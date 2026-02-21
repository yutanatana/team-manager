'use server';

import { createClient } from '@/lib/supabase-server';
import type { Member } from '@/types/database';

// 認証済みユーザーの team_id を取得するヘルパー
async function getTeamId(): Promise<string> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('未認証です');

    const { data: profile } = await supabase
        .from('profiles')
        .select('team_id, role')
        .eq('id', user.id)
        .single();

    if (!profile?.team_id) throw new Error('チームに所属していません');
    return profile.team_id;
}

// 管理者権限チェック
async function requireAdmin() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('未認証です');

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'admin') throw new Error('管理者権限が必要です');
}

// 部員一覧取得
export async function getMembers(): Promise<Member[]> {
    const supabase = await createClient();
    const teamId = await getTeamId();

    const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('team_id', teamId)
        .order('furigana');

    if (error) throw new Error(`部員の取得に失敗: ${error.message}`);
    return data || [];
}

// 部員1件取得
export async function getMember(id: string): Promise<Member | null> {
    const supabase = await createClient();
    const teamId = await getTeamId();

    const { data } = await supabase
        .from('members')
        .select('*')
        .eq('id', id)
        .eq('team_id', teamId)
        .single();

    return data;
}

// 部員作成（管理者のみ）
export async function createMember(member: {
    name: string;
    furigana: string;
    position: string;
    contact: string;
    address: string;
}): Promise<Member> {
    await requireAdmin();
    const supabase = await createClient();
    const teamId = await getTeamId();

    const { data, error } = await supabase
        .from('members')
        .insert({
            team_id: teamId,
            name: member.name,
            furigana: member.furigana,
            position: member.position,
            contact: member.contact,
            address: member.address,
            status: 'active',
        })
        .select()
        .single();

    if (error || !data) throw new Error(`部員の作成に失敗: ${error?.message}`);
    return data;
}

// 部員更新（管理者のみ）
export async function updateMember(
    id: string,
    member: Partial<{
        name: string;
        furigana: string;
        position: string;
        contact: string;
        address: string;
        status: string;
    }>
): Promise<Member> {
    await requireAdmin();
    const supabase = await createClient();
    const teamId = await getTeamId();

    const { data, error } = await supabase
        .from('members')
        .update(member)
        .eq('id', id)
        .eq('team_id', teamId)
        .select()
        .single();

    if (error || !data) throw new Error(`部員の更新に失敗: ${error?.message}`);
    return data;
}

// 部員削除（管理者のみ）
export async function deleteMember(id: string): Promise<void> {
    await requireAdmin();
    const supabase = await createClient();
    const teamId = await getTeamId();

    const { error } = await supabase
        .from('members')
        .delete()
        .eq('id', id)
        .eq('team_id', teamId);

    if (error) throw new Error(`部員の削除に失敗: ${error.message}`);
}
