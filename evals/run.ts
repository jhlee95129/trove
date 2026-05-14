/**
 * Eval Harness 메인 진입점.
 *
 * 사용법:
 *   pnpm eval                            # 전체 3개 파이프라인
 *   pnpm eval -- --pipeline=raw-rag      # 특정 파이프라인만
 *   pnpm eval -- --limit=5              # 처음 5개만
 *   pnpm eval -- --pipeline=raw-rag --limit=3
 */

import { readFileSync } from "fs"
import { join } from "path"

import { computeGenerationMetrics } from "./metrics/generation"
import { computeRetrievalMetrics } from "./metrics/retrieval"
import { buildReport, detectRegression, printReport, saveReport } from "./report"
import { runLangchainRag } from "./runners/langchain-rag"
import { runLanggraphAgentReflection } from "./runners/langgraph-agent-reflection"
import { runRawAgent } from "./runners/raw-agent"
import { runRawAgentReflection } from "./runners/raw-agent-reflection"
import { runRawRag } from "./runners/raw-rag"
import type { EvalResult, GoldenEntry, PipelineResult } from "./types"

// --- CLI 인자 파싱 ---

function parseArgs(): { pipelines: string[]; limit: number } {
  const args = process.argv.slice(2)
  let pipelines: string[] = []
  let limit = Infinity

  for (const arg of args) {
    if (arg.startsWith("--pipeline=")) {
      pipelines = [arg.split("=")[1]]
    } else if (arg.startsWith("--limit=")) {
      limit = parseInt(arg.split("=")[1], 10)
    }
  }

  if (pipelines.length === 0) {
    pipelines = ["raw-rag", "langchain-rag", "raw-agent"]
  }

  return { pipelines, limit }
}

// --- 파이프라인 매핑 ---

type PipelineRunner = (question: string) => Promise<PipelineResult>

const RUNNERS: Record<string, PipelineRunner> = {
  "raw-rag": runRawRag,
  "langchain-rag": runLangchainRag,
  "raw-agent": runRawAgent,
  "raw-agent-reflection": runRawAgentReflection,
  "langgraph-agent-reflection": runLanggraphAgentReflection,
}

// --- 골든셋 로드 ---

function loadGoldenSet(limit: number): GoldenEntry[] {
  const raw = readFileSync(
    join(import.meta.dirname, "golden-set.json"),
    "utf-8"
  )
  const entries = JSON.parse(raw) as GoldenEntry[]
  return entries.slice(0, limit)
}

// --- 단일 질문 평가 ---

async function evaluateOne(
  entry: GoldenEntry,
  pipeline: string,
  runner: PipelineRunner
): Promise<EvalResult> {
  console.log(`  [${entry.id}] "${entry.question.slice(0, 40)}..."`)

  // 1. 파이프라인 실행
  const result = await runner(entry.question)

  // 2. Retrieval 메트릭
  const retrievalMetrics = computeRetrievalMetrics(
    result.retrievedDocs,
    entry.expectedSources
  )

  // 3. Generation 메트릭 (LLM-as-judge)
  const generationMetrics = await computeGenerationMetrics(
    entry.question,
    result.answer,
    result.retrievedDocs,
    entry.keyPoints
  )

  console.log(
    `         recall=${retrievalMetrics.recallAtK.toFixed(2)} faith=${generationMetrics.faithfulness.score} relev=${generationMetrics.relevance.score} compl=${generationMetrics.completeness.score} (${result.latencyMs}ms)`
  )

  return {
    goldenId: entry.id,
    question: entry.question,
    category: entry.category,
    pipeline,
    pipelineResult: result,
    retrievalMetrics,
    generationMetrics,
  }
}

// --- Main ---

async function main() {
  const { pipelines, limit } = parseArgs()
  const goldenSet = loadGoldenSet(limit)

  console.log(`\nEval Harness`)
  console.log(`Pipelines: ${pipelines.join(", ")}`)
  console.log(`Questions: ${goldenSet.length}\n`)

  for (const pipeline of pipelines) {
    const runner = RUNNERS[pipeline]
    if (!runner) {
      console.error(`Unknown pipeline: ${pipeline}`)
      continue
    }

    console.log(`\n--- Running: ${pipeline} ---`)

    const results: EvalResult[] = []
    for (const entry of goldenSet) {
      const result = await evaluateOne(entry, pipeline, runner)
      results.push(result)
    }

    const report = buildReport(pipeline, results)
    printReport(report)
    saveReport(report)
    detectRegression(report)
  }
}

main().catch(console.error)
