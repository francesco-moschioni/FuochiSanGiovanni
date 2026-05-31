// ============================================================
//  CONFIGURA QUESTI VALORI PRIMA DEL DEPLOY
// ============================================================
//  1. Crea un progetto su https://supabase.com (gratuito)
//  2. Vai su Project Settings → API e copia URL e anon key
//  3. Scegli una password admin sicura
// ============================================================

const SUPABASE_URL = 'https://IL_TUO_PROGETTO.supabase.co';
const SUPABASE_ANON_KEY = 'LA_TUA_ANON_KEY';
const ADMIN_PASSWORD = 'cambia_questa_password';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
