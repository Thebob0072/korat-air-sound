import { useState, useMemo } from 'react';
import { X, FileDown, Printer, Loader2, Bluetooth } from 'lucide-react';
import { PDFDocument } from '@/components/PDFDocument';
import { usePDFExport } from '@/hooks/usePDFExport';
import { Button } from '@/components/ui/button';
import { useBusiness } from '@/context/BusinessContext';
import type { Order } from '@/types';

type DocType = 'receipt' | 'quotation' | 'invoice';

interface BtPrinterHandle {
  status: 'idle' | 'connecting' | 'connected' | 'printing' | 'error';
  deviceName: string | null;
  isConnected: boolean;
  connect: () => void;
  print: (order: Order) => void;
}

interface BillPreviewModalProps {
  order: Order;
  defaultDocType?: DocType;
  onClose: () => void;
  btPrinter: BtPrinterHandle;
}

const DOC_LABEL: Record<DocType, string> = {
  receipt: 'ใบเสร็จรับเงิน',
  quotation: 'ใบเสนอราคา',
  invoice: 'ใบวางบิล',
};

export function BillPreviewModal({
  order,
  defaultDocType = 'quotation',
  onClose,
  btPrinter,
}: BillPreviewModalProps) {
  const isPaid = order.status === 'Paid';
  const hasItems = (order.orderItems?.length ?? 0) > 0;
  const isCreditEligible = !!(order.vehicle?.customer?.name && order.vehicle?.customer?.phone);
  const canInvoice = hasItems && isCreditEligible && order.status !== 'Draft' && order.status !== 'Cancelled';

  const availableTabs: DocType[] = [
    ...(isPaid ? (['receipt'] as DocType[]) : []),
    'quotation',
    ...(canInvoice ? (['invoice'] as DocType[]) : []),
  ];

  // Trust defaultDocType unconditionally — the caller already validated the preconditions.
  // This prevents the stale-cache race where order.status hasn't yet updated to 'Paid'
  // but the receipt was already issued by the server.
  const [docType, setDocType] = useState<DocType>(defaultDocType);
  const [isCorp, setIsCorp] = useState(false);
  const [corpName, setCorpName] = useState('');
  const [corpAddress, setCorpAddress] = useState('');
  const [corpPhone, setCorpPhone] = useState('');

  const { selected: selectedBusiness } = useBusiness();
  const { docRef, exportPDF, isExporting } = usePDFExport();

  // useMemo so PDFDocument only re-renders when billing fields actually change
  const billingInfo = useMemo(
    () =>
      isCorp && corpName.trim()
        ? { orgName: corpName.trim(), address: corpAddress.trim(), phone: corpPhone.trim() }
        : undefined,
    [isCorp, corpName, corpAddress, corpPhone],
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-[880px] max-h-[90vh] flex-col rounded-[28px] bg-[#FDFCFA] shadow-[0_24px_80px_rgb(0,0,0,0.18)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="flex shrink-0 items-center justify-between border-b border-[#E8E4DF] px-6 pt-5 pb-4">
          <div>
            <h2 className="text-base font-bold text-[#2D2D2D]">{DOC_LABEL[docType]}</h2>
            <p className="mt-0.5 font-mono text-xs text-[#878681]">{order.orderNumber}</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-[#878681] transition-all hover:bg-[#EAE7E2] hover:text-[#2D2D2D]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── Doc type tabs ───────────────────────────────────────────────── */}
        {availableTabs.length > 1 && (
          <div className="shrink-0 px-6 pt-4">
            <div className="flex gap-1 rounded-2xl bg-[#F0EDE8] p-1">
              {availableTabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setDocType(tab)}
                  className={`flex-1 rounded-xl py-2 text-sm font-semibold transition-all duration-200 ${
                    docType === tab
                      ? 'bg-white text-[#2D2D2D] shadow-sm'
                      : 'text-[#878681] hover:text-[#2D2D2D]'
                  }`}
                >
                  {DOC_LABEL[tab]}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Billing type toggle + corp fields ───────────────────────────── */}
        <div className="shrink-0 px-6 py-3 space-y-2">
          <div className="flex rounded-2xl bg-[#F0EDE8] p-1 w-fit">
            <button
              onClick={() => setIsCorp(false)}
              className={`rounded-xl px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
                !isCorp ? 'bg-white text-[#2D2D2D] shadow-sm' : 'text-[#878681]'
              }`}
            >
              บุคคลธรรมดา
            </button>
            <button
              onClick={() => setIsCorp(true)}
              className={`rounded-xl px-4 py-1.5 text-sm font-medium transition-all duration-200 ${
                isCorp ? 'bg-white text-[#2D2D2D] shadow-sm' : 'text-[#878681]'
              }`}
            >
              นิติบุคคล
            </button>
          </div>
          {isCorp && (
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                autoFocus
                placeholder="ชื่อบริษัท / องค์กร *"
                value={corpName}
                onChange={(e) => setCorpName(e.target.value)}
                className="flex-1 rounded-xl border border-[#E8E4DF] bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D2D2D]/20"
              />
              <input
                placeholder="ที่อยู่"
                value={corpAddress}
                onChange={(e) => setCorpAddress(e.target.value)}
                className="flex-1 rounded-xl border border-[#E8E4DF] bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D2D2D]/20"
              />
              <input
                placeholder="โทรศัพท์"
                value={corpPhone}
                onChange={(e) => setCorpPhone(e.target.value)}
                className="sm:w-32 rounded-xl border border-[#E8E4DF] bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D2D2D]/20"
              />
            </div>
          )}
        </div>

        {/* ── Document preview (scrollable) ───────────────────────────────── */}
        <div className="min-h-0 min-w-0 flex-1 overflow-auto pb-2">
          <div className="px-6">
            <div
              className="overflow-hidden rounded-xl border border-[#E8E4DF] shadow-[0_2px_16px_rgb(0,0,0,0.07)]"
              style={{ minWidth: '794px' }}
            >
              <PDFDocument
                ref={docRef}
                order={order}
                docType={docType}
                billingInfo={billingInfo}
                shopInfo={selectedBusiness ? {
                  name: selectedBusiness.name,
                  tagline: selectedBusiness.tagline,
                  address: selectedBusiness.address,
                  phone: selectedBusiness.phone,
                } : undefined}
              />
            </div>
          </div>
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────── */}
        <div className="flex shrink-0 flex-wrap items-center gap-3 border-t border-[#E8E4DF] px-6 py-4">
          {btPrinter.isConnected ? (
            <Button
              variant="outline"
              onClick={() => btPrinter.print(order)}
              disabled={btPrinter.status === 'printing'}
              className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
            >
              {btPrinter.status === 'printing' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Printer className="mr-2 h-4 w-4" />
              )}
              พิมพ์{btPrinter.deviceName ? ` (${btPrinter.deviceName})` : ''}
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={btPrinter.connect}
              disabled={btPrinter.status === 'connecting'}
              className="text-[#878681]"
            >
              {btPrinter.status === 'connecting' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Bluetooth className="mr-2 h-4 w-4" />
              )}
              เชื่อมต่อเครื่องพิมพ์
            </Button>
          )}
          <Button
            onClick={() => exportPDF(`${docType}-${order.orderNumber}.pdf`)}
            disabled={isExporting}
          >
            {isExporting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <FileDown className="mr-2 h-4 w-4" />
            )}
            ดาวน์โหลด PDF
          </Button>
        </div>
      </div>
    </div>
  );
}
