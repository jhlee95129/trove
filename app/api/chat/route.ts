import { NextRequest, NextResponse } from "next/server"

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

  const response = await runToolLoop(messages, tools, executors)

  return NextResponse.json(response)
}
