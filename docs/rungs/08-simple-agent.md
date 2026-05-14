# Rung 8: 간단한 Agent

## 새로 이해한 원리

### Agent = while 루프 + 상태 + 종료 조건

Agent는 마법이 아니다. 코드로 분해하면:
- **while 루프**: `while (iteration < max)` — 반복의 구조
- **상태**: messages(누적), steps(누적), plan(덮어쓰기), iterationCount(덮어쓰기)
- **종료 조건**: `stop_reason !== "tool_use"` 또는 maxIterations 도달

### Agent vs Chain (Tool Loop)

| 관점 | Tool Loop (Rung 3) | Agent (Rung 8) |
|------|---------------------|-----------------|
| 상태 | messages 배열만 | messages + steps + plan + iteration |
| 판단 | 모델이 tool_use를 요청하면 무조건 실행 | 모델이 추론 → 도구 선택 → 판단 |
| 종료 | stop_reason === "end_turn" | 동일 + maxIterations 강제 종료 |
| RAG | 항상 실행 (system prompt 주입) | 도구로 선택적 사용 (kb_search) |
| 추적 | 없음 | Thought/Action/Observation 구조화 |

### ReAct 패턴

Thought → Action → Observation의 반복.
- **Thought**: 모델이 텍스트로 출력한 사고 과정 (text block)
- **Action**: 모델이 요청한 도구 호출 (tool_use block)
- **Observation**: 호스트가 도구를 실행한 결과 (tool_result)

Rung 3의 tool_use 루프와 구조적으로 동일하지만, Thought가 명시적으로 기록된다는 것이 핵심 차이.

### 상태 설계: 누적 vs 덮어쓰기

- **누적 (append-only)**: messages, steps — 이전 정보를 잃으면 안 되는 것
- **덮어쓰기 (overwrite)**: iterationCount, plan — 항상 최신 값만 의미 있는 것

이 구분이 agent 상태 설계의 출발점이다.

### KB 검색이 "도구"가 된 의미

Rung 7에서는 RAG가 항상 실행됐다 (always-on).
Rung 8에서는 agent가 "KB를 검색할지 말지"를 스스로 판단한다.
이것이 agent의 자율성 — 도구를 선택적으로 사용하는 능력.

## 핵심 코드

```typescript
// agent의 본질: while 루프
while (state.iterationCount < state.maxIterations) {
  state.iterationCount++

  const response = await anthropic.messages.create({
    model, max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: state.messages,
    tools: agentTools,
  })

  // 종료 조건: 모델이 더 이상 도구를 요청하지 않음
  if (response.stop_reason !== "tool_use") {
    return { answer, steps, ... }
  }

  // 도구 실행 → 결과를 messages에 추가 → 다음 반복
  // ...
}

// maxIterations 도달 시: 도구 없이 강제 답변 생성
```

## Raw Agent의 한계점 (3가지 이상)

1. (직접 실험하며 기록)
2.
3.

## 시행착오

- (직접 기록)

## 다음에 다시 본다면

- (직접 기록)
