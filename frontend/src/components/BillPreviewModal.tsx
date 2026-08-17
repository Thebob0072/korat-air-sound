import { useState, useMemo } from 'react';
import { X, FileDown, Printer, Loader2, Bluetooth } from 'lucide-react';
import { PDFDocument } from '@/components/PDFDocument';
import { usePDFExport } from '@/hooks/usePDFExport';
import { Button } from '@/components/ui/button';
import { useBusiness } from '@/context/BusinessContext';
import type { Order } from '@/types';

// ── 58mm browser print ────────────────────────────────────────────────────────

function thb2(n: number) {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function print58mm(order: Order, docType: 'receipt' | 'quotation' | 'invoice', shopName = 'Korat Air & Sound') {
  const docLabel = { receipt: 'ใบเสร็จรับเงิน', quotation: 'ใบเสนอราคา', invoice: 'ใบวางบิล' }[docType];
  const isReceipt = docType === 'receipt';

  const orderDate = new Date(order.createdAt);
  const dateStr = orderDate.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: '2-digit' });
  const timeStr = orderDate.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });

  const items = order.orderItems ?? [];
  const subtotal = items.reduce((s, i) => s + Number(i.subtotalPrice), 0);
  const total = Number(order.totalAmount);
  const discount = subtotal - total;
  const hasDiscount = discount > 0.005;

  // ── Canvas-based raster rendering ────────────────────────────────────────────
  // Thermal printer = raster device. Rendering as pixels avoids all font/antialiasing issues.

  const DPI = 203;
  const PX_PER_MM = DPI / 25.4;
  const W = Math.round(54 * PX_PER_MM);   // 431px printable width
  const M = Math.round(1 * PX_PER_MM);    // 1mm side margin
  const TW = W - M * 2;                   // text area width
  const PT = DPI / 72;                    // 1pt → px

  const FONT_BODY = 10.5;
  const FONT_SM   = 10;
  const FONT_LG   = 15;
  const FONT_XL   = 20;

  const mkFont = (ptSize: number, weight = 900) =>
    `${weight} ${Math.round(ptSize * PT)}px Tahoma, "Arial Unicode MS", Arial, sans-serif`;

  // Measure text width
  const mc = document.createElement('canvas').getContext('2d')!;
  const tw = (text: string, ptSize: number, weight = 900) => {
    mc.font = mkFont(ptSize, weight);
    return mc.measureText(text).width;
  };

  // Wrap text to fit TW
  const wrap = (text: string, ptSize: number, weight = 900): string[] => {
    const lines: string[] = [];
    let cur = '';
    for (const ch of text) {
      if (tw(cur + ch, ptSize, weight) > TW) { lines.push(cur); cur = ch; }
      else cur += ch;
    }
    if (cur) lines.push(cur);
    return lines.length ? lines : [''];
  };

  type DrawOp =
    | { t: 'text'; s: string; pt: number; w?: number; align?: 'c'|'r' }
    | { t: 'cols'; l: string; r: string; pt: number; rw?: number }
    | { t: 'hr'; dash?: boolean }
    | { t: 'gap'; h: number };

  const ops: DrawOp[] = [];
  const lh = (pt: number) => Math.round(pt * PT * 1.5); // line height

  // Helper builders
  const text  = (s: string, pt = FONT_BODY, w?: number, align?: 'c'|'r') => ops.push({ t: 'text', s, pt, w, align });
  const cols  = (l: string, r: string, pt = FONT_BODY, rw?: number)       => ops.push({ t: 'cols', l, r, pt, rw });
  const hr    = (dash = false)                                              => ops.push({ t: 'hr', dash });
  const gap   = (h: number)                                                 => ops.push({ t: 'gap', h });

  // ── Build receipt ops ────────────────────────────────────────────────────────
  gap(6);
  text(shopName, FONT_LG, 900, 'c');
  text('ประดับยนต์ · ติดตั้งฟิล์ม · ซ่อมแอร์', FONT_SM, 700, 'c');
  text('064-496-5333', FONT_SM, 700, 'c');
  gap(4); hr(); gap(3);
  text(`--- ${docLabel} ---`, 12, 900, 'c');
  gap(3); hr(); gap(4);
  cols('เลขที่', order.orderNumber, FONT_SM);
  cols('วันที่', `${dateStr} เวลา ${timeStr} น.`, FONT_SM);
  gap(4); hr(true); gap(4);

  const v = order.vehicle;
  const cust = v?.customer;
  if (v?.licensePlate) text(v.licensePlate, FONT_LG + 1, 900);
  if (v?.brand || v?.model) text([v?.brand, v?.model].filter(Boolean).join(' '), FONT_SM);
  if (cust?.name)  text(`ลูกค้า: ${cust.name}`, FONT_SM);
  if (cust?.phone) text(`โทร: ${cust.phone}`, FONT_SM);
  gap(4); hr(true); gap(4);

  text('รายการสินค้า / บริการ', FONT_SM);
  gap(3);
  items.forEach((item, i) => {
    const name = item.customLabel ?? item.product?.name ?? '';
    const qty  = Number(item.quantity);
    const price = Number(item.unitPrice);
    const sub  = Number(item.subtotalPrice);
    const label = `${i + 1}. ${name}${item.technicianName ? ` (${item.technicianName})` : ''}`;
    wrap(label, FONT_BODY).forEach(l => text(l, FONT_BODY));
    cols(`  ${qty % 1 === 0 ? qty : qty.toFixed(2)} × ฿${thb2(price)}`, `฿${thb2(sub)}`, FONT_BODY);
    gap(3);
  });

  hr(); gap(4);
  if (hasDiscount) {
    cols('ราคารวม', `฿${thb2(subtotal)}`, FONT_BODY);
    cols('ส่วนลด', `-฿${thb2(discount)}`, FONT_BODY);
    gap(3); hr(true); gap(3);
  }
  cols('ยอดชำระ', `฿${thb2(total)}`, FONT_XL);
  gap(4); hr(); gap(6);

  if (isReceipt) {
    text('*** ขอบคุณที่ใช้บริการ ***', FONT_SM, 900, 'c');
    text('กรุณาเก็บใบเสร็จนี้ไว้เป็นหลักฐาน', FONT_SM, 700, 'c');
    text('นำใบเสร็จมาแสดงเมื่อรับประกัน', FONT_SM, 700, 'c');
  } else {
    text('ใบเสนอราคามีอายุ 30 วัน', FONT_SM, 900, 'c');
    text('กรุณาตรวจสอบรายการก่อนยืนยัน', FONT_SM, 700, 'c');
    text('โทร 064-496-5333', FONT_SM, 700, 'c');
  }
  gap(16);

  // ── Calculate total canvas height ─────────────────────────────────────────
  let totalH = 0;
  for (const op of ops) {
    if (op.t === 'gap')  totalH += op.h;
    else if (op.t === 'hr')   totalH += 6;
    else if (op.t === 'text') totalH += lh(op.pt);
    else if (op.t === 'cols') totalH += lh(op.pt);
  }

  // ── Draw onto canvas ──────────────────────────────────────────────────────
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
      y += 2;
      if (op.dash) {
        ctx.save();
        ctx.setLineDash([5, 4]);
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(M, y); ctx.lineTo(W - M, y); ctx.stroke();
        ctx.restore();
      } else {
        ctx.fillRect(M, y, TW, 2);
      }
      y += 4;
    } else if (op.t === 'text') {
      ctx.font = mkFont(op.pt, op.w ?? 900);
      const lineH = lh(op.pt);
      const baseline = y + Math.round(op.pt * PT * 0.82);
      const textW = ctx.measureText(op.s).width;
      let x = M;
      if (op.align === 'c') x = M + (TW - textW) / 2;
      else if (op.align === 'r') x = W - M - textW;
      ctx.fillText(op.s, x, baseline);
      y += lineH;
    } else if (op.t === 'cols') {
      ctx.font = mkFont(op.pt, op.rw ?? 900);
      const lineH = lh(op.pt);
      const baseline = y + Math.round(op.pt * PT * 0.82);
      ctx.fillText(op.l, M, baseline);
      const rw = ctx.measureText(op.r).width;
      ctx.fillText(op.r, W - M - rw, baseline);
      y += lineH;
    }
  }

  // ── Threshold: convert every pixel to pure black or pure white ───────────
  // Thermal paper only has on/off dots — gray pixels print as faint noise.
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
    @page{size:58mm auto;margin:2mm 2mm 4mm}
    *{margin:0;padding:0}
    img{width:54mm;display:block;image-rendering:pixelated}
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
              onClick={() => print58mm(order, docType, selectedBusiness?.name)}
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
