import type { jsPDF } from "jspdf";
import { PDF_FONT, embedUnicodeFont } from "./font";
import { columnWidths, type Frame } from "./layout";

export const INK = "#111827";
export const MUTED = "#6b7280";
export const RULE = "#d1d5db";
export const HEAD_FILL = "#0f172a";
export const ZEBRA_FILL = "#f1f5f9";

const MARGIN = 16;
const GAP = 4;
const LINE = 4.6;
const CELL_PADDING = 2;

export interface PdfDocumentOptions {
  title: string;
  subject?: string;
  author?: string;
}

export interface TableInput {
  head: string[];
  rows: string[][];
  weights: number[];
}

export class PdfDocument {
  private cursor = MARGIN;

  private constructor(readonly doc: jsPDF) {}

  static async create(options: PdfDocumentOptions): Promise<PdfDocument> {
    const { jsPDF: JsPdf } = await import("jspdf");

    const doc = new JsPdf({ unit: "mm", format: "a4", orientation: "portrait" });

    doc.setProperties({
      title: options.title,
      subject: options.subject ?? options.title,
      author: options.author ?? "SWTIS",
    });

    await embedUnicodeFont(doc);

    return new PdfDocument(doc);
  }

  get width(): number {
    return this.doc.internal.pageSize.getWidth();
  }

  get height(): number {
    return this.doc.internal.pageSize.getHeight();
  }

  get contentWidth(): number {
    return this.width - MARGIN * 2;
  }

  private get bottom(): number {
    return this.height - MARGIN;
  }

  space(mm: number): void {
    this.cursor += mm;
  }

  ensure(mm: number): void {
    if (this.cursor + mm <= this.bottom) return;

    this.doc.addPage();
    this.cursor = MARGIN;
  }

  title(text: string): void {
    this.ensure(14);
    this.doc.setFont(PDF_FONT, "normal").setFontSize(16).setTextColor(INK);
    this.doc.text(text, MARGIN, this.cursor + 6);
    this.cursor += 9;

    this.doc.setDrawColor(RULE).setLineWidth(0.4);
    this.doc.line(MARGIN, this.cursor, this.width - MARGIN, this.cursor);
    this.cursor += GAP;
  }

  heading(text: string): void {
    this.ensure(12);
    this.doc.setFontSize(11).setTextColor(INK);
    this.doc.text(text, MARGIN, this.cursor + 4);
    this.cursor += 7;
  }

  paragraph(text: string): void {
    this.doc.setFontSize(9).setTextColor(MUTED);

    for (const line of this.doc.splitTextToSize(text, this.contentWidth)) {
      this.ensure(LINE);
      this.doc.text(line, MARGIN, this.cursor + 3.2);
      this.cursor += LINE;
    }

    this.cursor += 1;
  }

  keyValues(rows: [string, string][]): void {
    const [labelWidth] = columnWidths([1, 2], this.contentWidth);

    for (const [label, value] of rows) {
      this.ensure(LINE);
      this.doc.setFontSize(9);

      this.doc.setTextColor(MUTED);
      this.doc.text(label, MARGIN, this.cursor + 3.2);

      this.doc.setTextColor(INK);
      this.doc.text(value, MARGIN + labelWidth, this.cursor + 3.2);

      this.cursor += LINE;
    }

    this.cursor += 1;
  }

  table({ head, rows, weights }: TableInput): void {
    const widths = columnWidths(weights, this.contentWidth);

    this.drawTableHead(head, widths);

    rows.forEach((row, index) => {
      const cells = row.map((cell, column) =>
        this.doc.splitTextToSize(cell, widths[column] - CELL_PADDING * 2),
      );

      const height = Math.max(...cells.map((lines) => lines.length)) * LINE;

      if (this.cursor + height > this.bottom) {
        this.doc.addPage();
        this.cursor = MARGIN;
        this.drawTableHead(head, widths);
      }

      if (index % 2 === 1) {
        this.doc.setFillColor(ZEBRA_FILL);
        this.doc.rect(MARGIN, this.cursor, this.contentWidth, height, "F");
      }

      this.doc.setFontSize(8.5).setTextColor(INK);

      let x = MARGIN;
      cells.forEach((lines, column) => {
        lines.forEach((line: string, offset: number) => {
          this.doc.text(line, x + CELL_PADDING, this.cursor + 3.2 + offset * LINE);
        });
        x += widths[column];
      });

      this.cursor += height;
    });

    this.doc.setDrawColor(RULE).setLineWidth(0.2);
    this.doc.line(MARGIN, this.cursor, this.width - MARGIN, this.cursor);
    this.cursor += GAP;
  }

  private drawTableHead(head: string[], widths: number[]): void {
    const height = LINE + 1;
    this.ensure(height * 2);

    this.doc.setFillColor(HEAD_FILL);
    this.doc.rect(MARGIN, this.cursor, this.contentWidth, height, "F");

    this.doc.setFontSize(8.5).setTextColor("#ffffff");

    let x = MARGIN;
    head.forEach((label, column) => {
      this.doc.text(label, x + CELL_PADDING, this.cursor + 3.6);
      x += widths[column];
    });

    this.cursor += height;
  }

  reserve(height: number): Frame {
    this.ensure(height);

    const frame: Frame = {
      x: MARGIN,
      y: this.cursor,
      width: this.contentWidth,
      height,
    };

    this.cursor += height + GAP;
    return frame;
  }

  stampFooters(left: string, page: (n: number, total: number) => string): void {
    const total = this.doc.getNumberOfPages();

    for (let n = 1; n <= total; n += 1) {
      this.doc.setPage(n);
      this.doc.setFont(PDF_FONT, "normal").setFontSize(8).setTextColor(MUTED);
      this.doc.text(left, MARGIN, this.height - 8);
      this.doc.text(page(n, total), this.width - MARGIN, this.height - 8, {
        align: "right",
      });
    }
  }

  save(filename: string): void {
    this.doc.save(filename);
  }
}
