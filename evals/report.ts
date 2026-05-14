/**
 * Eval 리포트 생성.
 *
 * - 콘솔에 요약 출력
 * - JSON 파일로 저장 (evals/results/)
 * - 이전 리포트 대비 회귀 감지
 */

import { readFileSync, readdirSync, writeFileSync } from "fs"
import { join } from "path"

import type { AggregatedMetrics, EvalReport, EvalResult } from "./types"

const RESULTS_DIR = join(import.meta.dirname, "results")
const REGRESSION_THRESHOLD = 0.1

function aggregate(results: EvalResult[]): AggregatedMetrics {
  if (results.length === 0) {
    return {
      avgRecallAtK: 0,
      avgPrecisionAtK: 0,
      avgMrr: 0,
      avgFaithfulness: 0,
      avgRelevance: 0,
      avgCompleteness: 0,
    }
  }

  const n = results.length
  return {
    avgRecallAtK:
      results.reduce((s, r) => s + r.retrievalMetrics.recallAtK, 0) / n,
    avgPrecisionAtK:
      results.reduce((s, r) => s + r.retrievalMetrics.precisionAtK, 0) / n,
    avgMrr: results.reduce((s, r) => s + r.retrievalMetrics.mrr, 0) / n,
    avgFaithfulness:
      results.reduce((s, r) => s + r.generationMetrics.faithfulness.score, 0) /
      n,
    avgRelevance:
      results.reduce((s, r) => s + r.generationMetrics.relevance.score, 0) / n,
    avgCompleteness:
      results.reduce((s, r) => s + r.generationMetrics.completeness.score, 0) /
      n,
  }
}

function groupBy(
  results: EvalResult[],
  key: "category"
): Record<string, EvalResult[]> {
  const groups: Record<string, EvalResult[]> = {}
  for (const r of results) {
    const k = r[key]
    if (!groups[k]) groups[k] = []
    groups[k].push(r)
  }
  return groups
}

export function buildReport(
  pipeline: string,
  results: EvalResult[]
): EvalReport {
  const byCategory = groupBy(results, "category")
  const byCategoryAgg: Record<string, AggregatedMetrics> = {}
  for (const [cat, items] of Object.entries(byCategory)) {
    byCategoryAgg[cat] = aggregate(items)
  }

  return {
    pipeline,
    timestamp: new Date().toISOString(),
    totalQuestions: results.length,
    results,
    aggregate: aggregate(results),
    byCategory: byCategoryAgg,
  }
}

export function printReport(report: EvalReport): void {
  console.log(`\n${"=".repeat(60)}`)
  console.log(`  EVAL REPORT: ${report.pipeline}`)
  console.log(`  ${report.timestamp} | ${report.totalQuestions} questions`)
  console.log(`${"=".repeat(60)}\n`)

  // 전체 평균
  const a = report.aggregate
  console.log("--- Overall ---")
  console.log(
    `  Retrieval:  recall=${a.avgRecallAtK.toFixed(3)}  precision=${a.avgPrecisionAtK.toFixed(3)}  MRR=${a.avgMrr.toFixed(3)}`
  )
  console.log(
    `  Generation: faith=${a.avgFaithfulness.toFixed(2)}  relev=${a.avgRelevance.toFixed(2)}  compl=${a.avgCompleteness.toFixed(2)}`
  )

  // 카테고리별
  for (const [cat, agg] of Object.entries(report.byCategory)) {
    console.log(`\n--- ${cat} ---`)
    console.log(
      `  Retrieval:  recall=${agg.avgRecallAtK.toFixed(3)}  precision=${agg.avgPrecisionAtK.toFixed(3)}  MRR=${agg.avgMrr.toFixed(3)}`
    )
    console.log(
      `  Generation: faith=${agg.avgFaithfulness.toFixed(2)}  relev=${agg.avgRelevance.toFixed(2)}  compl=${agg.avgCompleteness.toFixed(2)}`
    )
  }

  // 실패 케이스
  const failures = report.results.filter(
    (r) => r.retrievalMetrics.recallAtK < 0.5
  )
  if (failures.length > 0) {
    console.log(`\n--- Low Recall (< 0.5) ---`)
    for (const f of failures) {
      console.log(
        `  [${f.goldenId}] recall=${f.retrievalMetrics.recallAtK.toFixed(3)} "${f.question.slice(0, 40)}..."`
      )
    }
  }

  console.log("")
}

export function saveReport(report: EvalReport): string {
  const filename = `${report.pipeline}_${report.timestamp.replace(/[:.]/g, "-")}.json`
  const filepath = join(RESULTS_DIR, filename)
  writeFileSync(filepath, JSON.stringify(report, null, 2))
  console.log(`Report saved: ${filepath}`)
  return filepath
}

/**
 * 이전 리포트와 비교하여 회귀를 감지한다.
 */
export function detectRegression(report: EvalReport): void {
  const files = readdirSync(RESULTS_DIR)
    .filter(
      (f) => f.startsWith(report.pipeline + "_") && f.endsWith(".json")
    )
    .sort()

  // 현재 리포트 파일 제외, 가장 최근 것
  const previousFiles = files.slice(0, -1)
  if (previousFiles.length === 0) {
    console.log("No previous report found for regression detection.\n")
    return
  }

  const prevPath = join(RESULTS_DIR, previousFiles[previousFiles.length - 1])
  const prev = JSON.parse(readFileSync(prevPath, "utf-8")) as EvalReport

  console.log(`\n--- Regression Check (vs ${previousFiles[previousFiles.length - 1]}) ---`)

  const checks: [string, number, number][] = [
    ["recall", report.aggregate.avgRecallAtK, prev.aggregate.avgRecallAtK],
    [
      "precision",
      report.aggregate.avgPrecisionAtK,
      prev.aggregate.avgPrecisionAtK,
    ],
    ["MRR", report.aggregate.avgMrr, prev.aggregate.avgMrr],
    [
      "faithfulness",
      report.aggregate.avgFaithfulness,
      prev.aggregate.avgFaithfulness,
    ],
    ["relevance", report.aggregate.avgRelevance, prev.aggregate.avgRelevance],
    [
      "completeness",
      report.aggregate.avgCompleteness,
      prev.aggregate.avgCompleteness,
    ],
  ]

  let regressionFound = false
  for (const [name, curr, prevVal] of checks) {
    const diff = curr - prevVal
    const marker =
      diff < -REGRESSION_THRESHOLD ? " ⚠ REGRESSION" : diff > 0.01 ? " ↑" : ""
    if (diff < -REGRESSION_THRESHOLD) regressionFound = true
    console.log(
      `  ${name}: ${prevVal.toFixed(3)} → ${curr.toFixed(3)} (${diff >= 0 ? "+" : ""}${diff.toFixed(3)})${marker}`
    )
  }

  if (regressionFound) {
    console.log("\n  ⚠ Regression detected! Review changes before deploying.\n")
  } else {
    console.log("\n  ✓ No regression detected.\n")
  }
}
