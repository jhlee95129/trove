# Rung 1: Hello Claude

## 새로 이해한 원리

### messages.create()의 최소 단위
API 호출에 필요한 필수 파라미터는 3개뿐: `model`, `max_tokens`, `messages`.
- `max_tokens`는 기본값이 없다 — 반드시 명시해야 한다.
- `messages`는 `{ role, content }` 객체의 배열.

### content는 왜 배열인가
`content`의 본질은 **블록 배열**이다. 문자열을 넘기면 SDK가 `[{ type: "text", text: "..." }]`로 변환해준다.
배열인 이유: 하나의 메시지에 text, image, tool_use, tool_result 등 여러 종류의 콘텐츠가 공존할 수 있기 때문.

### stop_reason
- `end_turn`: 모델이 자발적으로 응답을 끝냄
- `max_tokens`: 토큰 한도에 도달해 잘림
- `tool_use`: 도구 호출을 요청 (Rung 3에서 체감)

### 왜 클라이언트에서 직접 SDK를 호출하면 안 되는가
- API 키가 브라우저에 노출됨 (`NEXT_PUBLIC_` 없이는 서버 전용)
- CORS 제한
- 요청/비용 통제 불가

→ 그래서 `app/api/chat/route.ts` (서버) → `fetch("/api/chat")` (클라이언트) 구조가 필요.

## 핵심 코드

```typescript
// lib/anthropic.ts — globalThis 싱글턴 (dev 모드 인스턴스 중복 방지)
const anthropic = globalForAnthropic.anthropic ?? new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// app/api/chat/route.ts — 가장 단순한 호출
const response = await anthropic.messages.create({
  model: "claude-haiku-4-5",
  max_tokens: 1024,
  messages: [{ role: "user", content: message }],
})
return NextResponse.json(response) // raw 응답 전체 반환
```

## 시행착오

- (직접 기록)

## 다음에 다시 본다면

- (직접 기록)
