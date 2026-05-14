import { NextRequest, NextResponse } from "next/server"

import { runReActAgentWithReflection } from "@/lib/agent/react-reflection"

type AgentRequest = {
  question: string
  maxIterations?: number
}

export async function POST(request: NextRequest) {
  const { question, maxIterations } = (await request.json()) as AgentRequest

  if (!question?.trim()) {
    return NextResponse.json(
      { error: "question is required" },
      { status: 400 }
    )
  }

  const result = await runReActAgentWithReflection(question, { maxIterations })
  return NextResponse.json(result)
}
