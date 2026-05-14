import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters"

/**
 * LangChain이 추상화하는 것:
 * - 재귀적 분할 로직 (splitRecursive, splitBySize, applyOverlap)
 * - Separator 우선순위 처리
 * - Overlap 적용
 *
 * 비교: lib/rag/chunking.ts (108줄의 재귀 로직) → 여기서는 설정 객체 하나
 */
export const textSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: 500,
  chunkOverlap: 50,
  separators: ["\n\n", "\n", ". ", " ", ""],
})
