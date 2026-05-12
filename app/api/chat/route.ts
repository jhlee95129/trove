import { NextRequest, NextResponse } from "next/server"

import { calculatorTool, executeCalculator } from "@/lib/tools/calculator"
import { runToolLoop, type ToolExecutors } from "@/lib/tools/loop"

const tools = [calculatorTool]

const executors: ToolExecutors = {
  calculator: (input) =>
    executeCalculator(
      input as { operation: "add" | "subtract" | "multiply" | "divide"; a: number; b: number }
    ),
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

  // tool_use 루프: 모델이 도구 호출을 요청하면 실행 후 재호출, end_turn까지 반복
  const response = await runToolLoop(messages, tools, executors)

  return NextResponse.json(response)
}
