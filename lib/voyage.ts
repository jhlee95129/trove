// Voyage AI 임베딩 클라이언트 (SDK 없이 raw fetch — Principle First)

const VOYAGE_API_URL = "https://api.voyageai.com/v1/embeddings"
const MODEL = "voyage-3-large"

type VoyageResponse = {
  data: { embedding: number[] }[]
  usage: { total_tokens: number }
}

/**
 * 텍스트 배열을 임베딩 벡터 배열로 변환한다.
 * 각 텍스트가 고차원 벡터(숫자 배열)로 매핑된다.
 */
export async function embed(texts: string[]): Promise<number[][]> {
  const apiKey = process.env.VOYAGE_API_KEY
  if (!apiKey) {
    throw new Error("VOYAGE_API_KEY is not set")
  }

  const res = await fetch(VOYAGE_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      input: texts,
    }),
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Voyage API error ${res.status}: ${body}`)
  }

  const json = (await res.json()) as VoyageResponse
  return json.data.map((d) => d.embedding)
}
