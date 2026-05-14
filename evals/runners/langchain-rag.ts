/**
 * LangChain RAG 파이프라인 러너.
 *
 * lib/langchain/retrieve.ts로 검색 메트릭을 측정하고,
 * lib/langchain/rag-chain.ts의 askWithRag()로 답변을 생성한다.
 *
 * 왜 검색을 별도로 호출하나?
 * askWithRag()는 답변 문자열만 반환하므로
 * retrieval 메트릭 측정을 위해 검색을 따로 수행해야 한다.
 */

import { askWithRag } from "@/lib/langchain/rag-chain"
import { searchSimilar } from "@/lib/langchain/retrieve"

import type { PipelineResult, RetrievedDoc } from "../types"

export async function runLangchainRag(
  question: string
): Promise<PipelineResult> {
  const start = Date.now()

  // 1. 검색 (retrieval 메트릭용)
  const results = await searchSimilar(question, 3)
  const retrievedDocs: RetrievedDoc[] = results.map((r) => ({
    content: r.content,
    source: (r.metadata.source as string) ?? "unknown",
    similarity: r.similarity,
  }))

  // 2. 답변 생성 (내부적으로 다시 검색하지만, 일관성을 위해 별도 호출)
  const answer = await askWithRag(question)

  return {
    answer,
    retrievedDocs,
    latencyMs: Date.now() - start,
    tokenUsage: {
      // LangChain RAG 체인은 토큰 사용량을 직접 노출하지 않음
      inputTokens: 0,
      outputTokens: 0,
    },
  }
}
