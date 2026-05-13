import { NextRequest, NextResponse } from "next/server"

import { searchSimilar } from "@/lib/rag/retrieve"
import { calculatorTool, executeCalculator } from "@/lib/tools/calculator"
import { runToolLoop, type ToolExecutors } from "@/lib/tools/loop"
import { executeWebFetch, webFetchTool } from "@/lib/tools/web-fetch"
import { executeWebSearch, webSearchTool } from "@/lib/tools/web-search"

const tools = [calculatorTool, webSearchTool, webFetchTool]

const executors: ToolExecutors = {
  calculator: (input) =>
    executeCalculator(
      input as {
        operation: "add" | "subtract" | "multiply" | "divide"
        a: number
        b: number
      }
    ),
  web_search: (input) =>
    executeWebSearch(input as { query: string }),
  web_fetch: (input) =>
    executeWebFetch(input as { url: string }),
}

type Message = {
  role: "user" | "assistant"
  content: string
}

export async function POST(request: NextRequest) {
  const { messages } = (await request.json()) as { messages: Message[] }

  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json(
      { error: "messages array is required" },
      { status: 400 }
    )
  }

  // RAG: 사용자의 마지막 메시지로 벡터 검색 → 컨텍스트 주입
  const lastUserMessage = messages[messages.length - 1].content
  const docs = await searchSimilar(lastUserMessage, 3)

  let system: string | undefined
  if (docs.length > 0) {
    const context = docs
      .map((d, i) => `[문서 ${i + 1}] ${d.content}`)
      .join("\n\n")
    system = `다음 문서를 참고하여 답변하세요. 답변에 사용한 문서는 [출처: N] 형식으로 인용하세요. 문서에 관련 내용이 없으면 일반 지식으로 답변해도 됩니다.\n\n${context}`
  }

  const response = await runToolLoop(messages, tools, executors, system)

  return NextResponse.json(response)
}
