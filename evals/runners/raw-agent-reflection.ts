/**
 * Raw Agent + Reflection 파이프라인 러너.
 *
 * raw-agent.ts와 동일하되 runReActAgentWithReflection 사용.
 */

import { runReActAgentWithReflection } from "@/lib/agent/react-reflection"

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

export async function runRawAgentReflection(
  question: string
): Promise<PipelineResult> {
  const start = Date.now()

  const result = await runReActAgentWithReflection(question, {
    maxIterations: 5,
    model: "claude-haiku-4-5-20251001",
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
