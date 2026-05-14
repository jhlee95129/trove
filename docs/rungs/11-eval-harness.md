# Rung 11: Eval / Harness

## 핵심 원리

### 1. AI는 비결정적 → 단위 테스트 불가 → 통계적 측정

전통적 소프트웨어: `assert(f(x) === y)` → pass/fail.
AI 시스템: 같은 입력에 다른 출력 → **점수**로 측정하고 **평균**을 본다.

### 2. Retrieval과 Generation 메트릭의 분리

RAG 시스템은 두 단계로 구성:
1. **Retrieval** (검색): 질문과 관련된 문서를 찾는 단계
2. **Generation** (생성): 찾은 문서로 답변을 만드는 단계

답변이 나쁠 때 원인이 검색인지 생성인지 구분하려면 분리 측정이 필수.

| 상황 | 검색 | 생성 | 진단 |
|------|------|------|------|
| A | 좋음 | 좋음 | 정상 |
| B | 나쁨 | 좋음 | Hallucination 위험 |
| C | 좋음 | 나쁨 | 프롬프트 개선 필요 |
| D | 나쁨 | 나쁨 | 둘 다 고쳐야 함 |

### 3. Retrieval 메트릭 (결정적, LLM 불필요)

- **Recall@K**: 기대 문서 중 검색된 비율. "맞는 문서를 찾았나?"
- **Precision@K**: 검색 결과 중 관련 문서 비율. "노이즈가 얼마나 있나?"
- **MRR**: 첫 번째 관련 문서의 순위 역수. "관련 문서가 몇 번째에 있나?"

### 4. Generation 메트릭 (LLM-as-judge)

다른 LLM(claude-haiku)이 답변을 1~5점으로 평가:
- **Faithfulness**: 컨텍스트에 근거하는가? (hallucination 탐지)
- **Relevance**: 질문에 답하고 있는가?
- **Completeness**: 핵심 포인트를 모두 다루는가?

### 5. Golden Set

고정된 질문 + 기대 결과 세트. 3가지 범주:
- **정상 케이스**: 각 문서에 대한 직접적인 질문
- **교차 케이스**: 여러 문서에 걸치는 질문
- **엣지 케이스**: KB에 없는 주제, 무의미한 입력

### 6. 회귀 감지

프롬프트나 코드를 변경할 때마다 eval을 돌려 이전 결과와 비교.
임계값(0.1) 이상 떨어지면 경고 → 변경이 품질을 악화시켰는지 확인.

## 실행 방법

```bash
pnpm eval                            # 전체 3개 파이프라인
pnpm eval -- --pipeline=raw-rag      # 특정 파이프라인만
pnpm eval -- --limit=3               # 처음 3개 질문만
pnpm eval -- --pipeline=raw-rag --limit=5
```

## 파일 구조

```
evals/
├── types.ts              # 타입 정의
├── golden-set.json       # 27개 테스트 케이스
├── run.ts                # 메인 진입점
├── report.ts             # 콘솔 + JSON 리포트
├── metrics/
│   ├── retrieval.ts      # recall, precision, MRR
│   └── generation.ts     # LLM-as-judge
├── runners/
│   ├── raw-rag.ts        # Raw RAG 파이프라인
│   ├── langchain-rag.ts  # LangChain RAG 파이프라인
│   └── raw-agent.ts      # Raw Agent 파이프라인
└── results/              # JSON 리포트 저장 (.gitignore)
```

## 배운 점

<!-- 직접 작성 -->
