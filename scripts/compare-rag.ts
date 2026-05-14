/**
 * Raw vs LangChain RAG 비교 스크립트.
 *
 * 동일한 쿼리를 양쪽 구현에 보내고, 결과와 소요 시간을 비교한다.
 *
 * 실행: pnpm compare:rag
 */

import { searchSimilar as lcSearch } from "../lib/langchain/retrieve"
import { askWithRag } from "../lib/langchain/rag-chain"
import { searchSimilar as rawSearch } from "../lib/rag/retrieve"

async function main() {
  const query = "인공지능과 머신러닝의 차이"

  console.log(`쿼리: "${query}"\n`)

  // --- Raw 구현 ---
  console.log("=== Raw Implementation ===")
  const t1 = Date.now()
  const rawResults = await rawSearch(query, 3)
  const rawTime = Date.now() - t1
  console.log(`소요 시간: ${rawTime}ms`)
  console.log(`결과 수: ${rawResults.length}`)
  for (const r of rawResults) {
    console.log(
      `  [${r.similarity.toFixed(4)}] ${r.content.slice(0, 80)}...`
    )
  }

  // --- LangChain 구현 ---
  console.log("\n=== LangChain Implementation ===")
  const t2 = Date.now()
  const lcResults = await lcSearch(query, 3)
  const lcTime = Date.now() - t2
  console.log(`소요 시간: ${lcTime}ms`)
  console.log(`결과 수: ${lcResults.length}`)
  for (const r of lcResults) {
    console.log(
      `  [${r.similarity.toFixed(4)}] ${r.content.slice(0, 80)}...`
    )
  }

  // --- LangChain RAG Chain (전체 답변 생성) ---
  console.log("\n=== LangChain RAG Chain ===")
  const t3 = Date.now()
  const answer = await askWithRag(query)
  const chainTime = Date.now() - t3
  console.log(`소요 시간: ${chainTime}ms`)
  console.log(`답변:\n${answer}`)

  // --- 비교 요약 ---
  console.log("\n=== 비교 요약 ===")
  console.log(`검색 속도: Raw ${rawTime}ms vs LangChain ${lcTime}ms`)
  console.log(
    `결과 일치: ${rawResults.length === lcResults.length ? "동일" : "다름"} (${rawResults.length} vs ${lcResults.length})`
  )
}

main().catch(console.error)
