# Шаңырақ Хаб: Cloudflare Workers + Supabase

Бұл — 2026-10-18 күнгі бастапқы ZIP-тен дайындалған **жариялауға арналған жоба**.
Негізгі `vite.config.ts` өзгермеді; `vite.config.cloudflare.ts` ресми Cloudflare Vite plugin арқылы құрастырады.
Құрастыру мен нақты сайтты іске қосу Cloudflare аккаунтында жасалады; бұл ZIP ішінде APK немесе жұмыс істейтін веб-сайт жоқ.

## 1. GitHub

1. GitHub-та жаңа **Private** репозиторий ашыңыз (`shanyraq-hub-web`). Бұрынғы `yraq-hub` репозиторийінің кодын алмастырмаңыз.
2. Осы ZIP-ті компьютерде ашып, **ішіндегі файлдар мен бумаларды** репозиторий түбіріне жүктеңіз (архив файлының өзін емес).
3. `package.json`, `wrangler.jsonc`, `vite.config.cloudflare.ts`, `src/`, `public/` репозиторийдің түбірінде тұрсын.
4. `AGENTS.md` арқылы репозиторийді Lovable-пен синхрондап, тарихын күштеп өзгертпеңіз.

## 2. Cloudflare аккаунты

1. https://dash.cloudflare.com → Workers & Pages → Create → Import a repository / Connect to Git таңдаңыз.
2. GitHub аккаунтын қосып, жаңа `shanyraq-hub-web` репозиторийін таңдаңыз.
3. Worker атауы **`shanyraq-hub`** болсын (wrangler.jsonc ішіндегі `name` атпен сәйкес).
4. Build command = `npm run build:cloudflare`.
5. Deploy command = `npx wrangler deploy`.
6. Root directory = `/` (repository root).
7. Node.js 24 таңдалсын (`.node-version` файлы берілген).

## 3. Build variables (құрастыру кезіндегі ашық мәндер)

Cloudflare → Worker → Settings → Builds → Build Variables and Secrets:

- `VITE_SUPABASE_URL` = Supabase жобасының Project URL (`https://...supabase.co`)
- `VITE_SUPABASE_PUBLISHABLE_KEY` = Supabase-тің publishable / anon кілті (`sb_publishable_...` немесе anon key)

Бұлар браузерге берілуге арналған жария параметрлер. **`SUPABASE_SERVICE_ROLE_KEY` немесе басқа құпия кілтті `VITE_` атауымен жарияламаңыз.**
Егер Build Variables өзгергеннен кейін жинақ ескі мәндерді қолданса, Cloudflare-та қайта Build/Retry жасаңыз.

## 4. Runtime variables & secrets (сайт жұмыс істегенде)

Worker → Settings → Variables & Secrets арқылы келесі атауларды көрсетіңіз:

- `SUPABASE_URL` — URL (Text, ашық мән)
- `SUPABASE_PUBLISHABLE_KEY` — publishable / anon key (Text)
- `SUPABASE_SERVICE_ROLE_KEY` — **Secret** (Supabase service_role key; кодқа, GitHub-қа, чатқа салмаңыз)
- `SHANYRAQ_BOOTSTRAP_TOKEN` — **Secret**, өзіңіз жасайтын 16+ таңбалы кездейсоқ код

Егер бұрынғы жоспарлы тапсырмалар `LOVABLE_CRON_SECRET` қолданса, оларды жаңа серверге көшіргенде бөлек тексеру керек.

### Неліктен SHANYRAQ_BOOTSTRAP_TOKEN қосылды?

Алғашқы база бос кезде `/setup` бетін кез келген адам аша алады. Кілтсіз бірінші SUPER_ADMIN-ді тіркеу қауіпті.
Сондықтан `/setup` нысанында тек сіз білетін орнату кодын сұрайды.
Егер бірінші SUPER_ADMIN бұрыннан бар болса, бұл бет бәрібір жаңа әкімші жасауға жол бермейді.

## 5. Сайт ашылған соң

1. `https://shanyraq-hub.<your-subdomain>.workers.dev` сияқты нақты Cloudflare URL-ін алыңыз (алдын ала ойлап таппаңыз).
2. Сайтты инкогнито және телефон браузерінен ашып көріңіз.
3. Supabase Auth URL Configuration бөлімінде жаңа сайттың негізгі URL-ін және рұқсат етілген redirect URL-ін тексеріңіз.
4. `/login`, ұйымдар, афиша, фото/видео, жоспар, админ модерация, файл ашу, мобильді кіру секілді мүмкіндіктерді тексеріңіз.
5. Сосын HTTPS URL-ін `ShanyraqHub-Mobile-Kit.zip` мобильді жинағына `site_url` ретінде енгізіп, APK шығарамыз.

## Қателер

- Build қате берсе: Cloudflare → Workers & Pages → Worker → Deployments / Builds → log ішінен алғашқы нақты ERROR және алдындағы 10 жолды ғана көрсетіңіз (кілт мәндерін жасырыңыз).
- `Missing Supabase environment variable` болса, **Build variables және Runtime variables-ті екі бөлек** тексеріңіз.
- `Service worker` немесе PWA build қатесі болса, алдымен Cloudflare-ның негізгі SSR build қатесін қараңыз; PWA-ны уақытша өшіруге болады, бірақ сақтық үшін ол өзгеріс бұл жинақта жасалмады.
- `Worker exceeds size limit` шықса, тегін тариф шегін және server bundle өлшемін бірге тексеру керек.
- Кез келген username/password/private key-ді чатқа скрин күйінде көрсетпеңіз.

Ескерту: бұл жерде толық `npm install` + Cloudflare deploy орындалған жоқ, сондықтан жоба жарияланбай тұрып cloud build logs арқылы тексерілуі керек.


