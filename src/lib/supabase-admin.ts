// サーバーサイド専用の管理者用 Supabase クライアント
// service_role キーを使用するため RLS をバイパスできる
// ⚠️ クライアントサイドでは絶対に使用しないこと
import { createClient } from '@supabase/supabase-js';

export function createAdminClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceRoleKey) {
        throw new Error(
            'NEXT_PUBLIC_SUPABASE_URL または SUPABASE_SERVICE_ROLE_KEY が未設定です'
        );
    }

    return createClient(url, serviceRoleKey, {
        auth: {
            // サーバーサイド専用のため、セッション永続化は不要
            persistSession: false,
            autoRefreshToken: false,
        },
    });
}
