'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { createTeam, requestJoinTeam, getMyPendingRequest } from '@/app/actions/auth';

type Mode = 'select' | 'create' | 'join' | 'pending';

export default function OnboardingPage() {
    const router = useRouter();
    const { profile, loading, refreshProfile } = useAuth();
    const [mode, setMode] = useState<Mode>('select');
    const [teamName, setTeamName] = useState('');
    const [teamId, setTeamId] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [pendingTeamName, setPendingTeamName] = useState('');

    // チーム所属済みの場合はダッシュボードへリダイレクト
    useEffect(() => {
        if (!loading && profile?.team_id) {
            router.push('/');
        }
    }, [loading, profile, router]);

    // pending 状態の参加申請があるか確認
    useEffect(() => {
        async function checkPending() {
            try {
                const request = await getMyPendingRequest();
                if (request) {
                    setPendingTeamName(request.team?.name || request.team_id);
                    setMode('pending');
                }
            } catch {
                // 無視
            }
        }
        if (!loading && profile && !profile.team_id) {
            checkPending();
        }
    }, [loading, profile]);

    // チーム新規作成
    const handleCreateTeam = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!teamName.trim()) return;

        setSubmitting(true);
        try {
            await createTeam(teamName);
            await refreshProfile();
            router.push('/');
            router.refresh();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'チーム作成に失敗しました');
        } finally {
            setSubmitting(false);
        }
    };

    // チーム参加申請
    const handleJoinRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!teamId.trim()) return;

        setSubmitting(true);
        try {
            await requestJoinTeam(teamId.trim());
            setMode('pending');
            setPendingTeamName(teamId.trim());
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : '参加申請に失敗しました');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="auth-page">
                <div className="auth-card">
                    <div className="empty-state">
                        <div className="empty-state-icon">⏳</div>
                        <div className="empty-state-text">読み込み中...</div>
                    </div>
                </div>
            </div>
        );
    }

    // 承認待ち画面
    if (mode === 'pending') {
        return (
            <div className="auth-page">
                <div className="auth-card">
                    <div className="auth-header">
                        <div className="auth-logo">⏳</div>
                        <h1 className="auth-title">承認待ち</h1>
                        <p className="auth-subtitle">
                            チームへの参加申請を送信しました。<br />
                            管理者が承認するまでお待ちください。
                        </p>
                    </div>
                    <div className="card" style={{ marginBottom: 20 }}>
                        <div className="card-body">
                            <div className="stat-label">申請先チーム</div>
                            <div style={{ fontSize: '1.1rem', fontWeight: 600, marginTop: 4 }}>
                                {pendingTeamName}
                            </div>
                        </div>
                    </div>
                    <button
                        className="btn btn-ghost btn-full"
                        onClick={() => {
                            setMode('select');
                            setError('');
                        }}
                    >
                        ← 選択画面に戻る
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-page">
            <div className="auth-card" style={{ maxWidth: mode === 'select' ? 560 : 480 }}>
                <div className="auth-header">
                    <div className="auth-logo">🏆</div>
                    <h1 className="auth-title">チーム設定</h1>
                    <p className="auth-subtitle">
                        チームを新規作成するか、既存のチームに参加してください
                    </p>
                </div>

                {error && (
                    <div className="alert alert-error" style={{ marginBottom: 20 }}>⚠️ {error}</div>
                )}

                {/* 選択画面 */}
                {mode === 'select' && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <button
                            className="card"
                            onClick={() => { setMode('create'); setError(''); }}
                            style={{
                                cursor: 'pointer',
                                border: '2px solid transparent',
                                transition: 'border-color 0.2s',
                                textAlign: 'center',
                                padding: '32px 20px',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary-500)')}
                            onMouseLeave={e => (e.currentTarget.style.borderColor = 'transparent')}
                        >
                            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🆕</div>
                            <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 8 }}>
                                チームを新規作成
                            </div>
                            <div className="text-muted text-sm">
                                新しいチームを作成して管理者になります
                            </div>
                        </button>

                        <button
                            className="card"
                            onClick={() => { setMode('join'); setError(''); }}
                            style={{
                                cursor: 'pointer',
                                border: '2px solid transparent',
                                transition: 'border-color 0.2s',
                                textAlign: 'center',
                                padding: '32px 20px',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--primary-500)')}
                            onMouseLeave={e => (e.currentTarget.style.borderColor = 'transparent')}
                        >
                            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🤝</div>
                            <div style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: 8 }}>
                                既存チームに参加
                            </div>
                            <div className="text-muted text-sm">
                                チームIDを入力して参加申請を送ります
                            </div>
                        </button>
                    </div>
                )}

                {/* チーム作成フォーム */}
                {mode === 'create' && (
                    <form onSubmit={handleCreateTeam}>
                        <div className="form-group" style={{ marginBottom: 20 }}>
                            <label className="form-label">チーム名 *</label>
                            <input
                                type="text"
                                className="form-input"
                                value={teamName}
                                onChange={e => setTeamName(e.target.value)}
                                placeholder="○○サッカークラブ"
                                required
                                autoFocus
                            />
                        </div>
                        <div style={{ display: 'flex', gap: 12 }}>
                            <button
                                type="button"
                                className="btn btn-ghost"
                                onClick={() => { setMode('select'); setError(''); }}
                            >
                                ← 戻る
                            </button>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={submitting || !teamName.trim()}
                                style={{ flex: 1 }}
                            >
                                {submitting ? '作成中...' : 'チームを作成'}
                            </button>
                        </div>
                    </form>
                )}

                {/* 参加申請フォーム */}
                {mode === 'join' && (
                    <form onSubmit={handleJoinRequest}>
                        <div className="form-group" style={{ marginBottom: 8 }}>
                            <label className="form-label">チームID *</label>
                            <input
                                type="text"
                                className="form-input"
                                value={teamId}
                                onChange={e => setTeamId(e.target.value)}
                                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                                required
                                autoFocus
                            />
                        </div>
                        <p className="text-muted text-sm" style={{ marginBottom: 20 }}>
                            チーム管理者からチームIDを教えてもらってください
                        </p>
                        <div style={{ display: 'flex', gap: 12 }}>
                            <button
                                type="button"
                                className="btn btn-ghost"
                                onClick={() => { setMode('select'); setError(''); }}
                            >
                                ← 戻る
                            </button>
                            <button
                                type="submit"
                                className="btn btn-primary"
                                disabled={submitting || !teamId.trim()}
                                style={{ flex: 1 }}
                            >
                                {submitting ? '送信中...' : '参加申請を送る'}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
