import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export interface PDFExportOptions {
  title: string;
  subtitle?: string;
  filters?: { label: string; value: string }[];
  summary?: { label: string; value: string }[];
  columns: string[];
  rows: (string | number)[][];
  filename?: string;
}

export function exportPDF(opts: PDFExportOptions) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  // Header bar
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageW, 22, "F");

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text("10MS Finance", 12, 10);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text("Budget Tracker", 12, 16);

  // Report title (right side)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(opts.title, pageW - 12, 10, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(`Generated: ${dateStr}`, pageW - 12, 16, { align: "right" });

  let cursorY = 28;

  // Subtitle
  if (opts.subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(opts.subtitle, 12, cursorY);
    cursorY += 6;
  }

  // Active filters row
  if (opts.filters && opts.filters.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("Filters: ", 12, cursorY);
    const filterText = opts.filters.map(f => `${f.label}: ${f.value}`).join("   |   ");
    doc.setFont("helvetica", "normal");
    doc.text(filterText, 28, cursorY);
    cursorY += 6;
  }

  // Summary metrics box
  if (opts.summary && opts.summary.length > 0) {
    const boxH = 14;
    doc.setFillColor(241, 245, 249); // slate-100
    doc.roundedRect(12, cursorY, pageW - 24, boxH, 2, 2, "F");
    const cellW = (pageW - 24) / opts.summary.length;
    opts.summary.forEach((s, i) => {
      const x = 12 + i * cellW + cellW / 2;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(s.label, x, cursorY + 4.5, { align: "center" });
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(15, 23, 42);
      doc.text(s.value, x, cursorY + 10, { align: "center" });
    });
    cursorY += boxH + 5;
  }

  // Table
  autoTable(doc, {
    startY: cursorY,
    head: [opts.columns],
    body: opts.rows.map(row => row.map(cell => (cell === null || cell === undefined ? "" : String(cell)))),
    styles: {
      fontSize: 7.5,
      cellPadding: 2.5,
      lineColor: [226, 232, 240],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [248, 250, 252],
      fontStyle: "bold",
      fontSize: 8,
      halign: "center",
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { halign: "left" },
    },
    didDrawPage: (data) => {
      // Footer on each page
      const pageCount = (doc as any).internal.getNumberOfPages();
      const pageNum = data.pageNumber;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `10MS Finance Budget Tracker  ·  ${dateStr}  ·  Page ${pageNum} of ${pageCount}`,
        pageW / 2,
        doc.internal.pageSize.getHeight() - 5,
        { align: "center" }
      );
    },
  });

  doc.save(opts.filename || "report.pdf");
}
