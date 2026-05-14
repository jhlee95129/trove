/**
 * LangGraph Agent + Reflection 파이프라인 러너.
 */

import { runReActGraphWithReflection } from "@/lib/langgraph/react-graph-reflection"

import type { PipelineResult, RetrievedDoc } from "../types"

function parseKbObservation(observation: string): RetrievedDoc[] {
  const docs: RetrievedDoc[] = []
  const blocks = observation.split(/\[KB \d+\]/).filter((b) => b.trim())

  for (const block of blocks) {
    const simMatch = block.match(/\(유사도:\s*([\d.]+)\)/)
    const similarity = simMatch ? parseFloat(simMatch[1]) : 0
    const content = block.replace(/\(유사도:\s*[\d.]+\)\s*/, "").trim()

    docs.push({
      content,
      source: "unknown",
      similarity,
    })
  }

  return docs
}

export async function runLanggraphAgentReflection(
  question: string
): Promise<PipelineResult> {
  const start = Date.now()

  const result = await runReActGraphWithReflection(question, {
    maxIterations: 5,
  })

  let retrievedDocs: RetrievedDoc[] = []
  for (const step of result.steps) {
    if (step.type === "observation" && step.toolName === "kb_search") {
      retrievedDocs = parseKbObservation(step.content)
      break
    }
  }

  return {
    answer: result.answer,
    retrievedDocs,
    latencyMs: Date.now() - start,
    tokenUsage: {
      inputTokens: result.usage.totalInputTokens,
      outputTokens: result.usage.totalOutputTokens,
    },
  }
}
