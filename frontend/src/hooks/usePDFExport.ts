import { useRef, useState, useCallback } from 'react';

export function usePDFExport() {
  const docRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const exportPDF = useCallback(async (filename: string) => {
    const element = docRef.current;
    if (!element) return;

    setIsExporting(true);
    try {
      // Wait for web fonts (Thai) to be fully loaded
      await document.fonts.ready;

      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: false,
        // Ensure the element is visible for capture even if off-screen
        windowWidth: element.scrollWidth,
        windowHeight: element.scrollHeight,
      });

      const imgData = canvas.toDataURL('image/jpeg', 0.97);
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      const pdfW = pdf.internal.pageSize.getWidth();   // 210
      const pdfH = pdf.internal.pageSize.getHeight();  // 297
      const imgH = (canvas.height * pdfW) / canvas.width;

      // Single page (normal case)
      if (imgH <= pdfH) {
        pdf.addImage(imgData, 'JPEG', 0, 0, pdfW, imgH);
      } else {
        // Multi-page: slide the image up per page
        let remaining = imgH;
        let yPos = 0;
        while (remaining > 0) {
          if (yPos !== 0) pdf.addPage();
          pdf.addImage(imgData, 'JPEG', 0, -yPos, pdfW, imgH);
          yPos += pdfH;
          remaining -= pdfH;
        }
      }

      pdf.save(filename);
    } finally {
      setIsExporting(false);
    }
  }, []);

  return { docRef, exportPDF, isExporting };
}
