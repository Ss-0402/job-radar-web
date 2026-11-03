import mammoth from "mammoth";
import { extractText, getDocumentProxy } from "unpdf";

/**
 * 简历文件 → 纯文本。
 *
 * 与旧版 Python 的 docs.py 行为对齐：
 * - 支持 txt / md / docx / pdf
 * - 扫描件（读不到文字）给出明确提示，而不是空字符串
 * - 解析结果先清洗再截断
 */

export const SUPPORTED_EXT = ["txt", "md", "docx", "pdf"] as const;
export const MAX_BYTES = 5 * 1024 * 1024;
export const MIN_CHARS = 30;
export const MAX_CHARS = 20_000;

export type ParsedResume =
  | { ok: true; text: string; ext: string }
  | { ok: false; message: string };

function extOf(filename: string): string {
  const idx = filename.lastIndexOf(".");
  return idx === -1 ? "" : filename.slice(idx + 1).toLowerCase();
}

function clean(text: string): string {
  const lines = text.replace(/\r\n?/g, "\n").split("\n").map((l) => l.trimEnd());
  const out: string[] = [];
  for (const line of lines) {
    if (line === "" && out.length > 0 && out[out.length - 1] === "") continue;
    out.push(line);
  }
  return out.join("\n").trim();
}

async function fromDocx(bytes: Uint8Array): Promise<string> {
  const result = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
  return result.value ?? "";
}

async function fromPdf(bytes: Uint8Array): Promise<string> {
  const pdf = await getDocumentProxy(new Uint8Array(bytes));
  const { text } = await extractText(pdf, { mergePages: true });
  return Array.isArray(text) ? text.join("\n") : text;
}

export async function parseResume(
  filename: string,
  bytes: Uint8Array,
): Promise<ParsedResume> {
  const ext = extOf(filename);

  if (bytes.byteLength === 0) {
    return { ok: false, message: "这个文件是空的" };
  }
  if (bytes.byteLength > MAX_BYTES) {
    return { ok: false, message: "文件超过 5MB，请压缩后再上传" };
  }
  if (!SUPPORTED_EXT.includes(ext as (typeof SUPPORTED_EXT)[number])) {
    return {
      ok: false,
      message: `暂不支持 .${ext || "无扩展名"}，请上传 txt / md / docx / pdf`,
    };
  }

  let raw = "";
  try {
    if (ext === "docx") {
      raw = await fromDocx(bytes);
    } else if (ext === "pdf") {
      raw = await fromPdf(bytes);
    } else {
      raw = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    }
  } catch {
    return {
      ok: false,
      message:
        ext === "pdf"
          ? "这个 PDF 解析失败：可能设置了打开密码或文件已损坏"
          : ext === "docx"
            ? "这个 Word 文件解析失败：如果是旧版 .doc，请另存为 .docx"
            : "文件读取失败，请检查编码",
    };
  }

  const text = clean(raw);
  if (text.length < MIN_CHARS) {
    return {
      ok: false,
      message:
        "没能从这个文件里读到文字（扫描件或图片型 PDF 常见），请换成可复制文字的版本，或直接粘贴内容",
    };
  }

  return { ok: true, text: text.slice(0, MAX_CHARS), ext };
}
