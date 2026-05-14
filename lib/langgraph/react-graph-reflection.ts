/**
 * LangGraph ReAct Agent + Reflection.
 *
 * react-graph.ts의 그래프에 reflection 노드를 추가한 버전.
 *
 * ## 그래프 구조
 *
 * START → agent → [tool_calls?] → tools → agent → ... → reflection
 *                  [no tool_calls] → reflection
 *
 * reflection → [REVISE?] → revise → END
 *              [KEEP]    → END
 *
 * Raw 버전(react-reflection.ts)과의 차이:
 * - Raw: runReActAgent() 호출 후 별도 함수로 reflection
 * - LangGraph: 그래프 노드로 reflection이 내장
 */

import { ChatAnthropic } from "@langchain/anthropic"
import {
  AIMessage,
  HumanMessage,
  SystemMessage,
} from "@langchain/core/messages"
import type { BaseMessage } from "@langchain/core/messages"
import { Annotation, StateGraph, START, END } from "@langchain/langgraph"
import { ToolNode } from "@langchain/langgraph/prebuilt"

import type { AgentResult, AgentStep } from "@/lib/agent/types"
import { allLangchainTools } from "./tools"

// ────────────────────────────────────────────
// 1. State 정의 (기존 + reflected 플래그)
// ────────────────────────────────────────────

const ReflectionGraphState = Annotation.Root({
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
  reflected: Annotation<boolean>({
    reducer: (_, update) => update,
    default: () => false,
  }),
})

// ────────────────────────────────────────────
// 2. 시스템 프롬프트 + 모델
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

const model = new ChatAnthropic({
  model: "claude-sonnet-4-6",
  maxTokens: 2048,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
}).bindTools(allLangchainTools)

const reflectionModel = new ChatAnthropic({
  model: "claude-sonnet-4-6",
  maxTokens: 512,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
})

// ────────────────────────────────────────────
// 3. 노드 정의
// ────────────────────────────────────────────

async function agentNode(
  state: typeof ReflectionGraphState.State
): Promise<Partial<typeof ReflectionGraphState.State>> {
  const response = await model.invoke(state.messages)

  const steps: AgentStep[] = []
  if (typeof response.content === "string" && response.content.trim()) {
    steps.push({ type: "thought", content: response.content })
  } else if (Array.isArray(response.content)) {
    for (const block of response.content) {
      if (
        typeof block === "object" &&
        "type" in block &&
        block.type === "text"
      ) {
        const text = (block as { type: "text"; text: string }).text
        if (text.trim()) {
          steps.push({ type: "thought", content: text })
        }
      }
    }
  }

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

const toolNode = new ToolNode(allLangchainTools)

async function toolNodeWithSteps(
  state: typeof ReflectionGraphState.State
): Promise<Partial<typeof ReflectionGraphState.State>> {
  const result = await toolNode.invoke(state)

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

/**
 * Reflection 노드: 답변을 비평한다.
 */
async function reflectionNode(
  state: typeof ReflectionGraphState.State
): Promise<Partial<typeof ReflectionGraphState.State>> {
  // 마지막 AI 메시지에서 답변 추출
  const lastAi = [...state.messages]
    .reverse()
    .find((m) => m.getType() === "ai") as AIMessage | undefined

  let answer = ""
  if (lastAi) {
    if (typeof lastAi.content === "string") {
      answer = lastAi.content
    } else if (Array.isArray(lastAi.content)) {
      answer = lastAi.content
        .filter(
          (b): b is { type: "text"; text: string } =>
            typeof b === "object" && "type" in b && b.type === "text"
        )
        .map((b) => b.text)
        .join("\n")
    }
  }

  // 원래 질문 추출 (HumanMessage)
  const humanMsg = state.messages.find((m) => m.getType() === "human")
  const question =
    typeof humanMsg?.content === "string" ? humanMsg.content : ""

  // 컨텍스트 추출 (observation steps에서)
  const context = state.steps
    .filter((s) => s.type === "observation")
    .map((s) => s.content)
    .join("\n\n")

  const reflectionPrompt = `당신은 AI 답변 품질 검수자입니다.

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

  const response = await reflectionModel.invoke([
    new HumanMessage(reflectionPrompt),
  ])

  const reflectionText =
    typeof response.content === "string"
      ? response.content
      : Array.isArray(response.content)
        ? response.content
            .filter(
              (b): b is { type: "text"; text: string } =>
                typeof b === "object" && "type" in b && b.type === "text"
            )
            .map((b) => b.text)
            .join("")
        : ""

  return {
    messages: [response],
    steps: [{ type: "reflection", content: reflectionText }],
    reflected: true,
  }
}

/**
 * Revise 노드: 비평을 기반으로 답변을 재생성한다.
 */
async function reviseNode(
  state: typeof ReflectionGraphState.State
): Promise<Partial<typeof ReflectionGraphState.State>> {
  const humanMsg = state.messages.find((m) => m.getType() === "human")
  const question =
    typeof humanMsg?.content === "string" ? humanMsg.content : ""

  // 마지막 reflection에서 비평 추출
  const reflectionStep = [...state.steps]
    .reverse()
    .find((s) => s.type === "reflection")
  const critique = reflectionStep?.content ?? ""

  // 컨텍스트 추출
  const context = state.steps
    .filter((s) => s.type === "observation")
    .map((s) => s.content)
    .join("\n\n")

  // 이전 답변 추출
  const answerStep = [...state.steps]
    .reverse()
    .find((s) => s.type === "answer" || s.type === "thought")
  const originalAnswer = answerStep?.content ?? ""

  const revisionPrompt = `당신은 Trove 리서치 에이전트입니다.

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

  const response = await reflectionModel.invoke([
    new HumanMessage(revisionPrompt),
  ])

  return {
    messages: [response],
    steps: [
      {
        type: "answer",
        content:
          typeof response.content === "string"
            ? response.content
            : Array.isArray(response.content)
              ? response.content
                  .filter(
                    (b): b is { type: "text"; text: string } =>
                      typeof b === "object" &&
                      "type" in b &&
                      b.type === "text"
                  )
                  .map((b) => b.text)
                  .join("")
              : "",
      },
    ],
  }
}

// ────────────────────────────────────────────
// 4. 엣지 정의
// ────────────────────────────────────────────

function shouldContinue(
  state: typeof ReflectionGraphState.State
): "tools" | "reflection" {
  const lastMessage = state.messages[state.messages.length - 1]

  if (
    lastMessage.getType() === "ai" &&
    (lastMessage as AIMessage).tool_calls?.length
  ) {
    return "tools"
  }

  return "reflection"
}

function shouldRevise(
  state: typeof ReflectionGraphState.State
): "revise" | typeof END {
  const reflectionStep = [...state.steps]
    .reverse()
    .find((s) => s.type === "reflection")

  if (!reflectionStep) return END

  const firstLine = reflectionStep.content.trim().split("\n")[0].toUpperCase()
  return firstLine.startsWith("REVISE") ? "revise" : END
}

// ────────────────────────────────────────────
// 5. 그래프 조립 + 컴파일
// ────────────────────────────────────────────

const workflow = new StateGraph(ReflectionGraphState)
  .addNode("agent", agentNode)
  .addNode("tools", toolNodeWithSteps)
  .addNode("reflection", reflectionNode)
  .addNode("revise", reviseNode)
  .addEdge(START, "agent")
  .addConditionalEdges("agent", shouldContinue, {
    tools: "tools",
    reflection: "reflection",
  })
  .addEdge("tools", "agent")
  .addConditionalEdges("reflection", shouldRevise, {
    revise: "revise",
    [END]: END,
  })
  .addEdge("revise", END)

export const reflectionGraph = workflow.compile()

// ────────────────────────────────────────────
// 6. 공개 API
// ────────────────────────────────────────────

export async function runReActGraphWithReflection(
  userQuestion: string,
  options?: { maxIterations?: number }
): Promise<AgentResult> {
  const maxIterations = options?.maxIterations ?? 10

  const result = await reflectionGraph.invoke(
    {
      messages: [
        new SystemMessage(SYSTEM_PROMPT),
        new HumanMessage(userQuestion),
      ],
    },
    {
      // agent + tools = 2 per iteration, + reflection + revise = 2 more
      recursionLimit: maxIterations * 2 + 3,
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

  const steps = [...result.steps]
  const hasReflection = steps.some((s) => s.type === "reflection")
  const wasRevised = hasReflection
    ? steps.filter((s) => s.type === "answer").length > 1
    : false

  // 토큰 사용량 추출
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
    wasRevised,
    usage: { totalInputTokens, totalOutputTokens },
  }
}
