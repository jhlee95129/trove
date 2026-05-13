/**
 * Rung 6: 샘플 문서 인덱싱 스크립트
 *
 * 실행: pnpm seed:documents
 *
 * 다양한 주제의 샘플 문서를 임베딩 → Supabase에 저장한다.
 */

import { createClient } from "@supabase/supabase-js"

import { embed } from "../lib/voyage"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// --- 샘플 문서 ---

const documents = [
  {
    content:
      "인공지능(AI)은 인간의 학습, 추론, 지각 능력을 컴퓨터로 구현하는 기술이다. 최근 대규모 언어 모델(LLM)이 자연어 처리 분야에서 혁신적인 성과를 보이고 있다.",
    metadata: { category: "AI", source: "tech-overview" },
  },
  {
    content:
      "RAG(Retrieval-Augmented Generation)는 외부 지식을 검색하여 LLM의 답변 품질을 높이는 기법이다. 벡터 데이터베이스에서 관련 문서를 찾아 컨텍스트로 제공한다.",
    metadata: { category: "AI", source: "rag-intro" },
  },
  {
    content:
      "김치찌개는 한국의 대표적인 찌개 요리로, 잘 익은 김치와 돼지고기를 주재료로 사용한다. 두부와 대파를 넣어 끓이면 깊은 맛이 난다.",
    metadata: { category: "cooking", source: "korean-food" },
  },
  {
    content:
      "조선왕조는 1392년부터 1897년까지 약 500년간 이어진 한국의 왕조이다. 세종대왕은 한글을 창제하여 백성들이 쉽게 글을 읽고 쓸 수 있게 하였다.",
    metadata: { category: "history", source: "korean-history" },
  },
  {
    content:
      "축구는 세계에서 가장 인기 있는 스포츠로, 11명으로 구성된 두 팀이 상대편 골대에 공을 넣어 점수를 겨루는 경기이다. FIFA 월드컵은 4년마다 개최된다.",
    metadata: { category: "sports", source: "football-intro" },
  },
  {
    content:
      "TypeScript는 JavaScript에 정적 타입 시스템을 추가한 프로그래밍 언어이다. 컴파일 타임에 타입 오류를 잡아 대규모 프로젝트의 안정성을 높인다.",
    metadata: { category: "programming", source: "typescript-intro" },
  },
  {
    content:
      "임베딩(embedding)은 텍스트를 고차원 벡터로 변환하는 기술이다. 의미적으로 유사한 텍스트는 벡터 공간에서 가까운 위치에 매핑된다.",
    metadata: { category: "AI", source: "embedding-intro" },
  },
  {
    content:
      "Next.js는 React 기반의 풀스택 웹 프레임워크로, 서버 사이드 렌더링과 정적 사이트 생성을 지원한다. App Router는 서버 컴포넌트를 기본으로 사용한다.",
    metadata: { category: "programming", source: "nextjs-intro" },
  },
]

// --- Main ---

async function main() {
  console.log(`${documents.length}개 문서를 임베딩 중...`)

  // 모든 문서를 한 번에 임베딩 (API 호출 최소화)
  const embeddings = await embed(documents.map((d) => d.content))

  console.log(`임베딩 완료. Supabase에 저장 중...`)

  // 하나씩 저장
  for (let i = 0; i < documents.length; i++) {
    const { error } = await supabase.from("documents").insert({
      content: documents[i].content,
      embedding: JSON.stringify(embeddings[i]),
      metadata: documents[i].metadata,
    })

    if (error) {
      console.error(`문서 ${i + 1} 저장 실패:`, error.message)
    } else {
      console.log(`  [${i + 1}/${documents.length}] "${documents[i].content.slice(0, 30)}..." 저장 완료`)
    }
  }

  console.log(`\n완료! Supabase 대시보드에서 documents 테이블을 확인하세요.`)
}

main().catch(console.error)
