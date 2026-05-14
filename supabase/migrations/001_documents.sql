-- Rung 6: 벡터 검색을 위한 테이블 및 함수
-- Supabase SQL Editor에서 실행할 것

-- 1. pgvector 확장 활성화
create extension if not exists vector;

-- 2. documents 테이블
create table documents (
  id bigserial primary key,
  content text not null,
  embedding vector(1024),  -- voyage-3-large는 1024차원
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);

-- 3. HNSW 인덱스 (cosine similarity 검색 최적화)
-- <=> 연산자 = cosine distance
create index on documents using hnsw (embedding vector_cosine_ops);

-- 4. 검색 함수
create or replace function search_documents(
  query_embedding vector(1024),
  match_count int default 5
)
returns table (
  id bigint,
  content text,
  metadata jsonb,
  similarity float
)
language plpgsql
as $$
begin
  return query
  select
    d.id,
    d.content,
    d.metadata,
    1 - (d.embedding <=> query_embedding) as similarity
  from documents d
  order by d.embedding <=> query_embedding
  limit match_count;
end;
$$;
