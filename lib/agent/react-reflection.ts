/**
 * Reflection Agent — Raw 구현.
 *
 * Rung 8의 runReActAgent()를 호출한 후,
 * 답변을 self-critique하고 필요하면 수정하는 래퍼.
 *
 * ## Reflection 흐름
 *
 * 1. runReActAgent()로 기본 답변 생성
 * 2. Reflection prompt로 LLM 호출 → "KEEP" 또는 "REVISE: <이유>"
 * 3. KEEP → 원래 답변 반환
 * 4. REVISE → 비평을 포함해 재생성 → 수정된 답변 반환
 *
 * ## 왜 이렇게 하나?
 *
 * Agent가 답변을 만든 후 스스로 검증하면:
 * - Hallucination을 스스로 발견할 수 있다 (faithfulness ↑)
 * - 빠뜨린 정보를 보완할 수 있다 (completeness ↑)
 * - 비용: 추가 LLM 호출 1~2회 (latency ↑, tokens ↑)
 */

import { anthropic } from "@/lib/anthropic"

import { runReActAgent } from "./react-raw"
import type { AgentResult, AgentStep } from "./types"

/**
 * Reflection prompt: 답변을 비평하고 KEEP/REVISE를 판정한다.
 */
function buildReflectionPrompt(
  question: string,
  answer: string,
  context: string
): string {
  return `당신은 AI 답변 품질 검수자입니다.

원래 질문: ${question}

에이전트 답변:
${answer}

사용된 컨텍스트:
${context || "(컨텍스트 없음)"}

다음 기준으로 답변을 평가하세요:
1. 컨텍스트에 근거하는가? (hallucination 여부)
2. 질문에 정확히 답하고 있는가?
3. 핵심 정보가 빠져있지 않은가?

판정:
- 답변이 충분히 좋으면 첫 줄에: KEEP
- 수정이 필요하면 첫 줄에: REVISE
  그 다음 줄에 구체적 문제점을 설명하세요.`
}

/**
 * 수정 prompt: 비평을 기반으로 답변을 개선한다.
 */
function buildRevisionPrompt(
  question: string,
  originalAnswer: string,
  critique: string,
  context: string
): string {
  return `당신은 Trove 리서치 에이전트입니다.

이전에 다음 질문에 답변했지만, 검수에서 문제가 발견되었습니다.

질문: ${question}

이전 답변:
${originalAnswer}

검수 결과 (문제점):
${critique}

참고 컨텍스트:
${context || "(컨텍스트 없음)"}

위 문제점을 반영하여 개선된 답변을 작성하세요.
답변에는 출처를 [출처: N] 형식으로 인용하세요.`
}

/**
 * Agent steps에서 kb_search observation을 찾아 컨텍스트를 추출한다.
 */
function extractContext(steps: AgentStep[]): string {
  for (const step of steps) {
    if (step.type === "observation" && step.toolName === "kb_search") {
      return step.content
    }
  }
  return ""
}

export async function runReActAgentWithReflection(
  userQuestion: string,
  options?: {
    maxIterations?: number
    model?: string
  }
): Promise<AgentResult> {
  const model = options?.model ?? "claude-sonnet-4-6"

  // 1. 기본 ReAct Agent 실행
  const baseResult = await runReActAgent(userQuestion, options)

  // 2. 컨텍스트 추출
  const context = extractContext(baseResult.steps)

  // 3. Reflection: 답변을 비평
  const reflectionResponse = await anthropic.messages.create({
    model,
    max_tokens: 512,
    messages: [
      {
        role: "user",
        content: buildReflectionPrompt(
          userQuestion,
          baseResult.answer,
          context
        ),
      },
    ],
  })

  const reflectionText = reflectionResponse.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("")

  let totalInputTokens =
    baseResult.usage.totalInputTokens + reflectionResponse.usage.input_tokens
  let totalOutputTokens =
    baseResult.usage.totalOutputTokens + reflectionResponse.usage.output_tokens

  // Reflection step 기록
  const steps = [...baseResult.steps]
  steps.push({
    type: "reflection",
    content: reflectionText,
  })

  // 4. KEEP/REVISE 판정
  const firstLine = reflectionText.trim().split("\n")[0].trim().toUpperCase()
  const shouldRevise = firstLine.startsWith("REVISE")

  if (!shouldRevise) {
    // KEEP: 원래 답변 그대로 반환
    return {
      answer: baseResult.answer,
      steps,
      iterationCount: baseResult.iterationCount,
      wasRevised: false,
      usage: { totalInputTokens, totalOutputTokens },
    }
  }

  // 5. REVISE: 비평을 기반으로 답변 재생성
  const critique = reflectionText.replace(/^REVISE[:\s]*/i, "").trim()

  const revisionResponse = await anthropic.messages.create({
    model,
    max_tokens: 2048,
    messages: [
      {
        role: "user",
        content: buildRevisionPrompt(
          userQuestion,
          baseResult.answer,
          critique,
          context
        ),
      },
    ],
  })

  totalInputTokens += revisionResponse.usage.input_tokens
  totalOutputTokens += revisionResponse.usage.output_tokens

  const revisedAnswer = revisionResponse.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("")

  steps.push({ type: "answer", content: revisedAnswer })

  return {
    answer: revisedAnswer,
    steps,
    iterationCount: baseResult.iterationCount,
    wasRevised: true,
    usage: { totalInputTokens, totalOutputTokens },
  }
}
