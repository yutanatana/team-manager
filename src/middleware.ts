// 未ログインユーザーをログインページにリダイレクトするミドルウェア
// Next.js 16 の proxy ファイル規約（middleware.ts の後継）
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
    const { pathname } = request.nextUrl;

    // 認証不要のパス（Supabase が未設定でも常にアクセス可）
    const publicPaths = ['/login', '/signup'];
    const isPublicPath = publicPaths.some(p => pathname.startsWith(p));

    // 環境変数が未設定の場合はデプロイ設定の問題のため、publicPath 以外はリダイレクト
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        // 環境変数が未設定の場合、ログイン画面に誘導（ループ防止のためpublicPathは通す）
        if (!isPublicPath) {
            const url = request.nextUrl.clone();
            url.pathname = '/login';
            return NextResponse.redirect(url);
        }
        return NextResponse.next({ request });
    }

    let supabaseResponse = NextResponse.next({ request });

    const supabase = createServerClient(
        supabaseUrl,
        supabaseKey,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    );
                    supabaseResponse = NextResponse.next({ request });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    // セッションを更新（重要: await で実行すること）
    const { data: { user } } = await supabase.auth.getUser();

    // 未ログインの場合、ログインページへリダイレクト
    if (!user && !isPublicPath) {
        const url = request.nextUrl.clone();
        url.pathname = '/login';
        return NextResponse.redirect(url);
    }

    // ログイン済みでログイン/サインアップページにアクセスした場合、ダッシュボードへ
    if (user && isPublicPath) {
        const url = request.nextUrl.clone();
        url.pathname = '/';
        return NextResponse.redirect(url);
    }

    return supabaseResponse;
}

export const config = {
    matcher: [
        // 以下のパスを除いたすべてのルートに適用
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
};
