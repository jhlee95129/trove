import { createClient, type SupabaseClient } from "@supabase/supabase-js"

let _supabase: SupabaseClient | null = null

// 서버 측 전용 클라이언트 (secret key 사용) — lazy 초기화
export function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SECRET_KEY
    if (!supabaseUrl || !supabaseKey) {
      throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY are required")
    }
    _supabase = createClient(supabaseUrl, supabaseKey)
  }
  return _supabase
}

// 기존 코드 호환용
export const supabase = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    return (getSupabase() as unknown as Record<string | symbol, unknown>)[prop]
  },
})
