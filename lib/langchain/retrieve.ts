import type { Document } from "@langchain/core/documents"

import { vectorStore } from "./vector-store"

export type SearchResult = {
  content: string
  metadata: Record<string, unknown>
  similarity: number
}

/**
 * LangChain 벡터 검색.
 *
 * 내부적으로: query → embedQuery() → match_documents RPC → 결과
 * 한 줄 메서드 호출로 embed + search가 모두 처리된다.
 *
 * 비교: lib/rag/retrieve.ts (36줄: embed 호출 + supabase.rpc 호출)
 */
export async function searchSimilar(
  query: string,
  k: number = 5
): Promise<SearchResult[]> {
  const results: [Document, number][] =
    await vectorStore.similaritySearchWithScore(query, k)

  return results.map(([doc, score]) => ({
    content: doc.pageContent,
    metadata: doc.metadata as Record<string, unknown>,
    similarity: score,
  }))
}
