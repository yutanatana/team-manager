'use server';

import { supabase } from '@/lib/supabase';
import type { Expense } from '@/types/database';

// 支出一覧を取得
export async function getExpenses(): Promise<Expense[]> {
    const { data, error } = await supabase
        .from('expenses')
        .select('*')
        .order('date', { ascending: false });

    if (error) throw new Error(`支出の取得に失敗: ${error.message}`);
    return data || [];
}

// 支出を登録
export async function createExpense(expense: {
    date: string;
    amount: number;
    category: string;
    note: string;
    registered_by: string;
}): Promise<Expense> {
    const { data, error } = await supabase
        .from('expenses')
        .insert({
            date: expense.date,
            amount: expense.amount,
            category: expense.category,
            note: expense.note,
            registered_by: expense.registered_by,
        })
        .select()
        .single();

    if (error) throw new Error(`支出の登録に失敗: ${error.message}`);
    return data;
}

// 支出を更新
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
    const { data, error } = await supabase
        .from('expenses')
        .update(expense)
        .eq('id', id)
        .select()
        .single();

    if (error) throw new Error(`支出の更新に失敗: ${error.message}`);
    return data;
}

// 支出を削除
export async function deleteExpense(id: string): Promise<void> {
    const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id);

    if (error) throw new Error(`支出の削除に失敗: ${error.message}`);
}
