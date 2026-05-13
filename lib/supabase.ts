import { createClient } from "@supabase/supabase-js"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SECRET_KEY!

// 서버 측 전용 클라이언트 (secret key 사용)
export const supabase = createClient(supabaseUrl, supabaseKey)
