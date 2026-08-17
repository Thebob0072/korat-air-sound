import { useState, useMemo } from 'react';
import { X, FileDown, Printer, Loader2, Bluetooth } from 'lucide-react';
import { PDFDocument } from '@/components/PDFDocument';
import { usePDFExport } from '@/hooks/usePDFExport';
import { Button } from '@/components/ui/button';
import { useBusiness } from '@/context/BusinessContext';
import type { Order } from '@/types';
import type { Business } from '@/lib/business';

// ── Thermal receipt print ─────────────────────────────────────────────────────

function thb2(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

interface PrintBiz {
  name: string; tagline: string; phone: string; printWidth: 58 | 80; receiptFooter: string;
}

function print58mm(order: Order, docType: 'receipt' | 'quotation' | 'invoice', biz: PrintBiz) {
  const docLabel = { receipt: 'ใบเสร็จรับเงิน', quotation: 'ใบเสนอราคา', invoice: 'ใบวางบิล' }[docType];
  const isReceipt = docType === 'receipt';
  const paperW = biz.printWidth ?? 58;
  const contentMM = paperW === 80 ? 62 : 44;

  const orderDate = new Date(order.createdAt);
  const dateStr = orderDate.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: '2-digit' });
  const timeStr = orderDate.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

  const items = order.orderItems ?? [];
  const subtotal = items.reduce((s, i) => s + Number(i.subtotalPrice), 0);
  const total = Number(order.totalAmount);
  const discount = subtotal - total;
  const hasDiscount = discount > 0.005;

  // ── Canvas setup (203 DPI × 4x render for sharp downscale) ─────────────────
  const SCALE = 4;
  const DPI   = 203;
  const PPM   = DPI / 25.4;
  const W     = Math.round(contentMM * PPM) * SCALE;
  const PAD   = Math.round(2 * PPM) * SCALE;
  const TW    = W - PAD * 2;
  const PX    = (pt: number) => Math.round(pt * DPI / 72) * SCALE;

  // Sizes in pt — compact for 58mm thermal
  const SZ = { shop: 8, body: 6, plate: 9, total: 11, doc: 7 };

  const mkFont = (pt: number, fw = 800) =>
    `${fw} ${PX(pt)}px Arial, Tahoma, sans-serif`;

  // Shared off-screen canvas for measuring
  const mc = document.createElement('canvas').getContext('2d')!;
  const measure = (s: string, pt: number, fw = 800) => {
    mc.font = mkFont(pt, fw);
    return mc.measureText(s).width;
  };

  // Wrap text that exceeds TW — char by char (works for Thai)
  const wrap = (s: string, pt: number, fw = 800): string[] => {
    const out: string[] = [];
    let cur = '';
    for (const ch of s) {
      if (measure(cur + ch, pt, fw) > TW) { out.push(cur); cur = ch; }
      else cur += ch;
    }
    if (cur) out.push(cur);
    return out.length ? out : [''];
  };

  // ── Op list ───────────────────────────────────────────────────────────────
  type Op =
    | { t: 'txt'; s: string; pt: number; fw?: number; align?: 'c' | 'r' }
    | { t: 'col'; l: string; r: string; pt: number; fw?: number }
    | { t: 'hr';  dash?: boolean }
    | { t: 'gap'; h: number };

  const ops: Op[] = [];

  // Line height = 1.9× font px — enough room for Thai tone marks
  const LH = (pt: number) => Math.round(PX(pt) * 1.9);
  // Baseline offset inside each line slot
  const BL = (pt: number) => Math.round(PX(pt) * 1.1);

  const T = (s: string, pt: number, fw?: number, align?: 'c' | 'r') =>
    ops.push({ t: 'txt', s, pt, fw, align });
  const C = (l: string, r: string, pt: number, fw?: number) =>
    ops.push({ t: 'col', l, r, pt, fw });
  const HR = (dash = false) => ops.push({ t: 'hr', dash });
  const G  = (h: number)    => ops.push({ t: 'gap', h: h * SCALE });

  // ── Layout ────────────────────────────────────────────────────────────────

  // Header
  G(4);
  T(biz.name,        SZ.shop, 900, 'c');
  if (biz.tagline) T(biz.tagline, SZ.body, 700, 'c');
  if (biz.phone)   T(biz.phone,  SZ.body, 700, 'c');
  G(3); HR(); G(2);
  T(`--- ${docLabel} ---`,                        SZ.doc,  900, 'c');
  G(2); HR(); G(3);

  // Order ref
  C('เลขที่', order.orderNumber,                  SZ.body);
  C('วันที่', `${dateStr} เวลา ${timeStr} น.`,   SZ.body);
  G(3); HR(true); G(3);

  // Vehicle / customer
  const v    = order.vehicle;
  const cust = v?.customer;
  if (v?.licensePlate)
    wrap(v.licensePlate, SZ.plate, 900).forEach(l => T(l, SZ.plate, 900));
  if (v?.brand || v?.model)
    T([v?.brand, v?.model].filter(Boolean).join(' '), SZ.body, 700);
  if (cust?.name)
    T(`ลูกค้า: ${cust.name}`,  SZ.body, 700);
  if (cust?.phone)
    T(`โทร: ${cust.phone}`,    SZ.body, 700);
  G(3); HR(true); G(3);

  // Items
  T('รายการสินค้า / บริการ', SZ.body, 800);
  G(2);
  items.forEach((item, i) => {
    const name  = item.customLabel ?? item.product?.name ?? '';
    const qty   = Number(item.quantity);
    const price = Number(item.unitPrice);
    const sub   = Number(item.subtotalPrice);
    const label = `${i + 1}. ${name}${item.technicianName ? ` (${item.technicianName})` : ''}`;
    wrap(label, SZ.body, 800).forEach(l => T(l, SZ.body, 800));
    C(`  ${qty % 1 === 0 ? qty : qty.toFixed(2)} x ฿${thb2(price)}`,
      `฿${thb2(sub)}`, SZ.body, 700);
    G(2);
  });
  HR(); G(3);

  // Totals
  if (hasDiscount) {
    C('ราคารวม', `฿${thb2(subtotal)}`, SZ.body);
    C('ส่วนลด',  `-฿${thb2(discount)}`, SZ.body);
    G(2); HR(true); G(2);
  }
  T('ยอดชำระ', SZ.body, 900);
  T(`฿${thb2(total)}`, SZ.total, 900, 'r');
  G(4); HR(); G(5);

  // Footer
  if (isReceipt) {
    T(`*** ${biz.receiptFooter || 'ขอบคุณที่ใช้บริการ'} ***`, SZ.body, 900, 'c');
    T('กรุณาเก็บใบเสร็จนี้ไว้เป็นหลักฐาน',                    SZ.body, 700, 'c');
    T('นำใบเสร็จมาแสดงเมื่อรับประกัน',                         SZ.body, 700, 'c');
  } else {
    T('ใบเสนอราคามีอายุ 30 วัน',            SZ.body, 900, 'c');
    T('กรุณาตรวจสอบรายการก่อนยืนยัน',       SZ.body, 700, 'c');
    if (biz.phone) T(`โทร ${biz.phone}`,    SZ.body, 700, 'c');
  }
  G(0);

  // ── Compute canvas height ─────────────────────────────────────────────────
  let totalH = 0;
  for (const op of ops) {
    if (op.t === 'gap') totalH += op.h;
    else if (op.t === 'hr')  totalH += 8 * SCALE;
    else if (op.t === 'txt') totalH += LH(op.pt);
    else if (op.t === 'col') totalH += LH(op.pt);
  }

  // ── Draw ──────────────────────────────────────────────────────────────────
  const canvas = document.createElement('canvas');
  canvas.width  = W;
  canvas.height = totalH;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, 0, W, totalH);
  ctx.fillStyle = '#000';
  ctx.textBaseline = 'alphabetic';

  let y = 0;
  for (const op of ops) {
    if (op.t === 'gap') {
      y += op.h;

    } else if (op.t === 'hr') {
      const mid = y + 4 * SCALE;
      if (op.dash) {
        ctx.save();
        ctx.setLineDash([6 * SCALE, 5 * SCALE]);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1.5 * SCALE;
        ctx.beginPath(); ctx.moveTo(PAD, mid); ctx.lineTo(W - PAD, mid); ctx.stroke();
        ctx.restore();
      } else {
        ctx.fillRect(PAD, mid, TW, 2 * SCALE);
      }
      y += 8 * SCALE;

    } else if (op.t === 'txt') {
      ctx.font = mkFont(op.pt, op.fw ?? 900);
      const lineH = LH(op.pt);
      const base  = y + BL(op.pt);
      const tw    = ctx.measureText(op.s).width;
      let x = PAD;
      if (op.align === 'c') x = PAD + (TW - tw) / 2;
      else if (op.align === 'r') x = W - PAD - tw;
      ctx.fillText(op.s, x, base);
      ctx.fillText(op.s, x + 0.5, base);
      y += lineH;

    } else if (op.t === 'col') {
      ctx.font = mkFont(op.pt, op.fw ?? 900);
      const lineH = LH(op.pt);
      const base  = y + BL(op.pt);
      const rw    = ctx.measureText(op.r).width;
      const maxL  = TW - rw - 12;
      let left = op.l;
      while (left.length > 1 && ctx.measureText(left).width > maxL)
        left = left.slice(0, -1);
      ctx.fillText(left, PAD, base);
      ctx.fillText(left, PAD + 0.5, base);
      ctx.fillText(op.r, W - PAD - rw, base);
      ctx.fillText(op.r, W - PAD - rw + 0.5, base);
      y += lineH;
    }
  }

  // ── Threshold at 160 — captures anti-aliased edges as solid black ────────
  const imgData = ctx.getImageData(0, 0, W, totalH);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    const luma = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    const v = luma < 160 ? 0 : 255;
    d[i] = d[i + 1] = d[i + 2] = v;
    d[i + 3] = 255;
  }
  ctx.putImageData(imgData, 0, 0);

  // ── Print as base64 image via iframe ──────────────────────────────────────
  const dataUrl = canvas.toDataURL('image/png');
  const html = `<!DOCTYPE html><html><head><style>
    @page{size:${paperW}mm auto;margin:0 0 -25mm 0}
    html,body{margin:0;padding:0;height:fit-content}
    img{width:${contentMM}mm;display:block;margin:0;padding:0}
  </style></head><body><img src="${dataUrl}"></body></html>`;


  const iframe = document.createElement('iframe');
  iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;border:0;opacity:0;';
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument ?? (iframe.contentWindow as Window).document;
  doc.open();
  doc.write(html);
  doc.close();

  setTimeout(() => {
    (iframe.contentWindow as Window).focus();
    (iframe.contentWindow as Window).print();
    setTimeout(() => document.body.removeChild(iframe), 2000);
  }, 500);
}

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
          {/* 58mm browser print — receipts only */}
          {docType === 'receipt' && (
            <Button
              variant="outline"
              onClick={() => print58mm(order, docType, {
                name: selectedBusiness?.name ?? 'ร้านของฉัน',
                tagline: selectedBusiness?.tagline ?? '',
                phone: selectedBusiness?.phone ?? '',
                printWidth: (selectedBusiness as Business | null)?.printWidth ?? 58,
                receiptFooter: (selectedBusiness as Business | null)?.receiptFooter ?? 'ขอบคุณที่ใช้บริการ',
              })}
              className="text-[#4A4845]"
            >
              <Printer className="mr-2 h-4 w-4" />
              พิมพ์ 58mm
            </Button>
          )}

          {/* BLE Bluetooth printer */}
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
                <Bluetooth className="mr-2 h-4 w-4" />
              )}
              BLE{btPrinter.deviceName ? ` (${btPrinter.deviceName})` : ''}
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
              BLE Printer
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
