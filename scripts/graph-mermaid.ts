/**
 * LangGraph 에이전트의 그래프를 Mermaid 다이어그램으로 출력한다.
 *
 * 실행: pnpm graph:mermaid
 * 결과를 https://mermaid.live 에 붙여넣으면 시각화된다.
 */

import { agentGraph } from "../lib/langgraph/react-graph"

async function main() {
  const mermaid = agentGraph.getGraph().drawMermaid()
  console.log("=== LangGraph ReAct Agent — Mermaid Diagram ===\n")
  console.log(mermaid)
  console.log(
    "\n이 코드를 https://mermaid.live 에 붙여넣으면 그래프가 렌더링됩니다."
  )
}

main().catch(console.error)
