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

export default function Page() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [lastRaw, setLastRaw] = useState<ChatResponse | null>(null)
  const [showRaw, setShowRaw] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage: Message = { role: "user", content: input.trim() }
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInput("")
    setLoading(true)

    // 전체 히스토리를 매번 전송 — LLM은 stateless이므로
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: updatedMessages }),
    })

    const data = (await res.json()) as ChatResponse
    setLastRaw(data)

    const assistantText =
      data.content
        ?.filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("\n") ?? ""

    setMessages([
      ...updatedMessages,
      { role: "assistant", content: assistantText },
    ])
    setLoading(false)
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }))
  }

  return (
    <div className="mx-auto flex min-h-svh max-w-2xl flex-col p-6">
      {/* Header */}
      <div className="mb-4 flex items-baseline justify-between">
        <div>
          <h1 className="text-lg font-medium">Trove</h1>
          <p className="text-sm text-muted-foreground">
            Rung 2: 멀티턴 대화
          </p>
        </div>
        {lastRaw && (
          <div className="text-right text-xs text-muted-foreground">
            <div>input: {lastRaw.usage.input_tokens} tokens</div>
            <div>output: {lastRaw.usage.output_tokens} tokens</div>
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-4 overflow-y-auto pb-4">
        {messages.length === 0 && (
          <p className="py-12 text-center text-sm text-muted-foreground">
            대화를 시작해보세요. 매 턴마다 전체 히스토리가 전송됩니다.
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
              Thinking...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Raw JSON toggle */}
      {lastRaw && (
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

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="메시지를 입력하세요..."
          disabled={loading}
        />
        <Button type="submit" disabled={loading || !input.trim()}>
          {loading ? "..." : "Send"}
        </Button>
      </form>
    </div>
  )
}
