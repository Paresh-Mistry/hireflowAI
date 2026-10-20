import "server-only";

const MAX_STORED_CHARS = 60_000;

export type ExtractResult = { ok: true; text: string } | { ok: false; reason: string };

/** Extracts text from an uploaded resume. Never throws; scanned/image PDFs yield a reason instead. */
export async function extractResumeText(file: File): Promise<ExtractResult> {
  try {
    if (file.type === "text/plain") {
      const text = (await file.text()).trim();
      return text ? { ok: true, text: text.slice(0, MAX_STORED_CHARS) } : { ok: false, reason: "The text file is empty." };
    }
    if (file.type === "application/pdf") {
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: new Uint8Array(await file.arrayBuffer()) });
      try {
        const result = await parser.getText();
        const text = result.text.replace(/\s+\n/g, "\n").trim();
        if (text.length < 40) {
          return { ok: false, reason: "No selectable text found (scanned PDF?). Upload a text-based PDF." };
        }
        return { ok: true, text: text.slice(0, MAX_STORED_CHARS) };
      } finally {
        await parser.destroy();
      }
    }
    return { ok: false, reason: "Text extraction is supported for PDF and plain-text files." };
  } catch {
    return { ok: false, reason: "The document could not be read. It may be corrupted or password protected." };
  }
}
