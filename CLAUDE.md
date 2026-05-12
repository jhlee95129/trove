# Trove — AI 리서치 노트북

> 개인이 매일 사용할 수 있는 AI 리서치 노트북을 만들면서, AI 엔지니어링의 핵심 기술을 **원리부터** 단계적으로 학습하는 사이드 프로젝트.

---

## 0. 이 문서에 대해

- **대상**: 본 프로젝트의 1차 사용자이자 학습자 (20년차 풀스택 개발자, AI 엔지니어링 입문 단계)
- **목적**: Claude Code에게 컨텍스트로 제공되는 프로젝트 브리프 + 학습 로드맵
- **사용법**: 매 작업 시작 시 "CLAUDE.md의 Rung N을 시작합니다"라고 지시. Claude Code는 해당 Rung의 목표·원리·산출물을 기준으로 동작.

---

## 진행 현황

- [ ] Rung 1: Hello Claude
- [ ] Rung 2: 멀티턴 대화
- [ ] Rung 3: 첫 도구 — 계산기
- [ ] Rung 4: 웹 검색 도구
- [ ] Rung 5: 임베딩 이해
- [ ] Rung 6: 벡터 검색
- [ ] Rung 7: RAG 통합
- [ ] Rung 8: 간단한 Agent
- [ ] Rung 9: LangChain 도입
- [ ] Rung 10: LangGraph 도입
- [ ] Rung 11: Eval / Harness
- [ ] Rung 12: Agentic 패턴

> Rung 완료 시 체크박스만 갱신. 학습 노트는 `docs/rungs/NN-name.md`에 별도 작성.

---

## 1. 서비스 컨셉

### 1.1 이름
**Trove** (영어 "보물 창고"의 의미. 시간이 갈수록 가치가 누적되는 개인 자산을 상징.)

> 다른 후보: `Nook`, `Atlas`, `Compass`, `Lodestar`. 시작 후 언제든 변경 가능.

### 1.2 한 줄 정의
> "AI가 대신 조사해주고, 그 결과가 영구 보관되어 시간이 갈수록 더 똑똑해지는 개인 리서치 노트북."

### 1.3 핵심 사용자 흐름
1. 검색창에 질문을 입력한다.
2. 에이전트가 **웹 + 개인 KB**를 자율적으로 조사한다.
3. 인용이 포함된 답변을 받는다.
4. 답변과 출처는 자동으로 **개인 KB**에 저장된다.
5. PDF/노트를 업로드해 KB를 보강할 수 있다.
6. 같은 주제를 다시 물으면, KB를 먼저 검색하고 부족할 때만 웹을 탐색한다.

### 1.4 기존 서비스와의 차별점
- **ChatGPT / Claude.ai**: 대화 결과가 휘발됨. Trove는 영구 보관.
- **Perplexity**: 검색은 잘하지만 결과가 축적되지 않음. Trove는 축적.
- **Notion AI**: 자료 보관은 좋지만 능동적 리서치가 약함. Trove는 둘 다.

### 1.5 1차 타겟 사용자
프로젝트 소유자 본인. 사용 시나리오:
- 구직 활동 중 회사/직무 리서치
- AI 학습 자료 정리
- 도메인 학습 자료(예: 명리학) 개인 KB 구축
- 기술 비교 분석 (예: LangGraph vs LangChain)

---

## 2. 학습 철학

### 2.1 원칙: Principle First, Framework Second
**프레임워크를 먼저 배우면 프레임워크가 사라졌을 때 아무것도 못 한다.**
- 각 개념은 먼저 raw로 직접 구현한다.
- 같은 기능을 LangChain/LangGraph로 재작성한다.
- 두 구현을 비교하며 "이 프레임워크가 무엇을 추상화한 것인가"를 체감한다.

### 2.2 학습 산출물의 이중성
- **결과물 1**: 실제로 사용 가능한 Trove 서비스
- **결과물 2**: 각 단계에서 본인이 깨달은 원리를 정리한 학습 로그 (`docs/rungs/NN-name.md`)

두 번째 산출물이 더 중요할 수도 있다.

### 2.3 학습 페이스
- 한 번에 한 Rung만 진행.
- Rung 단위로 git 브랜치/커밋 분리.
- 다음 Rung 진행 전 반드시 학습 로그 작성.

---

## 3. 기술 스택

| Layer | 선택 | 이유 |
|---|---|---|
| Framework | **Next.js 15+ (App Router)** | 본인 친숙, RSC + Server Actions |
| Language | **TypeScript** | 타입 안정성 |
| LLM | **Anthropic Claude (claude-sonnet-4-6 기본, opus는 필요 시)** | tool_use 일류, 학습 대상 |
| DB | **Supabase (Postgres + pgvector)** | 본인 친숙. Polaris 경험 재활용. |
| Embedding | **Voyage AI (voyage-3-large)** | Polaris에서 OpenAI 썼으니 다양성 학습 차원 |
| 외부 검색 | **Tavily API** (또는 Brave Search) | Tool use 학습에 적합 |
| Framework (후반) | **LangChain.js, LangGraph.js** | Rung 9, 10에서 도입 |
| Eval | 자체 + **Ragas** | Rung 11에서 |
| Deploy | **Vercel** | Next.js 표준 |

### 3.1 환경 변수 (`.env.local`)
```
ANTHROPIC_API_KEY=
VOYAGE_API_KEY=
TAVILY_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

**원칙**: `NEXT_PUBLIC_` prefix가 붙은 키는 클라이언트로 노출됨. 시크릿은 절대 금지.

---

## 4. 학습 사다리 (12 Rungs)

각 Rung은 다음 형식을 따른다:
- **목표** — 한 문장
- **배우는 원리** — 프레임워크 독립적 개념
- **만드는 것** — 구체적 산출물
- **완료 기준** — 본인이 이것들을 설명할 수 있어야 함

---

### Rung 1: Hello Claude
- **목표**: Anthropic API의 가장 단순한 호출을 통해 message 구조를 이해한다.
- **배우는 원리**
  - `messages.create()`의 요청/응답 구조
  - `role: "user" | "assistant"`의 의미
  - `content`는 본질적으로 **블록 배열**이다 (text, image, tool_use, tool_result 등)
  - `stop_reason`의 의미 (`end_turn`, `max_tokens`, `tool_use`, ...)
  - 왜 client에서 직접 SDK를 호출하면 안 되는가 (key 노출, CORS, 통제 불가)
- **만드는 것**
  - Next.js 페이지에 input + button
  - `app/api/chat/route.ts`에서 Claude 호출
  - 응답 화면 표시
- **완료 기준**
  - 요청/응답 JSON 구조를 화이트보드에 손으로 그릴 수 있다
  - "content는 왜 배열인가?"에 답할 수 있다
- **예상 소요**: 1시간

---

### Rung 2: 멀티턴 대화
- **목표**: LLM은 stateless라는 사실을 체감한다.
- **배우는 원리**
  - LLM은 매 호출마다 **전체 대화 히스토리**를 받아야 컨텍스트를 가진다
  - 대화 상태는 **클라이언트/서버가 보관**한다 (모델이 아니라)
  - assistant 응답을 다음 요청의 messages 배열에 그대로 다시 넣는 패턴
  - Context window의 존재와 토큰 누적
- **만드는 것**
  - 채팅 UI (메시지 리스트 + 입력창)
  - 대화 히스토리 client state로 관리
  - 매 요청 시 전체 history 전송
- **완료 기준**
  - "왜 모델은 이전 대화를 '기억'하는 것처럼 보이는가"에 답할 수 있다
  - 토큰이 누적되는 위치를 코드에서 짚을 수 있다
- **예상 소요**: 1~2시간

---

### Rung 3: 첫 도구 — 계산기
- **목표**: tool_use의 본질을 raw로 이해한다.
- **배우는 원리**
  - **LLM은 텍스트(또는 구조화된 출력)만 생성한다**. "도구를 호출한다"는 건 **모델이 JSON을 뱉고 호스트가 실행하는 것**.
  - Tool schema(JSON Schema)는 모델에 대한 명세
  - `stop_reason === "tool_use"` → tool_use 블록 파싱 → 호스트 실행 → `tool_result` 블록으로 다시 messages에 추가 → 재호출
  - 이 루프가 끝나는 조건 (`stop_reason === "end_turn"`)
  - ReAct 패턴(Thought → Action → Observation)의 원형
- **만드는 것**
  - `calculator` tool 정의 (add, multiply 등)
  - tool_use 처리 루프 (`lib/tools/loop.ts`)
  - "123 * 456은?" 같은 질문에 정확히 답하는 챗봇
- **완료 기준**
  - tool_use loop의 시퀀스 다이어그램을 그릴 수 있다
  - tool schema의 어떤 필드가 모델 동작에 영향을 주는지 설명할 수 있다
- **예상 소요**: 2시간

---

### Rung 4: 웹 검색 도구
- **목표**: 외부 API를 tool로 통합하고 multi-step tool use를 경험한다.
- **배우는 원리**
  - 도구 여러 개 등록, 모델의 도구 선택 메커니즘
  - 도구 결과를 모델이 어떻게 후속 도구 호출/답변에 활용하는가
  - `tool_choice` 파라미터 (auto / any / specific)
  - Tool description이 모델 성능에 미치는 영향
  - 컨텍스트 비용 — 큰 도구 결과는 토큰을 먹는다
- **만드는 것**
  - `web_search` tool (Tavily API)
  - `web_fetch` tool (간단한 HTML → 텍스트)
  - 출처 URL을 인용 형태로 답변에 포함
- **완료 기준**
  - 모델이 도구를 연쇄 호출하는 흐름을 로그로 추적할 수 있다
  - Tool description을 바꿨을 때 동작이 어떻게 변하는지 실험해봤다
- **예상 소요**: 2~3시간

---

### Rung 5: 임베딩 이해
- **목표**: 임베딩의 정체를 직관적으로 이해한다.
- **배우는 원리**
  - 텍스트 → 고차원 벡터로의 매핑 함수
  - 의미적 유사도 = 벡터 공간에서의 각도 (cosine similarity)
  - 왜 거리(L2)가 아니라 각도인가
  - 모델별 차원 수(1024, 1536 등)와 그 의미
  - 임베딩 모델 선택의 트레이드오프 (속도/품질/비용)
- **만드는 것**
  - `scripts/embedding-playground.ts` — Voyage API 호출, 여러 문장 임베딩
  - 문장 쌍 간 cosine similarity 계산 출력
  - 의도적으로 비슷한/다른 문장으로 직관 확인
- **완료 기준**
  - "임베딩이 뭐예요"라는 질문에 비유 없이 정확히 답할 수 있다
  - cosine similarity를 손으로 계산할 수 있다
- **예상 소요**: 1~2시간

---

### Rung 6: 벡터 검색
- **목표**: pgvector를 raw SQL로 다룬다.
- **배우는 원리**
  - pgvector 확장과 vector 컬럼
  - 거리 연산자 (`<->`, `<=>`, `<#>`)와 그 의미
  - 인덱스 종류 (IVFFlat, HNSW)와 트레이드오프
  - Top-k 검색 SQL 패턴
  - Metadata와 함께 검색하는 패턴 (필터링)
- **만드는 것**
  - Supabase에 `documents` 테이블 (id, content, embedding, metadata)
  - 인덱싱 스크립트 (몇 개 문서 임베딩 → 저장)
  - 검색 함수 `searchSimilar(query: string, k: number)`
- **완료 기준**
  - pgvector SQL을 외부 도움 없이 작성할 수 있다
  - "왜 IVFFlat이 정확도와 속도의 트레이드오프를 갖는가" 설명할 수 있다
- **예상 소요**: 2~3시간

---

### Rung 7: RAG 통합
- **목표**: RAG의 정체를 raw로 구축한다.
- **배우는 원리**
  - RAG = "검색 + 생성". 마법이 아니다.
  - Chunking 전략: 왜 자르나? 크기와 overlap의 효과
  - 인덱싱 파이프라인: 로드 → 청크 → 임베딩 → 저장
  - 쿼리 파이프라인: 검색 → 컨텍스트 주입 → 생성
  - Context의 위치 — system / user / 별도 블록
  - 인용 표시(citation) 구현 방법
- **만드는 것**
  - PDF 업로드 UI
  - PDF 텍스트 추출 (pdf-parse 또는 unstructured)
  - 청킹 함수 직접 구현 (RecursiveCharacterTextSplitter 흉내)
  - 인덱싱 파이프라인
  - 검색 결과를 컨텍스트로 주입하는 챗 API
- **완료 기준**
  - "RAG는 무엇의 약자이고 정확히 무엇을 하는가" 1분 안에 설명 가능
  - Chunking 크기를 바꿨을 때 검색 품질이 어떻게 달라지는지 실험했다
- **예상 소요**: 3시간

---

### Rung 8: 간단한 Agent
- **목표**: agent가 무엇인지 raw 코드로 이해한다.
- **배우는 원리**
  - Agent = LLM 호출 루프 + 상태 + 종료 조건. 그 이상도 이하도 아니다.
  - State 설계: 무엇을 누적하고, 무엇을 덮어쓸 것인가
  - Conditional next-step: 코드 로직 vs LLM 결정
  - Max iterations와 무한루프 방지
  - ReAct 패턴의 raw 구현
- **만드는 것**
  - `lib/agent/react-raw.ts` — while 루프 기반 ReAct agent
  - State 객체 (messages, scratchpad, plan, iteration)
  - 질문 → 계획 → 도구 사용 결정 → 실행 → 종합 → 답변
- **완료 기준**
  - "agent와 chain의 차이가 무엇인가" 설명 가능
  - 본인이 만든 raw agent의 한계점을 3가지 이상 짚을 수 있다
- **예상 소요**: 3~4시간

---

### Rung 9: LangChain 도입
- **목표**: 같은 RAG 파이프라인을 LangChain.js로 재작성하고, 추상화의 효과를 체감한다.
- **배우는 원리**
  - LangChain primitives: DocumentLoader, TextSplitter, Embeddings, VectorStore, Retriever
  - LCEL (LangChain Expression Language) 또는 표준 chain 구성
  - Runnable 인터페이스
  - 추상화의 이점과 비용
- **만드는 것**
  - `lib/raw/` 와 `lib/langchain/` 두 폴더에 같은 RAG 기능 구현
  - 비교 문서 `docs/rungs/09-langchain-vs-raw.md` 작성 — 라인 수, 가독성, 디버깅 용이성
- **완료 기준**
  - "LangChain이 무엇을 추상화하는가"에 구체적인 예로 답할 수 있다
  - 어느 부분은 LangChain, 어느 부분은 raw가 낫다는 본인 의견을 갖는다
- **예상 소요**: 2~3시간

---

### Rung 10: LangGraph 도입
- **목표**: Rung 8의 raw agent를 LangGraph.js의 state machine으로 재작성한다.
- **배우는 원리**
  - StateGraph의 구성 요소: nodes, edges, conditional edges
  - State와 reducer (`Annotation`)
  - Checkpointer로 인한 stream / resume / time-travel
  - 시각화 (mermaid)
  - Subgraph와 multi-agent로의 확장 가능성
- **만드는 것**
  - `lib/agent/react-graph.ts` — LangGraph 버전
  - 그래프 시각화 (mermaid)
  - Streaming + checkpoint 동작 확인
- **완료 기준**
  - "Agent를 graph로 표현하는 것의 이점"을 raw 버전과 비교해 설명 가능
  - State reducer의 동작을 그릴 수 있다
- **예상 소요**: 3~4시간

---

### Rung 11: Eval / Harness
- **목표**: AI 시스템 평가의 방법론적 기초를 갖춘다.
- **배우는 원리**
  - AI는 비결정적 → 단위 테스트 불가 → **통계적 측정** 필요
  - **Retrieval metric**과 **Generation metric**의 분리
    - Retrieval: recall@k, MRR, nDCG, context precision/recall
    - Generation: faithfulness, answer relevance, completeness
  - LLM-as-judge의 원리, 한계, 편향 (자기편향, 위치편향)
  - 골든셋 설계 (정상 케이스, edge case, regression case)
  - 회귀 테스트로서의 eval
- **만드는 것**
  - `evals/golden-set.json` — 20~30개 질문 + 기대 출처/요점
  - `evals/run.ts` — 자체 eval runner
  - Ragas와 비교 (선택)
  - `npm run eval` → 메트릭 리포트 출력
- **완료 기준**
  - "이 시스템의 품질을 어떻게 측정하시나요?"에 답할 수 있다
  - 프롬프트 한 줄 바꿨을 때 회귀 여부를 자동 감지하는 흐름이 있다
- **예상 소요**: 3~4시간

---

### Rung 12: Agentic 패턴
- **목표**: 1~2개의 agentic 패턴을 적용하고 eval로 효과를 측정한다.
- **배우는 원리**
  - **Reflection**: 자기 답변에 대한 self-critique → 수정
  - **Planner-Executor**: 계획 수립과 실행을 분리
  - **Multi-Agent**: 역할 분리한 LLM 협업 (researcher / writer / critic)
  - **Human-in-the-Loop**: LangGraph interrupt
  - **Memory 계층화**: short-term / long-term / episodic
- **만드는 것**
  - 위 패턴 중 본인이 고른 1~2개 적용
  - Rung 11의 eval을 사용해 적용 전후 메트릭 비교
  - `docs/rungs/12-patterns-experiment.md` — 실험 리포트
- **완료 기준**
  - "Reflection을 추가했을 때 faithfulness가 어떻게 변했는가?" 같은 정량적 답변 가능
  - 비용 vs 품질의 트레이드오프를 본인의 시스템에서 정량화했다
- **예상 소요**: open-ended (1주 이상)

---

## 5. 리포 구조 (제안)

```
trove/
├── app/
│   ├── api/
│   │   ├── chat/route.ts          # Rung 1 ~
│   │   └── ingest/route.ts        # Rung 7 ~
│   ├── page.tsx                   # 검색창 + 답변 표시
│   ├── notebook/page.tsx          # KB 검색 UI (Rung 7 ~)
│   └── layout.tsx
├── lib/
│   ├── anthropic.ts               # Claude 클라이언트
│   ├── voyage.ts                  # 임베딩 클라이언트
│   ├── supabase.ts                # DB 클라이언트
│   ├── tools/                     # Rung 3 ~
│   │   ├── calculator.ts
│   │   ├── web-search.ts
│   │   └── loop.ts                # tool use 루프
│   ├── rag/
│   │   ├── chunking.ts            # Rung 7
│   │   ├── ingest.ts
│   │   └── retrieve.ts            # Rung 6, 7
│   ├── agent/
│   │   ├── react-raw.ts           # Rung 8
│   │   └── react-graph.ts         # Rung 10
│   ├── raw/                       # Raw RAG 구현 (Rung 7)
│   └── langchain/                 # LangChain RAG 재구현 (Rung 9)
├── scripts/
│   └── embedding-playground.ts    # Rung 5
├── evals/
│   ├── golden-set.json
│   └── run.ts                     # Rung 11
├── supabase/
│   └── migrations/
├── docs/
│   ├── LEARNING_LOG.md            # 누적 학습 로그
│   └── rungs/
│       ├── 01-hello-claude.md
│       ├── 02-multi-turn.md
│       ├── ...
│       └── 12-patterns-experiment.md
├── .env.local.example
├── CLAUDE.md                      # 이 문서
└── README.md
```

---

## 6. 컨벤션

### 6.1 학습 기록
- 각 Rung 완료 시 `docs/rungs/NN-name.md`에 다음을 기록:
  - **본인이 새로 이해한 원리** (가장 중요)
  - 핵심 코드 스니펫과 그것이 동작하는 이유
  - 시행착오와 막혔던 부분
  - "다음에 다시 본다면 무엇이 달라질까"

### 6.2 Git
- Rung별 브랜치: `rung/01-hello-claude`, `rung/02-multi-turn`, ...
- 머지 시 squash commit, 메시지: `feat(rung-N): <name>`

### 6.3 코드 스타일
- TypeScript strict mode 켤 것
- 외부 라이브러리 도입은 Rung별로 제한 (예: Rung 1~8에서는 LangChain 금지)
- 학습 목적의 raw 구현은 `lib/raw/` 아래에 그대로 보존 (지우지 말 것 — 비교 자산)

### 6.4 비용 관리
- 개발 중 기본 모델: `claude-sonnet-4-6` 또는 `claude-haiku-4-5`
- 복잡한 reasoning 테스트 시에만 `claude-opus-4-7`
- Eval 돌릴 때 비용 추적 (`usage.input_tokens`, `usage.output_tokens` 로깅)

---

## 7. Claude Code 협업 방식

### 7.1 매 Rung 시작 시
사용자가 Claude Code에게:
```
"CLAUDE.md의 Rung N을 시작합니다.
원리 중심으로 설명하면서 진행해주세요.
프레임워크는 명시된 시점에만 도입합니다."
```

### 7.2 Claude Code의 진행 방식
1. 해당 Rung의 **목표·원리·산출물**을 먼저 한 번 정리하고 확인 요청
2. 작은 단위로 코드 작성 → 핵심 개념 설명 → 다음 단위
3. Rung 완료 시 `docs/rungs/NN-name.md` 초안 작성을 도움 (학습자가 최종 작성)

### 7.3 안 좋은 패턴 (피할 것)
- ❌ Rung을 건너뛰고 통합 구현
- ❌ 학습자가 손으로 짜야 할 부분을 자동 완성으로 다 짜기
- ❌ 명시되지 않은 프레임워크 미리 도입 (예: Rung 5에서 LangChain)

---

## 8. Quickstart

```bash
# Rung 1 시작 명령 (Claude Code에게):
"CLAUDE.md의 Rung 1 (Hello Claude)을 시작합니다.
Next.js 프로젝트 초기화부터 같이 진행하고,
요청/응답 JSON 구조를 단계별로 설명해주세요."
```

---

## 9. 변경 이력

- v1.0 (2026-05-11) — 초안 작성
- v1.1 (2026-05-11) — "진행 현황" 체크리스트 섹션 추가