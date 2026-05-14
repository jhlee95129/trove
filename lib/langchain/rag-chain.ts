import { ChatAnthropic } from "@langchain/anthropic"
import type { Document } from "@langchain/core/documents"
import { StringOutputParser } from "@langchain/core/output_parsers"
import { ChatPromptTemplate } from "@langchain/core/prompts"
import {
  RunnablePassthrough,
  RunnableSequence,
} from "@langchain/core/runnables"

import { vectorStore } from "./vector-store"

/**
 * LCEL (LangChain Expression Language) RAG 체인.
 *
 * LCEL의 핵심 개념:
 * 1. Runnable 인터페이스: 모든 컴포넌트가 invoke(input) → output
 * 2. Pipe 조합: .pipe()로 Runnable을 순차 연결
 * 3. RunnablePassthrough: 입력을 그대로 다음으로 전달
 * 4. RunnableSequence: 여러 Runnable을 하나의 체인으로 구성
 *
 * 체인 구조:
 * question → { context: retriever→format, question: passthrough }
 *          → prompt template
 *          → Claude model
 *          → string output
 *
 * 비교: app/api/chat/route.ts에서는 이것을 명령형으로 구현:
 *   const docs = await searchSimilar(query, 3)
 *   const system = `...${context}...`
 *   const response = await runToolLoop(messages, tools, executors, system)
 */

const model = new ChatAnthropic({
  model: "claude-haiku-4-5",
  maxTokens: 1024,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
})

// VectorStore → Retriever (Runnable 인터페이스로 변환)
const retriever = vectorStore.asRetriever({ k: 3 })

const prompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    `다음 문서를 참고하여 답변하세요. 답변에 사용한 문서는 [출처: N] 형식으로 인용하세요.
문서에 관련 내용이 없으면 일반 지식으로 답변해도 됩니다.

{context}`,
  ],
  ["human", "{question}"],
])

function formatDocs(docs: Document[]): string {
  return docs
    .map((doc, i) => `[문서 ${i + 1}] ${doc.pageContent}`)
    .join("\n\n")
}

/**
 * RAG 체인: LCEL 선언적 조합.
 *
 * invoke({ question: "..." }) → string 답변
 */
export const ragChain = RunnableSequence.from([
  {
    context: retriever.pipe(formatDocs),
    question: new RunnablePassthrough(),
  },
  prompt,
  model,
  new StringOutputParser(),
])

/**
 * 편의 함수: raw API 패턴과 동일한 인터페이스.
 */
export async function askWithRag(question: string): Promise<string> {
  return ragChain.invoke({ question })
}
