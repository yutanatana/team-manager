'use server';

import { createClient } from '@/lib/supabase-server';
import type { FeeEvent } from '@/types/database';

// team_id 取得ヘルパー
async function getTeamId(): Promise<string> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('未認証です');
    const { data: profile } = await supabase
        .from('profiles').select('team_id').eq('id', user.id).single();
    if (!profile?.team_id) throw new Error('チームに所属していません');
    return profile.team_id;
}

// 管理者権限チェック
async function requireAdmin() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('未認証です');
    const { data: profile } = await supabase
        .from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') throw new Error('管理者権限が必要です');
}

// 徴収イベント一覧
export async function getFeeEvents(): Promise<FeeEvent[]> {
    const supabase = await createClient();
    const teamId = await getTeamId();
    const { data, error } = await supabase
        .from('fee_events')
        .select('*')
        .eq('team_id', teamId)
        .order('due_date', { ascending: false });
    if (error) throw new Error(`徴収イベントの取得に失敗: ${error.message}`);
    return data || [];
}

// 徴収イベント1件取得
export async function getFeeEvent(id: string): Promise<FeeEvent | null> {
    const supabase = await createClient();
    const teamId = await getTeamId();
    const { data } = await supabase
        .from('fee_events').select('*').eq('id', id).eq('team_id', teamId).single();
    return data;
}

// 作成（管理者のみ）
export async function createFeeEvent(event: {
    title: string;
    amount: number;
    due_date: string;
    note: string;
}): Promise<FeeEvent> {
    await requireAdmin();
    const supabase = await createClient();
    const teamId = await getTeamId();
    const { data, error } = await supabase
        .from('fee_events')
        .insert({ team_id: teamId, ...event })
        .select().single();
    if (error || !data) throw new Error(`徴収イベントの作成に失敗: ${error?.message}`);
    return data;
}

// 更新（管理者のみ）
export async function updateFeeEvent(
    id: string,
    event: Partial<{ title: string; amount: number; due_date: string; note: string }>
): Promise<FeeEvent> {
    await requireAdmin();
    const supabase = await createClient();
    const teamId = await getTeamId();
    const { data, error } = await supabase
        .from('fee_events').update(event).eq('id', id).eq('team_id', teamId).select().single();
    if (error || !data) throw new Error(`徴収イベントの更新に失敗: ${error?.message}`);
    return data;
}

// 削除（管理者のみ）
export async function deleteFeeEvent(id: string): Promise<void> {
    await requireAdmin();
    const supabase = await createClient();
    const teamId = await getTeamId();
    const { error } = await supabase
        .from('fee_events').delete().eq('id', id).eq('team_id', teamId);
    if (error) throw new Error(`徴収イベントの削除に失敗: ${error.message}`);
}
