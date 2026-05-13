import type Anthropic from "@anthropic-ai/sdk"

// --- Tool Schema ---
export const webSearchTool: Anthropic.Tool = {
  name: "web_search",
  description:
    "웹에서 최신 정보를 검색한다. 사용자의 질문이 실시간 정보, 최신 뉴스, 사실 확인이 필요할 때 사용한다.",
  input_schema: {
    type: "object" as const,
    properties: {
      query: {
        type: "string",
        description: "검색할 질문 또는 키워드",
      },
    },
    required: ["query"],
  },
}

// --- Tool Executor ---
type TavilyResult = {
  title: string
  url: string
  content: string
}

type TavilyResponse = {
  results: TavilyResult[]
}

export async function executeWebSearch(input: {
  query: string
}): Promise<string> {
  const apiKey = process.env.TAVILY_API_KEY
  if (!apiKey) {
    return "Error: TAVILY_API_KEY is not set"
  }

  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query: input.query,
      max_results: 5,
    }),
  })

  if (!res.ok) {
    return `Error: Tavily API returned ${res.status}`
  }

  const data = (await res.json()) as TavilyResponse

  // 검색 결과를 모델이 읽기 좋은 텍스트로 정리
  return data.results
    .map(
      (r, i) => `[${i + 1}] ${r.title}\nURL: ${r.url}\n${r.content}`
    )
    .join("\n\n")
}
