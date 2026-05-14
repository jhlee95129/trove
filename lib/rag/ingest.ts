import { PDFParse } from "pdf-parse"

import { supabase } from "@/lib/supabase"
import { embed } from "@/lib/voyage"

import { chunkText } from "./chunking"

/**
 * PDF 인덱싱 파이프라인:
 * PDF 버퍼 → 텍스트 추출 → 청킹 → 임베딩 → Supabase 저장
 *
 * @returns 저장된 청크 수
 */
export async function ingestPdf(
  buffer: Buffer,
  metadata: Record<string, unknown> = {}
): Promise<number> {
  // 1. PDF → 텍스트
  const parser = new PDFParse({ data: buffer })
  const result = await parser.getText()
  const text = result.text

  // 2. 텍스트 → 청크
  const chunks = chunkText(text, 500, 50)

  if (chunks.length === 0) {
    return 0
  }

  // 3. 청크 → 임베딩 (한 번에 요청)
  const embeddings = await embed(chunks)

  // 4. 임베딩 → Supabase 저장
  const rows = chunks.map((content, i) => ({
    content,
    embedding: JSON.stringify(embeddings[i]),
    metadata: { ...metadata, chunk_index: i },
  }))

  const { error } = await supabase.from("documents").insert(rows)

  if (error) {
    throw new Error(`Ingest error: ${error.message}`)
  }

  return chunks.length
}
