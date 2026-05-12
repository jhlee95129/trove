import { NextRequest, NextResponse } from "next/server"

import { anthropic } from "@/lib/anthropic"

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

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 1024,
    messages,
  })

  // raw 응답 전체를 그대로 반환 — 클라이언트가 content 블록과 usage를 직접 확인
  return NextResponse.json(response)
}
