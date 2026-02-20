// Supabase データベース型定義
export type MemberStatus = 'active' | 'inactive';
export type PaymentStatus = 'unpaid' | 'paid';
export type PaymentMethod = 'cash' | 'transfer' | 'other';

export interface Member {
    id: string;
    name: string;
    furigana: string;
    position: string;
    contact: string;
    status: MemberStatus;
    created_at: string;
}

export interface FeeEvent {
    id: string;
    title: string;
    amount: number;
    due_date: string;
    note: string;
    created_at: string;
}

export interface Payment {
    id: string;
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
    date: string;
    amount: number;
    category: string;
    note: string;
    registered_by: string;
    created_at: string;
}

// Supabase クライアント用の型定義
export interface Database {
    public: {
        Tables: {
            members: {
                Row: Member;
                Insert: {
                    id?: string;
                    name: string;
                    furigana?: string;
                    position?: string;
                    contact?: string;
                    status?: string;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    name?: string;
                    furigana?: string;
                    position?: string;
                    contact?: string;
                    status?: string;
                    created_at?: string;
                };
                Relationships: [];
            };
            fee_events: {
                Row: FeeEvent;
                Insert: {
                    id?: string;
                    title: string;
                    amount: number;
                    due_date: string;
                    note?: string;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    title?: string;
                    amount?: number;
                    due_date?: string;
                    note?: string;
                    created_at?: string;
                };
                Relationships: [];
            };
            payments: {
                Row: Payment;
                Insert: {
                    id?: string;
                    member_id: string;
                    fee_event_id: string;
                    status?: string;
                    paid_at?: string | null;
                    method?: string | null;
                    note?: string;
                };
                Update: {
                    id?: string;
                    member_id?: string;
                    fee_event_id?: string;
                    status?: string;
                    paid_at?: string | null;
                    method?: string | null;
                    note?: string;
                };
                Relationships: [
                    {
                        foreignKeyName: "payments_member_id_fkey";
                        columns: ["member_id"];
                        isOneToOne: false;
                        referencedRelation: "members";
                        referencedColumns: ["id"];
                    },
                    {
                        foreignKeyName: "payments_fee_event_id_fkey";
                        columns: ["fee_event_id"];
                        isOneToOne: false;
                        referencedRelation: "fee_events";
                        referencedColumns: ["id"];
                    }
                ];
            };
            expenses: {
                Row: Expense;
                Insert: {
                    id?: string;
                    date: string;
                    amount: number;
                    category?: string;
                    note?: string;
                    registered_by?: string;
                    created_at?: string;
                };
                Update: {
                    id?: string;
                    date?: string;
                    amount?: number;
                    category?: string;
                    note?: string;
                    registered_by?: string;
                    created_at?: string;
                };
                Relationships: [];
            };
        };
        Views: Record<string, never>;
        Functions: Record<string, never>;
        Enums: Record<string, never>;
        CompositeTypes: Record<string, never>;
    };
}
