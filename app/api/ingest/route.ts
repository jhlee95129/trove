import { NextRequest, NextResponse } from "next/server"

import { ingestPdf } from "@/lib/rag/ingest"

export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const file = formData.get("file") as File | null

  if (!file || file.type !== "application/pdf") {
    return NextResponse.json(
      { error: "PDF file is required" },
      { status: 400 }
    )
  }

  const buffer = Buffer.from(await file.arrayBuffer())
  const chunkCount = await ingestPdf(buffer, {
    filename: file.name,
    source: "upload",
  })

  return NextResponse.json({
    message: `${file.name}: ${chunkCount}개 청크 저장 완료`,
    chunkCount,
  })
}
