'use server';

import { createClient } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import type { Profile } from '@/types/database';

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

// チームを作成して管理者として登録
export async function signUpWithTeam(
    email: string,
    password: string,
    displayName: string,
    teamName: string
): Promise<void> {
    const supabase = await createClient();

    // ユーザー作成
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { display_name: displayName } },
    });
    if (signUpError || !authData.user) {
        throw new Error(`アカウント作成に失敗しました: ${signUpError?.message}`);
    }

    const userId = authData.user.id;

    // チーム作成
    const { data: team, error: teamError } = await supabase
        .from('teams')
        .insert({ name: teamName })
        .select()
        .single();

    if (teamError || !team) {
        throw new Error(`チーム作成に失敗しました: ${teamError?.message}`);
    }

    // プロフィールにチームと管理者ロールを設定
    const { error: profileError } = await supabase
        .from('profiles')
        .update({ team_id: team.id, role: 'admin', display_name: displayName })
        .eq('id', userId);

    if (profileError) {
        throw new Error(`プロフィール設定に失敗しました: ${profileError?.message}`);
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

// 管理者が部員をシステムに招待（メールアドレスを登録してパスワード設定メールを送信）
export async function inviteMember(
    email: string,
    displayName: string,
    teamId: string
): Promise<void> {
    const supabase = await createClient();

    // Supabase Admin API でメール招待
    const { error } = await supabase.auth.admin.inviteUserByEmail(email, {
        data: { display_name: displayName, team_id: teamId, role: 'member' },
    });

    if (error) throw new Error(`招待メールの送信に失敗しました: ${error.message}`);
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

// 未使用 redirect 対策
void redirect;
