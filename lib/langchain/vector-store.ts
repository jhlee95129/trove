import { SupabaseVectorStore } from "@langchain/community/vectorstores/supabase"
import { createClient } from "@supabase/supabase-js"

import { voyageEmbeddings } from "./embeddings"

/**
 * LangChain이 추상화하는 것:
 * - 임베딩 + 저장을 하나의 객체로 통합 (addDocuments)
 * - 임베딩 + 검색을 하나의 객체로 통합 (similaritySearch)
 * - Document 타입 (pageContent + metadata)
 *
 * 비교: lib/supabase.ts + lib/voyage.ts + lib/rag/retrieve.ts (~80줄 합산) → 설정 하나
 *
 * 주의: queryName은 "match_documents" — LangChain이 요구하는
 * filter 파라미터를 포함한 별도 RPC 함수 사용.
 */
const supabaseClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
)

export const vectorStore = new SupabaseVectorStore(voyageEmbeddings, {
  client: supabaseClient,
  tableName: "documents",
  queryName: "match_documents",
})
