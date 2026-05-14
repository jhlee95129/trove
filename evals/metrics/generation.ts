/**
 * Generation 메트릭 — LLM-as-judge.
 *
 * claude-haiku-4-5로 3가지 평가를 독립 수행:
 * - faithfulness: 답변이 컨텍스트에 근거하는가?
 * - relevance: 질문에 답하고 있는가?
 * - completeness: key_points를 모두 다루는가?
 */

import { anthropic } from "@/lib/anthropic"

import type { GenerationMetrics, RetrievedDoc } from "../types"

const JUDGE_MODEL = "claude-haiku-4-5-20251001"

type JudgeResult = { score: number; rationale: string }

async function judge(prompt: string): Promise<JudgeResult> {
  const response = await anthropic.messages.create({
    model: JUDGE_MODEL,
    max_tokens: 256,
    messages: [{ role: "user", content: prompt }],
  })

  const text =
    response.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("") ?? ""

  // 응답에서 점수와 근거를 파싱한다.
  // 기대 형식: "SCORE: N\nRATIONALE: ..."
  const scoreMatch = text.match(/SCORE:\s*(\d)/i)
  const rationaleMatch = text.match(/RATIONALE:\s*([\s\S]*)/i)

  return {
    score: scoreMatch ? parseInt(scoreMatch[1], 10) : 3,
    rationale: rationaleMatch ? rationaleMatch[1].trim() : text.trim(),
  }
}

function faithfulnessPrompt(
  question: string,
  answer: string,
  context: string
): string {
  return `You are an impartial evaluator. Rate the FAITHFULNESS of the answer on a scale of 1-5.

Faithfulness measures whether the answer is grounded in the provided context. A faithful answer only contains claims supported by the context.

QUESTION: ${question}

CONTEXT:
${context}

ANSWER: ${answer}

Scoring guide:
1 = Completely unfaithful, makes claims not in the context
2 = Mostly unfaithful, several unsupported claims
3 = Mixed, some claims supported, some not
4 = Mostly faithful, minor unsupported details
5 = Completely faithful, all claims grounded in context

Respond EXACTLY in this format:
SCORE: <1-5>
RATIONALE: <brief explanation>`
}

function relevancePrompt(question: string, answer: string): string {
  return `You are an impartial evaluator. Rate the RELEVANCE of the answer on a scale of 1-5.

Relevance measures whether the answer actually addresses the question asked.

QUESTION: ${question}

ANSWER: ${answer}

Scoring guide:
1 = Completely irrelevant, does not address the question
2 = Mostly irrelevant, tangentially related
3 = Partially relevant, addresses some aspects
4 = Mostly relevant, addresses the main question
5 = Perfectly relevant, directly and fully addresses the question

Respond EXACTLY in this format:
SCORE: <1-5>
RATIONALE: <brief explanation>`
}

function completenessPrompt(
  question: string,
  answer: string,
  keyPoints: string[]
): string {
  if (keyPoints.length === 0) {
    return `You are an impartial evaluator. Rate the COMPLETENESS of the answer on a scale of 1-5.

The question has no expected key points (it may be out of scope). Rate based on whether the answer appropriately handles the situation (e.g., acknowledging lack of information).

QUESTION: ${question}

ANSWER: ${answer}

Scoring guide:
1 = Poor handling
3 = Adequate handling
5 = Excellent handling

Respond EXACTLY in this format:
SCORE: <1-5>
RATIONALE: <brief explanation>`
  }

  return `You are an impartial evaluator. Rate the COMPLETENESS of the answer on a scale of 1-5.

Completeness measures whether the answer covers all expected key points.

QUESTION: ${question}

ANSWER: ${answer}

EXPECTED KEY POINTS:
${keyPoints.map((p, i) => `${i + 1}. ${p}`).join("\n")}

Scoring guide:
1 = Covers none of the key points
2 = Covers few key points
3 = Covers about half
4 = Covers most key points
5 = Covers all key points

Respond EXACTLY in this format:
SCORE: <1-5>
RATIONALE: <brief explanation>`
}

/**
 * 생성 품질 메트릭을 LLM-as-judge로 평가한다.
 * 3가지 평가를 병렬로 수행하여 속도를 높인다.
 */
export async function computeGenerationMetrics(
  question: string,
  answer: string,
  retrievedDocs: RetrievedDoc[],
  keyPoints: string[]
): Promise<GenerationMetrics> {
  const context = retrievedDocs
    .map((d, i) => `[${i + 1}] ${d.content}`)
    .join("\n\n")

  const [faithfulness, relevance, completeness] = await Promise.all([
    judge(faithfulnessPrompt(question, answer, context)),
    judge(relevancePrompt(question, answer)),
    judge(completenessPrompt(question, answer, keyPoints)),
  ])

  return { faithfulness, relevance, completeness }
}
