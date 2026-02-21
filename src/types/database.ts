// データベース型定義（Phase 2: チーム・認証対応）
export type MemberStatus = 'active' | 'inactive';
export type PaymentStatus = 'unpaid' | 'paid';
export type PaymentMethod = 'cash' | 'transfer' | 'other';
export type UserRole = 'admin' | 'member';

export interface Team {
    id: string;
    name: string;
    created_at: string;
}

export interface Profile {
    id: string;
    team_id: string | null;
    role: UserRole;
    display_name: string;
    created_at: string;
    // リレーション用
    team?: Team;
}

export interface Member {
    id: string;
    team_id: string;
    name: string;
    furigana: string;
    position: string;
    contact: string;
    address: string;
    status: MemberStatus;
    created_at: string;
}

export interface FeeEvent {
    id: string;
    team_id: string;
    title: string;
    amount: number;
    due_date: string;
    note: string;
    created_at: string;
}

export interface Payment {
    id: string;
    team_id: string;
    member_id: string;
    fee_event_id: string;
    status: PaymentStatus;
    paid_at: string | null;
    method: PaymentMethod | null;
    note: string;
    // リレーション用
    member?: Member;
    fee_event?: FeeEvent;
}

export interface Expense {
    id: string;
    team_id: string;
    date: string;
    amount: number;
    category: string;
    note: string;
    registered_by: string;
    created_at: string;
}
