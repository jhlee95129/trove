-- LangChain SupabaseVectorStore가 요구하는 함수 시그니처.
-- 기존 search_documents는 그대로 유지하고, 이 함수는 LangChain 전용.
-- 차이점: filter 파라미터 추가 (metadata jsonb 필터링)

create or replace function match_documents(
  query_embedding vector(1024),
  match_count int default 5,
  filter jsonb default '{}'::jsonb
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
  where d.metadata @> filter
  order by d.embedding <=> query_embedding
  limit match_count;
end;
$$;
