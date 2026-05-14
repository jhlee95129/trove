import type Anthropic from "@anthropic-ai/sdk"

import { searchSimilar } from "@/lib/rag/retrieve"
import { calculatorTool, executeCalculator } from "@/lib/tools/calculator"
import type { ToolExecutors } from "@/lib/tools/loop"
import { executeWebFetch, webFetchTool } from "@/lib/tools/web-fetch"
import { executeWebSearch, webSearchTool } from "@/lib/tools/web-search"

// --- 새 도구: kb_search ---
// Rung 7에서는 RAG가 "항상 실행"(always-on)이었다.
// Agent에서는 이것을 도구로 만들어, 모델이 "검색할지 말지" 스스로 판단한다.
// 이것이 agent의 자율성이다.
export const kbSearchTool: Anthropic.Tool = {
  name: "kb_search",
  description:
    "개인 지식 베이스(Knowledge Base)에서 의미적으로 유사한 문서를 검색한다. " +
    "이전에 저장된 PDF, 노트, 과거 리서치 결과에서 관련 정보를 찾을 때 사용한다. " +
    "웹 검색 전에 먼저 KB를 확인하면 더 빠르고 신뢰할 수 있는 답변을 얻을 수 있다.",
  input_schema: {
    type: "object" as const,
    properties: {
      query: {
        type: "string",
        description: "검색할 질문 또는 키워드",
      },
      k: {
        type: "number",
        description: "반환할 최대 문서 수 (기본값: 3)",
      },
    },
    required: ["query"],
  },
}

export async function executeKbSearch(input: {
  query: string
  k?: number
}): Promise<string> {
  try {
    const results = await searchSimilar(input.query, input.k ?? 3)

    if (results.length === 0) {
      return "KB에서 관련 문서를 찾지 못했습니다."
    }

    return results
      .map(
        (r, i) =>
          `[KB ${i + 1}] (유사도: ${r.similarity.toFixed(3)})\n${r.content}`
      )
      .join("\n\n")
  } catch (error) {
    return `KB 검색 오류: ${error instanceof Error ? error.message : "unknown"}`
  }
}

// --- 에이전트용 도구 + 실행기 모음 ---
export const agentTools: Anthropic.Tool[] = [
  calculatorTool,
  webSearchTool,
  webFetchTool,
  kbSearchTool,
]

export const agentExecutors: ToolExecutors = {
  calculator: (input) =>
    executeCalculator(
      input as {
        operation: "add" | "subtract" | "multiply" | "divide"
        a: number
        b: number
      }
    ),
  web_search: (input) => executeWebSearch(input as { query: string }),
  web_fetch: (input) => executeWebFetch(input as { url: string }),
  kb_search: (input) =>
    executeKbSearch(input as { query: string; k?: number }),
}
