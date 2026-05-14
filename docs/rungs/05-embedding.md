# Rung 5: 임베딩 이해

## 새로 이해한 원리

### 임베딩 = 텍스트 → 숫자 배열
임베딩 모델은 텍스트를 고차원 벡터(숫자 배열)로 변환하는 함수다.
"고양이가 매트 위에 앉아 있다" → `[0.023, -0.041, 0.017, ...]` (1024차원)

LLM과 다르다:
- LLM: 텍스트 → 텍스트 (생성)
- 임베딩 모델: 텍스트 → 숫자 배열 (매핑)

### Cosine Similarity = 의미적 유사도
두 벡터의 각도로 유사도를 측정한다.

```
cosine_similarity(a, b) = dot(a, b) / (|a| * |b|)
```

- 1.0 = 완전히 같은 의미
- 0.0 = 무관
- -1.0 = 반대 의미 (실제로 잘 안 나옴)

왜 거리(L2)가 아니라 각도인가?
→ 벡터의 **방향**이 의미를 나타내고, **크기**는 의미와 무관하기 때문.

### 차원 수의 의미
voyage-3-large는 1024차원. 이는 텍스트의 의미를 1024개의 축으로 표현한다는 뜻.
차원이 높을수록 더 미세한 의미 차이를 구분할 수 있지만, 저장/연산 비용이 늘어난다.

### Voyage AI를 SDK 없이 호출
OpenAI 호환 형태의 REST API. raw fetch 한 줄이면 됨:
```typescript
// POST https://api.voyageai.com/v1/embeddings
// body: { model: "voyage-3-large", input: ["텍스트1", "텍스트2"] }
// response: { data: [{ embedding: [0.023, ...] }] }
```

## 핵심 코드

```typescript
// lib/voyage.ts — 임베딩 클라이언트 (SDK 없이 raw fetch)
export async function embed(texts: string[]): Promise<number[][]> {
  const res = await fetch("https://api.voyageai.com/v1/embeddings", {
    body: JSON.stringify({ model: "voyage-3-large", input: texts }),
  })
  const json = await res.json()
  return json.data.map(d => d.embedding)
}

// cosine similarity 직접 구현 (외부 라이브러리 없이)
function cosineSimilarity(a: number[], b: number[]): number {
  return dotProduct(a, b) / (magnitude(a) * magnitude(b))
}
```

## 시행착오

- (직접 기록)

## 다음에 다시 본다면

- (직접 기록)
