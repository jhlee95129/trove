/**
 * Raw RAG 파이프라인 러너.
 *
 * lib/rag/retrieve.ts의 searchSimilar()로 검색하고,
 * Anthropic API로 직접 답변을 생성한다.
 * (app/api/chat/route.ts의 로직을 재현)
 */

import { anthropic } from "@/lib/anthropic"
import { searchSimilar } from "@/lib/rag/retrieve"

import type { PipelineResult, RetrievedDoc } from "../types"

export async function runRawRag(question: string): Promise<PipelineResult> {
  const start = Date.now()

  // 1. 검색
  const results = await searchSimilar(question, 3)
  const retrievedDocs: RetrievedDoc[] = results.map((r) => ({
    content: r.content,
    source: (r.metadata.source as string) ?? "unknown",
    similarity: r.similarity,
  }))

  // 2. 컨텍스트 구성 + 생성
  const context = results
    .map((d, i) => `[문서 ${i + 1}] ${d.content}`)
    .join("\n\n")

  const system = `다음 문서를 참고하여 답변하세요. 답변에 사용한 문서는 [출처: N] 형식으로 인용하세요. 문서에 관련 내용이 없으면 일반 지식으로 답변해도 됩니다.\n\n${context}`

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1024,
    system,
    messages: [{ role: "user", content: question }],
  })

  const answer =
    response.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("") ?? ""

  return {
    answer,
    retrievedDocs,
    latencyMs: Date.now() - start,
    tokenUsage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    },
  }
}
