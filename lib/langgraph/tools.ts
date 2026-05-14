/**
 * LangChain 도구 래퍼.
 *
 * raw 도구의 executor 함수를 재사용하면서
 * LangChain tool() + Zod 스키마로 래핑한다.
 *
 * 왜 필요한가?
 * - LangGraph의 ToolNode는 LangChain BaseTool 인터페이스(invoke 메서드)를 요구한다.
 * - raw Anthropic 도구는 JSON Schema + executor 함수 → invoke()가 없다.
 * - tool()은 "함수"를 "LangGraph가 라우팅할 수 있는 Runnable"로 변환한다.
 *
 * 비교: Anthropic JSON Schema vs Zod Schema
 * - 역할은 동일: "이 도구는 어떤 인자를 받는가"를 모델에게 알려준다.
 * - Zod는 런타임 유효성 검증을 추가로 제공한다.
 */

import { tool } from "@langchain/core/tools"
import { z } from "zod"

import { executeCalculator } from "@/lib/tools/calculator"
import { executeWebFetch } from "@/lib/tools/web-fetch"
import { executeWebSearch } from "@/lib/tools/web-search"

import { executeKbSearch } from "@/lib/agent/tools"

export const calculatorLcTool = tool(
  async ({ operation, a, b }) => {
    return executeCalculator({ operation, a, b })
  },
  {
    name: "calculator",
    description:
      "사칙연산을 수행한다. 수학 계산이 필요할 때 반드시 이 도구를 사용한다.",
    schema: z.object({
      operation: z
        .enum(["add", "subtract", "multiply", "divide"])
        .describe("수행할 연산"),
      a: z.number().describe("첫 번째 숫자"),
      b: z.number().describe("두 번째 숫자"),
    }),
  }
)

export const webSearchLcTool = tool(
  async ({ query }) => {
    return executeWebSearch({ query })
  },
  {
    name: "web_search",
    description:
      "웹에서 최신 정보를 검색한다. 사용자의 질문이 실시간 정보, 최신 뉴스, 사실 확인이 필요할 때 사용한다.",
    schema: z.object({
      query: z.string().describe("검색할 질문 또는 키워드"),
    }),
  }
)

export const webFetchLcTool = tool(
  async ({ url }) => {
    return executeWebFetch({ url })
  },
  {
    name: "web_fetch",
    description:
      "URL의 웹페이지 내용을 가져온다. 검색 결과에서 특정 페이지의 상세 내용을 읽고 싶을 때 사용한다.",
    schema: z.object({
      url: z.string().describe("가져올 웹페이지의 URL"),
    }),
  }
)

export const kbSearchLcTool = tool(
  async ({ query, k }) => {
    return executeKbSearch({ query, k })
  },
  {
    name: "kb_search",
    description:
      "개인 지식 베이스(Knowledge Base)에서 의미적으로 유사한 문서를 검색한다. " +
      "이전에 저장된 PDF, 노트, 과거 리서치 결과에서 관련 정보를 찾을 때 사용한다. " +
      "웹 검색 전에 먼저 KB를 확인하면 더 빠르고 신뢰할 수 있는 답변을 얻을 수 있다.",
    schema: z.object({
      query: z.string().describe("검색할 질문 또는 키워드"),
      k: z.number().optional().default(3).describe("반환할 최대 문서 수"),
    }),
  }
)

export const allLangchainTools = [
  calculatorLcTool,
  webSearchLcTool,
  webFetchLcTool,
  kbSearchLcTool,
]
