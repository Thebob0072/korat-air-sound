import { forwardRef } from 'react';
import type { Order } from '@/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

const thb = (n: number | string) =>
  Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ── Thai baht in words ────────────────────────────────────────────────────────
const ONES = ['', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
const POS  = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน'];

function readGroup(n: number): string {
  if (n === 0) return '';
  const s = n.toString();
  const len = s.length;
  let out = '';
  for (let i = 0; i < len; i++) {
    const d = parseInt(s[i]);
    const pos = len - 1 - i;
    if (d === 0) continue;
    if (pos === 1) {
      out += d === 1 ? 'สิบ' : d === 2 ? 'ยี่สิบ' : ONES[d] + 'สิบ';
    } else if (pos === 0 && len > 1 && d === 1) {
      out += 'เอ็ด';
    } else {
      out += ONES[d] + POS[pos];
    }
  }
  return out;
}

function bahtText(amount: number): string {
  if (amount === 0) return 'ศูนย์บาทถ้วน';
  const [intStr, decStr] = amount.toFixed(2).split('.');
  const baht = parseInt(intStr);
  const satang = parseInt(decStr);
  const millions = Math.floor(baht / 1_000_000);
  const rest = baht % 1_000_000;
  let out = '';
  if (millions > 0) out += readGroup(millions) + 'ล้าน';
  if (rest > 0) out += readGroup(rest);
  out += 'บาท';
  if (satang > 0) out += readGroup(satang) + 'สตางค์';
  else out += 'ถ้วน';
  return out;
}

const shortDate = (iso: string) =>
  new Intl.DateTimeFormat('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })
    .format(new Date(iso));

const dueDate = (iso: string) => {
  const d = new Date(iso);
  d.setDate(d.getDate() + 30);
  return shortDate(d.toISOString());
};

// ── Component ─────────────────────────────────────────────────────────────────

export interface BillingInfo {
  orgName: string;
  address: string;
  phone: string;
}

export interface PDFDocumentProps {
  order: Order;
  docType: 'receipt' | 'quotation' | 'invoice';
  billingInfo?: BillingInfo;
}

export const PDFDocument = forwardRef<HTMLDivElement, PDFDocumentProps>(
  ({ order, docType, billingInfo }, ref) => {
    const isReceipt = docType === 'receipt';
    const isInvoice = docType === 'invoice';

    const items = order.orderItems ?? [];
    const subtotal = items.reduce((s, i) => s + Number(i.subtotalPrice), 0);
    const total = Number(order.totalAmount);
    const discount = subtotal - total;
    const hasDiscount = discount > 0.005;

    const customer = order.vehicle?.customer;
    const vehicle = order.vehicle;
    const vehicleStr = [vehicle?.brand, vehicle?.model].filter(Boolean).join(' ');

    const displayName = billingInfo?.orgName || customer?.name || '—';
    const displayPhone = billingInfo?.phone || customer?.phone || '—';

    const LINE = '1px solid #e8e8e8';
    const LINE_DARK = '1.5px solid #d0d0d0';
    const FONT = '"Noto Sans Thai", "Sarabun", "Tahoma", sans-serif';
    const TEXT = '#1a1a1a';
    const MUTED = '#6b7280';
    const LABEL_COLOR = '#9ca3af';

    const docLabel = isReceipt
      ? 'ใบเสร็จรับเงิน / Receipt'
      : isInvoice
        ? 'ใบวางบิล / Invoice'
        : 'ใบเสนอราคา / Quotation';

    const docTitle = isReceipt ? 'ใบเสร็จ' : isInvoice ? 'ใบวางบิล' : 'ใบเสนอราคา';

    const H_PAD = '64px';
    const V_TOP = '48px';
    const V_BOTTOM = '32px';

    return (
      <div
        ref={ref}
        style={{
          width: '794px',
          minHeight: '1122px',
          backgroundColor: '#ffffff',
          fontFamily: FONT,
          color: TEXT,
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
        }}
      >

        {/* ══ CONTENT AREA (grows, items inside) ══════════════════════════════ */}
        <div style={{ flex: 'none', padding: `${V_TOP} ${H_PAD} 0` }}>

          {/* ── Header ────────────────────────────────────────────────────── */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>

            {/* Left: company */}
            <div>
              <div style={{ fontSize: '17px', fontWeight: '900', color: TEXT, letterSpacing: '-0.02em', lineHeight: '1' }}>
                Korat Air &amp; Sound
              </div>
              <div style={{ fontSize: '10.5px', color: MUTED, marginTop: '5px', lineHeight: '1.8' }}>
                ร้านประดับยนต์ ติดตั้งฟิล์ม ซ่อมแอร์ กระจกรถยนต์<br />
                711-715 ถ.ท้าวสุระ อ.เมือง ต.ในเมือง จ.นครราชสีมา 30000 · 093-321-8634
              </div>
            </div>

            {/* Right: doc type */}
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '9px', color: LABEL_COLOR, fontWeight: '600', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: '4px' }}>
                {docLabel}
              </div>
              <div style={{ fontSize: '20px', fontWeight: '800', color: TEXT, lineHeight: '1', letterSpacing: '-0.02em' }}>
                {docTitle}
              </div>
              <div style={{ fontSize: '11px', color: MUTED, fontFamily: 'monospace', marginTop: '5px', letterSpacing: '0.02em' }}>
                {order.orderNumber}
              </div>
            </div>
          </div>

          {/* ── Divider ───────────────────────────────────────────────────── */}
          <div style={{ borderTop: LINE_DARK, marginBottom: '14px' }} />

          {/* ── Info section ──────────────────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 48px', marginBottom: '14px' }}>
            {/* Left col */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
              <InfoCell label="วันที่" value={shortDate(order.createdAt)} />
              {isReceipt && <InfoCell label="สถานะ" value="ชำระแล้ว ✓" valueStyle={{ color: '#059669' }} />}
              {!isReceipt && isInvoice && <InfoCell label="กำหนดชำระ" value={dueDate(order.createdAt)} valueStyle={{ color: '#d97706' }} />}
              {!isReceipt && !isInvoice && <InfoCell label="ใช้ได้ถึง" value={dueDate(order.createdAt)} valueStyle={{ color: '#d97706' }} />}
              <InfoCell label={billingInfo ? 'บริษัท / องค์กร' : 'ชื่อลูกค้า'} value={displayName} />
              <InfoCell label="โทรศัพท์" value={displayPhone} mono />
              {billingInfo?.address && (
                <div style={{ gridColumn: '1 / -1' }}>
                  <InfoCell label="ที่อยู่" value={billingInfo.address} />
                </div>
              )}
            </div>
            {/* Right col: plate + car */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
              <InfoCell
                label="ทะเบียนรถ"
                value={vehicle?.licensePlate ?? '—'}
                valueStyle={{ fontFamily: 'monospace', letterSpacing: '0', fontSize: '13px', fontWeight: '700' }}
              />
              <InfoCell label="รุ่นรถ" value={vehicleStr || '—'} />
            </div>
          </div>

          {/* ── Divider ───────────────────────────────────────────────────── */}
          <div style={{ borderTop: LINE_DARK }} />

          {/* ── Items table ───────────────────────────────────────────────── */}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
            <thead>
              <tr>
                <th style={{ padding: '9px 0', textAlign: 'left', fontSize: '8.5px', fontWeight: '700', color: LABEL_COLOR, letterSpacing: '0.08em', textTransform: 'uppercase', width: '24px', borderBottom: LINE }}>
                  #
                </th>
                <th style={{ padding: '9px 10px', textAlign: 'left', fontSize: '8.5px', fontWeight: '700', color: LABEL_COLOR, letterSpacing: '0.08em', textTransform: 'uppercase', borderBottom: LINE }}>
                  รายการ
                </th>
                <th style={{ padding: '9px 10px', textAlign: 'center', fontSize: '8.5px', fontWeight: '700', color: LABEL_COLOR, letterSpacing: '0.08em', textTransform: 'uppercase', width: '52px', borderBottom: LINE }}>
                  จำนวน
                </th>
                <th style={{ padding: '9px 10px', textAlign: 'right', fontSize: '8.5px', fontWeight: '700', color: LABEL_COLOR, letterSpacing: '0.08em', textTransform: 'uppercase', width: '96px', borderBottom: LINE }}>
                  ราคา/หน่วย
                </th>
                <th style={{ padding: '9px 0', textAlign: 'right', fontSize: '8.5px', fontWeight: '700', color: LABEL_COLOR, letterSpacing: '0.08em', textTransform: 'uppercase', width: '96px', borderBottom: LINE }}>
                  รวม
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={item.id}>
                  <td style={{ padding: '10px 0', color: LABEL_COLOR, fontSize: '10px', verticalAlign: 'top', borderBottom: LINE }}>
                    {idx + 1}
                  </td>
                  <td style={{ padding: '10px', verticalAlign: 'top', borderBottom: LINE }}>
                    <div style={{ fontWeight: '600', color: TEXT, lineHeight: '1.4', fontSize: '11px' }}>
                      {item.customLabel ?? item.product?.name ?? '—'}
                    </div>
                    {item.product?.sku && (
                      <div style={{ fontSize: '9.5px', color: MUTED, marginTop: '2px', fontFamily: 'monospace' }}>
                        {item.product.sku}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '10px', textAlign: 'center', verticalAlign: 'top', color: MUTED, borderBottom: LINE, fontSize: '11px' }}>
                    {item.quantity}
                  </td>
                  <td style={{ padding: '10px', textAlign: 'right', fontFamily: 'monospace', color: MUTED, verticalAlign: 'top', borderBottom: LINE, fontSize: '11px' }}>
                    {thb(item.unitPrice)}
                  </td>
                  <td style={{ padding: '10px 0', textAlign: 'right', fontFamily: 'monospace', fontWeight: '700', color: TEXT, verticalAlign: 'top', borderBottom: LINE, fontSize: '11px' }}>
                    {thb(item.subtotalPrice)}
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: '28px 0', textAlign: 'center', color: LABEL_COLOR, borderBottom: LINE }}>
                    ไม่มีรายการ
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* ── Summary (inline with items, no gap) ───────────────────────── */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '12px' }}>
            <div style={{ width: '220px' }}>
              {hasDiscount && (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                    <span style={{ fontSize: '11px', color: MUTED }}>ราคารวม</span>
                    <span style={{ fontSize: '11px', color: MUTED, fontFamily: 'monospace' }}>{thb(subtotal)} ฿</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '7px' }}>
                    <span style={{ fontSize: '11px', color: MUTED }}>ส่วนลด</span>
                    <span style={{ fontSize: '11px', color: '#dc2626', fontFamily: 'monospace' }}>−{thb(discount)} ฿</span>
                  </div>
                </>
              )}
              <div style={{ borderTop: LINE_DARK, paddingTop: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '8px' }}>
                  <span style={{ fontSize: '11px', fontWeight: '600', color: MUTED, flexShrink: 0 }}>ยอดสุทธิ</span>
                  <span style={{ fontSize: '10.5px', color: MUTED, flex: 1, textAlign: 'center' }}>{bahtText(total)}</span>
                  <span style={{ fontSize: '14px', fontWeight: '800', color: TEXT, fontFamily: 'monospace', letterSpacing: '-0.01em', flexShrink: 0 }}>
                    {thb(total)} ฿
                  </span>
                </div>
              </div>
            </div>
          </div>

        </div>

        {/* ══ FLEX SPACER — pushes signatures + footer to bottom ══════════════ */}
        <div style={{ flex: '1 0 0' }} />

        {/* ══ BOTTOM SECTION: signatures + footer only ════════════════════════ */}
        <div style={{ flex: 'none', padding: `0 ${H_PAD} ${V_BOTTOM}` }}>


          {/* ── Signatures ────────────────────────────────────────────────── */}
          <div style={{ marginTop: '0', display: 'grid', gridTemplateColumns: '1fr 48px 1fr' }}>
            <SigBox
              name="จิรัฏฐ์ สธนเสาวภาคย์"
              role={isReceipt ? 'ผู้รับเงิน / Authorized' : isInvoice ? 'ผู้เสนอบิล / Proposer' : 'ผู้เสนอราคา / Proposer'}
            />
            <div />
            <SigBox
              name=""
              role={isReceipt ? 'ผู้ชำระเงิน / Customer' : isInvoice ? 'ผู้รับบิล / Customer' : 'ผู้รับใบเสนอราคา / Customer'}
              showDate
            />
          </div>

          {/* ── Footer ────────────────────────────────────────────────────── */}
          <div style={{ marginTop: '24px', borderTop: LINE, paddingTop: '10px', textAlign: 'center' }}>
            <div style={{ fontSize: '9.5px', color: LABEL_COLOR }}>
              {isReceipt
                ? 'ขอบคุณที่ใช้บริการ • Thank you for your business • Korat Air & Sound'
                : isInvoice
                  ? `กรุณาชำระภายในวันที่ ${dueDate(order.createdAt)} • Korat Air & Sound`
                  : `ใบเสนอราคามีอายุ 30 วัน นับจากวันที่ ${shortDate(order.createdAt)} • Korat Air & Sound`}
            </div>
          </div>

        </div>

      </div>
    );
  },
);

PDFDocument.displayName = 'PDFDocument';

// ── Sub-components ─────────────────────────────────────────────────────────────

function InfoCell({
  label,
  value,
  mono,
  valueStyle,
}: {
  label: string;
  value: string;
  mono?: boolean;
  valueStyle?: React.CSSProperties;
}) {
  return (
    <div>
      <div style={{ fontSize: '8px', fontWeight: '700', color: '#9ca3af', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '2px' }}>
        {label}
      </div>
      <div style={{ fontSize: '11px', fontWeight: '600', color: '#1a1a1a', fontFamily: mono ? 'monospace' : undefined, lineHeight: '1.4', ...valueStyle }}>
        {value}
      </div>
    </div>
  );
}

function SigBox({ name, role, showDate }: { name: string; role: string; showDate?: boolean }) {
  return (
    <div style={{ textAlign: 'center' }}>
      {/* blank space for handwriting */}
      <div style={{ height: '40px' }} />
      {/* signature line */}
      <div style={{ borderTop: '1px solid #c0beba' }} />
      {/* printed name + role + date below line */}
      <div style={{ paddingTop: '5px' }}>
        {name && (
          <div style={{ fontSize: '11px', fontWeight: '700', color: '#1a1a1a', marginBottom: '2px' }}>{name}</div>
        )}
        <div style={{ fontSize: '10px', color: '#6b7280' }}>{role}</div>
        {showDate && (
          <div style={{ fontSize: '9.5px', color: '#c0beba', marginTop: '3px' }}>
            วันที่ ......................................
          </div>
        )}
      </div>
    </div>
  );
}
