# Fuochi di San Giovanni — Setup in 10 minuti

## 1. Crea il database su Supabase (gratuito)

1. Vai su **https://supabase.com** → *Start your project* → crea un account
2. Crea un nuovo progetto (scegli un nome qualsiasi, es. `fuochi`)
3. Vai su **SQL Editor** (icona terminale a sinistra)
4. Incolla tutto il contenuto di `schema.sql` e premi **Run**

## 2. Copia le chiavi API

1. Vai su **Project Settings → API**
2. Copia:
   - **Project URL** → es. `https://abcdefgh.supabase.co`
   - **anon / public key** → la chiave lunga sotto "Project API keys"
3. Apri `js/config.js` e sostituisci:

```js
const SUPABASE_URL  = 'https://IL_TUO_PROGETTO.supabase.co'; // ← incolla qui
const SUPABASE_ANON_KEY = 'LA_TUA_ANON_KEY';                 // ← incolla qui
const ADMIN_PASSWORD    = 'cambia_questa_password';           // ← scegli una password
```

## 3. Pubblica il sito (scegli uno dei due)

### Opzione A — GitHub Pages (gratis, URL: `tuonome.github.io/fuochi`)

1. Crea un repo su GitHub (es. `fuochi`)
2. Carica tutti i file del progetto nel repo
3. Vai su **Settings → Pages → Source: Deploy from branch → main / root**
4. Dopo 1-2 minuti il sito è live

### Opzione B — Vercel (gratis, URL personalizzabile)

1. Vai su **https://vercel.com** → *Add New Project*
2. Importa il repo GitHub con i file
3. Deploy automatico in 30 secondi

## 4. Aggiungi gli elementi dalla pagina admin

1. Apri `tuosito.com/admin.html`
2. Inserisci la password che hai scelto
3. Clicca **+ Aggiungi elemento** per ogni cosa da portare
4. Per ogni elemento imposta:
   - **Nome**: es. "Bottiglia di vino"
   - **Descrizione**: es. "Preferibilmente bianco o rosé" (opzionale)
   - **Quantità necessaria**: quante persone devono selezionarlo prima che sparisca

## 5. Manda il link agli ospiti

Manda semplicemente l'URL della homepage (es. `tuosito.com/index.html`) a tutti gli invitati.
Gli ospiti non hanno bisogno di nessun account.

---

## Come funziona

| Chi | Cosa vede | Cosa può fare |
|-----|-----------|---------------|
| **Ospite** | Lista elementi disponibili | Seleziona cosa porta, può cambiare idea |
| **Admin** | Dashboard completa | Aggiunge/modifica/disattiva elementi, vede tutti gli ospiti, esporta CSV |

### Logica delle soglie
- Ogni elemento ha una **quantità necessaria** (es. 2 bottiglie di vino)
- Quando abbastanza persone lo selezionano, **sparisce dalla lista ospiti**
- L'elemento rimane visibile nella dashboard admin
- Gli aggiornamenti sono **in tempo reale**: se un ospite seleziona qualcosa, tutti gli altri lo vedono sparire istantaneamente

### Struttura file
```
fuochi/
├── index.html      ← pagina ospiti (manda questo link)
├── admin.html      ← dashboard admin (solo per te)
├── css/style.css
├── js/
│   ├── config.js   ← ⚠️ configura questo prima del deploy
│   ├── app.js
│   └── admin.js
└── schema.sql      ← SQL da incollare in Supabase
```
