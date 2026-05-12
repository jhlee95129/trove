"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

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
  const [input, setInput] = useState("")
  const [response, setResponse] = useState<ChatResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [showRaw, setShowRaw] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!input.trim() || loading) return

    setLoading(true)
    setResponse(null)

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: input }),
    })

    const data = (await res.json()) as ChatResponse
    setResponse(data)
    setLoading(false)
  }

  const answerText =
    response?.content
      ?.filter((block) => block.type === "text")
      .map((block) => block.text)
      .join("\n") ?? ""

  return (
    <div className="mx-auto flex min-h-svh max-w-2xl flex-col gap-6 p-6">
      <div>
        <h1 className="text-lg font-medium">Trove</h1>
        <p className="text-sm text-muted-foreground">Rung 1: Hello Claude</p>
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Claude anything..."
          disabled={loading}
        />
        <Button type="submit" disabled={loading || !input.trim()}>
          {loading ? "Asking..." : "Ask"}
        </Button>
      </form>

      {response && (
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Response</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                {answerText}
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <span>model: {response.model}</span>
                <span>stop: {response.stop_reason}</span>
                <span>
                  tokens: {response.usage.input_tokens} in /{" "}
                  {response.usage.output_tokens} out
                </span>
              </div>
            </CardContent>
          </Card>

          <div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRaw(!showRaw)}
            >
              {showRaw ? "Hide" : "Show"} Raw JSON
            </Button>
            {showRaw && (
              <pre className="mt-2 max-h-96 overflow-auto rounded-lg bg-muted p-4 font-mono text-xs">
                {JSON.stringify(response, null, 2)}
              </pre>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
