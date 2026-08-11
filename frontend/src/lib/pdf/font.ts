import type { jsPDF } from "jspdf";

export const PDF_FONT = "DejaVuSans";

const FILE = "DejaVuSans.ttf";
const URL = `/fonts/${FILE}`;
const CHUNK = 0x8000;

let pending: Promise<string> | null = null;

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";

  for (let offset = 0; offset < bytes.length; offset += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + CHUNK));
  }

  return btoa(binary);
}

export function loadFont(): Promise<string> {
  pending ??= fetch(URL)
    .then((response) => {
      if (!response.ok) throw new Error(`Font request failed: ${response.status}`);
      return response.arrayBuffer();
    })
    .then(toBase64)
    .catch((error: unknown) => {
      pending = null;
      throw error;
    });

  return pending;
}

export async function embedUnicodeFont(doc: jsPDF): Promise<void> {
  const base64 = await loadFont();

  doc.addFileToVFS(FILE, base64);
  doc.addFont(FILE, PDF_FONT, "normal");
  doc.setFont(PDF_FONT, "normal");
}
