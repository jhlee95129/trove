/**
 * LangGraph ReAct 에이전트.
 *
 * Rung 8의 raw while 루프 에이전트(react-raw.ts)를
 * LangGraph StateGraph로 재작성한 것.
 *
 * ## raw 에이전트 vs LangGraph 에이전트 비교
 *
 * | 개념        | Raw (react-raw.ts)                | LangGraph (이 파일)              |
 * |-------------|-----------------------------------|----------------------------------|
 * | 루프        | `while (iteration < max)`         | `tools → agent` 순환 edge        |
 * | 종료 조건   | `if (stop_reason !== "tool_use")` | conditional edge → END           |
 * | 상태 갱신   | `state.messages.push(...)`        | node returns partial → reducer   |
 * | 안전장치    | maxIterations counter             | recursionLimit config            |
 * | 도구 실행   | executor map 수동 lookup          | ToolNode 자동 dispatch           |
 *
 * ## 그래프 구조
 *
 * START → agent → [tool_calls?] → tools → agent → ... → END
 *                  [no tool_calls] → END
 */

import { ChatAnthropic } from "@langchain/anthropic"
import { AIMessage, HumanMessage, SystemMessage } from "@langchain/core/messages"
import type { BaseMessage } from "@langchain/core/messages"
import { Annotation, StateGraph, START, END } from "@langchain/langgraph"
import { ToolNode } from "@langchain/langgraph/prebuilt"

import type { AgentResult, AgentStep } from "@/lib/agent/types"
import { allLangchainTools } from "./tools"

// ────────────────────────────────────────────
// 1. State 정의 (Annotation + Reducer)
// ────────────────────────────────────────────

/**
 * LangGraph 에이전트의 상태.
 *
 * Rung 8 AgentState와의 대응:
 * - messages → messagesReducer (내장, append)
 * - steps → custom append reducer
 * - iterationCount → custom overwrite reducer
 * - maxIterations → state에서 제거, recursionLimit config로 대체
 * - plan → 현재 미사용이므로 제외
 */
const GraphAgentState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (current, update) => [...current, ...update],
    default: () => [],
  }),

  steps: Annotation<AgentStep[]>({
    reducer: (current, update) => [...current, ...update],
    default: () => [],
  }),

  iterationCount: Annotation<number>({
    reducer: (_, update) => update,
    default: () => 0,
  }),
})

// ────────────────────────────────────────────
// 2. 시스템 프롬프트 (raw 에이전트와 동일)
// ────────────────────────────────────────────

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

// ────────────────────────────────────────────
// 3. 모델 + 도구 바인딩
// ────────────────────────────────────────────

const model = new ChatAnthropic({
  model: "claude-sonnet-4-6",
  maxTokens: 2048,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
}).bindTools(allLangchainTools)

// ────────────────────────────────────────────
// 4. 노드 정의
// ────────────────────────────────────────────

/**
 * agent 노드: LLM을 호출하고 thought/action step을 추출한다.
 *
 * Raw 에이전트의 2a~2b 단계에 대응:
 * - 2a: LLM 호출 (73~79행)
 * - 2b: textBlocks/toolBlocks 추출 (86~98행)
 */
async function agentNode(
  state: typeof GraphAgentState.State
): Promise<Partial<typeof GraphAgentState.State>> {
  const response = await model.invoke(state.messages)

  // thought step 추출 (텍스트 블록)
  const steps: AgentStep[] = []
  if (typeof response.content === "string" && response.content.trim()) {
    steps.push({ type: "thought", content: response.content })
  } else if (Array.isArray(response.content)) {
    for (const block of response.content) {
      if (typeof block === "object" && "type" in block && block.type === "text") {
        const text = (block as { type: "text"; text: string }).text
        if (text.trim()) {
          steps.push({ type: "thought", content: text })
        }
      }
    }
  }

  // action step 추출 (tool_calls)
  if (response.tool_calls?.length) {
    for (const tc of response.tool_calls) {
      steps.push({
        type: "action",
        content: `${tc.name}(${JSON.stringify(tc.args)})`,
        toolName: tc.name,
        toolInput: tc.args as Record<string, unknown>,
      })
    }
  }

  return {
    messages: [response],
    steps,
    iterationCount: state.iterationCount + 1,
  }
}

/**
 * tools 노드: ToolNode로 도구를 실행하고 observation step을 추출한다.
 *
 * Raw 에이전트의 2d 단계에 대응 (113~148행):
 * - executor 수동 lookup → ToolNode가 자동 dispatch
 * - observation step 추출
 */
const toolNode = new ToolNode(allLangchainTools)

async function toolNodeWithSteps(
  state: typeof GraphAgentState.State
): Promise<Partial<typeof GraphAgentState.State>> {
  const result = await toolNode.invoke(state)

  // observation step 추출
  const steps: AgentStep[] = []
  const messages: BaseMessage[] = result.messages ?? []

  for (const msg of messages) {
    if (msg.getType() === "tool") {
      steps.push({
        type: "observation",
        content:
          typeof msg.content === "string"
            ? msg.content
            : JSON.stringify(msg.content),
      })
    }
  }

  return { messages, steps }
}

// ────────────────────────────────────────────
// 5. 엣지 정의
// ────────────────────────────────────────────

/**
 * 조건부 라우팅: agent 노드 이후 다음 단계를 결정한다.
 *
 * Raw 에이전트의 2c 단계에 대응 (100~111행):
 *   if (response.stop_reason !== "tool_use") → 종료
 *
 * LangGraph에서는 이것이 conditional edge가 된다:
 *   tool_calls 있으면 → "tools" 노드
 *   없으면 → END
 */
function shouldContinue(
  state: typeof GraphAgentState.State
): "tools" | typeof END {
  const lastMessage = state.messages[state.messages.length - 1]

  if (
    lastMessage.getType() === "ai" &&
    (lastMessage as AIMessage).tool_calls?.length
  ) {
    return "tools"
  }

  return END
}

// ────────────────────────────────────────────
// 6. 그래프 조립 + 컴파일
// ────────────────────────────────────────────

const workflow = new StateGraph(GraphAgentState)
  .addNode("agent", agentNode)
  .addNode("tools", toolNodeWithSteps)
  .addEdge(START, "agent")
  .addConditionalEdges("agent", shouldContinue, {
    tools: "tools",
    [END]: END,
  })
  .addEdge("tools", "agent")

export const agentGraph = workflow.compile()

// ────────────────────────────────────────────
// 7. 공개 API (raw 에이전트와 동일 인터페이스)
// ────────────────────────────────────────────

/**
 * LangGraph ReAct 에이전트 실행.
 *
 * raw runReActAgent()와 동일한 시그니처 + 반환 타입(AgentResult).
 * 내부적으로 StateGraph.invoke()를 호출한다.
 *
 * recursionLimit 계산:
 *   각 iteration = agent 노드 + tools 노드 = 2 step
 *   maxIterations * 2 + 1 (마지막 agent 호출 포함)
 */
export async function runReActGraph(
  userQuestion: string,
  options?: {
    maxIterations?: number
  }
): Promise<AgentResult> {
  const maxIterations = options?.maxIterations ?? 10

  const result = await agentGraph.invoke(
    {
      messages: [
        new SystemMessage(SYSTEM_PROMPT),
        new HumanMessage(userQuestion),
      ],
    },
    {
      recursionLimit: maxIterations * 2 + 1,
    }
  )

  // 마지막 AI 메시지에서 답변 추출
  const lastAiMessage = [...result.messages]
    .reverse()
    .find((m: BaseMessage) => m.getType() === "ai") as AIMessage | undefined

  let answer: string
  if (!lastAiMessage) {
    answer = "답변을 생성하지 못했습니다."
  } else if (typeof lastAiMessage.content === "string") {
    answer = lastAiMessage.content
  } else if (Array.isArray(lastAiMessage.content)) {
    answer = lastAiMessage.content
      .filter(
        (b): b is { type: "text"; text: string } =>
          typeof b === "object" && "type" in b && b.type === "text"
      )
      .map((b) => b.text)
      .join("\n")
  } else {
    answer = "답변을 생성하지 못했습니다."
  }

  // answer step 추가
  const steps = [...result.steps]
  if (answer) {
    steps.push({ type: "answer", content: answer })
  }

  // 토큰 사용량 추출 (AIMessage.usage_metadata)
  let totalInputTokens = 0
  let totalOutputTokens = 0
  for (const msg of result.messages) {
    if (msg.getType() === "ai") {
      const usage = (msg as AIMessage).usage_metadata
      if (usage) {
        totalInputTokens += usage.input_tokens ?? 0
        totalOutputTokens += usage.output_tokens ?? 0
      }
    }
  }

  return {
    answer,
    steps,
    iterationCount: result.iterationCount,
    usage: { totalInputTokens, totalOutputTokens },
  }
}
