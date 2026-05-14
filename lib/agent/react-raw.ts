import type Anthropic from "@anthropic-ai/sdk"

import { anthropic } from "@/lib/anthropic"

import { agentExecutors, agentTools } from "./tools"
import type { AgentResult, AgentState, AgentStep } from "./types"

const DEFAULT_MAX_ITERATIONS = 10

/**
 * 시스템 프롬프트: 에이전트의 행동 방식을 지시한다.
 *
 * 핵심: 모델에게 "생각 → 행동 → 관찰" 사이클을 따르도록 유도.
 * 이 프롬프트가 ReAct의 "Re"(Reasoning)를 담당한다.
 */
const SYSTEM_PROMPT = `당신은 Trove 리서치 에이전트입니다. 사용자의 질문에 답하기 위해 도구를 사용할 수 있습니다.

## 행동 방식
1. 먼저 질문을 분석하고 답변 계획을 세우세요.
2. 필요한 정보가 있으면 도구를 사용하세요.
   - 과거에 저장된 자료가 있을 수 있으니 kb_search를 먼저 확인하세요.
   - KB에 없으면 web_search로 웹을 검색하세요.
   - 특정 URL의 내용이 필요하면 web_fetch를 사용하세요.
   - 계산이 필요하면 calculator를 사용하세요.
3. 도구 결과를 종합하여 최종 답변을 작성하세요.
4. 답변에는 출처를 [출처: N] 형식으로 인용하세요.

## 중요
- 한 번에 하나의 도구만 호출하세요.
- 불필요한 도구 호출은 피하세요.
- 충분한 정보가 모이면 바로 최종 답변을 작성하세요.`

/**
 * ReAct 에이전트: while 루프 + 상태 + 종료 조건
 *
 * ## Tool Loop (lib/tools/loop.ts)와의 차이
 *
 * | 관점     | Tool Loop          | Agent              |
 * |----------|--------------------|--------------------|
 * | 상태     | messages 배열만    | messages + steps + plan + iteration |
 * | 판단     | 무조건 실행        | 추론 → 선택 → 판단 |
 * | 종료     | end_turn만         | end_turn + maxIterations 강제 종료 |
 * | RAG      | 항상 실행          | 도구로 선택적 사용 |
 * | 추적     | 없음               | Thought/Action/Observation 구조화 |
 */
export async function runReActAgent(
  userQuestion: string,
  options?: {
    maxIterations?: number
    model?: string
  }
): Promise<AgentResult> {
  const model = options?.model ?? "claude-sonnet-4-6"
  const maxIterations = options?.maxIterations ?? DEFAULT_MAX_ITERATIONS

  // 1. 상태 초기화
  const state: AgentState = {
    messages: [{ role: "user", content: userQuestion }],
    steps: [],
    iterationCount: 0,
    maxIterations,
    plan: null,
  }

  let totalInputTokens = 0
  let totalOutputTokens = 0

  // 2. 메인 루프 — 이것이 agent의 본질이다
  while (state.iterationCount < state.maxIterations) {
    state.iterationCount++

    // 2a. LLM 호출
    const response = await anthropic.messages.create({
      model,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      messages: state.messages,
      tools: agentTools,
    })

    // 토큰 사용량 누적
    totalInputTokens += response.usage.input_tokens
    totalOutputTokens += response.usage.output_tokens

    // 2b. 응답에서 Thought(텍스트)와 Action(tool_use)을 추출
    const textBlocks = response.content.filter(
      (b): b is Anthropic.TextBlock => b.type === "text"
    )
    const toolBlocks = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
    )

    // Thought 기록 (모델이 텍스트로 출력한 사고 과정)
    for (const block of textBlocks) {
      if (block.text.trim()) {
        state.steps.push({ type: "thought", content: block.text })
      }
    }

    // 2c. 종료 조건: stop_reason이 "end_turn"이면 최종 답변
    if (response.stop_reason !== "tool_use") {
      const answer = textBlocks.map((b) => b.text).join("\n")
      state.steps.push({ type: "answer", content: answer })

      return {
        answer,
        steps: state.steps,
        iterationCount: state.iterationCount,
        usage: { totalInputTokens, totalOutputTokens },
      }
    }

    // 2d. Action: 도구 실행
    // assistant 응답 전체를 messages에 추가
    state.messages.push({
      role: "assistant",
      content: response.content,
    })

    const toolResults: Anthropic.ToolResultBlockParam[] = []

    for (const block of toolBlocks) {
      // Action 기록
      state.steps.push({
        type: "action",
        content: `${block.name}(${JSON.stringify(block.input)})`,
        toolName: block.name,
        toolInput: block.input as Record<string, unknown>,
      })

      // 도구 실행
      const executor = agentExecutors[block.name]
      const result = executor
        ? await executor(block.input as Record<string, unknown>)
        : `Error: unknown tool "${block.name}"`

      // Observation 기록
      state.steps.push({
        type: "observation",
        content: result,
      })

      toolResults.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: result,
      })
    }

    // 2e. tool_result를 messages에 추가 → 다음 반복으로
    state.messages.push({
      role: "user",
      content: toolResults,
    })
  }

  // 3. 안전장치: maxIterations 도달 시 강제 종료
  // 도구 없이 마지막 한 번 호출 → 모델이 답변을 강제 생성
  const finalResponse = await anthropic.messages.create({
    model,
    max_tokens: 2048,
    system:
      SYSTEM_PROMPT +
      "\n\n[시스템: 최대 반복 횟수에 도달했습니다. 지금까지 수집한 정보로 최종 답변을 작성하세요.]",
    messages: state.messages,
    // tools를 제외 → 모델이 도구 호출 대신 답변을 강제 생성
  })

  totalInputTokens += finalResponse.usage.input_tokens
  totalOutputTokens += finalResponse.usage.output_tokens

  const answer = finalResponse.content
    .filter((b): b is Anthropic.TextBlock => b.type === "text")
    .map((b) => b.text)
    .join("\n")

  state.steps.push({ type: "answer", content: answer })

  return {
    answer,
    steps: state.steps,
    iterationCount: state.iterationCount,
    usage: { totalInputTokens, totalOutputTokens },
  }
}
