import { supabase } from "@/lib/supabase"
import { embed } from "@/lib/voyage"

type SearchResult = {
  id: number
  content: string
  metadata: Record<string, unknown>
  similarity: number
}

/**
 * 쿼리 텍스트와 의미적으로 유사한 문서를 검색한다.
 *
 * 1. 쿼리를 Voyage AI로 임베딩
 * 2. pgvector의 cosine distance(<=>)로 유사 문서 검색
 * 3. similarity 점수와 함께 상위 k개 반환
 */
export async function searchSimilar(
  query: string,
  k: number = 5
): Promise<SearchResult[]> {
  // 1. 쿼리를 벡터로 변환
  const [queryEmbedding] = await embed([query])

  // 2. Supabase RPC로 검색 함수 호출
  const { data, error } = await supabase.rpc("search_documents", {
    query_embedding: JSON.stringify(queryEmbedding),
    match_count: k,
  })

  if (error) {
    throw new Error(`Search error: ${error.message}`)
  }

  return data as SearchResult[]
}
