'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { updateTeamName } from '../actions/auth';
import { createClient } from '@/lib/supabase';
import type { Profile } from '@/types/database';

export default function SettingsPage() {
    const router = useRouter();
    const { profile, isAdmin, loading, refreshProfile } = useAuth();
    const [teamName, setTeamName] = useState('');
    const [members, setMembers] = useState<Profile[]>([]);
    const [saving, setSaving] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteName, setInviteName] = useState('');
    const [inviting, setInviting] = useState(false);
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

    useEffect(() => {
        if (profile?.team?.name) {
            setTeamName(profile.team.name);
        }
        loadTeamMembers();
    }, [profile, loadTeamMembers]);

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

    // 管理者として部員を招待
    const handleInvite = async () => {
        if (!profile?.team_id || !inviteEmail.trim()) return;
        setInviting(true);
        setMessage('');
        setError('');
        try {
            const supabase = createClient();
            // Supabase Auth Admin API は Service Role Key が必要なため、
            // ここではリンクの案内を表示する（本番では Edge Function を推奨）
            const { error: inviteError } = await supabase.auth.signInWithOtp({
                email: inviteEmail,
                options: {
                    data: {
                        display_name: inviteName,
                        team_id: profile.team_id,
                        role: 'member',
                    },
                },
            });
            if (inviteError) throw inviteError;
            setInviteEmail('');
            setInviteName('');
            setMessage(`${inviteEmail} に招待リンクを送信しました`);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : '招待に失敗しました');
        } finally {
            setInviting(false);
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
                    <p className="page-subtitle">チーム情報の管理・部員の招待</p>
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
                </div>
            </div>

            {/* 部員招待 */}
            <div className="card mb-4">
                <div className="card-header">
                    <h2 className="card-title">部員を招待</h2>
                </div>
                <div className="card-body">
                    <p className="text-muted text-sm mb-4">
                        招待したい部員のメールアドレスを入力してください。招待リンクが送信されます。
                    </p>
                    <div className="form-row">
                        <div className="form-group" style={{ flex: 1 }}>
                            <label className="form-label">お名前</label>
                            <input
                                className="form-input"
                                value={inviteName}
                                onChange={e => setInviteName(e.target.value)}
                                placeholder="山田 太郎"
                            />
                        </div>
                        <div className="form-group" style={{ flex: 1 }}>
                            <label className="form-label">メールアドレス *</label>
                            <input
                                type="email"
                                className="form-input"
                                value={inviteEmail}
                                onChange={e => setInviteEmail(e.target.value)}
                                placeholder="member@example.com"
                            />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                            <button
                                className="btn btn-primary"
                                onClick={handleInvite}
                                disabled={inviting || !inviteEmail.trim()}
                            >
                                {inviting ? '送信中...' : '招待を送る'}
                            </button>
                        </div>
                    </div>
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
