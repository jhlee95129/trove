/**
 * Rung 5: 임베딩 플레이그라운드
 *
 * 실행: pnpm playground:embedding
 *
 * Part 1: 임베딩이란? — 텍스트 → 숫자 배열
 * Part 2: Cosine Similarity — 직접 구현
 * Part 3: 유사도 매트릭스 — 의미적 거리 실험
 */

import { embed } from "../lib/voyage"

// --- Cosine Similarity 직접 구현 ---

function dotProduct(a: number[], b: number[]): number {
  let sum = 0
  for (let i = 0; i < a.length; i++) {
    sum += a[i] * b[i]
  }
  return sum
}

function magnitude(v: number[]): number {
  let sum = 0
  for (let i = 0; i < v.length; i++) {
    sum += v[i] * v[i]
  }
  return Math.sqrt(sum)
}

function cosineSimilarity(a: number[], b: number[]): number {
  return dotProduct(a, b) / (magnitude(a) * magnitude(b))
}

// --- 실험용 문장들 ---

const sentences = [
  "고양이가 매트 위에 앉아 있다",
  "고양이가 카펫 위에 누워 있다",
  "강아지가 공원에서 뛰어놀고 있다",
  "주식 시장이 폭락했다",
  "인공지능이 세상을 바꾸고 있다",
]

// --- Main ---

async function main() {
  console.log("=== Part 1: 임베딩이란? ===\n")

  const [firstEmbedding] = await embed([sentences[0]])

  console.log(`입력: "${sentences[0]}"`)
  console.log(`차원 수: ${firstEmbedding.length}`)
  console.log(
    `처음 10개 값: [${firstEmbedding.slice(0, 10).map((v) => v.toFixed(4)).join(", ")}]`
  )
  console.log(
    `\n→ 임베딩 = 텍스트를 ${firstEmbedding.length}차원 공간의 한 점으로 매핑한 것. 숫자 배열일 뿐이다.\n`
  )

  // ---

  console.log("=== Part 2: Cosine Similarity ===\n")

  const embeddings = await embed(sentences)

  // 비슷한 쌍
  const sim01 = cosineSimilarity(embeddings[0], embeddings[1])
  console.log(`"${sentences[0]}" vs "${sentences[1]}"`)
  console.log(`→ similarity: ${sim01.toFixed(4)} (비슷한 의미)\n`)

  // 다른 쌍
  const sim03 = cosineSimilarity(embeddings[0], embeddings[3])
  console.log(`"${sentences[0]}" vs "${sentences[3]}"`)
  console.log(`→ similarity: ${sim03.toFixed(4)} (전혀 다른 의미)\n`)

  // 중간 쌍
  const sim02 = cosineSimilarity(embeddings[0], embeddings[2])
  console.log(`"${sentences[0]}" vs "${sentences[2]}"`)
  console.log(`→ similarity: ${sim02.toFixed(4)} (동물이라는 공통점)\n`)

  // ---

  console.log("=== Part 3: 유사도 매트릭스 ===\n")

  // 헤더
  const labels = sentences.map((_, i) => `문장${i + 1}`)
  const colWidth = 8
  const headerRow =
    "".padEnd(12) + labels.map((l) => l.padStart(colWidth)).join("")
  console.log(headerRow)

  // 매트릭스
  for (let i = 0; i < sentences.length; i++) {
    const row = labels[i].padEnd(12)
    const values = embeddings
      .map((_, j) =>
        cosineSimilarity(embeddings[i], embeddings[j])
          .toFixed(2)
          .padStart(colWidth)
      )
      .join("")
    console.log(row + values)
  }

  console.log(`\n문장 목록:`)
  sentences.forEach((s, i) => console.log(`  문장${i + 1}: "${s}"`))
}

main().catch(console.error)
