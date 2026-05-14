"use client"

import { useRef, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type Message = {
  role: "user" | "assistant"
  content: string
}

type ContentBlock = {
  type: string
  text?: string
}

type ChatResponse = {
  id: string
  type: string
  role: string
  content: ContentBlock[]
  model: string
  stop_reason: string
  stop_sequence: string | null
  usage: {
    input_tokens: number
    output_tokens: number
  }
}

type AgentStep = {
  type: "thought" | "action" | "observation" | "answer" | "reflection"
  content: string
  toolName?: string
}

type AgentResponse = {
  answer: string
  steps: AgentStep[]
  iterationCount: number
  usage: {
    totalInputTokens: number
    totalOutputTokens: number
  }
}

type Mode = "raw" | "langchain" | "langgraph" | "reflection"

const MODE_LABELS: Record<Mode, string> = {
  raw: "Raw Agent",
  langchain: "LangChain RAG",
  langgraph: "LangGraph Agent",
  reflection: "Reflection Agent",
}

const MODE_DESCRIPTIONS: Record<Mode, string> = {
  raw: "Raw Agent: 직접 구현한 ReAct 에이전트가 도구를 사용해 답변합니다.",
  langchain:
    "LangChain RAG: LCEL 체인이 KB를 검색하고 답변을 생성합니다.",
  langgraph:
    "LangGraph Agent: StateGraph 기반 ReAct 에이전트가 도구를 사용해 답변합니다.",
  reflection:
    "Reflection Agent: 답변 후 self-critique하고 필요 시 수정합니다.",
}

const MODES: Mode[] = ["raw", "langchain", "langgraph", "reflection"]

export default function Page() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [lastRaw, setLastRaw] = useState<ChatResponse | null>(null)
  const [showRaw, setShowRaw] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)
  const bottomRef = useRef<HTMLDivElement>(null)

  const [mode, setMode] = useState<Mode>("raw")
  const [agentSteps, setAgentSteps] = useState<AgentStep[]>([])
  const [agentUsage, setAgentUsage] = useState<AgentResponse["usage"] | null>(
    null
  )
  const [showSteps, setShowSteps] = useState(false)

  const isAgentMode = mode === "raw" || mode === "langgraph" || mode === "reflection"

  function cycleMode() {
    const idx = MODES.indexOf(mode)
    setMode(MODES[(idx + 1) % MODES.length])
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage: Message = { role: "user", content: input.trim() }
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInput("")
    setLoading(true)

    if (mode === "raw" || mode === "langgraph" || mode === "reflection") {
      // Agent Mode: 단일 질문
      const endpoint =
        mode === "raw" ? "/api/agent" : mode === "langgraph" ? "/api/agent-graph" : "/api/agent-reflection"
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: input.trim() }),
      })

      const data = (await res.json()) as AgentResponse
      setAgentSteps(data.steps)
      setAgentUsage(data.usage)
      setLastRaw(null)

      setMessages([
        ...updatedMessages,
        { role: "assistant", content: data.answer },
      ])
    } else {
      // LangChain RAG: 전체 히스토리 전송
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages }),
      })

      const data = (await res.json()) as ChatResponse
      setLastRaw(data)
      setAgentSteps([])
      setAgentUsage(null)

      const assistantText =
        data.content
          ?.filter((block) => block.type === "text")
          .map((block) => block.text)
          .join("\n") ?? ""

      setMessages([
        ...updatedMessages,
        { role: "assistant", content: assistantText },
      ])
    }

    setLoading(false)
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }))
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setUploadStatus(`"${file.name}" 업로드 중...`)

    const formData = new FormData()
    formData.append("file", file)

    try {
      const res = await fetch("/api/ingest", {
        method: "POST",
        body: formData,
      })
      const data = (await res.json()) as { message: string }
      setUploadStatus(data.message)
    } catch {
      setUploadStatus("업로드 실패")
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const stepStyles: Record<AgentStep["type"], string> = {
    thought: "border-l-2 border-blue-400 bg-blue-50 dark:bg-blue-950/30",
    action: "border-l-2 border-amber-400 bg-amber-50 dark:bg-amber-950/30",
    observation:
      "border-l-2 border-green-400 bg-green-50 dark:bg-green-950/30",
    answer: "border-l-2 border-purple-400 bg-purple-50 dark:bg-purple-950/30",
    reflection:
      "border-l-2 border-rose-400 bg-rose-50 dark:bg-rose-950/30",
  }

  const stepLabels: Record<AgentStep["type"], string> = {
    thought: "THOUGHT",
    action: "ACTION",
    observation: "OBSERVATION",
    answer: "ANSWER",
    reflection: "REFLECTION",
  }

  return (
    <div className="mx-auto flex min-h-svh max-w-2xl flex-col p-6">
      {/* Header */}
      <div className="mb-4 flex items-baseline justify-between">
        <div>
          <h1 className="text-lg font-medium">Trove</h1>
          <p className="text-sm text-muted-foreground">
            Rung 12: Reflection
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Mode Toggle */}
          <button
            onClick={cycleMode}
            className="rounded-full bg-primary px-3 py-1 text-xs font-medium text-primary-foreground transition-colors"
          >
            {MODE_LABELS[mode]}
          </button>
          {/* Token Usage */}
          {isAgentMode && agentUsage && (
            <div className="text-right text-xs text-muted-foreground">
              <div>input: {agentUsage.totalInputTokens} tokens</div>
              <div>output: {agentUsage.totalOutputTokens} tokens</div>
            </div>
          )}
          {!isAgentMode && lastRaw && (
            <div className="text-right text-xs text-muted-foreground">
              <div>input: {lastRaw.usage.input_tokens} tokens</div>
              <div>output: {lastRaw.usage.output_tokens} tokens</div>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-4 overflow-y-auto pb-4">
        {messages.length === 0 && (
          <p className="py-12 text-center text-sm text-muted-foreground">
            {MODE_DESCRIPTIONS[mode]}
          </p>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            className={
              msg.role === "user" ? "flex justify-end" : "flex justify-start"
            }
          >
            <div
              className={
                msg.role === "user"
                  ? "max-w-[80%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground"
                  : "max-w-[80%] rounded-2xl rounded-bl-sm bg-muted px-4 py-2.5 text-sm"
              }
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-sm bg-muted px-4 py-2.5 text-sm text-muted-foreground">
              {isAgentMode ? "Agent thinking..." : "Thinking..."}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Agent Reasoning Steps */}
      {isAgentMode && agentSteps.length > 0 && (
        <div className="mb-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSteps(!showSteps)}
          >
            {showSteps ? "Hide" : "Show"} Reasoning Steps ({agentSteps.length})
          </Button>
          {showSteps && (
            <div className="mt-2 space-y-2">
              {agentSteps.map((step, i) => (
                <div
                  key={i}
                  className={`rounded-lg px-3 py-2 text-xs ${stepStyles[step.type]}`}
                >
                  <span className="font-mono font-semibold">
                    {stepLabels[step.type]}
                    {step.toolName && ` [${step.toolName}]`}
                  </span>
                  <p className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap">
                    {step.content}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Raw JSON toggle (LangChain mode only) */}
      {!isAgentMode && lastRaw && (
        <div className="mb-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowRaw(!showRaw)}
          >
            {showRaw ? "Hide" : "Show"} Raw JSON
          </Button>
          {showRaw && (
            <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-muted p-4 font-mono text-xs">
              {JSON.stringify(lastRaw, null, 2)}
            </pre>
          )}
        </div>
      )}

      {/* PDF Upload */}
      <div className="mb-3 flex items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handleFileUpload}
          disabled={uploading}
          className="text-sm"
        />
        {uploadStatus && (
          <span className="text-xs text-muted-foreground">{uploadStatus}</span>
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={
            isAgentMode
              ? "에이전트에게 질문하세요..."
              : "메시지를 입력하세요..."
          }
          disabled={loading}
        />
        <Button type="submit" disabled={loading || !input.trim()}>
          {loading ? "..." : "Send"}
        </Button>
      </form>
    </div>
  )
}
