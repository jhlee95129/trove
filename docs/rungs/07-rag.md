# Rung 7: RAG 통합

## 새로 이해한 원리

### RAG = Retrieval-Augmented Generation
마법이 아니라 두 단계의 조합:
1. **Retrieval** — 벡터 검색으로 관련 문서 찾기
2. **Generation** — 찾은 문서를 컨텍스트로 LLM에게 답변 생성 요청

```
사용자 질문 → embed() → 벡터 검색 → 관련 문서 3개
                                         ↓
Claude에게: "이 문서를 참고해서 답변해줘" + 사용자 질문
                                         ↓
                                    문서 기반 답변
```

### Chunking = 왜 문서를 자르는가?
- 임베딩 모델에는 입력 길이 제한이 있다
- 긴 문서를 통째로 임베딩하면 의미가 희석된다
- 작은 청크로 나누면 검색 정밀도가 높아진다
- overlap으로 청크 경계의 문맥 손실을 줄인다

### 인덱싱 파이프라인
```
PDF → 텍스트 추출(pdf-parse) → 청킹(chunkText) → 임베딩(Voyage) → 저장(Supabase)
```

### 쿼리 파이프라인
```
질문 → 벡터 검색(searchSimilar) → system 프롬프트에 컨텍스트 주입 → Claude 호출
```

### Context의 위치 = system 프롬프트
검색 결과를 `system` 파라미터로 전달한다. `messages`가 아닌 `system`에 넣는 이유:
- 대화 히스토리와 분리된 "배경 지식" 역할
- 매 턴마다 최신 검색 결과로 교체 가능

### 인용 = 모델에게 지시
별도 UI 없이, system 프롬프트에 "답변에 사용한 문서는 [출처: N]으로 인용하세요"라고 지시하면 모델이 텍스트에 인용을 포함한다.

## 핵심 코드

```typescript
// lib/rag/chunking.ts — RecursiveCharacterTextSplitter 직접 구현
export function chunkText(text: string, chunkSize = 500, overlap = 50): string[]
// 분할 우선순위: 문단(\n\n) → 줄(\n) → 문장(. ) → 글자

// lib/rag/ingest.ts — 인덱싱 파이프라인
const parser = new PDFParse({ data: buffer })
const result = await parser.getText()
const chunks = chunkText(result.text)
const embeddings = await embed(chunks)
await supabase.from("documents").insert(rows)

// app/api/chat/route.ts — RAG 통합
const docs = await searchSimilar(lastUserMessage, 3)
const system = `다음 문서를 참고하여 답변하세요...\n\n${context}`
const response = await runToolLoop(messages, tools, executors, system)
```

## 시행착오

- (직접 기록)

## 다음에 다시 본다면

- (직접 기록)
