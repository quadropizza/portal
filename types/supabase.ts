// =====================================================================
// Tipos gerados pelo Supabase CLI:
//   npx supabase gen types typescript --linked > types/supabase.ts
//
// Este arquivo é placeholder até o projeto Supabase ser criado e
// vinculado. Por enquanto, mantém o build de TS funcionando.
// =====================================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: Record<string, { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> }>;
    Views: Record<string, { Row: Record<string, unknown> }>;
    Functions: Record<string, unknown>;
    Enums: Record<string, string>;
  };
};
