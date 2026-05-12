import { NextRequest, NextResponse } from "next/server"

import { anthropic } from "@/lib/anthropic"

export async function POST(request: NextRequest) {
  const { message } = (await request.json()) as { message: string }

  if (!message || typeof message !== "string") {
    return NextResponse.json(
      { error: "message is required" },
      { status: 400 }
    )
  }

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: message,
      },
    ],
  })

  // raw 응답 전체를 그대로 반환 — content 블록 배열, stop_reason, usage 등을 학습용으로 확인
  return NextResponse.json(response)
}
