import type Anthropic from "@anthropic-ai/sdk"

import { anthropic } from "@/lib/anthropic"

// 도구 실행기 맵: tool name → 실행 함수
export type ToolExecutors = Record<
  string,
  (input: Record<string, unknown>) => string
>

const MAX_ITERATIONS = 10

/**
 * tool_use 루프의 핵심:
 *
 * 1. messages.create() 호출 (tools 포함)
 * 2. stop_reason이 "tool_use"이면:
 *    - 응답의 content에서 tool_use 블록을 찾는다
 *    - 호스트(우리)가 해당 도구를 실행한다
 *    - assistant 응답 전체를 messages에 추가한다
 *    - tool_result를 messages에 추가한다
 *    - 다시 1번으로 (재호출)
 * 3. stop_reason이 "end_turn"이면 최종 응답 반환
 */
export async function runToolLoop(
  messages: Anthropic.MessageParam[],
  tools: Anthropic.Tool[],
  executors: ToolExecutors
): Promise<Anthropic.Message> {
  const currentMessages = [...messages]
  let iterations = 0

  while (iterations < MAX_ITERATIONS) {
    iterations++

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 1024,
      messages: currentMessages,
      tools,
    })

    // stop_reason이 "end_turn"이면 루프 종료 — 모델이 최종 답변을 생성한 것
    if (response.stop_reason !== "tool_use") {
      return response
    }

    // stop_reason이 "tool_use" — 모델이 도구 호출을 요청한 것
    // 1) assistant 응답 전체를 messages에 추가
    currentMessages.push({
      role: "assistant",
      content: response.content,
    })

    // 2) content에서 tool_use 블록을 찾아 각각 실행
    const toolResults: Anthropic.ToolResultBlockParam[] = []

    for (const block of response.content) {
      if (block.type === "tool_use") {
        const executor = executors[block.name]
        const result = executor
          ? executor(block.input as Record<string, unknown>)
          : `Error: unknown tool "${block.name}"`

        toolResults.push({
          type: "tool_result",
          tool_use_id: block.id,
          content: result,
        })
      }
    }

    // 3) tool_result를 user role로 messages에 추가 → 재호출
    currentMessages.push({
      role: "user",
      content: toolResults,
    })
  }

  // 안전장치: MAX_ITERATIONS 도달 시 마지막 응답 반환
  return anthropic.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 1024,
    messages: currentMessages,
    tools,
  })
}
