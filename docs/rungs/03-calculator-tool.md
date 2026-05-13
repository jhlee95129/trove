# Rung 3: 첫 도구 — 계산기

## 새로 이해한 원리

### LLM은 도구를 "호출"하지 않는다
모델은 `tool_use` JSON 블록을 **출력**할 뿐이다. 실제 실행은 호스트(우리 서버)가 한다.
"도구 호출"이라는 표현은 은유일 뿐, 실제로는:
1. 모델이 `{ type: "tool_use", name: "calculator", input: { operation: "multiply", a: 123, b: 456 } }` JSON을 생성
2. 호스트가 이 JSON을 파싱해서 실제 함수를 실행
3. 결과를 `tool_result` 블록으로 messages에 추가
4. 다시 모델 호출

### tool_use 루프
```
messages.create(tools 포함)
  → stop_reason === "tool_use"?
    → Yes: tool_use 블록 파싱 → 실행 → tool_result 추가 → 재호출 (while 루프)
    → No (end_turn): 최종 응답 반환
```

이것이 ReAct 패턴(Thought → Action → Observation)의 원형이다.

### Tool Schema = 모델에 대한 계약서
- `name`: 도구 식별자 (우리가 자유롭게 지정)
- `description`: 모델이 "이 도구를 쓸지 말지" 판단하는 핵심 근거
- `input_schema`: JSON Schema 표준. 모델은 이 스키마에 맞는 JSON을 생성

description을 어떻게 쓰느냐에 따라 모델의 도구 사용 빈도가 달라진다.

### tool_result의 위치
tool_result는 `role: "user"`로 추가한다.
```
messages: [
  { role: "user", content: "123 * 456은?" },
  { role: "assistant", content: [TextBlock, ToolUseBlock] },  // 모델 응답
  { role: "user", content: [ToolResultBlock] },               // 실행 결과
  { role: "assistant", content: [TextBlock] },                 // 최종 답변
]
```

## 핵심 코드

```typescript
// calculator.ts — 도구 정의 (스키마)
export const calculatorTool: Anthropic.Tool = {
  name: "calculator",
  description: "사칙연산을 수행한다...",
  input_schema: { type: "object", properties: { operation, a, b }, required: [...] }
}

// calculator.ts — 실행 함수 (모델은 이 존재를 모른다)
export function executeCalculator(input): string { ... }

// loop.ts — while 루프
while (iterations < MAX_ITERATIONS) {
  const response = await anthropic.messages.create({ messages, tools })
  if (response.stop_reason !== "tool_use") return response
  // tool_use 블록 파싱 → 실행 → tool_result 추가 → 반복
}
```

## 시행착오

- (직접 기록)

## 다음에 다시 본다면

- (직접 기록)
