import { forwardRef } from 'react';
import type { Order } from '@/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

const thb = (n: number | string) =>
  Number(n).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fullDate = (iso: string) =>
  new Intl.DateTimeFormat('th-TH', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }).format(new Date(iso));

const shortDate = (iso: string) =>
  new Intl.DateTimeFormat('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })
    .format(new Date(iso));

const validUntil = (iso: string) => {
  const d = new Date(iso);
  d.setDate(d.getDate() + 30);
  return shortDate(d.toISOString());
};

// ── Style tokens ──────────────────────────────────────────────────────────────

const S = {
  page: {
    width: '794px',
    minHeight: '1122px',
    backgroundColor: '#ffffff',
    fontFamily: '"Noto Sans Thai", "Sarabun", "Tahoma", sans-serif',
    color: '#1c1c1c',
    boxSizing: 'border-box' as const,
    padding: '0',
    position: 'relative' as const,
  },
  topBar: (isReceipt: boolean) => ({
    height: '6px',
    background: isReceipt
      ? 'linear-gradient(90deg, #065f46 0%, #10b981 100%)'
      : 'linear-gradient(90deg, #1e3a5f 0%, #3b82f6 100%)',
  }),
  body: {
    padding: '40px 56px 40px 56px',
  },
  // Header
  headerWrap: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
    marginBottom: '24px',
  },
  companyName: {
    fontSize: '20px', fontWeight: '900', letterSpacing: '-0.02em', color: '#1c1c1c', lineHeight: '1.1',
  },
  companySub: {
    fontSize: '11px', color: '#6b7280', marginTop: '3px', lineHeight: '1.6',
  },
  docTypePill: (isReceipt: boolean) => ({
    display: 'inline-block',
    backgroundColor: isReceipt ? '#d1fae5' : '#dbeafe',
    color: isReceipt ? '#065f46' : '#1e3a5f',
    borderRadius: '8px',
    padding: '4px 12px',
    fontSize: '11px',
    fontWeight: '700',
    letterSpacing: '0.04em',
    textTransform: 'uppercase' as const,
    marginBottom: '6px',
  }),
  docTitle: {
    fontSize: '28px', fontWeight: '900', color: '#1c1c1c', lineHeight: '1',
  },
  docNumber: {
    fontSize: '12px', color: '#6b7280', marginTop: '4px', fontFamily: 'monospace',
  },

  // Info section
  infoBox: {
    backgroundColor: '#f9f9f7',
    borderRadius: '12px',
    padding: '16px 20px',
    marginBottom: '24px',
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '10px 24px',
  },
  infoRow: {
    display: 'flex', alignItems: 'baseline', gap: '6px',
  },
  infoLabel: {
    fontSize: '10px', fontWeight: '700', color: '#9ca3af',
    textTransform: 'uppercase' as const, letterSpacing: '0.06em',
    minWidth: '52px', flexShrink: 0,
  },
  infoValue: {
    fontSize: '13px', color: '#1c1c1c', fontWeight: '600',
  },

  // Table
  table: {
    width: '100%', borderCollapse: 'collapse' as const, marginBottom: '0',
  },
  thead: {
    backgroundColor: '#1c1c1c',
  },
  th: {
    padding: '10px 12px', fontSize: '10px', fontWeight: '700',
    color: '#ffffff', letterSpacing: '0.07em', textTransform: 'uppercase' as const,
  },
  thRight: {
    padding: '10px 12px', fontSize: '10px', fontWeight: '700',
    color: '#ffffff', letterSpacing: '0.07em', textTransform: 'uppercase' as const,
    textAlign: 'right' as const,
  },
  thCenter: {
    padding: '10px 12px', fontSize: '10px', fontWeight: '700',
    color: '#ffffff', letterSpacing: '0.07em', textTransform: 'uppercase' as const,
    textAlign: 'center' as const,
  },
  td: {
    padding: '10px 12px', fontSize: '12px', color: '#1c1c1c',
    borderBottom: '1px solid #f0f0f0',
  },
  tdMono: {
    padding: '10px 12px', fontSize: '12px', color: '#1c1c1c',
    borderBottom: '1px solid #f0f0f0',
    textAlign: 'right' as const,
    fontFamily: 'monospace',
    whiteSpace: 'nowrap' as const,
  },
  tdCenter: {
    padding: '10px 12px', fontSize: '12px', color: '#1c1c1c',
    borderBottom: '1px solid #f0f0f0',
    textAlign: 'center' as const,
  },
  tdGray: {
    padding: '10px 12px', fontSize: '11px', color: '#6b7280',
    borderBottom: '1px solid #f0f0f0',
  },
  trEven: { backgroundColor: '#fafafa' },
  trOdd:  { backgroundColor: '#ffffff' },

  // Summary
  summaryWrap: {
    display: 'flex', justifyContent: 'flex-end',
    padding: '16px 0 0 0',
    borderTop: '2px solid #1c1c1c',
  },
  summaryBox: {
    minWidth: '260px',
  },
  summaryRow: {
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'baseline', marginBottom: '6px',
  },
  summaryLabel: {
    fontSize: '12px', color: '#6b7280',
  },
  summaryValue: {
    fontSize: '12px', color: '#1c1c1c', fontFamily: 'monospace',
  },
  discountValue: {
    fontSize: '12px', color: '#dc2626', fontFamily: 'monospace',
  },
  totalRow: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'baseline',
    borderTop: '1px solid #e5e7eb', paddingTop: '10px', marginTop: '4px',
  },
  totalLabel: {
    fontSize: '14px', fontWeight: '800', color: '#1c1c1c',
  },
  totalValue: {
    fontSize: '22px', fontWeight: '900', color: '#1c1c1c', fontFamily: 'monospace',
  },

  // Signatures
  sigSection: {
    display: 'flex', justifyContent: 'space-between',
    marginTop: '40px', paddingTop: '24px',
    borderTop: '1px solid #e5e7eb',
    gap: '40px',
  },
  sigBox: {
    flex: 1, textAlign: 'center' as const,
  },
  sigLine: {
    height: '1px', backgroundColor: '#1c1c1c', marginBottom: '8px', marginTop: '40px',
  },
  sigName: {
    fontSize: '11px', color: '#6b7280',
  },
  sigDate: {
    fontSize: '11px', color: '#9ca3af', marginTop: '4px',
  },

  // Footer
  footer: {
    position: 'absolute' as const, bottom: '24px', left: '56px', right: '56px',
    textAlign: 'center' as const, borderTop: '1px solid #e5e7eb', paddingTop: '12px',
  },
  footerText: {
    fontSize: '11px', color: '#9ca3af',
  },
};

// ── Component ─────────────────────────────────────────────────────────────────

export interface PDFDocumentProps {
  order: Order;
  docType: 'receipt' | 'quotation';
}

export const PDFDocument = forwardRef<HTMLDivElement, PDFDocumentProps>(
  ({ order, docType }, ref) => {
    const isReceipt = docType === 'receipt';
    const items = order.orderItems ?? [];
    const subtotal = items.reduce((s, i) => s + Number(i.subtotalPrice), 0);
    const total = Number(order.totalAmount);
    const discount = subtotal - total;
    const hasDiscount = discount > 0.005;

    return (
      <div ref={ref} style={S.page}>
        {/* Accent bar */}
        <div style={S.topBar(isReceipt)} />

        <div style={S.body}>
          {/* ── Header ────────────────────────────────────────────────────── */}
          <div style={S.headerWrap}>
            {/* Left: Company */}
            <div>
              <div style={S.companyName}>Korat Air &amp; Sound</div>
              <div style={S.companySub}>
                ร้านประดับยนต์และซ่อมแอร์<br />
                นครราชสีมา · โทร 044-XXX-XXXX
              </div>
            </div>

            {/* Right: Document type */}
            <div style={{ textAlign: 'right' }}>
              <div style={S.docTypePill(isReceipt)}>
                {isReceipt ? 'ใบเสร็จรับเงิน / Receipt' : 'ใบเสนอราคา / Quotation'}
              </div>
              <div style={S.docTitle}>
                {isReceipt ? 'ใบเสร็จ' : 'ใบเสนอราคา'}
              </div>
              <div style={S.docNumber}>{order.orderNumber}</div>
            </div>
          </div>

          {/* ── Info section ──────────────────────────────────────────────── */}
          <div style={S.infoBox}>
            <div style={S.infoRow}>
              <span style={S.infoLabel}>วันที่</span>
              <span style={S.infoValue}>{fullDate(order.createdAt)}</span>
            </div>
            {!isReceipt && (
              <div style={S.infoRow}>
                <span style={S.infoLabel}>ใช้ได้ถึง</span>
                <span style={{ ...S.infoValue, color: '#92400e' }}>{validUntil(order.createdAt)}</span>
              </div>
            )}
            {isReceipt && (
              <div style={S.infoRow}>
                <span style={S.infoLabel}>สถานะ</span>
                <span style={{ ...S.infoValue, color: '#065f46' }}>ชำระแล้ว ✓</span>
              </div>
            )}
            <div style={S.infoRow}>
              <span style={S.infoLabel}>ลูกค้า</span>
              <span style={S.infoValue}>{order.vehicle?.customer?.name ?? '—'}</span>
            </div>
            <div style={S.infoRow}>
              <span style={S.infoLabel}>โทร</span>
              <span style={{ ...S.infoValue, fontFamily: 'monospace' }}>
                {order.vehicle?.customer?.phone ?? '—'}
              </span>
            </div>
            <div style={S.infoRow}>
              <span style={S.infoLabel}>ทะเบียน</span>
              <span style={{ ...S.infoValue, fontSize: '15px', fontWeight: '900', letterSpacing: '0.05em' }}>
                {order.vehicle?.licensePlate ?? '—'}
              </span>
            </div>
            <div style={S.infoRow}>
              <span style={S.infoLabel}>รถ</span>
              <span style={S.infoValue}>
                {[order.vehicle?.brand, order.vehicle?.model].filter(Boolean).join(' ') || '—'}
              </span>
            </div>
          </div>

          {/* ── Items table ───────────────────────────────────────────────── */}
          <table style={S.table}>
            <thead style={S.thead}>
              <tr>
                <th style={{ ...S.th, width: '36px', textAlign: 'center' }}>#</th>
                <th style={{ ...S.th, textAlign: 'left' }}>รายการ</th>
                <th style={{ ...S.thCenter, width: '60px' }}>จำนวน</th>
                <th style={{ ...S.thRight, width: '110px' }}>ราคา/หน่วย</th>
                <th style={{ ...S.thRight, width: '110px' }}>รวม</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={item.id} style={idx % 2 === 0 ? S.trOdd : S.trEven}>
                  <td style={{ ...S.tdCenter, color: '#9ca3af', fontSize: '11px' }}>{idx + 1}</td>
                  <td style={S.td}>
                    <div style={{ fontWeight: '600', lineHeight: '1.3' }}>
                      {item.customLabel ?? item.product?.name ?? '—'}
                    </div>
                    {item.product?.sku && (
                      <div style={S.tdGray}>{item.product.sku}</div>
                    )}
                  </td>
                  <td style={S.tdCenter}>{item.quantity}</td>
                  <td style={S.tdMono}>{thb(item.unitPrice)}</td>
                  <td style={{ ...S.tdMono, fontWeight: '700' }}>{thb(item.subtotalPrice)}</td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ ...S.td, textAlign: 'center', color: '#9ca3af', padding: '24px' }}>
                    ไม่มีรายการ
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* ── Summary ───────────────────────────────────────────────────── */}
          <div style={S.summaryWrap}>
            <div style={S.summaryBox}>
              {hasDiscount && (
                <>
                  <div style={S.summaryRow}>
                    <span style={S.summaryLabel}>ราคารวม</span>
                    <span style={S.summaryValue}>{thb(subtotal)} ฿</span>
                  </div>
                  <div style={S.summaryRow}>
                    <span style={S.summaryLabel}>ส่วนลด</span>
                    <span style={S.discountValue}>−{thb(discount)} ฿</span>
                  </div>
                </>
              )}
              <div style={S.totalRow}>
                <span style={S.totalLabel}>ยอดสุทธิ</span>
                <span style={S.totalValue}>{thb(total)} ฿</span>
              </div>
            </div>
          </div>

          {/* ── Signatures ───────────────────────────────────────────────── */}
          <div style={S.sigSection}>
            <div style={S.sigBox}>
              <div style={S.sigLine} />
              <div style={S.sigName}>ผู้รับเงิน / Authorized by</div>
              <div style={S.sigDate}>Korat Air &amp; Sound</div>
            </div>
            <div style={{ width: '80px', flexShrink: 0 }} />
            <div style={S.sigBox}>
              <div style={S.sigLine} />
              <div style={S.sigName}>
                {isReceipt ? 'ผู้ชำระเงิน / Customer' : 'ยืนยันรับใบเสนอราคา / Customer'}
              </div>
              <div style={S.sigDate}>วันที่ ..........................................</div>
            </div>
          </div>
        </div>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <div style={S.footer}>
          <div style={S.footerText}>
            {isReceipt
              ? 'ขอบคุณที่ใช้บริการ • Thank you for your business • Korat Air & Sound'
              : `ใบเสนอราคามีอายุ 30 วัน นับจากวันที่ ${shortDate(order.createdAt)} • Korat Air & Sound`}
          </div>
        </div>
      </div>
    );
  },
);

PDFDocument.displayName = 'PDFDocument';
