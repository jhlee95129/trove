import type Anthropic from "@anthropic-ai/sdk"

// --- Tool Schema ---
// Anthropic API에 전달할 도구 명세. 모델은 이 JSON Schema를 보고
// 언제, 어떤 인자로 도구를 "호출할지" 결정한다.
export const calculatorTool: Anthropic.Tool = {
  name: "calculator",
  description:
    "사칙연산을 수행한다. 수학 계산이 필요할 때 반드시 이 도구를 사용한다.",
  input_schema: {
    type: "object" as const,
    properties: {
      operation: {
        type: "string",
        enum: ["add", "subtract", "multiply", "divide"],
        description: "수행할 연산",
      },
      a: { type: "number", description: "첫 번째 숫자" },
      b: { type: "number", description: "두 번째 숫자" },
    },
    required: ["operation", "a", "b"],
  },
}

// --- Tool Executor ---
// 모델이 출력한 tool_use 블록의 input을 받아 실제 계산을 수행.
// 모델은 이 함수의 존재를 모른다 — 단지 JSON을 뱉었을 뿐.
type CalculatorInput = {
  operation: "add" | "subtract" | "multiply" | "divide"
  a: number
  b: number
}

export function executeCalculator(input: CalculatorInput): string {
  const { operation, a, b } = input
  switch (operation) {
    case "add":
      return String(a + b)
    case "subtract":
      return String(a - b)
    case "multiply":
      return String(a * b)
    case "divide":
      if (b === 0) return "Error: division by zero"
      return String(a / b)
  }
}
