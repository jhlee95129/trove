/**
 * Retrieval 메트릭 — 결정적 계산, LLM 불필요.
 *
 * 검색 결과의 source 목록과 기대 source 목록을 비교한다.
 */

import type { RetrievalMetrics, RetrievedDoc } from "../types"

/**
 * Recall@K: 기대 문서 중 검색된 비율.
 *   |검색 ∩ 기대| / |기대|
 *
 * 기대 문서가 없으면(edge case) 1.0을 반환한다.
 */
function recallAtK(retrieved: string[], expected: string[]): number {
  if (expected.length === 0) return 1.0
  const found = expected.filter((src) => retrieved.includes(src))
  return found.length / expected.length
}

/**
 * Precision@K: 검색된 문서 중 관련 문서 비율.
 *   |검색 ∩ 기대| / |검색|
 *
 * 검색 결과가 없으면 0을 반환한다.
 * 기대 문서가 없으면(edge case) — 어떤 검색 결과든 노이즈이므로 0.
 */
function precisionAtK(retrieved: string[], expected: string[]): number {
  if (retrieved.length === 0) return 0
  if (expected.length === 0) return 0
  const found = retrieved.filter((src) => expected.includes(src))
  return found.length / retrieved.length
}

/**
 * MRR (Mean Reciprocal Rank): 첫 번째 관련 문서의 순위 역수.
 *   1 / (첫 번째 관련 문서의 index + 1)
 *
 * 관련 문서가 없으면 0.
 * 기대 문서가 없으면(edge case) 1.0.
 */
function mrr(retrieved: string[], expected: string[]): number {
  if (expected.length === 0) return 1.0
  const idx = retrieved.findIndex((src) => expected.includes(src))
  if (idx === -1) return 0
  return 1 / (idx + 1)
}

/**
 * 검색 결과에 대한 retrieval 메트릭을 계산한다.
 */
export function computeRetrievalMetrics(
  retrievedDocs: RetrievedDoc[],
  expectedSources: string[]
): RetrievalMetrics {
  const retrievedSources = retrievedDocs.map((d) => d.source)

  return {
    recallAtK: recallAtK(retrievedSources, expectedSources),
    precisionAtK: precisionAtK(retrievedSources, expectedSources),
    mrr: mrr(retrievedSources, expectedSources),
  }
}
