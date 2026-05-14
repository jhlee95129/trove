# Trove

> AI가 대신 조사해주고, 그 결과가 영구 보관되어 시간이 갈수록 더 똑똑해지는 개인 리서치 노트북.

## 소개

Trove는 AI 리서치 노트북이자, AI 엔지니어링의 핵심 기술을 **원리부터** 단계적으로 학습하기 위한 사이드 프로젝트입니다.

### 핵심 흐름

1. 검색창에 질문을 입력한다
2. 에이전트가 **웹 + 개인 KB**를 자율적으로 조사한다
3. 인용이 포함된 답변을 받는다
4. 답변과 출처는 자동으로 **개인 KB**에 저장된다
5. PDF/노트를 업로드해 KB를 보강할 수 있다
6. 같은 주제를 다시 물으면, KB를 먼저 검색하고 부족할 때만 웹을 탐색한다

### 차별점

| 서비스 | 한계 | Trove |
|--------|------|-------|
| ChatGPT / Claude.ai | 대화 결과가 휘발됨 | 영구 보관 |
| Perplexity | 결과가 축적되지 않음 | 축적 |
| Notion AI | 능동적 리서치가 약함 | 리서치 + 보관 둘 다 |

## 기술 스택

| Layer | 선택 |
|-------|------|
| Framework | Next.js 15+ (App Router) |
| Language | TypeScript (strict mode) |
| LLM | Anthropic Claude (claude-sonnet-4-6) |
| DB | Supabase (Postgres + pgvector) |
| Embedding | Voyage AI (voyage-3-large) |
| 외부 검색 | Tavily API |
| Agent Framework | LangChain.js, LangGraph.js |
| Eval | 자체 eval harness (LLM-as-judge) |
| Deploy | Vercel |

## 시작하기

### 사전 요구사항

- Node.js 18+
- pnpm
- Supabase 프로젝트 (pgvector 확장 활성화)

### 설치

```bash
git clone https://github.com/<your-username>/trove.git
cd trove
pnpm install
```

### 환경 변수

`.env.local.example`을 복사하여 `.env.local`을 생성하고 값을 채웁니다:

```bash
cp .env.local.example .env.local
```

```
ANTHROPIC_API_KEY=
VOYAGE_API_KEY=
TAVILY_API_KEY=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SECRET_KEY=
```

### 실행

```bash
pnpm dev
```

## 프로젝트 구조

```
trove/
├── app/                          # Next.js App Router
│   ├── api/
│   │   ├── chat/route.ts         # 기본 채팅 API
│   │   ├── agent/route.ts        # Raw ReAct Agent API
│   │   ├── agent-graph/route.ts  # LangGraph Agent API
│   │   ├── agent-reflection/route.ts  # Reflection Agent API
│   │   └── ingest/route.ts       # 문서 인덱싱 API
│   └── page.tsx                  # 메인 UI
├── lib/
│   ├── anthropic.ts              # Claude 클라이언트
│   ├── voyage.ts                 # 임베딩 클라이언트
│   ├── supabase.ts               # DB 클라이언트
│   ├── tools/                    # Tool 정의 (calculator, web-search, kb-search)
│   ├── rag/                      # RAG 파이프라인 (chunking, ingest, retrieve)
│   ├── agent/
│   │   ├── react-raw.ts          # Raw ReAct Agent
│   │   ├── react-reflection.ts   # Raw + Reflection
│   │   └── types.ts              # Agent 타입 정의
│   ├── langchain/                # LangChain RAG 구현
│   └── langgraph/
│       ├── react-graph.ts        # LangGraph ReAct Agent
│       └── react-graph-reflection.ts  # LangGraph + Reflection
├── evals/                        # Eval 하네스
│   ├── golden-set.json           # 골든셋 (27개 테스트 케이스)
│   ├── run.ts                    # Eval 실행 엔트리포인트
│   ├── metrics/                  # Retrieval + Generation 메트릭
│   └── runners/                  # 파이프라인별 러너
├── scripts/                      # 유틸리티 스크립트
├── docs/rungs/                   # 단계별 학습 노트
└── CLAUDE.md                     # Claude Code 컨텍스트
```

## 학습 로드맵 (12 Rungs)

이 프로젝트는 "Principle First, Framework Second" 원칙을 따릅니다. 각 개념을 먼저 raw로 구현한 뒤, 프레임워크로 재작성하며 추상화의 의미를 체감합니다.

| Rung | 주제 | 핵심 원리 |
|------|------|-----------|
| 1 | Hello Claude | API message 구조, content block |
| 2 | 멀티턴 대화 | LLM의 statelessness |
| 3 | 첫 도구 — 계산기 | tool_use 루프, ReAct 원형 |
| 4 | 웹 검색 도구 | multi-step tool use, tool_choice |
| 5 | 임베딩 이해 | 벡터 매핑, cosine similarity |
| 6 | 벡터 검색 | pgvector, HNSW 인덱스 |
| 7 | RAG 통합 | chunking, 인덱싱/쿼리 파이프라인 |
| 8 | 간단한 Agent | ReAct 패턴 raw 구현 |
| 9 | LangChain 도입 | 추상화의 이점과 비용 |
| 10 | LangGraph 도입 | StateGraph, reducer, conditional edges |
| 11 | Eval / Harness | LLM-as-judge, retrieval/generation 메트릭 분리 |
| 12 | Agentic 패턴 | Reflection (self-critique + revision) |

## 주요 명령어

```bash
# 개발 서버
pnpm dev

# 타입 체크
pnpm typecheck

# Eval 실행
pnpm eval -- --pipeline=raw-agent --limit=5
pnpm eval -- --pipeline=raw-agent-reflection --limit=5
pnpm eval -- --pipeline=langgraph-agent-reflection --limit=5

# 사용 가능한 파이프라인: raw-rag, langchain-rag, raw-agent, raw-agent-reflection, langgraph-agent-reflection
```

## 라이선스

MIT
