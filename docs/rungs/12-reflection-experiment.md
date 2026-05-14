# Rung 12: Agentic 패턴 — Reflection 실험

## 핵심 원리

### Reflection이란?

Agent가 답변을 생성한 후, **자기 답변을 비평(self-critique)하고 부족하면 수정**하는 패턴.

```
ReAct 루프 → 답변 생성
    ↓
Reflection: "이 답변을 비평해라"
    ↓
KEEP → 원래 답변 반환
REVISE → 비평 기반으로 재생성 → 수정된 답변 반환
```

### 왜 Reflection인가?

- **Hallucination 감소**: 컨텍스트에 없는 내용을 답변에 포함했는지 스스로 확인
- **Completeness 향상**: 빠뜨린 핵심 포인트를 발견하고 보완
- **비용**: 추가 LLM 호출 1~2회 (KEEP이면 1회, REVISE면 2회)

### Raw vs LangGraph 비교

| 관점 | Raw (react-reflection.ts) | LangGraph (react-graph-reflection.ts) |
|------|--------------------------|--------------------------------------|
| 구현 | runReActAgent() 후 별도 함수 | 그래프 노드로 내장 |
| 흐름 | 순차적 if/else | conditional edge |
| 확장 | 코드 수정 필요 | 노드/엣지 추가로 확장 |

## 실행 방법

```bash
# Raw Agent (기준선)
pnpm eval -- --pipeline=raw-agent --limit=5

# Raw Agent + Reflection
pnpm eval -- --pipeline=raw-agent-reflection --limit=5

# LangGraph Agent + Reflection
pnpm eval -- --pipeline=langgraph-agent-reflection --limit=5
```

## 파일 구조

```
lib/agent/
├── react-raw.ts              # 기존 Raw Agent (변경 없음)
├── react-reflection.ts       # Raw + Reflection (래퍼)
└── types.ts                  # AgentStep에 "reflection" 추가

lib/langgraph/
├── react-graph.ts            # 기존 LangGraph Agent (변경 없음)
└── react-graph-reflection.ts # LangGraph + Reflection 노드

evals/runners/
├── raw-agent.ts              # 기존 (변경 없음)
├── raw-agent-reflection.ts   # Reflection 러너
└── langgraph-agent-reflection.ts
```

## 실험 결과

<!-- eval 실행 후 직접 작성 -->

### 기준선 (Raw Agent)
- faithfulness:
- relevance:
- completeness:
- latency:
- tokens:

### Reflection 적용 후
- faithfulness:
- relevance:
- completeness:
- latency:
- tokens:

### 분석
- faithfulness 변화:
- completeness 변화:
- 비용 대비 효과:

## 배운 점

<!-- 직접 작성 -->
