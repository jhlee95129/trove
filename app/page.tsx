"use client"

import { useRef, useState } from "react"

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
  raw: "직접 구현한 ReAct 에이전트가 도구를 사용해 답변합니다.",
  langchain: "LCEL 체인이 KB를 검색하고 답변을 생성합니다.",
  langgraph: "StateGraph 기반 ReAct 에이전트가 도구를 사용해 답변합니다.",
  reflection: "답변 후 self-critique하고 필요 시 수정합니다.",
}

const MODES: Mode[] = ["raw", "langchain", "langgraph", "reflection"]

const stepStyles: Record<AgentStep["type"], string> = {
  thought: "border-l-2 border-blue-400 bg-blue-50/80 dark:bg-blue-950/30",
  action: "border-l-2 border-amber-400 bg-amber-50/80 dark:bg-amber-950/30",
  observation: "border-l-2 border-green-400 bg-green-50/80 dark:bg-green-950/30",
  answer: "border-l-2 border-purple-400 bg-purple-50/80 dark:bg-purple-950/30",
  reflection: "border-l-2 border-rose-400 bg-rose-50/80 dark:bg-rose-950/30",
}

const stepLabels: Record<AgentStep["type"], string> = {
  thought: "THOUGHT",
  action: "ACTION",
  observation: "OBSERVATION",
  answer: "ANSWER",
  reflection: "REFLECTION",
}

const stepIcons: Record<AgentStep["type"], string> = {
  thought: "💭",
  action: "⚡",
  observation: "👁",
  answer: "✅",
  reflection: "🔍",
}

function formatTokens(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

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
  const [showModeMenu, setShowModeMenu] = useState(false)

  const isAgentMode =
    mode === "raw" || mode === "langgraph" || mode === "reflection"

  const tokenUsage = isAgentMode
    ? agentUsage
      ? {
          input: agentUsage.totalInputTokens,
          output: agentUsage.totalOutputTokens,
        }
      : null
    : lastRaw
      ? { input: lastRaw.usage.input_tokens, output: lastRaw.usage.output_tokens }
      : null

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage: Message = { role: "user", content: input.trim() }
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInput("")
    setLoading(true)

    if (mode === "raw" || mode === "langgraph" || mode === "reflection") {
      const endpoint =
        mode === "raw"
          ? "/api/agent"
          : mode === "langgraph"
            ? "/api/agent-graph"
            : "/api/agent-reflection"
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

  return (
    <div className="mx-auto flex min-h-svh max-w-2xl flex-col">
      {/* ─── Header ─── */}
      <header className="sticky top-0 z-10 border-b bg-background/80 px-6 py-4 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Trove</h1>
            <p className="text-xs text-muted-foreground">
              쓸수록 똑똑해지는 AI 리서치 노트북
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Token Usage Badge */}
            {tokenUsage && (
              <div className="flex items-center gap-1.5 rounded-full border px-2.5 py-1">
                <svg
                  className="h-3 w-3 text-muted-foreground"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5"
                  />
                </svg>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {formatTokens(tokenUsage.input)} / {formatTokens(tokenUsage.output)}
                </span>
              </div>
            )}

            {/* Mode Selector */}
            <div className="relative">
              <button
                onClick={() => setShowModeMenu(!showModeMenu)}
                className="flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors hover:bg-muted"
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    mode === "raw"
                      ? "bg-blue-500"
                      : mode === "langchain"
                        ? "bg-emerald-500"
                        : mode === "langgraph"
                          ? "bg-violet-500"
                          : "bg-rose-500"
                  }`}
                />
                {MODE_LABELS[mode]}
                <svg
                  className={`h-3 w-3 text-muted-foreground transition-transform ${showModeMenu ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="m19.5 8.25-7.5 7.5-7.5-7.5"
                  />
                </svg>
              </button>

              {showModeMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowModeMenu(false)}
                  />
                  <div className="absolute right-0 z-20 mt-1 w-52 overflow-hidden rounded-lg border bg-background shadow-lg">
                    {MODES.map((m) => (
                      <button
                        key={m}
                        onClick={() => {
                          setMode(m)
                          setShowModeMenu(false)
                        }}
                        className={`flex w-full items-start gap-2.5 px-3 py-2.5 text-left text-xs transition-colors hover:bg-muted ${
                          mode === m ? "bg-muted/50" : ""
                        }`}
                      >
                        <span
                          className={`mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                            m === "raw"
                              ? "bg-blue-500"
                              : m === "langchain"
                                ? "bg-emerald-500"
                                : m === "langgraph"
                                  ? "bg-violet-500"
                                  : "bg-rose-500"
                          }`}
                        />
                        <div>
                          <div className="font-medium">{MODE_LABELS[m]}</div>
                          <div className="mt-0.5 text-[10px] text-muted-foreground">
                            {MODE_DESCRIPTIONS[m]}
                          </div>
                        </div>
                        {mode === m && (
                          <svg
                            className="ml-auto mt-0.5 h-3 w-3 shrink-0 text-primary"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={2.5}
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="m4.5 12.75 6 6 9-13.5"
                            />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ─── Messages ─── */}
      <div className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="mb-3 text-4xl">🔎</div>
            <p className="text-sm font-medium">무엇이든 물어보세요</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {MODE_DESCRIPTIONS[mode]}
            </p>
          </div>
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
            <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm bg-muted px-4 py-2.5 text-sm text-muted-foreground">
              <span className="inline-flex gap-0.5">
                <span className="animate-bounce" style={{ animationDelay: "0ms" }}>.</span>
                <span className="animate-bounce" style={{ animationDelay: "150ms" }}>.</span>
                <span className="animate-bounce" style={{ animationDelay: "300ms" }}>.</span>
              </span>
              {isAgentMode ? "에이전트가 조사 중" : "답변 생성 중"}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* ─── Bottom Area ─── */}
      <div className="sticky bottom-0 border-t bg-background/80 px-6 pb-6 pt-3 backdrop-blur-sm">
        {/* Reasoning Steps Accordion */}
        {isAgentMode && agentSteps.length > 0 && (
          <div className="mb-3">
            <button
              onClick={() => setShowSteps(!showSteps)}
              className="flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors hover:bg-muted"
            >
              <svg
                className={`h-3 w-3 text-muted-foreground transition-transform ${showSteps ? "rotate-90" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m8.25 4.5 7.5 7.5-7.5 7.5"
                />
              </svg>
              <span>추론 과정</span>
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-normal text-muted-foreground">
                {agentSteps.length}단계
              </span>
            </button>
            {showSteps && (
              <div className="mt-2 max-h-72 space-y-1.5 overflow-y-auto rounded-lg border p-2">
                {agentSteps.map((step, i) => (
                  <div
                    key={i}
                    className={`rounded-md px-3 py-2 text-xs ${stepStyles[step.type]}`}
                  >
                    <div className="flex items-center gap-1.5">
                      <span>{stepIcons[step.type]}</span>
                      <span className="font-mono font-semibold text-[10px]">
                        {stepLabels[step.type]}
                        {step.toolName && (
                          <span className="ml-1 font-normal text-muted-foreground">
                            {step.toolName}
                          </span>
                        )}
                      </span>
                    </div>
                    <p className="mt-1 max-h-32 overflow-auto whitespace-pre-wrap leading-relaxed text-foreground/80">
                      {step.content}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Raw JSON Accordion (LangChain mode) */}
        {!isAgentMode && lastRaw && (
          <div className="mb-3">
            <button
              onClick={() => setShowRaw(!showRaw)}
              className="flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors hover:bg-muted"
            >
              <svg
                className={`h-3 w-3 text-muted-foreground transition-transform ${showRaw ? "rotate-90" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m8.25 4.5 7.5 7.5-7.5 7.5"
                />
              </svg>
              Raw JSON
            </button>
            {showRaw && (
              <pre className="mt-2 max-h-64 overflow-auto rounded-lg border bg-muted/50 p-3 font-mono text-[11px] leading-relaxed">
                {JSON.stringify(lastRaw, null, 2)}
              </pre>
            )}
          </div>
        )}

        {/* Input Bar */}
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          {/* File Upload Button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-colors hover:bg-muted disabled:opacity-50"
            title="PDF 업로드"
          >
            {uploading ? (
              <svg
                className="h-4 w-4 animate-spin text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
            ) : (
              <svg
                className="h-4 w-4 text-muted-foreground"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="m18.375 12.739-7.693 7.693a4.5 4.5 0 0 1-6.364-6.364l10.94-10.94A3 3 0 1 1 19.5 7.372L8.552 18.32m.009-.01-.01.01m5.699-9.941-7.81 7.81a1.5 1.5 0 0 0 2.112 2.13"
                />
              </svg>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf"
            onChange={handleFileUpload}
            className="hidden"
          />

          {/* Text Input */}
          <div className="relative flex-1">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="무엇이든 물어보세요..."
              disabled={loading}
              className="h-10 w-full rounded-full border bg-background px-4 pr-12 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50"
            />
            {/* Send Button (inside input) */}
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full bg-primary text-primary-foreground transition-opacity disabled:opacity-30"
            >
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.5 10.5 12 3m0 0 7.5 7.5M12 3v18"
                />
              </svg>
            </button>
          </div>
        </form>

        {/* Upload Status */}
        {uploadStatus && (
          <p className="mt-2 text-center text-[11px] text-muted-foreground">
            {uploadStatus}
          </p>
        )}
      </div>
    </div>
  )
}
