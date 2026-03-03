'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import {
    updateTeamName,
    getPendingJoinRequests,
    approveJoinRequest,
    rejectJoinRequest,
} from '../actions/auth';
import { createClient } from '@/lib/supabase';
import type { Profile, JoinRequest } from '@/types/database';

export default function SettingsPage() {
    const router = useRouter();
    const { profile, isAdmin, loading, refreshProfile } = useAuth();
    const [teamName, setTeamName] = useState('');
    const [members, setMembers] = useState<Profile[]>([]);
    const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    // チームメンバー（profiles）の取得
    const loadTeamMembers = useCallback(async () => {
        if (!profile?.team_id) return;
        const supabase = createClient();
        const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('team_id', profile.team_id);
        setMembers(data ?? []);
    }, [profile?.team_id]);

    // 参加申請一覧の取得
    const loadJoinRequests = useCallback(async () => {
        if (!isAdmin) return;
        try {
            const requests = await getPendingJoinRequests();
            setJoinRequests(requests);
        } catch {
            // 権限なし等は無視
        }
    }, [isAdmin]);

    useEffect(() => {
        if (profile?.team?.name) {
            setTeamName(profile.team.name);
        }
        loadTeamMembers();
        loadJoinRequests();
    }, [profile, loadTeamMembers, loadJoinRequests]);

    // 管理者でなければダッシュボードへリダイレクト
    useEffect(() => {
        if (!loading && !isAdmin) {
            router.push('/');
        }
    }, [loading, isAdmin, router]);

    // チーム名を保存
    const handleSaveTeamName = async () => {
        if (!profile?.team_id || !teamName.trim()) return;
        setSaving(true);
        setMessage('');
        setError('');
        try {
            await updateTeamName(profile.team_id, teamName);
            await refreshProfile();
            setMessage('チーム名を更新しました');
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : '更新に失敗しました');
        } finally {
            setSaving(false);
        }
    };

    // 参加申請を承認
    const handleApprove = async (requestId: string) => {
        setMessage('');
        setError('');
        try {
            await approveJoinRequest(requestId);
            setMessage('参加申請を承認しました');
            await loadJoinRequests();
            await loadTeamMembers();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : '承認に失敗しました');
        }
    };

    // 参加申請を拒否
    const handleReject = async (requestId: string) => {
        setMessage('');
        setError('');
        try {
            await rejectJoinRequest(requestId);
            setMessage('参加申請を拒否しました');
            await loadJoinRequests();
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : '拒否に失敗しました');
        }
    };

    // ロールを変更（管理者 ↔ 一般部員）
    const handleRoleChange = async (userId: string, newRole: 'admin' | 'member') => {
        const supabase = createClient();
        await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
        await loadTeamMembers();
    };

    if (loading) {
        return (
            <div className="empty-state">
                <div className="empty-state-icon">⏳</div>
                <div className="empty-state-text">読み込み中...</div>
            </div>
        );
    }

    return (
        <>
            <div className="page-header">
                <div>
                    <h1 className="page-title">チーム設定</h1>
                    <p className="page-subtitle">チーム情報の管理・メンバー管理</p>
                </div>
            </div>

            {/* メッセージ表示 */}
            {message && <div className="alert alert-success mb-4">✅ {message}</div>}
            {error && <div className="alert alert-error mb-4">⚠️ {error}</div>}

            {/* チーム名設定 */}
            <div className="card mb-4">
                <div className="card-header">
                    <h2 className="card-title">チーム情報</h2>
                </div>
                <div className="card-body">
                    <div className="form-row">
                        <div className="form-group" style={{ flex: 1 }}>
                            <label className="form-label">チーム名</label>
                            <input
                                className="form-input"
                                value={teamName}
                                onChange={e => setTeamName(e.target.value)}
                                placeholder="○○サッカークラブ"
                            />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                            <button
                                className="btn btn-primary"
                                onClick={handleSaveTeamName}
                                disabled={saving || !teamName.trim()}
                            >
                                {saving ? '保存中...' : '保存'}
                            </button>
                        </div>
                    </div>
                    {/* チームID表示（参加申請用に共有） */}
                    {profile?.team_id && (
                        <div style={{ marginTop: 16 }}>
                            <label className="form-label">チームID（メンバー招待時に共有）</label>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                background: 'var(--bg-secondary)',
                                borderRadius: 8,
                                padding: '10px 14px',
                                fontFamily: 'monospace',
                                fontSize: '0.85rem',
                                wordBreak: 'break-all',
                            }}>
                                {profile.team_id}
                                <button
                                    className="btn btn-ghost btn-sm"
                                    onClick={() => {
                                        navigator.clipboard.writeText(profile.team_id!);
                                        setMessage('チームIDをコピーしました');
                                    }}
                                    title="コピー"
                                >
                                    📋
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* 参加申請一覧 */}
            <div className="card mb-4">
                <div className="card-header">
                    <h2 className="card-title">参加申請</h2>
                    <span className="text-muted text-sm">{joinRequests.length}件</span>
                </div>
                <div className="card-body">
                    {joinRequests.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-state-text">承認待ちの申請はありません</div>
                        </div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {joinRequests.map(req => (
                                <div
                                    key={req.id}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '12px 16px',
                                        background: 'var(--bg-secondary)',
                                        borderRadius: 8,
                                    }}
                                >
                                    <div>
                                        <div style={{ fontWeight: 600 }}>
                                            {(req.profile as { display_name?: string })?.display_name || '名前未設定'}
                                        </div>
                                        <div className="text-muted text-sm">
                                            {new Date(req.created_at).toLocaleDateString('ja-JP')} 申請
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 8 }}>
                                        <button
                                            className="btn btn-primary btn-sm"
                                            onClick={() => handleApprove(req.id)}
                                        >
                                            承認
                                        </button>
                                        <button
                                            className="btn btn-ghost btn-sm"
                                            onClick={() => handleReject(req.id)}
                                        >
                                            拒否
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* メンバー一覧 */}
            <div className="card">
                <div className="card-header">
                    <h2 className="card-title">登録メンバー</h2>
                    <span className="text-muted text-sm">{members.length}名</span>
                </div>
                <div className="table-wrapper">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>名前</th>
                                <th>権限</th>
                                <th>操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {members.length === 0 ? (
                                <tr>
                                    <td colSpan={3}>
                                        <div className="empty-state">
                                            <div className="empty-state-text">メンバーがいません</div>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                members.map(m => (
                                    <tr key={m.id}>
                                        <td>
                                            {m.display_name || '-'}
                                            {m.id === profile?.id && (
                                                <span className="badge badge-blue ml-2">あなた</span>
                                            )}
                                        </td>
                                        <td>
                                            <span className={`badge ${m.role === 'admin' ? 'badge-purple' : 'badge-gray'}`}>
                                                {m.role === 'admin' ? '管理者' : '一般部員'}
                                            </span>
                                        </td>
                                        <td>
                                            {/* 自分以外のロールを変更可能 */}
                                            {m.id !== profile?.id && (
                                                <button
                                                    className="btn btn-ghost btn-sm"
                                                    onClick={() => handleRoleChange(m.id, m.role === 'admin' ? 'member' : 'admin')}
                                                >
                                                    {m.role === 'admin' ? '一般に変更' : '管理者に昇格'}
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
}
