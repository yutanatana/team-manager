import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Supabase のメール認証リンクからのコールバックを処理する
// メール確認後、認証コードをセッションに変換してリダイレクトする
export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    // リダイレクト先（デフォルトはオンボーディングページ）
    const next = searchParams.get('next') ?? '/onboarding';

    if (code) {
        const cookieStore = await cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll() {
                        return cookieStore.getAll();
                    },
                    setAll(cookiesToSet) {
                        try {
                            cookiesToSet.forEach(({ name, value, options }) =>
                                cookieStore.set(name, value, options)
                            );
                        } catch {
                            // Server Component から呼ばれた場合は無視
                        }
                    },
                },
            }
        );

        // 認証コードをセッションに変換
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error) {
            return NextResponse.redirect(`${origin}${next}`);
        }
    }

    // エラー時はログインページにリダイレクト
    return NextResponse.redirect(`${origin}/login`);
}
