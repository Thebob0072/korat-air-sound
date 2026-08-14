import { useRef, useState, useCallback } from 'react';
import type { Order } from '@/types';
import { formatCurrency } from '@/lib/utils';

// ── ESC/POS constants ────────────────────────────────────────────────────────

const ESC = 0x1b;
const GS = 0x1d;
const LF = 0x0a;

// ── TIS-620 encoder (Thai charset for 58mm thermal printers) ─────────────────

function encodeText(text: string): number[] {
  const bytes: number[] = [];
  for (const char of text) {
    const code = char.charCodeAt(0);
    if (code >= 0x0e00 && code <= 0x0e7f) {
      bytes.push(code - 0x0e00 + 0xa0);
    } else if (code < 0x80) {
      bytes.push(code);
    } else {
      bytes.push(0x3f); // '?' for unsupported chars
    }
  }
  return bytes;
}

// ── Layout helpers (32-char line for 58mm) ────────────────────────────────────

const LINE_WIDTH = 32;

function pad(text: string, width: number, align: 'left' | 'right' | 'center' = 'left'): string {
  const len = [...text].length; // Thai chars count as 1
  if (len >= width) return text.slice(0, width);
  const spaces = width - len;
  if (align === 'right') return ' '.repeat(spaces) + text;
  if (align === 'center') {
    const l = Math.floor(spaces / 2);
    const r = spaces - l;
    return ' '.repeat(l) + text + ' '.repeat(r);
  }
  return text + ' '.repeat(spaces);
}

function cols(left: string, right: string, width = LINE_WIDTH): string {
  const rightLen = [...right].length;
  const leftMax = width - rightLen - 1;
  const leftTrimmed = [...left].length > leftMax ? [...left].slice(0, leftMax - 1).join('') + '…' : left;
  return pad(leftTrimmed, leftMax) + ' ' + right;
}

function divider(char = '-', width = LINE_WIDTH): string {
  return char.repeat(width);
}

// ── ESC/POS builder ──────────────────────────────────────────────────────────

function buildReceiptBuffer(order: Order): Uint8Array {
  const chunks: number[] = [];

  const push = (...bytes: number[]) => chunks.push(...bytes);
  const text = (str: string) => chunks.push(...encodeText(str));
  const line = (str = '') => { text(str); push(LF); };

  // Init + TIS-620 codepage
  push(ESC, 0x40);           // init
  push(ESC, 0x74, 0x13);    // codepage TIS-620

  // ── Header ──
  push(ESC, 0x61, 0x01);    // center
  push(ESC, 0x45, 0x01);    // bold on
  push(ESC, 0x21, 0x10);    // double height
  line('Korat Air & Sound');
  push(ESC, 0x21, 0x00);    // normal size
  push(ESC, 0x45, 0x00);    // bold off
  line('ประดับยนต์ ติดตั้งฟิล์ม ซ่อมแอร์');
  line('064-496-5333');
  push(ESC, 0x61, 0x00);    // left

  // ── Doc type & number ──
  push(ESC, 0x61, 0x01);    // center
  line(divider('='));
  push(ESC, 0x45, 0x01);
  const isReceipt = order.status === 'Paid';
  line(isReceipt ? 'ใบเสร็จรับเงิน' : 'ใบเสนอราคา');
  push(ESC, 0x45, 0x00);
  push(ESC, 0x61, 0x00);
  line(divider('='));

  // ── Order info ──
  const now = new Date();
  const dateStr = now.toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = now.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
  line(cols('เลขที่:', order.orderNumber));
  line(cols('วันที่:', `${dateStr} ${timeStr}`));

  // ── Vehicle & customer ──
  line(divider());
  if (order.vehicle?.licensePlate) {
    push(ESC, 0x45, 0x01);
    line(cols('ทะเบียน:', order.vehicle.licensePlate));
    push(ESC, 0x45, 0x00);
  }
  if (order.vehicle?.brand || order.vehicle?.model) {
    line(cols('รถ:', `${order.vehicle.brand ?? ''} ${order.vehicle.model ?? ''}`.trim()));
  }
  if (order.vehicle?.customer?.name) {
    line(cols('ลูกค้า:', order.vehicle.customer.name));
  }
  if (order.vehicle?.customer?.phone) {
    line(cols('โทร:', order.vehicle.customer.phone));
  }

  // ── Items ──
  line(divider());
  (order.orderItems ?? []).forEach((item, idx) => {
    const name = item.customLabel ?? item.product?.name ?? '';
    const qty = Number(item.quantity);
    const price = Number(item.unitPrice);
    const sub = qty * price;
    const nameLine = [...name].length > LINE_WIDTH - 2 ? [...name].slice(0, LINE_WIDTH - 3).join('') + '…' : name;
    text(`${idx + 1}. `);
    line(nameLine);
    line(cols(`  x${qty} @ ${formatCurrency(price)}`, formatCurrency(sub)));
  });

  // ── Total ──
  line(divider('='));
  push(ESC, 0x45, 0x01);
  push(ESC, 0x21, 0x10); // double height
  line(cols('ยอดรวม', formatCurrency(Number(order.totalAmount))));
  push(ESC, 0x21, 0x00);
  push(ESC, 0x45, 0x00);

  // ── Footer ──
  line(divider('='));
  push(ESC, 0x61, 0x01); // center
  if (isReceipt) {
    line('ขอบคุณที่ใช้บริการ');
    line('ชำระเงินเรียบร้อยแล้ว');
  } else {
    line('ใบเสนอราคามีอายุ 30 วัน');
    line('กรุณาตรวจสอบรายการก่อนยืนยัน');
  }
  push(ESC, 0x61, 0x00);

  // Feed + cut
  push(ESC, 0x64, 0x05);    // feed 5 lines
  push(GS, 0x56, 0x42, 0x00); // full cut

  return new Uint8Array(chunks);
}

// ── Bluetooth service/characteristic pairs to try ────────────────────────────

const BLE_PROFILES = [
  {
    service: '000018f0-0000-1000-8000-00805f9b34fb',
    char: '00002af1-0000-1000-8000-00805f9b34fb',
  },
  {
    service: '49535343-fe7d-4ae5-8fa9-9fafd205e455',
    char: '49535343-8841-43f4-a8d4-ecbe34729bb3',
  },
  {
    service: '6e400001-b5a3-f393-e0a9-e50e24dcca9e',
    char: '6e400002-b5a3-f393-e0a9-e50e24dcca9e',
  },
  {
    service: 'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
    char: 'bef8d6c9-9c21-4c9e-b632-bd58c1009f9f',
  },
];

// ── Hook ─────────────────────────────────────────────────────────────────────

type PrinterStatus = 'idle' | 'connecting' | 'connected' | 'printing' | 'error';

export function useBluetoothPrinter() {
  const [status, setStatus] = useState<PrinterStatus>('idle');
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const charRef = useRef<BluetoothRemoteGATTCharacteristic | null>(null);
  const deviceRef = useRef<BluetoothDevice | null>(null);

  const isConnected = status === 'connected' || status === 'printing';

  const connect = useCallback(async () => {
    if (!navigator.bluetooth) {
      setError('เบราว์เซอร์นี้ไม่รองรับ Web Bluetooth (ใช้ Chrome/Edge)');
      setStatus('error');
      return;
    }
    try {
      setStatus('connecting');
      setError(null);

      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: BLE_PROFILES.map((p) => p.service),
      });

      device.addEventListener('gattserverdisconnected', () => {
        setStatus('idle');
        setDeviceName(null);
        charRef.current = null;
      });

      const server = await device.gatt!.connect();
      deviceRef.current = device;

      // Try each known profile until one works
      let found = false;
      for (const profile of BLE_PROFILES) {
        try {
          const svc = await server.getPrimaryService(profile.service);
          const ch = await svc.getCharacteristic(profile.char);
          charRef.current = ch;
          found = true;
          break;
        } catch {
          // try next
        }
      }

      if (!found) {
        throw new Error('ไม่พบ service ESC/POS บนเครื่องพิมพ์นี้');
      }

      setDeviceName(device.name ?? 'เครื่องพิมพ์');
      setStatus('connected');
    } catch (err) {
      const name = (err as Error).name;
      const msg = (err as Error).message ?? '';
      if (name === 'NotFoundError') {
        setStatus('idle');
      } else if (name === 'SecurityError' || msg.toLowerCase().includes('permission')) {
        setError('ต้อง pair เครื่องพิมพ์ก่อน: Settings → Bluetooth → เพิ่มอุปกรณ์');
        setStatus('error');
      } else if (msg.includes('GATT') || name === 'NetworkError') {
        setError('เชื่อมต่อไม่ได้ — pair เครื่องพิมพ์ที่ Settings → Bluetooth ก่อน หรือรีสตาร์ท Bluetooth');
        setStatus('error');
      } else {
        setError(msg || 'เชื่อมต่อไม่สำเร็จ');
        setStatus('error');
      }
    }
  }, []);

  const disconnect = useCallback(() => {
    deviceRef.current?.gatt?.disconnect();
    charRef.current = null;
    deviceRef.current = null;
    setStatus('idle');
    setDeviceName(null);
    setError(null);
  }, []);

  const print = useCallback(async (order: Order) => {
    if (!charRef.current) {
      setError('ยังไม่ได้เชื่อมต่อเครื่องพิมพ์');
      return;
    }
    try {
      setStatus('printing');
      const buffer = buildReceiptBuffer(order);

      // Send in 512-byte chunks (BLE MTU limit)
      const CHUNK = 512;
      for (let offset = 0; offset < buffer.length; offset += CHUNK) {
        const chunk = buffer.slice(offset, offset + CHUNK);
        if (!charRef.current) throw new Error('การเชื่อมต่อถูกตัดกลางคัน');
        try {
          await charRef.current.writeValueWithoutResponse(chunk);
        } catch {
          await charRef.current?.writeValue(chunk);
        }
        // Small delay between chunks
        if (offset + CHUNK < buffer.length) {
          await new Promise((r) => setTimeout(r, 50));
        }
      }

      setStatus('connected');
    } catch (err) {
      setError((err as Error).message ?? 'พิมพ์ไม่สำเร็จ');
      setStatus('error');
    }
  }, []);

  return { status, deviceName, error, isConnected, connect, disconnect, print };
}
