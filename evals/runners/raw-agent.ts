/**
 * Raw Agent 파이프라인 러너.
 *
 * lib/agent/react-raw.ts의 runReActAgent()를 호출하고,
 * agent steps에서 kb_search observation을 파싱하여
 * retrieval 메트릭에 사용할 검색 결과를 추출한다.
 */

import { runReActAgent } from "@/lib/agent/react-raw"

import type { PipelineResult, RetrievedDoc } from "../types"

/**
 * Agent의 kb_search observation에서 검색된 문서 정보를 파싱한다.
 *
 * executeKbSearch()의 출력 형식:
 *   [KB 1] (유사도: 0.842)
 *   <content>
 *
 *   [KB 2] (유사도: 0.756)
 *   <content>
 */
function parseKbObservation(observation: string): RetrievedDoc[] {
  const docs: RetrievedDoc[] = []
  const blocks = observation.split(/\[KB \d+\]/).filter((b) => b.trim())

  for (const block of blocks) {
    const simMatch = block.match(/\(유사도:\s*([\d.]+)\)/)
    const similarity = simMatch ? parseFloat(simMatch[1]) : 0
    const content = block.replace(/\(유사도:\s*[\d.]+\)\s*/, "").trim()

    docs.push({
      content,
      source: "unknown", // agent observation에는 source metadata가 없다
      similarity,
    })
  }

  return docs
}

export async function runRawAgent(question: string): Promise<PipelineResult> {
  const start = Date.now()

  const result = await runReActAgent(question, {
    maxIterations: 5,
    model: "claude-haiku-4-5-20251001",
  })

  // Agent steps에서 kb_search observation을 찾아 검색 결과 추출
  let retrievedDocs: RetrievedDoc[] = []
  for (const step of result.steps) {
    if (step.type === "observation" && step.toolName === "kb_search") {
      retrievedDocs = parseKbObservation(step.content)
      break // 첫 번째 kb_search 결과만 사용
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
