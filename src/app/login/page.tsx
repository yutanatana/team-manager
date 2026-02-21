'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase';

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const supabase = createClient();
            const { error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            if (signInError) throw signInError;
            router.push('/');
            router.refresh();
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'ログインに失敗しました';
            setError(msg.includes('Invalid login credentials')
                ? 'メールアドレスまたはパスワードが正しくありません'
                : msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-card">
                {/* ロゴ・タイトル */}
                <div className="auth-header">
                    <div className="auth-logo">💰</div>
                    <h1 className="auth-title">部費管理</h1>
                    <p className="auth-subtitle">チームアカウントにログイン</p>
                </div>

                {/* エラーメッセージ */}
                {error && (
                    <div className="alert alert-error">
                        ⚠️ {error}
                    </div>
                )}

                {/* フォーム */}
                <form onSubmit={handleLogin} className="auth-form">
                    <div className="form-group">
                        <label className="form-label">メールアドレス</label>
                        <input
                            type="email"
                            className="form-input"
                            value={email}
                            onChange={e => setEmail(e.target.value)}
                            placeholder="example@email.com"
                            required
                            autoComplete="email"
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">パスワード</label>
                        <input
                            type="password"
                            className="form-input"
                            value={password}
                            onChange={e => setPassword(e.target.value)}
                            placeholder="パスワードを入力"
                            required
                            autoComplete="current-password"
                        />
                    </div>
                    <button
                        type="submit"
                        className="btn btn-primary btn-full"
                        disabled={loading}
                    >
                        {loading ? 'ログイン中...' : 'ログイン'}
                    </button>
                </form>

                <div className="auth-footer">
                    <p className="text-muted text-sm">
                        チームがまだない場合は{' '}
                        <Link href="/signup" style={{ color: 'var(--primary-600)' }}>
                            新規チーム作成
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
