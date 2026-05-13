/**
 * Rung 6: 벡터 검색 플레이그라운드
 *
 * 실행: pnpm playground:search
 *
 * 검색어를 임베딩 → Supabase에서 유사 문서 검색 → 결과 출력
 */

import { createClient } from "@supabase/supabase-js"

import { embed } from "../lib/voyage"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SECRET_KEY!
)

// --- 검색 함수 (lib/rag/retrieve.ts와 동일한 로직) ---

async function searchSimilar(query: string, k: number = 5) {
  const [queryEmbedding] = await embed([query])

  const { data, error } = await supabase.rpc("search_documents", {
    query_embedding: JSON.stringify(queryEmbedding),
    match_count: k,
  })

  if (error) {
    throw new Error(`Search error: ${error.message}`)
  }

  return data as { id: number; content: string; metadata: Record<string, unknown>; similarity: number }[]
}

// --- 테스트 검색어들 ---

const queries = [
  "인공지능과 머신러닝",
  "한국 전통 음식",
  "프로그래밍 언어의 타입 시스템",
  "스포츠 경기 규칙",
]

// --- Main ---

async function main() {
  console.log("=== 벡터 검색 테스트 ===\n")

  for (const query of queries) {
    console.log(`🔍 검색어: "${query}"`)
    console.log("-".repeat(50))

    const results = await searchSimilar(query, 3)

    for (const result of results) {
      const sim = result.similarity.toFixed(4)
      const category = (result.metadata as { category?: string }).category ?? "unknown"
      console.log(`  [${sim}] [${category}] ${result.content.slice(0, 60)}...`)
    }

    console.log("")
  }
}

main().catch(console.error)
