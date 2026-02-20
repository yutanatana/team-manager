'use server';

import { supabase } from '@/lib/supabase';
import type { FeeEvent } from '@/types/database';

// 徴収イベント一覧を取得
export async function getFeeEvents(): Promise<FeeEvent[]> {
    const { data, error } = await supabase
        .from('fee_events')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) throw new Error(`徴収イベントの取得に失敗: ${error.message}`);
    return data || [];
}

// 徴収イベントを1件取得
export async function getFeeEvent(id: string): Promise<FeeEvent | null> {
    const { data, error } = await supabase
        .from('fee_events')
        .select('*')
        .eq('id', id)
        .single();

    if (error) return null;
    return data;
}

// 徴収イベントを登録
export async function createFeeEvent(event: {
    title: string;
    amount: number;
    due_date: string;
    note: string;
}): Promise<FeeEvent> {
    const { data, error } = await supabase
        .from('fee_events')
        .insert({
            title: event.title,
            amount: event.amount,
            due_date: event.due_date,
            note: event.note,
        })
        .select()
        .single();

    if (error) throw new Error(`徴収イベントの登録に失敗: ${error.message}`);
    return data;
}

// 徴収イベントを更新
export async function updateFeeEvent(
    id: string,
    event: Partial<{
        title: string;
        amount: number;
        due_date: string;
        note: string;
    }>
): Promise<FeeEvent> {
    const { data, error } = await supabase
        .from('fee_events')
        .update(event)
        .eq('id', id)
        .select()
        .single();

    if (error) throw new Error(`徴収イベントの更新に失敗: ${error.message}`);
    return data;
}

// 徴収イベントを削除
export async function deleteFeeEvent(id: string): Promise<void> {
    const { error } = await supabase
        .from('fee_events')
        .delete()
        .eq('id', id);

    if (error) throw new Error(`徴収イベントの削除に失敗: ${error.message}`);
}
