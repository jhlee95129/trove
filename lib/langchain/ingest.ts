import { Document } from "@langchain/core/documents"
import { PDFParse } from "pdf-parse"

import { textSplitter } from "./splitter"
import { vectorStore } from "./vector-store"

/**
 * LangChain 인덱싱 파이프라인.
 *
 * Flow: PDF → text → Document → splitDocuments → addDocuments (embed + store)
 *
 * LangChain이 추상화하는 것:
 * - splitDocuments: 텍스트 분할 + Document 타입 유지 (metadata 전파)
 * - addDocuments: 임베딩 생성 + DB 삽입을 한 번에
 *
 * 비교: lib/rag/ingest.ts (47줄, 4개의 명시적 단계) → 여기서는 ~20줄
 *
 * PDF 추출은 여전히 raw — LangChain의 PDF loader가 큰 가치를 더하지 않으므로.
 */
export async function ingestPdf(
  buffer: Buffer,
  metadata: Record<string, unknown> = {}
): Promise<number> {
  // 1. PDF → text (raw: LangChain PDF loader 불필요)
  const parser = new PDFParse({ data: buffer })
  const result = await parser.getText()

  // 2. text → Document (LangChain의 콘텐츠+메타데이터 추상화)
  const doc = new Document({
    pageContent: result.text,
    metadata,
  })

  // 3. Document → chunks (textSplitter가 metadata를 자동 전파)
  const chunks = await textSplitter.splitDocuments([doc])

  if (chunks.length === 0) return 0

  // 4. chunks → embed + store (vectorStore.addDocuments가 한 번에 처리)
  await vectorStore.addDocuments(chunks)

  return chunks.length
}
