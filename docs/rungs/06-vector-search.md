# Rung 6: 벡터 검색

## 새로 이해한 원리

### pgvector = Postgres에 벡터 검색 기능을 추가하는 확장
별도의 벡터 DB(Pinecone, Weaviate 등)를 쓸 필요 없이, 기존 Postgres에 `vector` 타입 컬럼을 추가하면 된다.

```sql
create extension if not exists vector;
embedding vector(1024)  -- 1024차원 벡터 컬럼
```

### 거리 연산자 3종
```
<->  L2 distance (유클리드 거리)
<=>  cosine distance (1 - cosine similarity)
<#>  inner product (음수 내적)
```
우리는 `<=>` (cosine distance)를 사용. similarity = `1 - cosine_distance`.

### HNSW 인덱스
- **H**ierarchical **N**avigable **S**mall **W**orld
- 그래프 기반 근사 최근접 탐색 (ANN)
- 정확도가 높고 빠르지만, 빌드 시간과 메모리 사용량이 큼
- IVFFlat 대비: 빌드 느림, 검색 빠름, 정확도 높음

```sql
create index on documents using hnsw (embedding vector_cosine_ops);
```

### 검색 패턴: RPC 함수
Supabase에서 벡터 검색을 하려면 SQL 함수를 만들고 `rpc()`로 호출:
```typescript
const { data } = await supabase.rpc("search_documents", {
  query_embedding: JSON.stringify(queryEmbedding),
  match_count: 5,
})
```

### 전체 흐름 (인덱싱 → 검색)
```
인덱싱: 문서 → Voyage AI(embed) → 벡터 → Supabase INSERT
검색:   쿼리 → Voyage AI(embed) → 벡터 → Supabase RPC(cosine) → 유사 문서
```

## 핵심 코드

```typescript
// lib/supabase.ts — 클라이언트
export const supabase = createClient(url, serviceRoleKey)

// lib/rag/retrieve.ts — 벡터 검색
export async function searchSimilar(query: string, k: number = 5) {
  const [queryEmbedding] = await embed([query])
  const { data } = await supabase.rpc("search_documents", {
    query_embedding: JSON.stringify(queryEmbedding),
    match_count: k,
  })
  return data
}
```

```sql
-- supabase/migrations/001_documents.sql
-- 검색 함수: cosine distance로 정렬, similarity 반환
select d.*, 1 - (d.embedding <=> query_embedding) as similarity
from documents d
order by d.embedding <=> query_embedding
limit match_count;
```

## 시행착오

- (직접 기록)

## 다음에 다시 본다면

- (직접 기록)
