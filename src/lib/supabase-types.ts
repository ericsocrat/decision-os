/**
 * Generated Supabase Database types for Decision OS.
 *
 * This file types the `decisions` table used for cloud persistence.
 * Regenerate with: `npx supabase gen types typescript --project-id <id>`
 */

/**
 * The Decision object stored as JSONB in the `data` column.
 * Matches the `Decision` type from `./types.ts` but typed as
 * a generic JSON-compatible record for Supabase.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type DecisionJsonb = Record<string, any>;

export interface Database {
  public: {
    Tables: {
      decisions: {
        Row: {
          id: string;
          user_id: string;
          decision_id: string;
          data: DecisionJsonb;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          decision_id: string;
          data: DecisionJsonb;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          decision_id?: string;
          data?: DecisionJsonb;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "decisions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
      shared_decisions: {
        Row: {
          id: string;
          decision: DecisionJsonb;
          created_by: string | null;
          created_at: string;
          expires_at: string;
        };
        Insert: {
          id: string;
          decision: DecisionJsonb;
          created_by?: string | null;
          created_at?: string;
          expires_at?: string;
        };
        Update: {
          id?: string;
          decision?: DecisionJsonb;
          created_by?: string | null;
          created_at?: string;
          expires_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "shared_decisions_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "users";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}
