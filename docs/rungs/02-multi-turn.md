# Rung 2: 멀티턴 대화

## 새로 이해한 원리

### LLM은 stateless다
모델은 이전 대화를 "기억"하지 않는다. 매 호출마다 **전체 대화 히스토리**를 `messages` 배열로 보내야 한다.
"기억하는 것처럼 보이는" 이유: 클라이언트가 히스토리를 누적해서 매번 전부 보내기 때문.

### 대화 상태의 소유자
- 모델: stateless. 상태 없음.
- 클라이언트: `useState<Message[]>([])` — 배열에 user/assistant 메시지를 누적.
- 서버 (route.ts): 단순 패스스루. 받은 messages를 그대로 API에 전달.

### assistant 응답을 다시 넣는 패턴
```
1. user 메시지 추가 → messages = [...messages, { role: "user", content }]
2. 전체 배열 전송 → API 호출
3. 응답의 text 추출 → messages = [...messages, { role: "assistant", content: text }]
4. 다음 턴에 이 전체 배열을 다시 전송
```

### 토큰 누적
대화가 길어지면 `usage.input_tokens`가 턴마다 증가한다.
— 이것은 매번 전체 히스토리를 보내는 증거이자, context window 한계에 도달할 수 있다는 경고.

## 핵심 코드

```typescript
// 클라이언트: 전체 히스토리를 매번 전송
body: JSON.stringify({ messages: updatedMessages })

// 서버: 받은 messages를 그대로 전달
const response = await anthropic.messages.create({
  model: "claude-haiku-4-5",
  max_tokens: 1024,
  messages, // ← 전체 배열 그대로
})
```

## 시행착오

- (직접 기록)

## 다음에 다시 본다면

- (직접 기록)
