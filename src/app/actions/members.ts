'use server';

import { supabase } from '@/lib/supabase';
import type { Member } from '@/types/database';

// 部員一覧を取得
export async function getMembers(): Promise<Member[]> {
    const { data, error } = await supabase
        .from('members')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) throw new Error(`部員の取得に失敗: ${error.message}`);
    return data || [];
}

// 部員を1件取得
export async function getMember(id: string): Promise<Member | null> {
    const { data, error } = await supabase
        .from('members')
        .select('*')
        .eq('id', id)
        .single();

    if (error) return null;
    return data;
}

// 部員を登録
export async function createMember(member: {
    name: string;
    furigana: string;
    position: string;
    contact: string;
}): Promise<Member> {
    const { data, error } = await supabase
        .from('members')
        .insert({
            name: member.name,
            furigana: member.furigana,
            position: member.position,
            contact: member.contact,
            status: 'active',
        })
        .select()
        .single();

    if (error) throw new Error(`部員の登録に失敗: ${error.message}`);
    return data;
}

// 部員を更新
export async function updateMember(
    id: string,
    member: Partial<{
        name: string;
        furigana: string;
        position: string;
        contact: string;
        status: string;
    }>
): Promise<Member> {
    const { data, error } = await supabase
        .from('members')
        .update(member)
        .eq('id', id)
        .select()
        .single();

    if (error) throw new Error(`部員の更新に失敗: ${error.message}`);
    return data;
}

// 部員を削除
export async function deleteMember(id: string): Promise<void> {
    const { error } = await supabase
        .from('members')
        .delete()
        .eq('id', id);

    if (error) throw new Error(`部員の削除に失敗: ${error.message}`);
}
