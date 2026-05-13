# Rung 4: 웹 검색 도구

## 새로 이해한 원리

### LLM은 인터넷에 접속할 수 없다
모델은 텍스트 생성기일 뿐이다. HTTP 요청, 네트워크 접속 — 전부 불가능.
"ChatGPT가 검색한다"는 것도 내부에서 우리와 같은 도구를 붙여놓은 것이다.

### 도구를 조합하면 능력이 확장된다
- `web_search`: 키워드 → 검색 결과 (URL + 요약)
- `web_fetch`: URL → 페이지 내용 (HTML → 텍스트)
- 모델이 상황에 따라 하나만 쓰거나, 순서대로 연쇄 호출한다.

```
"Python 3.13 새 기능 알려줘"
  → web_search({ query: "Python 3.13 new features" })
  → 검색 결과에서 URL 발견
  → web_fetch({ url: "https://docs.python.org/..." })
  → 상세 내용으로 답변 생성
```

### 도구 선택은 description 기반
3개 도구(calculator, web_search, web_fetch)를 등록하면 모델이 description을 읽고 상황에 맞는 도구를 고른다.
- "123 * 456은?" → calculator
- "최신 뉴스 알려줘" → web_search
- "이 URL 요약해줘" → web_fetch

### 비동기 executor
외부 API를 호출하는 도구는 `async`여야 한다.
```typescript
// Before (Rung 3): 동기만 지원
type ToolExecutors = Record<string, (input) => string>

// After (Rung 4): 비동기도 지원
type ToolExecutors = Record<string, (input) => string | Promise<string>>
```
executor 호출 부분에 `await` 추가.

### Principle First, Framework Second
Anthropic 빌트인 `web_search` 도구나 Vercel AI SDK를 쓰면 한 줄이면 되지만, 직접 만들어봤기 때문에 내부 동작을 이해한다.

## 핵심 코드

```typescript
// web-search.ts — Tavily API로 검색 (SDK 없이 raw fetch)
const res = await fetch("https://api.tavily.com/search", {
  method: "POST",
  body: JSON.stringify({ api_key: apiKey, query: input.query, max_results: 5 }),
})
// 결과: [1] 제목\nURL: ...\n요약 형태로 정리

// web-fetch.ts — URL 내용 가져오기
const html = await res.text()
const text = stripHtml(html)  // 태그 제거
// 3000자 제한으로 토큰 비용 방지

// route.ts — 도구 3개 등록
const tools = [calculatorTool, webSearchTool, webFetchTool]
const executors = { calculator: ..., web_search: ..., web_fetch: ... }
```

## 시행착오

- (직접 기록)

## 다음에 다시 본다면

- (직접 기록)
