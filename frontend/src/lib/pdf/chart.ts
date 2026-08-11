import type { jsPDF } from "jspdf";
import { MUTED, RULE } from "./document";
import { PDF_FONT } from "./font";
import {
  bandCenters,
  domainOf,
  labelStride,
  niceTicks,
  scaleValue,
  type Domain,
  type Frame,
} from "./layout";

export interface ChartInput {
  values: (number | null)[];
  labels: string[];
  unit: string;
  color: string;
  kind: "line" | "bar";
}

const AXIS_GUTTER = 14;
const LABEL_GUTTER = 6;
const LABEL_WIDTH = 14;
const BAR_SHARE = 0.6;

const plotOf = (frame: Frame): Frame => ({
  x: frame.x + AXIS_GUTTER,
  y: frame.y,
  width: frame.width - AXIS_GUTTER,
  height: frame.height - LABEL_GUTTER,
});

export function drawChart(doc: jsPDF, frame: Frame, chart: ChartInput): void {
  const plot = plotOf(frame);

  const ticks = niceTicks(...domainOf(chart.values, chart.kind === "bar"), 4);
  if (ticks.length === 0) return;

  const domain: Domain = [ticks[0], ticks[ticks.length - 1]];

  doc.setFont(PDF_FONT, "normal").setFontSize(7);

  for (const tick of ticks) {
    const y = scaleValue(tick, domain, plot);

    doc.setDrawColor(RULE).setLineWidth(0.1);
    doc.line(plot.x, y, plot.x + plot.width, y);

    doc.setTextColor(MUTED);
    doc.text(`${tick}${chart.unit}`, plot.x - 2, y + 1, { align: "right" });
  }

  const centers = bandCenters(chart.values.length, plot);

  if (chart.kind === "bar") {
    drawBars(doc, plot, domain, centers, chart);
  } else {
    drawLine(doc, plot, domain, centers, chart);
  }

  const stride = labelStride(
    chart.labels.length,
    Math.max(Math.floor(plot.width / LABEL_WIDTH), 1),
  );

  doc.setFontSize(7).setTextColor(MUTED);
  chart.labels.forEach((label, index) => {
    if (index % stride !== 0) return;
    doc.text(label, centers[index], plot.y + plot.height + 4, {
      align: "center",
    });
  });
}

function drawBars(
  doc: jsPDF,
  plot: Frame,
  domain: Domain,
  centers: number[],
  chart: ChartInput,
): void {
  const width = (plot.width / Math.max(chart.values.length, 1)) * BAR_SHARE;
  const baseline = scaleValue(Math.max(domain[0], 0), domain, plot);

  doc.setFillColor(chart.color);

  chart.values.forEach((value, index) => {
    if (value === null) return;

    const top = scaleValue(value, domain, plot);
    const height = baseline - top;
    if (height <= 0) return;

    doc.rect(centers[index] - width / 2, top, width, height, "F");
  });
}

function drawLine(
  doc: jsPDF,
  plot: Frame,
  domain: Domain,
  centers: number[],
  chart: ChartInput,
): void {
  doc.setDrawColor(chart.color).setLineWidth(0.6);

  let previous: [number, number] | null = null;

  chart.values.forEach((value, index) => {
    if (value === null) {
      previous = null;
      return;
    }

    const point: [number, number] = [
      centers[index],
      scaleValue(value, domain, plot),
    ];

    if (previous) doc.line(previous[0], previous[1], point[0], point[1]);
    previous = point;
  });
}
