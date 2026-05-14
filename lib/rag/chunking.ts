/**
 * RecursiveCharacterTextSplitter 직접 구현 (LangChain 없이)
 *
 * 분할 우선순위: 문단(\n\n) → 줄(\n) → 문장(. ) → 글자
 * overlap으로 청크 간 문맥을 유지한다.
 */

const SEPARATORS = ["\n\n", "\n", ". ", " ", ""]

/**
 * 텍스트를 지정된 크기의 청크로 분할한다.
 *
 * @param text - 분할할 텍스트
 * @param chunkSize - 청크 최대 길이 (글자 수)
 * @param overlap - 청크 간 겹치는 글자 수
 */
export function chunkText(
  text: string,
  chunkSize: number = 500,
  overlap: number = 50
): string[] {
  // 빈 텍스트 처리
  if (!text.trim()) return []

  // 텍스트가 chunkSize 이하면 그대로 반환
  if (text.length <= chunkSize) return [text.trim()]

  return splitRecursive(text, chunkSize, overlap, 0)
}

function splitRecursive(
  text: string,
  chunkSize: number,
  overlap: number,
  separatorIndex: number
): string[] {
  const separator = SEPARATORS[separatorIndex]

  // 마지막 분할자(빈 문자열)에 도달하면 글자 단위로 자른다
  if (separator === "") {
    return splitBySize(text, chunkSize, overlap)
  }

  const parts = text.split(separator)
  const chunks: string[] = []
  let current = ""

  for (const part of parts) {
    const candidate = current
      ? current + separator + part
      : part

    if (candidate.length <= chunkSize) {
      current = candidate
    } else {
      // 현재까지 모은 것을 청크로 저장
      if (current) {
        chunks.push(current.trim())
      }

      // 이 part 자체가 chunkSize보다 크면 더 작은 분할자로 재귀
      if (part.length > chunkSize) {
        const subChunks = splitRecursive(part, chunkSize, overlap, separatorIndex + 1)
        chunks.push(...subChunks)
        current = ""
      } else {
        current = part
      }
    }
  }

  // 마지막 남은 것
  if (current.trim()) {
    chunks.push(current.trim())
  }

  // overlap 적용
  if (overlap > 0 && chunks.length > 1) {
    return applyOverlap(chunks, overlap)
  }

  return chunks
}

function splitBySize(text: string, chunkSize: number, overlap: number): string[] {
  const chunks: string[] = []
  let start = 0

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length)
    chunks.push(text.slice(start, end).trim())
    start += chunkSize - overlap
  }

  return chunks.filter(Boolean)
}

function applyOverlap(chunks: string[], overlap: number): string[] {
  const result: string[] = [chunks[0]]

  for (let i = 1; i < chunks.length; i++) {
    // 이전 청크의 마지막 overlap 글자를 현재 청크 앞에 붙인다
    const prevTail = chunks[i - 1].slice(-overlap)
    result.push(prevTail + " " + chunks[i])
  }

  return result
}
