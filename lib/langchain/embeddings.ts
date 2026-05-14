import { VoyageEmbeddings } from "@langchain/community/embeddings/voyage"

/**
 * LangChain이 추상화하는 것:
 * - Voyage API에 대한 HTTP fetch 호출
 * - 배치 처리 (batchSize로 자동 분할)
 * - Embeddings 인터페이스 (embedDocuments + embedQuery)
 *
 * 비교: lib/voyage.ts (40줄의 raw fetch) → 여기서는 5줄 설정
 */
export const voyageEmbeddings = new VoyageEmbeddings({
  apiKey: process.env.VOYAGE_API_KEY,
  modelName: "voyage-3-large",
})
