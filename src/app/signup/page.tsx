'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signUpWithTeam } from '@/app/actions/auth';

export default function SignUpPage() {
    const router = useRouter();
    const [form, setForm] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        displayName: '',
        teamName: '',
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [step, setStep] = useState<'form' | 'done'>('form');

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (form.password !== form.confirmPassword) {
            setError('パスワードが一致しません');
            return;
        }
        if (form.password.length < 8) {
            setError('パスワードは8文字以上で設定してください');
            return;
        }

        setLoading(true);

        try {
            // Server Action 経由でチーム作成（service_role で RLS をバイパス）
            await signUpWithTeam(form.email, form.password, form.displayName, form.teamName);
            setStep('done');
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : '登録に失敗しました';
            setError(msg.includes('User already registered')
                ? 'このメールアドレスはすでに登録されています'
                : msg);
        } finally {
            setLoading(false);
        }
    };

    if (step === 'done') {
        return (
            <div className="auth-page">
                <div className="auth-card">
                    <div className="auth-header">
                        <div className="auth-logo">✅</div>
                        <h1 className="auth-title">登録完了</h1>
                        <p className="auth-subtitle">
                            確認メールを送信しました。メールのリンクをクリックしてアカウントを有効化してください。
                        </p>
                    </div>
                    <button
                        className="btn btn-primary btn-full"
                        onClick={() => router.push('/login')}
                    >
                        ログインページへ
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-page">
            <div className="auth-card">
                <div className="auth-header">
                    <div className="auth-logo">🏆</div>
                    <h1 className="auth-title">新規チーム作成</h1>
                    <p className="auth-subtitle">管理者アカウントとチームを同時に作成</p>
                </div>

                {error && (
                    <div className="alert alert-error">⚠️ {error}</div>
                )}

                <form onSubmit={handleSignUp} className="auth-form">
                    <div className="form-group">
                        <label className="form-label">チーム名 *</label>
                        <input
                            type="text"
                            className="form-input"
                            value={form.teamName}
                            onChange={e => setForm({ ...form, teamName: e.target.value })}
                            placeholder="○○サッカークラブ"
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">お名前（管理者）*</label>
                        <input
                            type="text"
                            className="form-input"
                            value={form.displayName}
                            onChange={e => setForm({ ...form, displayName: e.target.value })}
                            placeholder="山田 太郎"
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label className="form-label">メールアドレス *</label>
                        <input
                            type="email"
                            className="form-input"
                            value={form.email}
                            onChange={e => setForm({ ...form, email: e.target.value })}
                            placeholder="admin@example.com"
                            required
                            autoComplete="email"
                        />
                    </div>
                    <div className="form-row">
                        <div className="form-group">
                            <label className="form-label">パスワード *</label>
                            <input
                                type="password"
                                className="form-input"
                                value={form.password}
                                onChange={e => setForm({ ...form, password: e.target.value })}
                                placeholder="8文字以上"
                                required
                                autoComplete="new-password"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">パスワード（確認）*</label>
                            <input
                                type="password"
                                className="form-input"
                                value={form.confirmPassword}
                                onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
                                placeholder="もう一度入力"
                                required
                                autoComplete="new-password"
                            />
                        </div>
                    </div>
                    <button
                        type="submit"
                        className="btn btn-primary btn-full"
                        disabled={loading}
                    >
                        {loading ? '作成中...' : 'チームを作成する'}
                    </button>
                </form>

                <div className="auth-footer">
                    <p className="text-muted text-sm">
                        すでにアカウントをお持ちですか？{' '}
                        <Link href="/login" style={{ color: 'var(--primary-600)' }}>
                            ログイン
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
