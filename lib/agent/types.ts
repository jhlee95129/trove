import type Anthropic from "@anthropic-ai/sdk"

/**
 * ReAct 에이전트의 한 단계.
 * Thought → Action → Observation 사이클에 대응한다.
 */
export type AgentStep = {
  type: "thought" | "action" | "observation" | "answer"
  content: string
  toolName?: string
  toolInput?: Record<string, unknown>
}

/**
 * 에이전트의 내부 상태.
 *
 * 상태 설계의 핵심: 누적 vs 덮어쓰기
 * - 누적(append-only): messages, steps — 이전 정보를 잃으면 안 되는 것
 * - 덮어쓰기(overwrite): iterationCount, plan — 최신 값만 의미 있는 것
 */
export type AgentState = {
  messages: Anthropic.MessageParam[] // 누적
  steps: AgentStep[] // 누적
  iterationCount: number // 덮어쓰기
  maxIterations: number
  plan: string | null // 덮어쓰기
}

/**
 * 에이전트가 반환하는 최종 결과.
 */
export type AgentResult = {
  answer: string
  steps: AgentStep[]
  iterationCount: number
  usage: {
    totalInputTokens: number
    totalOutputTokens: number
  }
}
