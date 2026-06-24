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
  chartImages?: { title: string; dataUrl: string }[];
}

/** Capture a DOM element (by id) as a PNG data URL using html2canvas */
export async function captureChart(elementId: string, title: string): Promise<{ title: string; dataUrl: string } | null> {
  const el = document.getElementById(elementId);
  if (!el) return null;
  try {
    const html2canvas = (await import("html2canvas")).default;
    const canvas = await html2canvas(el, {
      backgroundColor: "#ffffff",
      scale: 1.8,
      logging: false,
      useCORS: true,
    });
    return { title, dataUrl: canvas.toDataURL("image/png") };
  } catch {
    return null;
  }
}

function drawHeader(doc: jsPDF, title: string, dateStr: string) {
  const pageW = doc.internal.pageSize.getWidth();
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageW, 22, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(255, 255, 255);
  doc.text("10MS Finance", 12, 10);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(148, 163, 184);
  doc.text("Budget Tracker", 12, 16);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(title, pageW - 12, 10, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(`Generated: ${dateStr}`, pageW - 12, 16, { align: "right" });
}

function drawFooter(doc: jsPDF, dateStr: string, pageNum: number, pageCount: number) {
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text(
    `10MS Finance Budget Tracker  ·  ${dateStr}  ·  Page ${pageNum} of ${pageCount}`,
    pageW / 2,
    pageH - 5,
    { align: "center" }
  );
}

export function exportPDF(opts: PDFExportOptions) {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  drawHeader(doc, opts.title, dateStr);

  let cursorY = 28;

  if (opts.subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(opts.subtitle, 12, cursorY);
    cursorY += 6;
  }

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

  if (opts.summary && opts.summary.length > 0) {
    const boxH = 14;
    doc.setFillColor(241, 245, 249);
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

  // ── Data Table ──────────────────────────────────────────────────────────────
  if (opts.rows.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text("Data Table", 12, cursorY);
    cursorY += 4;

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
      columnStyles: { 0: { halign: "left" } },
      didDrawPage: (data) => {
        const totalPages = (doc as any).internal.getNumberOfPages();
        drawFooter(doc, dateStr, data.pageNumber, totalPages);
      },
    });
  }

  // ── Charts ──────────────────────────────────────────────────────────────────
  const charts = (opts.chartImages ?? []).filter(Boolean);
  if (charts.length > 0) {
    const margin = 12;
    const usableW = pageW - margin * 2;
    const colW = (usableW - 6) / 2; // 2 charts per row, 6mm gap
    const chartH = colW * 0.52;     // ~16:9 ish aspect
    const rowH = chartH + 12;       // chart + label space

    // how many rows fit on a page after the header (22mm) + title line (8mm)
    const contentStart = 30;
    const contentH = pageH - contentStart - 10; // 10mm bottom margin
    const rowsPerPage = Math.floor(contentH / rowH);

    for (let i = 0; i < charts.length; i++) {
      const rowInPage = Math.floor(i / 2) % rowsPerPage;
      const colIdx = i % 2;

      if (i % (rowsPerPage * 2) === 0) {
        doc.addPage();
        drawHeader(doc, opts.title, dateStr);

        // Section header
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.setTextColor(30, 41, 59);
        doc.text("Charts & Visualizations", margin, contentStart - 2);
      }

      const x = margin + colIdx * (colW + 6);
      const y = contentStart + rowInPage * rowH;

      // Chart title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text(charts[i].title, x, y + 5);

      // Chart image
      try {
        doc.addImage(charts[i].dataUrl, "PNG", x, y + 7, colW, chartH);
      } catch {
        // silently skip if image fails
      }

      // Page footer
      const currentPage = (doc as any).internal.getCurrentPageInfo().pageNumber;
      const totalPages = (doc as any).internal.getNumberOfPages();
      drawFooter(doc, dateStr, currentPage, totalPages);
    }
  }

  // Update all footers with final page count
  const total = (doc as any).internal.getNumberOfPages();
  const pageH2 = doc.internal.pageSize.getHeight();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    doc.setFillColor(255, 255, 255);
    doc.rect(0, pageH2 - 10, pageW, 10, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `10MS Finance Budget Tracker  ·  ${dateStr}  ·  Page ${p} of ${total}`,
      pageW / 2, pageH2 - 5, { align: "center" }
    );
  }

  doc.save(opts.filename || "report.pdf");
}
