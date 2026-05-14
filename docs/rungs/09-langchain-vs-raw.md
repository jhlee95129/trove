# Rung 9: LangChain vs Raw 비교

## 새로 이해한 원리

### LangChain이 추상화하는 것

1. **Embeddings 인터페이스** — raw fetch를 클래스로 감싸고, embedDocuments/embedQuery 메서드 제공
2. **TextSplitter** — 재귀 분할 로직을 설정 객체로 교체
3. **VectorStore** — 임베딩 + 저장 + 검색을 하나의 객체로 통합
4. **Retriever** — VectorStore.asRetriever()로 검색을 Runnable로 변환
5. **LCEL (pipe)** — 프롬프트 → 모델 → 파서를 선언적으로 조합

### 정량 비교

| 컴포넌트 | Raw (라인 수) | LangChain (라인 수) | 비율 |
|----------|--------------|-------------------|------|
| Embedding client | ~40 (lib/voyage.ts) | ~10 (embeddings.ts) | 4:1 |
| Text splitter | 108 (lib/rag/chunking.ts) | ~8 (splitter.ts) | 13:1 |
| Vector store + retrieval | ~80 (supabase.ts + retrieve.ts) | ~25 (vector-store.ts + retrieve.ts) | 3:1 |
| Ingestion | 47 (lib/rag/ingest.ts) | ~30 (ingest.ts) | 1.5:1 |
| RAG chain | ~56 (route.ts 관련 부분) | ~50 (rag-chain.ts) | ~1:1 |

### LCEL의 본질

```typescript
// 선언적 체인 구성
const ragChain = RunnableSequence.from([
  { context: retriever.pipe(formatDocs), question: new RunnablePassthrough() },
  prompt,
  model,
  new StringOutputParser(),
])

// 사용: 한 줄로 invoke
const answer = await ragChain.invoke({ question: "..." })
```

vs. 명령형 raw:
```typescript
const docs = await searchSimilar(query, 3)
const system = `...${docs.map(...).join("\n\n")}...`
const response = await runToolLoop(messages, tools, executors, system)
```

### Runnable 인터페이스

모든 LangChain 컴포넌트가 구현하는 인터페이스:
- `invoke(input) → output`
- `stream(input) → AsyncIterable`
- `batch(inputs) → outputs`

이것 덕분에 `.pipe()`로 아무 컴포넌트나 연결할 수 있다.

### Raw가 더 나은 경우

- (직접 기록: 디버깅 시 에러 위치 파악, 커스텀 로직 추가 용이성...)

### LangChain이 더 나은 경우

- (직접 기록: 프로토타이핑 속도, 컴포넌트 교체 용이성...)

## 핵심 코드 스니펫

(비교 스크립트 실행 후 결과 붙여넣기)

## 시행착오

- (직접 기록)

## 다음에 다시 본다면

- (직접 기록)
