'use server';

import { createClient } from '@/lib/supabase-server';
import { createAdminClient } from '@/lib/supabase-admin';
import type { Profile, JoinRequest } from '@/types/database';

// ===========================================
// 認証
// ===========================================

// ログイン
export async function signIn(email: string, password: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw new Error(`ログインに失敗しました: ${error.message}`);
}

// ログアウト
export async function signOut(): Promise<void> {
    const supabase = await createClient();
    await supabase.auth.signOut();
}

// 個人アカウント作成（チームとは切り離し）
export async function signUp(
    email: string,
    password: string,
    displayName: string
): Promise<void> {
    const supabase = await createClient();

    const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: displayName } },
    });
    if (signUpError || !authData.user) {
        throw new Error(`アカウント作成に失敗しました: ${signUpError?.message}`);
    }
}

// 現在のログインユーザーのプロフィール（ロール・チームID）を取得
export async function getCurrentProfile(): Promise<Profile | null> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data } = await supabase
        .from('profiles')
        .select('*, team:teams(*)')
        .eq('id', user.id)
        .single();

    return data;
}

// ===========================================
// チーム管理
// ===========================================

// チームを新規作成し、作成者を管理者として設定
export async function createTeam(teamName: string): Promise<void> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('未認証です');

    // 管理者用クライアント（RLS をバイパス）
    const adminClient = createAdminClient();

    // チーム作成
    const { data: team, error: teamError } = await adminClient
        .from('teams')
        .insert({ name: teamName })
        .select()
        .single();

    if (teamError || !team) {
        throw new Error(`チーム作成に失敗しました: ${teamError?.message}`);
    }

    // プロフィールにチームと管理者ロールを設定
    const { error: profileError } = await adminClient
        .from('profiles')
        .update({ team_id: team.id, role: 'admin' })
        .eq('id', user.id);

    if (profileError) {
        throw new Error(`プロフィール設定に失敗しました: ${profileError?.message}`);
    }
}

// チーム名を更新（管理者のみ）
export async function updateTeamName(teamId: string, name: string): Promise<void> {
    const supabase = await createClient();
    const { error } = await supabase
        .from('teams')
        .update({ name })
        .eq('id', teamId);
    if (error) throw new Error(`チーム名の更新に失敗しました: ${error.message}`);
}

// ===========================================
// チーム参加申請
// ===========================================

// チームIDで参加申請を送る
export async function requestJoinTeam(teamId: string): Promise<void> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('未認証です');

    // チームの存在確認
    const adminClient = createAdminClient();
    const { data: team } = await adminClient
        .from('teams')
        .select('id')
        .eq('id', teamId)
        .single();

    if (!team) {
        throw new Error('指定されたチームIDが見つかりません');
    }

    // すでに申請済みか確認
    const { data: existing } = await adminClient
        .from('join_requests')
        .select('id, status')
        .eq('user_id', user.id)
        .eq('team_id', teamId)
        .single();

    if (existing) {
        if (existing.status === 'pending') {
            throw new Error('すでにこのチームに参加申請中です');
        }
        if (existing.status === 'approved') {
            throw new Error('このチームへの参加はすでに承認されています');
        }
        // rejected の場合は再申請を許可（既存レコードを pending に更新）
        const { error } = await adminClient
            .from('join_requests')
            .update({ status: 'pending' })
            .eq('id', existing.id);
        if (error) throw new Error(`参加申請に失敗しました: ${error.message}`);
        return;
    }

    // 新規申請
    const { error } = await adminClient
        .from('join_requests')
        .insert({ user_id: user.id, team_id: teamId });

    if (error) throw new Error(`参加申請に失敗しました: ${error.message}`);
}

// 自分の pending 状態の参加申請を取得
export async function getMyPendingRequest(): Promise<JoinRequest | null> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const adminClient = createAdminClient();
    const { data } = await adminClient
        .from('join_requests')
        .select('*, team:teams(*)')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .single();

    return data;
}

// ===========================================
// 管理者による承認・拒否
// ===========================================

// 管理者向け：チームへの参加申請一覧を取得
export async function getPendingJoinRequests(): Promise<JoinRequest[]> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('未認証です');

    // 管理者の team_id を取得
    const { data: profile } = await supabase
        .from('profiles')
        .select('team_id, role')
        .eq('id', user.id)
        .single();

    if (!profile?.team_id || profile.role !== 'admin') {
        throw new Error('管理者権限が必要です');
    }

    const adminClient = createAdminClient();
    const { data, error } = await adminClient
        .from('join_requests')
        .select('*, profile:profiles!join_requests_user_id_fkey(id, display_name)')
        .eq('team_id', profile.team_id)
        .eq('status', 'pending')
        .order('created_at', { ascending: true });

    if (error) throw new Error(`申請一覧の取得に失敗しました: ${error.message}`);
    return data || [];
}

// 管理者向け：参加申請を承認
export async function approveJoinRequest(requestId: string): Promise<void> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('未認証です');

    // 管理者の team_id を確認
    const { data: adminProfile } = await supabase
        .from('profiles')
        .select('team_id, role')
        .eq('id', user.id)
        .single();

    if (!adminProfile?.team_id || adminProfile.role !== 'admin') {
        throw new Error('管理者権限が必要です');
    }

    const adminClient = createAdminClient();

    // 申請を取得
    const { data: request } = await adminClient
        .from('join_requests')
        .select('*')
        .eq('id', requestId)
        .eq('team_id', adminProfile.team_id)
        .eq('status', 'pending')
        .single();

    if (!request) throw new Error('該当する申請が見つかりません');

    // 申請を承認済みに更新
    const { error: updateError } = await adminClient
        .from('join_requests')
        .update({ status: 'approved' })
        .eq('id', requestId);

    if (updateError) throw new Error(`承認に失敗しました: ${updateError.message}`);

    // 申請者の profile に team_id を設定
    const { error: profileError } = await adminClient
        .from('profiles')
        .update({ team_id: adminProfile.team_id, role: 'member' })
        .eq('id', request.user_id);

    if (profileError) throw new Error(`プロフィール更新に失敗しました: ${profileError.message}`);
}

// 管理者向け：参加申請を拒否
export async function rejectJoinRequest(requestId: string): Promise<void> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('未認証です');

    // 管理者の team_id を確認
    const { data: adminProfile } = await supabase
        .from('profiles')
        .select('team_id, role')
        .eq('id', user.id)
        .single();

    if (!adminProfile?.team_id || adminProfile.role !== 'admin') {
        throw new Error('管理者権限が必要です');
    }

    const adminClient = createAdminClient();
    const { error } = await adminClient
        .from('join_requests')
        .update({ status: 'rejected' })
        .eq('id', requestId)
        .eq('team_id', adminProfile.team_id);

    if (error) throw new Error(`拒否に失敗しました: ${error.message}`);
}
