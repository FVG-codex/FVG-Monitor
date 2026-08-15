import { createClient } from "@supabase/supabase-js";

// Le variabili vanno impostate in .env.local (vedi .env.example).
// Questo client verrà usato a partire dalla Fase 1 per leggere
// la tabella `snapshots` invece dei dati segnaposto in app/page.tsx.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
