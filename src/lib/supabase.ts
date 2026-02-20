import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Supabase クライアント（型の自動推論を避けるため非ジェネリック）
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
