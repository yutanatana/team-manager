'use server';

import { supabase } from '@/lib/supabase';
import type { Payment } from '@/types/database';

// 特定の徴収イベントに紐づく支払い記録を取得（部員情報付き）
export async function getPaymentsByFeeEvent(feeEventId: string): Promise<Payment[]> {
    const { data, error } = await supabase
        .from('payments')
        .select('*, member:members(*)')
        .eq('fee_event_id', feeEventId)
        .order('member_id');

    if (error) throw new Error(`支払い記録の取得に失敗: ${error.message}`);
    return data || [];
}

// 特定の部員の支払い履歴を取得（イベント情報付き）
export async function getPaymentsByMember(memberId: string): Promise<Payment[]> {
    const { data, error } = await supabase
        .from('payments')
        .select('*, fee_event:fee_events(*)')
        .eq('member_id', memberId)
        .order('fee_event_id');

    if (error) throw new Error(`支払い履歴の取得に失敗: ${error.message}`);
    return data || [];
}

// 全支払い記録を取得
export async function getAllPayments(): Promise<Payment[]> {
    const { data, error } = await supabase
        .from('payments')
        .select('*, member:members(*), fee_event:fee_events(*)');

    if (error) throw new Error(`支払い記録の取得に失敗: ${error.message}`);
    return data || [];
}

// 徴収イベントに対して全在籍部員の支払いレコードを一括作成
export async function createPaymentsForEvent(feeEventId: string): Promise<void> {
    // 在籍中の部員を取得
    const { data: members, error: membersError } = await supabase
        .from('members')
        .select('id')
        .eq('status', 'active');

    if (membersError) throw new Error(`部員の取得に失敗: ${membersError.message}`);
    if (!members || members.length === 0) return;

    // 既存の支払いレコードを確認
    const { data: existingPayments } = await supabase
        .from('payments')
        .select('member_id')
        .eq('fee_event_id', feeEventId);

    const existingMemberIds = new Set((existingPayments || []).map(p => p.member_id));

    // 未作成の部員に対してレコードを作成
    const newPayments = members
        .filter(m => !existingMemberIds.has(m.id))
        .map(m => ({
            member_id: m.id,
            fee_event_id: feeEventId,
            status: 'unpaid' as const,
            paid_at: null,
            method: null,
            note: '',
        }));

    if (newPayments.length === 0) return;

    const { error } = await supabase.from('payments').insert(newPayments);
    if (error) throw new Error(`支払いレコードの一括作成に失敗: ${error.message}`);
}

// 支払い状態を更新
export async function updatePaymentStatus(
    id: string,
    data: {
        status: 'unpaid' | 'paid';
        paid_at?: string | null;
        method?: 'cash' | 'transfer' | 'other' | null;
        note?: string;
    }
): Promise<Payment> {
    const { data: updated, error } = await supabase
        .from('payments')
        .update({
            status: data.status,
            paid_at: data.status === 'paid' ? (data.paid_at || new Date().toISOString().split('T')[0]) : null,
            method: data.status === 'paid' ? (data.method || null) : null,
            note: data.note || '',
        })
        .eq('id', id)
        .select()
        .single();

    if (error) throw new Error(`支払い状態の更新に失敗: ${error.message}`);
    return updated;
}
