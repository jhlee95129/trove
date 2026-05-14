/**
 * Raw Agent vs LangGraph Agent 비교 스크립트.
 *
 * 동일한 질문을 양쪽 구현에 보내고, 결과를 비교한다.
 *
 * 실행: pnpm compare:agent
 */

import { runReActGraph } from "../lib/langgraph/react-graph"
import { runReActAgent } from "../lib/agent/react-raw"

async function main() {
  const question = "123 * 456은 얼마인가요?"

  console.log(`질문: "${question}"\n`)

  // --- Raw Agent ---
  console.log("=== Raw Agent ===")
  const t1 = Date.now()
  const rawResult = await runReActAgent(question, { maxIterations: 5 })
  const rawTime = Date.now() - t1

  console.log(`소요 시간: ${rawTime}ms`)
  console.log(`반복 횟수: ${rawResult.iterationCount}`)
  console.log(
    `토큰: input=${rawResult.usage.totalInputTokens}, output=${rawResult.usage.totalOutputTokens}`
  )
  console.log(`단계 수: ${rawResult.steps.length}`)
  for (const step of rawResult.steps) {
    console.log(`  [${step.type}] ${step.content.slice(0, 100)}`)
  }
  console.log(`답변: ${rawResult.answer.slice(0, 200)}`)

  // --- LangGraph Agent ---
  console.log("\n=== LangGraph Agent ===")
  const t2 = Date.now()
  const graphResult = await runReActGraph(question, { maxIterations: 5 })
  const graphTime = Date.now() - t2

  console.log(`소요 시간: ${graphTime}ms`)
  console.log(`반복 횟수: ${graphResult.iterationCount}`)
  console.log(
    `토큰: input=${graphResult.usage.totalInputTokens}, output=${graphResult.usage.totalOutputTokens}`
  )
  console.log(`단계 수: ${graphResult.steps.length}`)
  for (const step of graphResult.steps) {
    console.log(`  [${step.type}] ${step.content.slice(0, 100)}`)
  }
  console.log(`답변: ${graphResult.answer.slice(0, 200)}`)

  // --- 비교 요약 ---
  console.log("\n=== 비교 요약 ===")
  console.log(`속도: Raw ${rawTime}ms vs LangGraph ${graphTime}ms`)
  console.log(
    `반복: Raw ${rawResult.iterationCount} vs LangGraph ${graphResult.iterationCount}`
  )
  console.log(
    `토큰: Raw ${rawResult.usage.totalInputTokens + rawResult.usage.totalOutputTokens} vs LangGraph ${graphResult.usage.totalInputTokens + graphResult.usage.totalOutputTokens}`
  )
}

main().catch(console.error)
