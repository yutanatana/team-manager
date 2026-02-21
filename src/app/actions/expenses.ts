'use server';

import { createClient } from '@/lib/supabase-server';
import type { Expense } from '@/types/database';

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

// 支出一覧
export async function getExpenses(): Promise<Expense[]> {
    const supabase = await createClient();
    const teamId = await getTeamId();
    const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .eq('team_id', teamId)
        .order('date', { ascending: false });
    if (error) throw new Error(`支出の取得に失敗: ${error.message}`);
    return data || [];
}

// 支出作成（管理者のみ）
export async function createExpense(expense: {
    date: string;
    amount: number;
    category: string;
    note: string;
    registered_by: string;
}): Promise<Expense> {
    await requireAdmin();
    const supabase = await createClient();
    const teamId = await getTeamId();
    const { data, error } = await supabase
        .from('expenses')
        .insert({ team_id: teamId, ...expense })
        .select().single();
    if (error || !data) throw new Error(`支出の作成に失敗: ${error?.message}`);
    return data;
}

// 支出更新（管理者のみ）
export async function updateExpense(
    id: string,
    expense: Partial<{
        date: string;
        amount: number;
        category: string;
        note: string;
        registered_by: string;
    }>
): Promise<Expense> {
    await requireAdmin();
    const supabase = await createClient();
    const teamId = await getTeamId();
    const { data, error } = await supabase
        .from('expenses').update(expense).eq('id', id).eq('team_id', teamId).select().single();
    if (error || !data) throw new Error(`支出の更新に失敗: ${error?.message}`);
    return data;
}

// 支出削除（管理者のみ）
export async function deleteExpense(id: string): Promise<void> {
    await requireAdmin();
    const supabase = await createClient();
    const teamId = await getTeamId();
    const { error } = await supabase
        .from('expenses').delete().eq('id', id).eq('team_id', teamId);
    if (error) throw new Error(`支出の削除に失敗: ${error.message}`);
}
