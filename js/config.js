// ============================================================
//  CONFIGURA QUESTI VALORI PRIMA DEL DEPLOY
// ============================================================
//  1. Crea un progetto su https://supabase.com (gratuito)
//  2. Vai su Project Settings → API e copia URL e anon key
//  3. Scegli una password admin sicura
// ============================================================

const SUPABASE_URL = 'https://fkeofxhadpziafumxlve.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZrZW9meGhhZHB6aWFmdW14bHZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAyMDA3NjUsImV4cCI6MjA5NTc3Njc2NX0.lo-q79_IaNDVPxs4cgRS4TAYFjhXNUXxbI1PDRIm3rI';
const ADMIN_PASSWORD = 'Fuochi2026';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
