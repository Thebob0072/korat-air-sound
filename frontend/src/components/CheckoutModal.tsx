import * as Dialog from '@radix-ui/react-dialog';
import { useForm } from 'react-hook-form';
import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { X, CreditCard, FileText, Loader2, AlertCircle, Banknote, Smartphone, QrCode } from 'lucide-react';
import QRCode from 'react-qr-code';
import generatePayload from 'promptpay-qr';
import {
  createOrder,
  addOrderItem,
  processPayment,
  updateOrderStatus,
} from '@/lib/api';
import { usePOSCartStore } from '@/store/POSCartStore';
import { cn, formatCurrency } from '@/lib/utils';

// ── Schema ────────────────────────────────────────────────────────────────────

const CheckoutSchema = z.object({
  paymentMethod: z.enum(['cash', 'transfer'] as const, {
    errorMap: () => ({ message: 'กรุณาเลือกวิธีชำระเงิน' }),
  }),
  cashReceived: z.coerce.number().min(0, 'กรุณากรอกจำนวนเงิน').optional(),
  discount: z.coerce
    .number({ invalid_type_error: 'กรุณากรอกตัวเลข' })
    .min(0, 'ส่วนลดต้องไม่ติดลบ')
    .default(0),
  note: z.string().max(200, 'หมายเหตุไม่เกิน 200 ตัวอักษร').trim().optional(),
});

type CheckoutFormValues = z.infer<typeof CheckoutSchema>;

// ── Props ─────────────────────────────────────────────────────────────────────

interface CheckoutModalProps {
  open: boolean;
  onClose: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CheckoutModal({ open, onClose }: CheckoutModalProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Read cart from Zustand
  const items = usePOSCartStore((s) => s.items);
  const vehicle = usePOSCartStore((s) => s.vehicle);
  const getSubtotal = usePOSCartStore((s) => s.getSubtotal);
  const setDiscount = usePOSCartStore((s) => s.setDiscount);
  const storeDiscount = usePOSCartStore((s) => s.discount);
  const clearCart = usePOSCartStore((s) => s.clearCart);

  const {
    register,
    handleSubmit,
    watch,
    setError,
    reset,
    setValue,
    formState: { errors },
  } = useForm<CheckoutFormValues>({
    resolver: zodResolver(CheckoutSchema),
    defaultValues: { paymentMethod: 'cash', discount: 0, note: '' },
  });

  // Sync discount from store when modal opens
  useEffect(() => {
    if (open) setValue('discount', storeDiscount);
  }, [open, storeDiscount, setValue]);

  const paymentMethod = watch('paymentMethod');
  const watchedDiscount = Number(watch('discount')) || 0;
  const watchedCashReceived = Number(watch('cashReceived')) || 0;

  const subtotal = getSubtotal();
  const total = Math.max(0, subtotal - watchedDiscount);
  const change = paymentMethod === 'cash' ? Math.max(0, watchedCashReceived - total) : 0;

  // ── Mutation ────────────────────────────────────────────────────────────────

  const commitMutation = useMutation({
    mutationFn: async ({ markAsPaid }: { markAsPaid: boolean }) => {
      if (!vehicle) throw new Error('ไม่พบข้อมูลรถ กรุณาค้นหาอีกครั้ง');
      if (items.length === 0) throw new Error('ไม่มีรายการในบิล');

      const order = await createOrder(vehicle.id);
      // UUID pattern — real DB products; anything else is a synthetic custom item
      const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      try {
        for (const item of items) {
          const isRealProduct = UUID_RE.test(item.product.id);
          await addOrderItem(order.id, {
            productId: isRealProduct ? item.product.id : undefined,
            customLabel: isRealProduct ? undefined : item.product.name,
            technicianName: item.technicianName,
            quantity: item.quantity,
            unitPrice: Number(item.product.sellingPrice),
          });
        }
        if (markAsPaid) {
          await processPayment(order.id);
        } else {
          await updateOrderStatus(order.id, 'Quoted');
        }
        return order.id;
      } catch (err) {
        // Attempt to cancel the partially-created order so it does not appear as orphaned Draft
        try {
          await updateOrderStatus(order.id, 'Cancelled');
        } catch {
          // Silently ignore — the primary error will be surfaced to the user
        }
        throw err;
      }
    },
    onSuccess: (orderId) => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      clearCart();
      reset();
      onClose();
      navigate(`/orders/${orderId}`);
    },
  });

  // ── Submit logic ────────────────────────────────────────────────────────────

  const submitWithMode = (markAsPaid: boolean) =>
    handleSubmit((formData) => {
      const discount = Number(formData.discount) || 0;
      const finalTotal = Math.max(0, subtotal - discount);

      if (discount > subtotal) {
        setError('discount', { message: 'ส่วนลดมากกว่ายอดรวม' });
        return;
      }

      if (markAsPaid && formData.paymentMethod === 'cash') {
        const received = Number(formData.cashReceived) || 0;
        if (received < finalTotal) {
          setError('cashReceived', {
            message: `ต้องรับเงินอย่างน้อย ${formatCurrency(finalTotal)}`,
          });
          return;
        }
      }

      setDiscount(discount);
      commitMutation.mutate({ markAsPaid });
    })();

  const handleClose = () => {
    if (commitMutation.isPending) return;
    reset();
    commitMutation.reset();
    onClose();
  };

  const dateLabel = format(new Date(), 'd MMM yyyy · HH:mm', { locale: th });

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <Dialog.Root open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <Dialog.Content
          aria-describedby="checkout-description"
          className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 bg-white rounded-[28px] shadow-[0_20px_60px_rgb(0,0,0,0.15)] max-h-[92vh] flex flex-col data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 focus:outline-none"
        >
          {/* Header */}
          <div className="flex items-start justify-between px-6 py-5 border-b border-[#E5E5E3] shrink-0">
            <div>
              <Dialog.Title className="text-lg font-bold text-[#2D2D2D] leading-none">
                ยืนยันการชำระเงิน
              </Dialog.Title>
              <p id="checkout-description" className="text-xs text-[#878681] mt-1.5">{dateLabel}</p>
            </div>
            <Dialog.Close
              aria-label="ปิด"
              disabled={commitMutation.isPending}
              onClick={handleClose}
              className="h-8 w-8 rounded-full flex items-center justify-center text-[#878681] hover:text-[#2D2D2D] hover:bg-[#F7F7F5] disabled:opacity-40 transition-all duration-200"
            >
              <X className="h-4 w-4" />
            </Dialog.Close>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto">

            {/* Vehicle */}
            {vehicle && (
              <div className="px-6 py-4 border-b border-dashed border-[#E5E5E3]">
                <p className="font-mono font-black text-xl tracking-[0.12em] text-[#2D2D2D] leading-none">
                  {vehicle.licensePlate}
                </p>
                <p className="text-xs text-[#878681] mt-1">
                  {[vehicle.brand && `${vehicle.brand} ${vehicle.model}`, vehicle.customer?.name].filter(Boolean).join(' · ')}
                </p>
              </div>
            )}

            {/* Line items */}
            <div className="px-6 py-4 border-b border-dashed border-[#E5E5E3]">
              <div className="flex items-center gap-2 mb-2 pb-2 border-b border-dashed border-[#F0EFED]">
                <p className="flex-1 text-[10px] font-bold uppercase tracking-widest text-[#878681]">รายการ ({items.length})</p>
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#878681] w-24 text-right">ราคา</p>
              </div>
              <div className="space-y-2.5">
                {items.map((item) => (
                  <div key={item.product.id} className="flex items-baseline gap-2">
                    <span className="flex-1 text-sm font-medium text-[#2D2D2D] leading-snug">
                      {item.product.name}
                    </span>
                    <span className="text-xs text-[#878681] shrink-0">×{item.quantity}</span>
                    <span className="text-sm font-mono font-semibold text-[#2D2D2D] w-24 text-right shrink-0 tabular-nums">
                      {formatCurrency(Number(item.product.sellingPrice) * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Form fields */}
            <div className="px-6 py-5 space-y-5">
              {/* Discount */}
              <div>
                <label htmlFor="discount" className="block text-sm font-semibold text-[#2D2D2D] mb-2">
                  ส่วนลด <span className="font-normal text-[#878681]">(บาท)</span>
                </label>
                <input
                  id="discount"
                  type="number"
                  min="0"
                  step="1"
                  inputMode="numeric"
                  className={cn(
                    'w-full h-11 px-4 text-base font-mono bg-[#F7F7F5] border-0 rounded-2xl transition-all focus:outline-none focus:ring-2',
                    errors.discount ? 'ring-2 ring-red-400' : 'focus:ring-[#3B3A36]/15',
                  )}
                  {...register('discount')}
                />
                {errors.discount && (
                  <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />{errors.discount.message}
                  </p>
                )}
              </div>

              {/* Payment method */}
              <div>
                <p className="text-sm font-semibold text-[#2D2D2D] mb-2">วิธีชำระเงิน</p>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { value: 'cash', label: 'เงินสด', Icon: Banknote },
                    { value: 'transfer', label: 'โอนเงิน', Icon: Smartphone },
                  ] as const).map(({ value, label, Icon }) => (
                    <label
                      key={value}
                      className={cn(
                        'flex items-center justify-center gap-2.5 h-12 border-2 rounded-2xl cursor-pointer transition-all duration-200 font-semibold text-sm select-none',
                        paymentMethod === value
                          ? 'border-[#3B3A36] bg-[#3B3A36] text-white'
                          : 'border-[#E5E5E3] bg-white text-[#878681] hover:border-[#3B3A36] hover:text-[#2D2D2D]',
                      )}
                    >
                      <input type="radio" value={value} className="sr-only" {...register('paymentMethod')} />
                      <Icon className="h-4 w-4" />
                      {label}
                    </label>
                  ))}
                </div>
              </div>

              {/* PromptPay QR */}
              {paymentMethod === 'transfer' && (
                <div className="flex flex-col items-center gap-3 bg-[#F7F7F5] rounded-2xl px-6 py-5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#878681]">
                    <QrCode className="h-3.5 w-3.5" />
                    สแกน PromptPay เพื่อชำระ
                  </div>
                  <div className="bg-white p-3 rounded-2xl shadow-sm">
                    <QRCode
                      value={generatePayload('0933218634', { amount: total })}
                      size={172}
                      level="M"
                    />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-[#2D2D2D]">093-321-8634</p>
                    <p className="text-xs text-[#878681] mt-0.5">โอนมา <span className="font-bold text-[#2D2D2D]">{formatCurrency(total)}</span></p>
                  </div>
                </div>
              )}

              {/* Cash received */}
              {paymentMethod === 'cash' && (
                <div>
                  <label htmlFor="cashReceived" className="block text-sm font-semibold text-[#2D2D2D] mb-2">
                    รับเงินมา <span className="font-normal text-[#878681]">(บาท)</span>
                  </label>
                  <input
                    id="cashReceived"
                    type="number"
                    min="0"
                    step="1"
                    inputMode="numeric"
                    className={cn(
                      'w-full h-11 px-4 text-base font-mono bg-[#F7F7F5] border-0 rounded-2xl transition-all focus:outline-none focus:ring-2',
                      errors.cashReceived ? 'ring-2 ring-red-400' : 'focus:ring-[#3B3A36]/15',
                    )}
                    {...register('cashReceived')}
                  />
                  {errors.cashReceived && (
                    <p className="mt-1.5 text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3.5 w-3.5 shrink-0" />{errors.cashReceived.message}
                    </p>
                  )}
                  {change > 0 && !errors.cashReceived && (
                    <div className="mt-2.5 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-2.5 flex items-center justify-between">
                      <span className="text-sm text-emerald-700 font-medium">เงินทอน</span>
                      <span className="font-mono font-black text-xl text-emerald-700 tabular-nums">{formatCurrency(change)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Note */}
              <div>
                <label htmlFor="note" className="block text-sm font-semibold text-[#2D2D2D] mb-2">
                  หมายเหตุ <span className="font-normal text-[#878681]">(ถ้ามี)</span>
                </label>
                <input
                  id="note"
                  type="text"
                  maxLength={200}
                  className="w-full h-10 px-4 text-sm bg-[#F7F7F5] border-0 rounded-2xl focus:ring-2 focus:ring-[#3B3A36]/15 focus:outline-none transition-all"
                  placeholder="เช่น รับรถพรุ่งนี้เช้า 9 โมง"
                  {...register('note')}
                />
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t border-[#E5E5E3] px-6 py-5 space-y-4 shrink-0">
            {/* Price summary */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-sm text-[#878681]">
                <span>ราคาก่อนส่วนลด</span>
                <span className="font-mono tabular-nums">{formatCurrency(subtotal)}</span>
              </div>
              {watchedDiscount > 0 && (
                <div className="flex justify-between text-sm text-[#878681]">
                  <span>ส่วนลด</span>
                  <span className="font-mono tabular-nums text-rose-400">− {formatCurrency(watchedDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between items-baseline border-t border-dashed border-[#E5E5E3] pt-2 mt-1">
                <span className="text-sm font-bold text-[#2D2D2D]">ยอดชำระ</span>
                <span className="font-mono font-black text-3xl text-[#2D2D2D] tabular-nums">{formatCurrency(total)}</span>
              </div>
            </div>

            {commitMutation.isError && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{(commitMutation.error as Error).message}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => submitWithMode(false)}
                disabled={commitMutation.isPending}
                className="h-12 bg-[#F7F7F5] hover:bg-[#E5E5E3] text-[#878681] hover:text-[#2D2D2D] text-sm font-medium rounded-2xl transition-all duration-200 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <FileText className="h-4 w-4" />
                ออกใบเสนอราคา
              </button>
              <button
                type="button"
                onClick={() => submitWithMode(true)}
                disabled={commitMutation.isPending}
                className="h-12 bg-[#3B3A36] hover:opacity-90 text-white text-sm font-medium rounded-2xl transition-all duration-200 active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {commitMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <><CreditCard className="h-4 w-4" />ยืนยันชำระเงิน</>
                )}
              </button>
            </div>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
