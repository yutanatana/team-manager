'use server';

import { createClient } from '@/lib/supabase-server';
import type { Payment } from '@/types/database';

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

// 全支払い記録（チーム内）
export async function getAllPayments(): Promise<Payment[]> {
    const supabase = await createClient();
    const teamId = await getTeamId();
    const { data, error } = await supabase
        .from('payments')
        .select('*, member:members(*), fee_event:fee_events(*)')
        .eq('team_id', teamId);
    if (error) throw new Error(`支払い記録の取得に失敗: ${error.message}`);
    return data || [];
}

// 徴収イベント単位の支払い一覧
export async function getPaymentsByFeeEvent(feeEventId: string): Promise<Payment[]> {
    const supabase = await createClient();
    const teamId = await getTeamId();
    const { data, error } = await supabase
        .from('payments')
        .select('*, member:members(*), fee_event:fee_events(*)')
        .eq('fee_event_id', feeEventId)
        .eq('team_id', teamId);
    if (error) throw new Error(`支払い記録の取得に失敗: ${error.message}`);
    return data || [];
}

// 部員単位の支払い履歴
export async function getPaymentsByMember(memberId: string): Promise<Payment[]> {
    const supabase = await createClient();
    const teamId = await getTeamId();
    const { data, error } = await supabase
        .from('payments')
        .select('*, member:members(*), fee_event:fee_events(*)')
        .eq('member_id', memberId)
        .eq('team_id', teamId);
    if (error) throw new Error(`支払い履歴の取得に失敗: ${error.message}`);
    return data || [];
}

// 徴収イベント作成時に全部員分の支払いレコードを一括生成（管理者のみ）
export async function createPaymentsForFeeEvent(feeEventId: string): Promise<void> {
    await requireAdmin();
    const supabase = await createClient();
    const teamId = await getTeamId();

    const { data: members, error: membersError } = await supabase
        .from('members')
        .select('id')
        .eq('team_id', teamId)
        .eq('status', 'active');

    if (membersError) throw new Error(`部員取得に失敗: ${membersError.message}`);
    if (!members?.length) return;

    const records = members.map(m => ({
        team_id: teamId,
        member_id: m.id,
        fee_event_id: feeEventId,
        status: 'unpaid',
    }));

    const { error } = await supabase.from('payments').upsert(records, {
        onConflict: 'member_id,fee_event_id',
        ignoreDuplicates: true,
    });
    if (error) throw new Error(`支払いレコード生成に失敗: ${error.message}`);
}

// 支払い状況を更新（管理者のみ）
export async function updatePaymentStatus(
    paymentId: string,
    status: 'paid' | 'unpaid',
    method?: string,
    note?: string
): Promise<Payment> {
    await requireAdmin();
    const supabase = await createClient();
    const teamId = await getTeamId();

    const updateData: Record<string, unknown> = { status };
    if (status === 'paid') {
        updateData.paid_at = new Date().toISOString();
        updateData.method = method ?? 'cash';
        updateData.note = note ?? '';
    } else {
        updateData.paid_at = null;
        updateData.method = null;
        updateData.note = '';
    }

    const { data, error } = await supabase
        .from('payments')
        .update(updateData)
        .eq('id', paymentId)
        .eq('team_id', teamId)
        .select()
        .single();

    if (error || !data) throw new Error(`支払い状況の更新に失敗: ${error?.message}`);
    return data;
}
