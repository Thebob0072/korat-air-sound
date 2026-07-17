/**
 * PrinterController — ESC/POS USB thermal printer integration.
 *
 * Requires:
 *   npm install escpos escpos-usb
 *
 * OS notes:
 *   macOS  : No extra drivers required for most USB thermal printers.
 *   Linux  : Add user to `plugdev` group; create udev rule for the printer VID/PID.
 *   Windows: Install Zadig (https://zadig.akeo.ie) to replace the driver with WinUSB/libusbK.
 */

// ── Type stubs for escpos (ships own types in v3) and escpos-usb (no @types) ─

/* eslint-disable @typescript-eslint/no-require-imports */
/* eslint-disable @typescript-eslint/no-explicit-any */

interface EscposDevice {
  open(callback: (err: Error | null) => void): void;
}

interface EscposPrinter {
  font(type: string): this;
  align(type: string): this;
  style(type: string): this;
  size(width: number, height: number): this;
  text(content: string): this;
  drawLine(): this;
  barcode(data: string, type: string): this;
  cut(): this;
  close(callback?: () => void): void;
}

// ── Payload type ──────────────────────────────────────────────────────────────

export interface PrintReceiptPayload {
  order_number: string;
  customer_name: string;
  license_plate: string;
  items: Array<{ name: string; qty: number; price: number }>;
  total: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const RECEIPT_WIDTH = 42; // characters per line for 80mm paper

function justifyLine(left: string, right: string): string {
  const totalLen = left.length + right.length;
  if (totalLen >= RECEIPT_WIDTH) return `${left.substring(0, RECEIPT_WIDTH - right.length - 1)} ${right}`;
  return left + ' '.repeat(RECEIPT_WIDTH - totalLen) + right;
}

function formatThaiCurrency(amount: number): string {
  return `${amount.toLocaleString('th-TH')} \u0e3f`;
}

// ── Print function ────────────────────────────────────────────────────────────

export async function printReceipt(payload: PrintReceiptPayload): Promise<void> {
  let escpos: any;
  let USB: any;

  try {
    escpos = require('escpos');
    USB = require('escpos-usb');
    escpos.USB = USB;
  } catch {
    throw new Error('PRINTER_DRIVER_NOT_INSTALLED');
  }

  let device: EscposDevice;
  try {
    device = new USB() as EscposDevice;
  } catch {
    throw new Error('PRINTER_NOT_FOUND');
  }

  return new Promise<void>((resolve, reject) => {
    device.open((openErr) => {
      if (openErr) {
        const msg = openErr.message ?? '';
        if (msg.includes('LIBUSB_ERROR_IO') || msg.toLowerCase().includes('paper')) {
          reject(new Error('PAPER_OUT'));
        } else if (msg.includes('LIBUSB_ERROR_NO_DEVICE') || msg.includes('not found')) {
          reject(new Error('PRINTER_NOT_FOUND'));
        } else {
          reject(openErr);
        }
        return;
      }

      const printer: EscposPrinter = new escpos.Printer(device, { encoding: 'UTF-8' });

      try {
        // ── Shop header ──────────────────────────────────────────────────
        printer
          .font('A')
          .align('CT')
          .style('B')
          .size(2, 2)
          .text('Korat Air & Sound')
          .style('NORMAL')
          .size(1, 1)
          .text('\u0e23\u0e49\u0e32\u0e19\u0e1b\u0e23\u0e30\u0e14\u0e31\u0e1a\u0e22\u0e19\u0e15\u0e4c\u0e41\u0e25\u0e30\u0e0b\u0e48\u0e2d\u0e21\u0e41\u0e2d\u0e23\u0e4c') // ร้านประดับยนต์และซ่อมแอร์
          .drawLine();

        // ── Order info + license plate ───────────────────────────────────
        printer
          .align('LT')
          .style('B')
          .text(`\u0e40\u0e25\u0e02\u0e17\u0e35\u0e48: ${payload.order_number}`) // เลขที่:
          .align('CT')
          .size(2, 1)
          .style('B')
          .text(payload.license_plate)
          .size(1, 1)
          .style('NORMAL')
          .text(payload.customer_name)
          .drawLine();

        // ── Line items ───────────────────────────────────────────────────
        printer.align('LT');
        for (const item of payload.items) {
          const nameCol = item.name.substring(0, 28);
          const rightCol = `x${item.qty}  ${formatThaiCurrency(item.price)}`;
          printer.text(justifyLine(nameCol, rightCol));
        }

        // ── Total ────────────────────────────────────────────────────────
        printer
          .drawLine()
          .align('RT')
          .style('B')
          .text(
            `\u0e22\u0e2d\u0e14\u0e23\u0e27\u0e21: ${formatThaiCurrency(payload.total)}`, // ยอดรวม:
          )
          .style('NORMAL')
          .drawLine();

        // ── Barcode (order number) ───────────────────────────────────────
        printer
          .align('CT')
          .barcode(payload.order_number, 'CODE128')
          .cut()
          .close(() => resolve());
      } catch (printErr) {
        reject(printErr);
      }
    });
  });
}
