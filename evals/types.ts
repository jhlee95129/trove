/**
 * Eval Harness 타입 정의.
 *
 * Retrieval 메트릭과 Generation 메트릭을 분리해서 측정한다.
 * - Retrieval: 결정적 (LLM 불필요) — recall, precision, MRR
 * - Generation: LLM-as-judge — faithfulness, relevance, completeness
 */

// --- Golden Set ---

export type GoldenEntry = {
  id: string
  question: string
  /** normal: 직접 질문, cross: 교차/모호, edge: KB에 없는 주제 */
  category: "normal" | "cross" | "edge"
  /** easy: 단일 문서, medium: 추론 필요, hard: 교차/엣지 */
  difficulty: "easy" | "medium" | "hard"
  /** 기대되는 문서 source 목록 (metadata.source 값) */
  expectedSources: string[]
  /** 답변에 포함되어야 할 핵심 포인트 */
  keyPoints: string[]
}

// --- Pipeline Result ---

export type RetrievedDoc = {
  content: string
  source: string
  similarity: number
}

export type PipelineResult = {
  answer: string
  retrievedDocs: RetrievedDoc[]
  latencyMs: number
  tokenUsage: {
    inputTokens: number
    outputTokens: number
  }
}

// --- Metrics ---

export type RetrievalMetrics = {
  recallAtK: number // 0~1
  precisionAtK: number // 0~1
  mrr: number // 0~1
}

export type GenerationMetrics = {
  faithfulness: { score: number; rationale: string } // 1~5
  relevance: { score: number; rationale: string } // 1~5
  completeness: { score: number; rationale: string } // 1~5
}

// --- Eval Result ---

export type EvalResult = {
  goldenId: string
  question: string
  category: GoldenEntry["category"]
  pipeline: string
  pipelineResult: PipelineResult
  retrievalMetrics: RetrievalMetrics
  generationMetrics: GenerationMetrics
}

// --- Report ---

export type AggregatedMetrics = {
  avgRecallAtK: number
  avgPrecisionAtK: number
  avgMrr: number
  avgFaithfulness: number
  avgRelevance: number
  avgCompleteness: number
}

export type EvalReport = {
  pipeline: string
  timestamp: string
  totalQuestions: number
  results: EvalResult[]
  aggregate: AggregatedMetrics
  byCategory: Record<string, AggregatedMetrics>
}
