# Rung 10: LangGraph 도입

## 새로 이해한 원리

### StateGraph = while 루프의 선언적 표현

| 개념 | Raw Agent (react-raw.ts) | LangGraph (react-graph.ts) |
|------|--------------------------|----------------------------|
| 루프 | `while (iteration < max)` | `tools → agent` 순환 edge |
| 종료 조건 | `if (stop_reason !== "tool_use")` | conditional edge → END |
| 상태 갱신 | `state.messages.push(...)` | node returns partial → reducer merges |
| 안전장치 | maxIterations counter | recursionLimit config |
| 도구 실행 | executor map 수동 lookup | ToolNode 자동 dispatch |

### Annotation과 Reducer

- 누적(append): `(curr, update) => [...curr, ...update]` — messages, steps
- 덮어쓰기(overwrite): `(_, update) => update` — iterationCount
- Rung 8에서 `.push()` vs `=`로 구분한 것이 reducer 한 줄로 선언화

### 그래프로 표현하는 이점 (raw 대비)

1. (실험 후 기록)
2.
3.

### 그래프로 표현하는 한계 (raw 대비)

1. (실험 후 기록)
2.
3.

### Mermaid 다이어그램

(pnpm graph:mermaid 실행 결과 붙여넣기)

## 핵심 코드 스니펫

(비교 스크립트 실행 후 결과 붙여넣기)

## 시행착오

- (직접 기록)

## 다음에 다시 본다면

- (직접 기록)
