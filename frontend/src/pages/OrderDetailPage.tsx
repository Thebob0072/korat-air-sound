import { useState, useEffect } from 'react';
import { flushSync } from 'react-dom';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChevronLeft, Printer, Plus, Trash2, CreditCard, Loader2, Search, FileDown, Bluetooth, BluetoothOff } from 'lucide-react';
import { PDFDocument } from '@/components/PDFDocument';
import { usePDFExport } from '@/hooks/usePDFExport';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  getOrder,
  getProducts,
  addOrderItem,
  removeOrderItem,
  updateOrderStatus,
  processPayment,
} from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useBluetoothPrinter } from '@/hooks/useBluetoothPrinter';
import type { Order, Product, OrderStatus } from '@/types';

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_LABELS: Record<OrderStatus, string> = {
  Draft: 'แบบร่าง',
  Quoted: 'ใบเสนอราคา',
  InProgress: 'กำลังซ่อม',
  WaitingForParts: 'รออะไหล่',
  Ready: 'รอส่งมอบ',
  Paid: 'ชำระแล้ว',
  Cancelled: 'ยกเลิก',
};

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning';

const STATUS_BADGE: Record<OrderStatus, BadgeVariant> = {
  Draft: 'secondary',
  Quoted: 'warning',
  InProgress: 'default',
  WaitingForParts: 'warning',
  Ready: 'success',
  Paid: 'success',
  Cancelled: 'destructive',
};

const CATEGORY_LABELS: Record<string, string> = {
  AirCon: 'แอร์',
  Tint: 'ฟิล์มกรองแสง',
  Glass: 'กระจก',
  CentralLock: 'เครื่องเสียง',
  ServiceFee: 'อื่นๆ',
};

// ── Utility ───────────────────────────────────────────────────────────────────

function extractApiError(err: unknown, fallback: string): string {
  return (
    (err as { response?: { data?: { error?: string } } })?.response?.data?.error ?? fallback
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const btPrinter = useBluetoothPrinter();
  const { docRef: receiptRef, exportPDF: exportReceiptPDF, isExporting: isExportingReceipt } = usePDFExport();
  const { docRef: quotationRef, exportPDF: exportQuotationPDF, isExporting: isExportingQuotation } = usePDFExport();
  const { docRef: invoiceRef, exportPDF: exportInvoicePDF, isExporting: isExportingInvoice } = usePDFExport();

  const [showAddItem, setShowAddItem] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  const [showPayConfirm, setShowPayConfirm] = useState(false);

  // PDF export options dialog
  const [showPDFOptions, setShowPDFOptions] = useState(false);
  const [pdfOptionsFor, setPdfOptionsFor] = useState<'receipt' | 'quotation' | 'invoice'>('quotation');
  const [isCorp, setIsCorp] = useState(false);
  const [corpName, setCorpName] = useState('');
  const [corpAddress, setCorpAddress] = useState('');
  const [corpPhone, setCorpPhone] = useState('');
  const [receiptBillingInfo, setReceiptBillingInfo] = useState<{ orgName: string; address: string; phone: string } | undefined>(undefined);
  const [quotationBillingInfo, setQuotationBillingInfo] = useState<{ orgName: string; address: string; phone: string } | undefined>(undefined);
  const [invoiceBillingInfo, setInvoiceBillingInfo] = useState<{ orgName: string; address: string; phone: string } | undefined>(undefined);

  // ── Queries ───────────────────────────────────────────────────────────────

  const {
    data: order,
    isPending: orderLoading,
    isError: orderFailed,
  } = useQuery({
    queryKey: ['order', id],
    queryFn: () => getOrder(id!),
    enabled: !!id,
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => getProducts(),
    enabled: showAddItem,
    staleTime: 0,
  });

  // ── Mutations ─────────────────────────────────────────────────────────────

  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  const addItemMutation = useMutation({
    mutationFn: ({ product, quantity, technicianName, customLabel, unitPrice }: {
      product?: Product;
      quantity: number;
      technicianName?: string;
      customLabel?: string;
      unitPrice?: number;
    }) => {
      const isReal = product && UUID_RE.test(product.id);
      return addOrderItem(id!, {
        productId: isReal ? product!.id : undefined,
        customLabel: customLabel ?? (isReal ? undefined : product?.name),
        quantity,
        technicianName,
        unitPrice: Number(unitPrice ?? product?.sellingPrice ?? 0),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      setShowAddItem(false);
    },
  });

  const removeItemMutation = useMutation({
    mutationFn: (itemId: string) => removeOrderItem(id!, itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      setItemToDelete(null);
    },
  });

  const markQuotedMutation = useMutation({
    mutationFn: () => updateOrderStatus(id!, 'Quoted'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });

  const payMutation = useMutation({
    mutationFn: () => processPayment(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setShowPayConfirm(false);
    },
  });

  // ── Derived state ─────────────────────────────────────────────────────────

  const actionError =
    addItemMutation.error
      ? extractApiError(addItemMutation.error, 'เพิ่มสินค้าไม่สำเร็จ')
      : removeItemMutation.error
        ? extractApiError(removeItemMutation.error, 'ลบรายการไม่สำเร็จ')
        : markQuotedMutation.error
          ? extractApiError(markQuotedMutation.error, 'เกิดข้อผิดพลาด')
          : payMutation.error
            ? extractApiError(payMutation.error, 'การชำระเงินไม่สำเร็จ')
            : null;

  const isAnyMutating =
    addItemMutation.isPending ||
    removeItemMutation.isPending ||
    markQuotedMutation.isPending ||
    payMutation.isPending;

  if (orderLoading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (orderFailed || !order) {
    return <div className="text-center py-16 text-destructive">ไม่พบออเดอร์</div>;
  }

  // Auto-open receipt PDF dialog when navigated from checkout with ?receipt=1
  useEffect(() => {
    if (order && searchParams.get('receipt') === '1' && order.status === 'Paid') {
      setSearchParams({}, { replace: true });
      setPdfOptionsFor('receipt');
      setIsCorp(false);
      setCorpName('');
      setCorpAddress('');
      setCorpPhone('');
      setShowPDFOptions(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.id, order?.status]);

  const isEditable = order.status === 'Draft' || order.status === 'Quoted';
  const hasItems = (order.orderItems?.length ?? 0) > 0;
  const isCreditEligible = !!(order.vehicle?.customer?.name && order.vehicle?.customer?.phone);

  const openPDFOptions = (docType: 'receipt' | 'quotation' | 'invoice') => {
    setPdfOptionsFor(docType);
    setIsCorp(false);
    setCorpName('');
    setCorpAddress('');
    setCorpPhone('');
    setShowPDFOptions(true);
  };

  const handleConfirmPDF = () => {
    const info = isCorp && corpName.trim()
      ? { orgName: corpName.trim(), address: corpAddress.trim(), phone: corpPhone.trim() }
      : undefined;
    setShowPDFOptions(false);
    if (pdfOptionsFor === 'receipt') {
      flushSync(() => setReceiptBillingInfo(info));
      exportReceiptPDF(`receipt-${order.orderNumber}.pdf`);
    } else if (pdfOptionsFor === 'quotation') {
      flushSync(() => setQuotationBillingInfo(info));
      exportQuotationPDF(`quotation-${order.orderNumber}.pdf`);
    } else {
      flushSync(() => setInvoiceBillingInfo(info));
      exportInvoicePDF(`invoice-${order.orderNumber}.pdf`);
    }
  };

  return (
    <>
      {/* ── Screen layout ─────────────────────────────────────────────────── */}
      <div className="no-print space-y-4">
        {/* Top bar */}
        <div className="flex items-center gap-3 flex-wrap">
          <Button variant="ghost" size="sm" onClick={() => navigate('/orders')}>
            <ChevronLeft className="h-4 w-4 mr-1" />
            ย้อนกลับ
          </Button>
          <h1 className="text-lg font-bold text-[#2D2D2D]">{order.orderNumber}</h1>
          <Badge variant={STATUS_BADGE[order.status]}>{STATUS_LABELS[order.status]}</Badge>

          <div className="ml-auto flex gap-2 flex-wrap">
            {order.status === 'Draft' && hasItems && (
              <Button
                variant="outline"
                onClick={() => markQuotedMutation.mutate()}
                disabled={isAnyMutating}
              >
                {markQuotedMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                ออกใบเสนอราคา
              </Button>
            )}
            {isEditable && hasItems && (
              <Button onClick={() => setShowPayConfirm(true)} disabled={isAnyMutating}>
                <CreditCard className="h-4 w-4 mr-2" />
                ชำระเงิน
              </Button>
            )}
            {hasItems && order.status !== 'Cancelled' && (
              <Button
                variant="outline"
                onClick={() => openPDFOptions('quotation')}
                disabled={isExportingQuotation}
              >
                {isExportingQuotation ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileDown className="h-4 w-4 mr-2" />
                )}
                PDF ใบเสนอราคา
              </Button>
            )}
            {hasItems && isCreditEligible && order.status !== 'Cancelled' && order.status !== 'Draft' && (
              <Button
                variant="outline"
                onClick={() => openPDFOptions('invoice')}
                disabled={isExportingInvoice}
              >
                {isExportingInvoice ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileDown className="h-4 w-4 mr-2" />
                )}
                PDF ใบวางบิล
              </Button>
            )}
            {order.status === 'Paid' && (
              <Button
                onClick={() => openPDFOptions('receipt')}
                disabled={isExportingReceipt}
              >
                {isExportingReceipt ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <FileDown className="h-4 w-4 mr-2" />
                )}
                PDF ใบเสร็จ
              </Button>
            )}
            {(order.status === 'Quoted' || order.status === 'Paid') && (
              btPrinter.isConnected ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-emerald-600 font-medium hidden sm:block">
                    {btPrinter.deviceName}
                  </span>
                  <Button
                    variant="outline"
                    onClick={() => btPrinter.print(order)}
                    disabled={btPrinter.status === 'printing'}
                    className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                  >
                    {btPrinter.status === 'printing' ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Printer className="h-4 w-4 mr-2" />
                    )}
                    พิมพ์
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={btPrinter.disconnect}
                    className="text-[#878681] hover:text-red-500 px-2"
                    title="ตัดการเชื่อมต่อ"
                  >
                    <BluetoothOff className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  onClick={btPrinter.connect}
                  disabled={btPrinter.status === 'connecting'}
                >
                  {btPrinter.status === 'connecting' ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Bluetooth className="h-4 w-4 mr-2" />
                  )}
                  {btPrinter.status === 'connecting' ? 'กำลังเชื่อมต่อ…' : 'เชื่อมต่อเครื่องพิมพ์'}
                </Button>
              )
            )}
          </div>
        </div>

        {actionError && (
          <div className="bg-red-50 text-red-600 text-sm rounded-2xl px-5 py-3 border border-red-100">
            {actionError}
          </div>
        )}

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Items table */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">รายการสินค้า / บริการ</CardTitle>
                {isEditable && (
                  <Button size="sm" onClick={() => setShowAddItem(true)} disabled={isAnyMutating}>
                    <Plus className="h-4 w-4 mr-1" />
                    เพิ่มรายการ
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead className="bg-[#F7F5F2]">
                  <tr className="border-b border-[#E5E5E3]">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-[#878681] uppercase tracking-wide">รายการ</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-[#878681] uppercase tracking-wide w-16">จำนวน</th>
                    <th className="text-right px-3 py-3 text-xs font-semibold text-[#878681] uppercase tracking-wide w-28">ราคา/ชิ้น</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-[#878681] uppercase tracking-wide w-28">รวม</th>
                    {isEditable && <th className="w-10" />}
                  </tr>
                </thead>
                <tbody>
                  {order.orderItems?.map((item) => (
                    <tr key={item.id} className="border-b border-[#F0EDE8] last:border-0 hover:bg-[#F7F5F2] transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-medium text-[#2D2D2D] text-sm">{item.customLabel ?? item.product?.name}</div>
                  {item.technicianName && (
                    <div className="text-xs text-[#878681] mt-0.5">&#128295; {item.technicianName}</div>
                  )}
                        <div className="text-xs text-[#878681] mt-0.5">
                          {item.product ? `${CATEGORY_LABELS[item.product.category ?? '']} · ${item.product.sku}` : 'บริการกำหนดเอง'}
                        </div>
                      </td>
                      <td className="text-center px-3 text-sm text-[#2D2D2D]">{item.quantity}</td>
                      <td className="text-right px-3 text-sm text-[#878681] font-mono">{formatCurrency(item.unitPrice)}</td>
                      <td className="text-right px-5 font-semibold font-mono text-[#2D2D2D] text-sm">
                        {formatCurrency(item.subtotalPrice)}
                      </td>
                      {isEditable && (
                        <td className="text-center pr-2">
                          <button
                            onClick={() => setItemToDelete(item.id)}
                            disabled={isAnyMutating}
                            className="p-1.5 text-[#878681] hover:text-red-500 hover:bg-red-50 transition-colors rounded-xl disabled:opacity-40"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                  {!hasItems && (
                    <tr>
                      <td
                        colSpan={isEditable ? 5 : 4}
                        className="text-center text-[#878681] py-12 text-sm"
                      >
                        ยังไม่มีรายการ — กด &ldquo;เพิ่มรายการ&rdquo; เพื่อเริ่มต้น
                      </td>
                    </tr>
                  )}
                </tbody>
                {hasItems && (
                  <tfoot>
                    <tr className="border-t-2 border-[#E5E5E3]">
                      <td
                        colSpan={isEditable ? 4 : 3}
                        className="text-right px-5 py-3.5 font-bold text-sm text-[#878681]"
                      >
                        ยอดรวมทั้งหมด
                      </td>
                      <td className="text-right px-5 py-3.5 font-black text-xl font-mono text-[#2D2D2D]">
                        {formatCurrency(order.totalAmount)}
                      </td>
                      {isEditable && <td />}
                    </tr>
                  </tfoot>
                )}
              </table>
            </CardContent>
          </Card>

          {/* Side info */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground uppercase tracking-wide">
                  รถยนต์
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                <p className="text-2xl font-bold">{order.vehicle?.licensePlate}</p>
                <p className="text-sm text-muted-foreground">
                  {order.vehicle?.brand} {order.vehicle?.model}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground uppercase tracking-wide">
                  ลูกค้า
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p className="font-semibold">{order.vehicle?.customer?.name}</p>
                <p className="text-muted-foreground">{order.vehicle?.customer?.phone}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground uppercase tracking-wide">
                  ออเดอร์
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div>
                  <p className="text-xs text-muted-foreground">วันที่เปิดงาน</p>
                  <p>{formatDate(order.createdAt)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">แก้ไขล่าสุด</p>
                  <p>{formatDate(order.updatedAt)}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Add Item Modal */}
        {showAddItem && (
          <AddItemModal
            products={products}
            isPending={addItemMutation.isPending}
            onAdd={(product, quantity, technicianName) => addItemMutation.mutate({ product, quantity, technicianName })}
            onAddCustom={(name, price, technicianName) =>
              addItemMutation.mutate({
                customLabel: name,
                quantity: 1,
                technicianName,
                unitPrice: price,
              })
            }
            onClose={() => setShowAddItem(false)}
          />
        )}
      </div>

      {/* ── Delete item confirmation ────────────────────────────────────────────── */}
      <AlertDialog
        open={itemToDelete !== null}
        onOpenChange={(open) => { if (!open) setItemToDelete(null); }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบรายการ</AlertDialogTitle>
            <AlertDialogDescription>
              ต้องการลบรายการนี้ออกจากออเดอร์? การกระทำนี้ไม่สามารถย้อนกลับได้
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={removeItemMutation.isPending}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { if (itemToDelete) removeItemMutation.mutate(itemToDelete); }}
              disabled={removeItemMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {removeItemMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              ลบรายการ
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Payment confirmation ──────────────────────────────────────────────────── */}
      <AlertDialog open={showPayConfirm} onOpenChange={setShowPayConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการชำระเงิน</AlertDialogTitle>
            <AlertDialogDescription>
              ระบบจะตัดสต๊อกสินค้าอัตโนมัติ กรุณาตรวจสอบรายการให้ครบถ้วนก่อนยืนยัน
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={payMutation.isPending}>ยกเลิก</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => payMutation.mutate()}
              disabled={payMutation.isPending}
            >
              {payMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              ชำระเงิน
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Print layout ──────────────────────────────────────────────────── */}
      <PrintDocument order={order} />

      {/* ── PDF options dialog (shared for all doc types) ────────────────── */}
      {showPDFOptions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-white rounded-[24px] shadow-[0_24px_80px_rgb(0,0,0,0.18)] border border-[#E8E4DF] overflow-hidden">
            {/* Header */}
            <div className="px-6 py-5 border-b border-[#E8E4DF]">
              <h2 className="text-base font-bold text-[#2D2D2D]">
                {pdfOptionsFor === 'receipt' ? 'ตัวเลือกใบเสร็จ' : pdfOptionsFor === 'invoice' ? 'ตัวเลือกใบวางบิล' : 'ตัวเลือกใบเสนอราคา'}
              </h2>
              <p className="text-xs text-[#878681] mt-0.5">เลือกรูปแบบผู้รับเอกสาร</p>
            </div>

            <div className="px-6 py-5 space-y-4">
              {/* Toggle: personal vs corp */}
              <div className="flex bg-[#F0EDE8] rounded-2xl p-1">
                <button
                  type="button"
                  onClick={() => setIsCorp(false)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${!isCorp ? 'bg-white text-[#2D2D2D] shadow-sm' : 'text-[#878681] hover:text-[#2D2D2D]'}`}
                >
                  บุคคลธรรมดา
                </button>
                <button
                  type="button"
                  onClick={() => setIsCorp(true)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all ${isCorp ? 'bg-white text-[#2D2D2D] shadow-sm' : 'text-[#878681] hover:text-[#2D2D2D]'}`}
                >
                  นิติบุคคล / บริษัท
                </button>
              </div>

              {/* Personal mode — show default customer info */}
              {!isCorp && (
                <div className="bg-[#F7F5F2] rounded-2xl px-4 py-3 space-y-1.5">
                  <p className="text-xs font-semibold text-[#878681] uppercase tracking-wide">ข้อมูลลูกค้าที่จะแสดง</p>
                  <p className="text-sm font-medium text-[#2D2D2D]">{order.vehicle?.customer?.name || '—'}</p>
                  <p className="text-sm text-[#878681] font-mono">{order.vehicle?.customer?.phone || '—'}</p>
                </div>
              )}

              {/* Corp fields */}
              {isCorp && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-semibold text-[#878681] uppercase tracking-wide mb-1.5">ชื่อบริษัท / องค์กร <span className="text-[#C0BEBA]">*</span></label>
                    <input
                      type="text"
                      value={corpName}
                      onChange={(e) => setCorpName(e.target.value)}
                      placeholder="บริษัท ABC จำกัด"
                      autoFocus
                      className="w-full bg-[#F0EDE8] border-0 rounded-2xl px-4 py-2.5 text-sm text-[#2D2D2D] placeholder:text-[#C0BEBA] focus:outline-none focus:ring-2 focus:ring-[#3B3A36]/15 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#878681] uppercase tracking-wide mb-1.5">ที่อยู่</label>
                    <textarea
                      value={corpAddress}
                      onChange={(e) => setCorpAddress(e.target.value)}
                      placeholder="123 ถ.ตัวอย่าง แขวง/ตำบล เขต/อำเภอ จังหวัด รหัสไปรษณีย์"
                      rows={2}
                      className="w-full bg-[#F0EDE8] border-0 rounded-2xl px-4 py-2.5 text-sm text-[#2D2D2D] placeholder:text-[#C0BEBA] focus:outline-none focus:ring-2 focus:ring-[#3B3A36]/15 transition-all resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#878681] uppercase tracking-wide mb-1.5">เบอร์โทร</label>
                    <input
                      type="tel"
                      value={corpPhone}
                      onChange={(e) => setCorpPhone(e.target.value)}
                      placeholder="02-XXX-XXXX"
                      className="w-full bg-[#F0EDE8] border-0 rounded-2xl px-4 py-2.5 text-sm font-mono text-[#2D2D2D] placeholder:text-[#C0BEBA] focus:outline-none focus:ring-2 focus:ring-[#3B3A36]/15 transition-all"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 pb-6 flex gap-3">
              <button
                type="button"
                onClick={() => setShowPDFOptions(false)}
                className="flex-1 bg-[#F0EDE8] hover:bg-[#E5E5E3] rounded-2xl px-4 py-3 text-sm font-medium text-[#878681] hover:text-[#2D2D2D] transition-all"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleConfirmPDF}
                disabled={isCorp && !corpName.trim()}
                className="flex-1 bg-[#3B3A36] hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-2xl px-4 py-3 text-sm font-semibold transition-all"
              >
                ออก PDF
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Off-screen PDF templates for html2canvas capture */}
      <div
        aria-hidden="true"
        style={{ position: 'fixed', left: '-9999px', top: 0, zIndex: -1, pointerEvents: 'none' }}
      >
        <PDFDocument ref={receiptRef} order={order} docType="receipt" billingInfo={receiptBillingInfo} />
      </div>
      <div
        aria-hidden="true"
        style={{ position: 'fixed', left: '-9999px', top: 0, zIndex: -1, pointerEvents: 'none' }}
      >
        <PDFDocument ref={quotationRef} order={order} docType="quotation" billingInfo={quotationBillingInfo} />
      </div>
      <div
        aria-hidden="true"
        style={{ position: 'fixed', left: '-9999px', top: 0, zIndex: -1, pointerEvents: 'none' }}
      >
        <PDFDocument ref={invoiceRef} order={order} docType="invoice" billingInfo={invoiceBillingInfo} />
      </div>
    </>
  );
}

// ── Add Item Modal ────────────────────────────────────────────────────────────

interface AddItemModalProps {
  products: Product[];
  isPending: boolean;
  onAdd: (product: Product, quantity: number, technicianName?: string) => void;
  onAddCustom: (name: string, price: number, technicianName?: string) => void;
  onClose: () => void;
}

function AddItemModal({ products, isPending, onAdd, onAddCustom, onClose }: AddItemModalProps) {
  const [tab, setTab] = useState<'product' | 'custom'>('product');
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('');
  const [selected, setSelected] = useState<Product | null>(null);
  const [qty, setQty] = useState(1);
  const [technicianName, setTechnicianName] = useState('');
  // custom item fields
  const [customName, setCustomName] = useState('');
  const [customPrice, setCustomPrice] = useState('');
  const [customTech, setCustomTech] = useState('');

  const CATEGORIES = [
    { value: '', label: 'ทั้งหมด' },
    { value: 'AirCon', label: 'แอร์' },
    { value: 'Tint', label: 'ฟิล์มกรองแสง' },
    { value: 'Glass', label: 'กระจก' },
    { value: 'CentralLock', label: 'กุญแจรีโมท' },
    { value: 'Sound', label: 'เครื่องเสียง' },
    { value: 'ServiceFee', label: 'อื่นๆ' },
  ];

  const filtered = products.filter((p) => {
    const matchCat = !activeCategory || p.category === activeCategory;
    const q = search.toLowerCase();
    const matchSearch =
      !search ||
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  const customPriceNum = parseFloat(customPrice) || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#FDFCFA] rounded-[28px] shadow-[0_24px_80px_rgb(0,0,0,0.18)] w-full max-w-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 shrink-0">
          <div>
            <h2 className="font-bold text-[#2D2D2D] text-base">เพิ่มรายการ</h2>
            {tab === 'product' && <p className="text-xs text-[#878681] mt-0.5">{filtered.length} รายการ</p>}
          </div>
          <button onClick={onClose} className="h-8 w-8 flex items-center justify-center rounded-full text-[#878681] hover:text-[#2D2D2D] hover:bg-[#EAE7E2] transition-all">✕</button>
        </div>

        {/* Tab toggle */}
        <div className="px-6 pb-3 shrink-0">
          <div className="flex bg-[#F0EDE8] rounded-2xl p-1">
            <button type="button" onClick={() => setTab('product')}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${tab === 'product' ? 'bg-white text-[#2D2D2D] shadow-sm' : 'text-[#878681] hover:text-[#2D2D2D]'}`}>
              สินค้า / บริการ
            </button>
            <button type="button" onClick={() => setTab('custom')}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${tab === 'custom' ? 'bg-white text-[#2D2D2D] shadow-sm' : 'text-[#878681] hover:text-[#2D2D2D]'}`}>
              กำหนดเอง
            </button>
          </div>
        </div>

        {/* ── Custom item tab ── */}
        {tab === 'custom' && (
          <div className="px-6 pb-6 space-y-4 flex-1">
            <div>
              <label className="block text-sm font-semibold text-[#2D2D2D] mb-1.5">ชื่อรายการ *</label>
              <input
                type="text"
                autoFocus
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="เช่น ค่าแรง, อุปกรณ์เสริม…"
                className="w-full bg-[#F0EDE8] border-0 rounded-2xl px-4 py-2.5 text-sm text-[#2D2D2D] placeholder:text-[#C0BEBA] focus:outline-none focus:ring-2 focus:ring-[#3B3A36]/15 transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#2D2D2D] mb-1.5">ราคา (บาท) *</label>
              <input
                type="number"
                min="0"
                step="1"
                inputMode="decimal"
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
                placeholder="0"
                className="w-full bg-[#F0EDE8] border-0 rounded-2xl px-4 py-2.5 text-sm font-mono text-[#2D2D2D] placeholder:text-[#C0BEBA] focus:outline-none focus:ring-2 focus:ring-[#3B3A36]/15 transition-all"
              />
            </div>
            <div className="flex items-center gap-2 bg-[#F7F5F2] rounded-2xl px-3 py-2">
              <span className="text-xs text-[#C0BEBA]">🔧</span>
              <input
                type="text"
                value={customTech}
                onChange={(e) => setCustomTech(e.target.value)}
                placeholder="ช่างผู้รับผิดชอบ (ไม่บังคับ)"
                className="flex-1 bg-transparent text-sm text-[#2D2D2D] placeholder:text-[#C0BEBA] focus:outline-none"
              />
            </div>
            {customName.trim() && customPriceNum > 0 && (
              <div className="bg-[#F0EDE8] rounded-2xl px-4 py-3 flex items-center justify-between">
                <span className="text-sm text-[#2D2D2D] truncate max-w-[65%]">{customName.trim()}</span>
                <span className="text-base font-bold font-mono text-[#3B3A36]">{formatCurrency(customPriceNum)}</span>
              </div>
            )}
            <button
              onClick={() => {
                if (customName.trim() && customPriceNum > 0) {
                  onAddCustom(customName.trim(), customPriceNum, customTech || undefined);
                }
              }}
              disabled={!customName.trim() || customPriceNum <= 0 || isPending}
              className="w-full flex items-center justify-center gap-2 bg-[#3B3A36] hover:opacity-90 active:scale-[0.98] disabled:opacity-40 text-white text-sm font-medium rounded-2xl px-5 py-3 transition-all"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {customPriceNum > 0 ? `เพิ่มในออเดอร์ ${formatCurrency(customPriceNum)}` : 'เพิ่มในออเดอร์'}
            </button>
          </div>
        )}

        {/* ── Product tab ── */}
        {tab === 'product' && <>

        {/* Search + Category filters */}
        <div className="px-6 pb-4 space-y-3 shrink-0">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-[#878681] pointer-events-none" />
            <input
              className="w-full bg-white border border-[#E8E4DF] rounded-2xl pl-11 pr-4 py-3 text-sm text-[#2D2D2D] placeholder:text-[#878681] focus:outline-none focus:ring-2 focus:ring-[#3B3A36]/15 shadow-[0_1px_4px_rgb(0,0,0,0.04)] transition-all"
              placeholder="ค้นหาชื่อสินค้าหรือ SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              autoFocus
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                onClick={() => setActiveCategory(c.value)}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${
                  activeCategory === c.value
                    ? 'bg-[#3B3A36] text-white shadow-sm'
                    : 'bg-white border border-[#E8E4DF] text-[#878681] hover:text-[#2D2D2D] hover:border-[#3B3A36]/30'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Product list */}
        <div className="overflow-y-auto flex-1 px-3 pb-3">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-[#878681]">
              <div className="h-14 w-14 rounded-full bg-[#F0EDE8] flex items-center justify-center">
                <Search className="h-6 w-6 text-[#C0BEBA]" strokeWidth={1.5} />
              </div>
              <p className="text-sm">ไม่พบสินค้า</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filtered.map((product) => {
                const isSelected = selected?.id === product.id;
                const lowStock = Number(product.stockQuantity) <= 3;
                return (
                  <button
                    key={product.id}
                    onClick={() => { setSelected(product); setQty(1); }}
                    className={`w-full text-left px-4 py-3.5 rounded-2xl flex items-center gap-3 transition-all duration-150 ${
                      isSelected
                        ? 'bg-[#3B3A36] shadow-[0_4px_16px_rgb(0,0,0,0.12)]'
                        : 'bg-white hover:bg-[#F5F2EE] border border-transparent hover:border-[#E8E4DF]'
                    }`}
                  >
                    {/* Icon badge */}
                    <div className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 text-xs font-bold ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-[#F0EDE8] text-[#878681]'
                    }`}>
                      {product.sku.slice(0, 2).toUpperCase()}
                    </div>
                    {/* Text */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium leading-snug ${isSelected ? 'text-white' : 'text-[#2D2D2D]'}`}>
                        {product.name}
                      </p>
                      <p className={`text-xs mt-0.5 ${isSelected ? 'text-white/60' : 'text-[#878681]'}`}>
                        {CATEGORY_LABELS[product.category]}
                        {product.stockQuantity !== 9999 && (
                          <span className={lowStock && !isSelected ? 'text-rose-400 font-semibold' : ''}>
                            {' '}· คงเหลือ {product.stockQuantity}
                          </span>
                        )}
                      </p>
                    </div>
                    {/* Price + check */}
                    <div className="text-right shrink-0 flex items-center gap-2">
                      <span className={`text-sm font-mono font-semibold ${isSelected ? 'text-white' : 'text-[#2D2D2D]'}`}>
                        {formatCurrency(product.sellingPrice)}
                      </span>
                      {isSelected && (
                        <div className="h-5 w-5 rounded-full bg-white/25 flex items-center justify-center">
                          <span className="text-white text-xs">✓</span>
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer: selected product + qty + add button */}
        {selected && (
          <div className="px-5 py-4 border-t border-[#EAE7E2] bg-white rounded-b-[28px] shrink-0">
            {/* Technician name */}
            <div className="flex items-center gap-2 bg-[#F7F5F2] rounded-2xl px-3 py-2 mb-3">
              <span className="text-xs text-[#C0BEBA]">&#128295;</span>
              <input
                type="text"
                value={technicianName}
                onChange={(e) => setTechnicianName(e.target.value)}
                placeholder="ช่างผู้รับผิดชอบ (ไม่บังคับ)"
                className="flex-1 bg-transparent text-sm text-[#2D2D2D] placeholder:text-[#C0BEBA] focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm text-[#2D2D2D] truncate">{selected.name}</p>
                <p className="text-xs text-[#878681] mt-0.5">{formatCurrency(selected.sellingPrice)} × {qty} = <span className="font-bold text-[#2D2D2D] font-mono">{formatCurrency(Number(selected.sellingPrice) * qty)}</span></p>
              </div>

              {/* Qty stepper */}
              <div className="flex items-center bg-[#F0EDE8] rounded-full p-1 shrink-0">
                <button
                  className="h-8 w-8 rounded-full bg-white shadow-sm flex items-center justify-center text-[#2D2D2D] hover:bg-[#E8E4DF] transition-all text-base font-medium"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                >−</button>
                <span className="w-10 text-center font-bold text-[#2D2D2D] text-sm tabular-nums">{qty}</span>
                <button
                  className="h-8 w-8 rounded-full bg-white shadow-sm flex items-center justify-center text-[#2D2D2D] hover:bg-[#E8E4DF] transition-all text-base font-medium"
                  onClick={() => setQty((q) => Math.min(Number(selected.stockQuantity), q + 1))}
                >+</button>
              </div>

              <button
                onClick={() => onAdd(selected, qty, technicianName || undefined)}
                disabled={isPending}
                className="flex items-center gap-2 bg-[#3B3A36] hover:opacity-90 active:scale-[0.98] disabled:opacity-40 text-white text-sm font-medium rounded-2xl px-5 py-2.5 transition-all shrink-0"
              >
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                เพิ่มรายการ
              </button>
            </div>
          </div>
        )}
        </>}
      </div>
    </div>
  );
}

// ── Print Document ────────────────────────────────────────────────────────────

function PrintDocument({ order }: { order: Order }) {
  const isReceipt = order.status === 'Paid';

  return (
    <div className="print-only hidden">
      <div className="print-container">
        {/* Shop header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold">Korat Air &amp; Sound</h1>
          <p className="text-sm">ร้านประดับยนต์และซ่อมแอร์</p>
          <p className="text-sm">โทร: 044-XXX-XXXX</p>
        </div>

        {/* Document title */}
        <div className="text-center border-t border-b border-black py-2 mb-4">
          <p className="text-lg font-bold">{isReceipt ? 'ใบเสร็จรับเงิน' : 'ใบเสนอราคา'}</p>
          <p className="text-sm">เลขที่: {order.orderNumber}</p>
          <p className="text-sm">วันที่: {formatDate(order.createdAt)}</p>
        </div>

        {/* Customer info */}
        <div className="mb-4 text-sm grid grid-cols-2 gap-1">
          <p><strong>ลูกค้า:</strong> {order.vehicle?.customer?.name}</p>
          <p><strong>โทร:</strong> {order.vehicle?.customer?.phone}</p>
          <p>
            <strong>ทะเบียน:</strong> {order.vehicle?.licensePlate}
          </p>
          <p>
            <strong>รถ:</strong> {order.vehicle?.brand} {order.vehicle?.model}
          </p>
        </div>

        {/* Line items */}
        <table className="w-full text-sm border-collapse mb-4">
          <thead>
            <tr className="border-t border-b border-black">
              <th className="text-left py-1.5">รายการ</th>
              <th className="text-center py-1.5 w-14">จำนวน</th>
              <th className="text-right py-1.5 w-24">ราคา/ชิ้น</th>
              <th className="text-right py-1.5 w-24">รวม</th>
            </tr>
          </thead>
          <tbody>
            {order.orderItems?.map((item) => (
              <tr key={item.id} className="border-b border-gray-300">
                <td className="py-1.5">{item.customLabel ?? item.product?.name}</td>
                <td className="text-center">{item.quantity}</td>
                <td className="text-right">{formatCurrency(item.unitPrice)}</td>
                <td className="text-right">{formatCurrency(item.subtotalPrice)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-black font-bold">
              <td colSpan={3} className="text-right pt-2">ยอดรวมทั้งหมด</td>
              <td className="text-right pt-2">{formatCurrency(order.totalAmount)}</td>
            </tr>
          </tfoot>
        </table>

        {/* Footer note */}
        {isReceipt ? (
          <div className="text-center mt-8 border-t pt-4">
            <p className="font-bold">ชำระเงินเรียบร้อยแล้ว ขอบคุณที่ใช้บริการ</p>
          </div>
        ) : (
          <div className="mt-8 border-t pt-4 text-sm space-y-1">
            <p>ใบเสนอราคานี้มีอายุ 30 วัน นับจากวันที่ออก</p>
            <div className="flex justify-between mt-6">
              <p>ลายเซ็นลูกค้า: ____________________</p>
              <p>ลายเซ็นผู้รับมอบอำนาจ: ____________________</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
