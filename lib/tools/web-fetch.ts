import type Anthropic from "@anthropic-ai/sdk"

// --- Tool Schema ---
export const webFetchTool: Anthropic.Tool = {
  name: "web_fetch",
  description:
    "URL의 웹페이지 내용을 가져온다. 검색 결과에서 특정 페이지의 상세 내용을 읽고 싶을 때 사용한다.",
  input_schema: {
    type: "object" as const,
    properties: {
      url: {
        type: "string",
        description: "가져올 웹페이지의 URL",
      },
    },
    required: ["url"],
  },
}

// --- Tool Executor ---
const MAX_CONTENT_LENGTH = 3000

// 간단한 HTML → 텍스트 변환 (태그 제거)
function stripHtml(html: string): string {
  return html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

export async function executeWebFetch(input: {
  url: string
}): Promise<string> {
  try {
    const res = await fetch(input.url, {
      headers: {
        "User-Agent": "Trove/1.0 (AI Research Notebook)",
      },
    })

    if (!res.ok) {
      return `Error: HTTP ${res.status} from ${input.url}`
    }

    const html = await res.text()
    const text = stripHtml(html)

    // 토큰 비용 방지: 큰 페이지는 잘라서 반환
    if (text.length > MAX_CONTENT_LENGTH) {
      return text.slice(0, MAX_CONTENT_LENGTH) + "\n\n[... truncated]"
    }

    return text
  } catch {
    return `Error: Failed to fetch ${input.url}`
  }
}
