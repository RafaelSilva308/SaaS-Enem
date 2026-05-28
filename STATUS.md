# SaaS ENEM — Status do Projeto

> **Última atualização:** 2026-05-26 (revisão de segurança + importação das provas do ENEM)
> **Fonte de verdade:** este arquivo. Atualizar manualmente a cada sessão de trabalho.

---

## Infraestrutura de Produção

| Serviço | URL / ID | Status |
|---------|----------|--------|
| Frontend | https://enemproapp.com.br | ✅ Online |
| Frontend (backup Vercel) | https://frontend-pied-one-13.vercel.app | ✅ Online |
| Backend (Railway) | https://backend-production-2daa.up.railway.app | ✅ Online |
| Health check | https://backend-production-2daa.up.railway.app/health | ✅ OK |
| Banco de dados | Neon PostgreSQL | ✅ Online |
| Cache | Redis (Railway) | ✅ Online |

**IDs dos serviços:**
- Vercel projeto: `rafaels-projects-e2dc01a7/frontend` · Project ID: `prj_elbkZ49Dpv66rzhyBoiAJOtOkZoW` · Team ID: `team_5aGayHsovCmwkAQmzSsEHHDh`
- Railway projeto: `faithful-possibility` · Service ID: `c9305353-0587-4a82-a73f-ad3baf3082d0`
- Domínio: `enemproapp.com.br` (Registro.br)

**Configurações críticas Vercel (não alterar):**
- Root Directory: `frontend/` — sem isso o build falha (monorepo)
- Branch: `master`
- GitHub integration: ativa em `RafaelSilva308/SaaS-Enem`

**Deploy automático:**
- Frontend: push para `master` → Vercel detecta → build em ~1–2 min
- Backend: Railway integração nativa com GitHub (deploy automático)

**Deploy manual de emergência (frontend):**
```bash
cd frontend && vercel deploy --prod
```

---

## Stack Técnica

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Next.js 15 (TypeScript, App Router, `src/`) + TailwindCSS v4 |
| UI | Shadcn/UI Base UI (não Radix — APIs distintas!) |
| Estado | Zustand + persist (`auth-store`, `gamification-store`) |
| Backend | FastAPI (Python), async com asyncpg |
| ORM | SQLModel + Alembic (3 migrations) |
| DB | PostgreSQL Neon — 24 tabelas |
| Cache | Redis (Railway) |
| Pagamentos | Stripe LIVE (`sk_live_...`) |
| IA | Gemini 1.5 Flash (primário) + GPT-4o fallback + LangChain |
| Email | Resend |
| Deploy | Vercel (frontend) + Railway (backend) |

**Design System:** bg `#020617` · primary `#2563eb` · secondary `#10b981` · accent `#7c3aed` · Glassmorphism dark · Fonte Outfit

**Variáveis de ambiente — Frontend (Vercel):**
- `NEXT_PUBLIC_API_URL` = `https://backend-production-2daa.up.railway.app/api/v1`
- `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` = `pk_live_...` (chave pública Stripe)

**Variáveis de ambiente — Frontend local (`.env.local`):**
- `NEXT_PUBLIC_API_URL` = `http://localhost:8000/api/v1`

---

## Banco de Dados — 24 Tabelas

`users` · `subscriptions` · `learning_profiles` · `diagnostics` · `study_plans` · `weekly_sprints` · `topics` · `essay_themes` · `questions` · `question_options` · `exams` · `badges` · `scheduled_exams` · `exam_results` · `exam_answers` · `essays` · `essay_analyses` · `question_stats` · `user_badges` · `notifications` · `study_sessions` · `user_streaks` · `user_points` · `point_history`

**Migrations aplicadas em produção:**
- `0001_initial_schema.py` — schema completo
- `0002_composite_indexes.py` — índices compostos
- `0003_rename_subscription_stripe_field.py` — renomeia campo Stripe

---

## O Que Está Implementado — Backend

### Autenticação (`/api/v1/auth/`)
- `POST /register` — cria usuário + OTP via Resend
- `POST /verify-email` — valida OTP Redis (TTL 10min)
- `POST /login` — JWT 60min + refresh 30d + rate limit 5x/15min/IP + 2FA opcional
- `POST /refresh` — rotação stateful de tokens
- `POST /resend-otp` — reenvio de OTP
- `POST /forgot-password` — token 48 bytes TTL 1h
- `POST /reset-password` — atualiza hash bcrypt
- `POST /2fa/enable` — gera TOTP secret + QR code
- `POST /2fa/verify` — confirma TOTP e persiste
- `GET /me` — dados do usuário autenticado
- `DELETE /me` — exclusão de conta (LGPD)
- `GET /me/export` — exportação de dados (LGPD)

### Dashboard (`/api/v1/dashboard/`)
- `GET /` — countdown ENEM, meta do dia, sprint atual, recomendação IA, atividade semanal (cache Redis 5min)
- `POST /study-sessions/start` — registra início de sessão
- `POST /study-sessions/end` — calcula duração, atualiza sprint, award XP

### Diagnóstico (`/api/v1/diagnostic/`)
- `GET /questions` — 40 questões (existe no backend mas **não é usado pelo onboarding atual**)
- `POST /submit` — diagnóstico via respostas às questões (existe mas **não é usado pelo onboarding atual**)
- `POST /self-assessment` — **único endpoint usado pelo onboarding** — diagnóstico via autoavaliação (Fraco/Regular/Forte por área)
- `GET /result` — resultado do diagnóstico do usuário
- `GET /status` — `{ has_completed: bool }` para redirect do onboarding

### Assinaturas (`/api/v1/subscriptions/`)
- `GET /plans` — 4 planos com features (free/1m/3m/6m)
- `POST /activate-free` — ativa freemium sem pagamento
- `POST /create` — cria Stripe Customer + Subscription com trial 7 dias
- `GET /me` — status, dias restantes, método, auto_renewal
- `POST /cancel` — desativa via `cancel_at_period_end` Stripe
- `POST /webhook` — processa eventos Stripe (subscription.updated, invoice.payment_succeeded etc.)

### Plano de Estudos (`/api/v1/study-plans/`)
- `POST /generate` — gera plano completo até o ENEM (algoritmo por fraqueza/horário/dias)
- `GET /me` — plano ativo com sprint atual, próximo sprint, progresso por disciplina
- `PUT /{plan_id}/adjust` — atualiza learning_profile e regenera
- `POST /topics/{topic_id}/complete` — toggle conclusão, atualiza horas do sprint, retorna XP

### Banco de Questões (`/api/v1/questions/`)
- `GET /` — paginado com filtros (área, tópico, dificuldade, ano, fonte)
- `GET /recommended` — baseado em question_stats + diagnóstico
- `GET /doubts` — questões marcadas como dúvida
- `GET /{question_id}` — detalhe de uma questão
- `POST /answer` — resposta → gabarito + explicação + atualiza question_stats
- `POST /{question_id}/mark-doubt` — toggle marcação de dúvida

### Simulados (`/api/v1/exams/`)
- `POST /create` — cria exam (completo=180q / área=45q / tópico=10–15q / quiz=5q)
- `GET /scheduled` — lista simulados agendados do usuário
- `POST /scheduled/{id}/start` — inicia simulado, lock questões no Redis
- `PUT /scheduled/{id}/save-answer` — salva resposta no Redis (sobrevive refresh)
- `PUT /scheduled/{id}/toggle-mark` — marca/desmarca questão para revisão
- `POST /scheduled/{id}/submit` — submete, calcula score bruto + TRI
- `GET /scheduled/{id}/result` — resultado completo com TRI

### Redação (`/api/v1/essays/`)
- `GET /themes` — catálogo de temas de redação
- `GET /` — lista redações do usuário
- `POST /` — cria nova redação (rascunho)
- `GET /{essay_id}` — detalhe com análise se já corrigida
- `PUT /{essay_id}` — atualiza rascunho (auto-save)
- `POST /{essay_id}/submit` — envia para correção por IA (Gemini Flash → GPT-4o fallback)
- `DELETE /{essay_id}` — exclui redação

### Desempenho (`/api/v1/performance/`)
- `GET /tri-history` — evolução TRI por área ao longo do tempo
- `GET /enem-prediction` — projeção de nota com intervalo de confiança
- `GET /overview` — KPIs gerais do usuário
- `GET /error-patterns` — padrões de erro (Conceitual/Atenção/Cálculo/Tempo)
- `GET /subject/{subject}` — deep-dive por disciplina
- `GET /comparison` — comparação vs média anônima de outros usuários

### Gamificação (`/api/v1/gamification/`)
- `GET /me` — nível, XP, badges desbloqueados, streak atual
- `GET /leaderboard` — top 50 anonimizado (7 dias + all-time)

### Notificações (`/api/v1/notifications/`)
- `GET /unread-count` — contagem de não lidas
- `GET /` — lista paginada com filtros
- `PATCH /{id}/read` — marca como lida
- `PATCH /read-all` — marca todas como lidas
- `GET /vapid-public-key` — chave pública para Web Push
- `POST /subscribe` — registra device para push notifications

### Análise Comparativa (`/api/v1/analysis/`)
- `GET /enem-historical` — médias históricas ENEM 2018–2024
- `GET /topic-frequency` — heatmap de frequência de tópicos por ano
- `GET /cohort-comparison` — comparação de coorte anônima
- `GET /probable-topics` — tópicos mais prováveis para o ENEM 2026

### Contingência (`/api/v1/contingency/`)
- `GET /status` — detecta atraso no plano (leve/moderado/severo)
- `POST /regenerate` — reordena plano por fraqueza + frequência ENEM
- `GET /turbo-session` — sessão rápida (10–15min) no tópico mais fraco

### Middleware de Segurança
- `SecurityHeadersMiddleware` (`backend/app/middleware/security.py`) — adiciona headers HTTP de segurança padrão e `X-Request-ID` em todas as respostas para rastreabilidade de logs

### Admin (`/api/v1/admin/`) — requer `role=admin`
- `GET /metrics` — DAU, MAU, MRR, churn
- `GET /users` — lista paginada de usuários
- `PATCH /users/{id}/status` — ativa/suspende usuário
- `DELETE /users/{id}` — remove usuário
- `GET /questions` — lista questões para moderação
- `POST /questions` — cria nova questão
- `PATCH /questions/{id}` — edita questão
- `DELETE /questions/{id}` — remove questão
- `GET /analytics/subscriptions` — analytics de assinaturas
- `GET /analytics/essays` — analytics de redações

---

## O Que Está Implementado — Frontend

### Páginas Públicas
- `/` — Landing page com links para login/registro
- `/privacidade` — Política de privacidade
- `/termos` — Termos de uso

### Autenticação (`/(auth)/`)
- `/login` — login com 2FA condicional
- `/register` — registro com indicador de força de senha (4 níveis animados)
- `/verify-email` — 6 inputs OTP separados, autoavanço, paste, timer reenvio 60s
- `/forgot-password` — sem revelar existência do e-mail
- `/reset-password` — tela de erro explícita quando token ausente

### App Protegido (`/(app)/`)
- `/onboarding` — wizard 5 etapas: boas-vindas → perfil → **autoavaliação** (Fraco/Regular/Forte por área, sem questões) → resultado → plano
- `/dashboard` — countdown ENEM, meta diária (ProgressRing), timer de sessão flutuante, atividade semanal (BarChart), recomendação IA, próximo simulado
- `/plano` — 3 views (sprint atual / calendário / por área) + painel ajuste lateral
- `/banco-questoes` — filtros, lista paginada, aba dúvidas, modo estudo tela cheia
- `/simulados` — hub com lista, criar simulado (modal), timer, navegador de questões
- `/simulados/[id]/fazer` — timer, grid colorido de questões, marcar para revisão, pausar/finalizar
- `/simulados/[id]/resultado` — reveal animado, gráfico por área, revisão por questão
- `/redacao` — catálogo de temas + aba "Minhas Redações"
- `/redacao/escrever` — split-pane (tema | editor), contador linhas/palavras, auto-save, timer 30min
- `/redacao/[id]` — resultado com score, barras 5 competências, feedback IA
- `/desempenho` — TRI history chart, projeção ENEM com slider, radar por área, padrões de erro
- `/gamificacao` — anel de nível, heatmap streak, grid badges, leaderboard
- `/notificacoes` — lista completa com filtros e marcar como lida
- `/analise-comparativa` — médias históricas ENEM, heatmap frequência tópicos, tópicos prováveis 2026
- `/configuracoes` — dados pessoais, troca de senha, 2FA, configurações de notificações
- `/configuracoes/billing` — status assinatura, dias restantes, cancelamento com confirmação

### Admin (`/admin/`)
- `/admin` — redirect para dashboard
- `/admin/dashboard` — métricas: DAU, MAU, MRR, churn
- `/admin/users` — lista, ativar/suspender, deletar usuários
- `/admin/questions` — CRUD de questões

### Componentes relevantes
- `Sidebar` + `TopBar` + `BottomNav` (mobile) — navegação global
- `SessionTimer` — timer de sessão flutuante persistente
- `CheckoutModal` — PIX (QR + polling 5s) / Boleto / Cartão com máscara
- `XPWidget` — XP/nível sempre visível no header
- `LevelUpModal` — animação level-up com confetti
- `ContingencyBanner` + `ContingencyModal` + `TurboSessionSheet`
- `InstallPrompt` + `PushSetup` + `ServiceWorkerRegistrar` — PWA
- `ProgressRing`, `TopicCard`, `QuestionCard` — componentes reutilizáveis

### Arquivos PWA (frontend/public/)
- `sw.js` — service worker
- `manifest.webmanifest` — manifest PWA
- `icon.svg` + `icon-maskable.svg` — ícones do app

### Stores Zustand
- `auth-store.ts` — autenticação + persist localStorage + sync cookie `auth_session`
- `gamification-store.ts` — XP, nível e streak em cache local

### Banco de Questões — Estado em Produção (Neon)

**1.558 questões reais do ENEM** importadas em 2026-05-26.

| Disciplina | Questões |
|-----------|---------|
| Ciências da Natureza | 418 |
| Linguagens | 390 |
| Ciências Humanas | 381 |
| Matemática | 369 |
| **Total** | **1.558** |

**Anos cobertos:** 2009, 2011–2021, 2024, 2025 (14 anos)
**Anos ausentes:** 2010, 2022, 2023 — PDFs escaneados (sem texto extraível, precisariam de OCR)

**Origem dos dados:** PDFs oficiais INEP em `Provas_2009-2025/` (pasta local, no `.gitignore`, não vai ao GitHub)
**Critérios de descarte:** questões com imagem obrigatória (gráficos, tirinhas, mapas, tabelas) e questões com texto corrompido

**Para reimportar ou adicionar anos:**
```bash
# Da raiz do projeto
python backend/scripts/extract_questions.py
# Do diretório backend/
DATABASE_URL_SYNC="postgresql://..." python scripts/import_questions.py
```

---

### Scripts utilitários (backend/scripts/)
- `create_test_user.py` — cria usuário + assinatura premium no banco de produção
- `_check_subs.py` — consulta status de usuários e assinaturas no banco (diagnóstico rápido)
- `extract_questions.py` — extrai questões dos PDFs em `Provas_2009-2025/` e gera `questions.json` (requer `pip install pdfplumber`)
- `import_questions.py` — importa `questions.json` para o banco (PostgreSQL ou SQLite)

---

## Otimizações de Performance Pendentes (identificadas em 2026-05-26)

Todas são mudanças de código apenas — sem alteração de infraestrutura. Redis, Railway, Vercel e Neon continuam como estão.

| # | Prioridade | Esforço | Arquivo | O que fazer |
|---|-----------|---------|---------|------------|
| 1 | Alta | ~1h | `backend/app/services/performance_service.py` | Adicionar cache Redis (TTL 10–30min) nos 4 endpoints de `/performance/*` — fazem 4+ queries de agregação sem nenhum cache hoje |
| 2 | Alta | ~1h | `backend/app/services/admin_service.py:340` | Corrigir N+1 query: trocar loop de 20 queries individuais de opções por uma única query `WHERE question_id IN (...)` |
| 3 | Média | ~15min | `frontend/src/app/(app)/dashboard/page.tsx:170` | Trocar chamadas sequenciais `/dashboard` + `/contingency/status` por `Promise.all()` |
| 4 | Média | ~30min | Páginas que usam recharts | Trocar import estático do recharts por `dynamic(() => import('recharts'), { ssr: false })` para evitar que ~245KB sejam carregados em todas as páginas |
| 5 | Baixa | ~30min | Nova migration Alembic | Adicionar índice composto `(subject, year)` na tabela `questions` — filtro mais comum no banco de questões sem índice composto |
| 6 | Alta (futuro) | Dias | `frontend/src/app/(app)/` | Migrar páginas pesadas (`/banco-questoes`, `/desempenho`, `/analise-comparativa`) de `"use client"` para Next.js Server Components — entrega HTML pronto ao usuário |

**Detalhes técnicos de cada item:**

**Item 1 — Cache performance:**
Redis já está configurado e em uso no projeto. Basta seguir o mesmo padrão de `questions_service.py`:
```python
cache_key = f"perf:overview:{user_id}"
cached = await redis.get(cache_key)
if cached: return json.loads(cached)
# ... queries ...
await redis.setex(cache_key, 1800, json.dumps(result))  # TTL 30min
```
Aplicar em: `get_overview()`, `get_tri_history()`, `get_error_patterns()`, `get_enem_prediction()`.
Invalidar o cache quando o usuário submete um simulado (`submit_exam()`).

**Item 2 — N+1 admin:**
Trocar `_question_with_options()` chamado em loop por batch loading:
```python
q_ids = [q.id for q in questions]
opts = await session.exec(select(QuestionOption).where(QuestionOption.question_id.in_(q_ids)))
opts_map = defaultdict(list)
for opt in opts.all():
    opts_map[opt.question_id].append(opt)
```
Padrão já existe e funciona em `exams_service.py:489–500`.

**Item 3 — Promise.all dashboard:**
```typescript
// Antes (sequencial):
const { data } = await api.get("/dashboard")
const contingency = await api.get("/contingency/status")

// Depois (paralelo):
const [{ data }, contingency] = await Promise.all([
  api.get("/dashboard"),
  api.get("/contingency/status"),
])
```

**Item 4 — Dynamic import recharts:**
```typescript
// Antes:
import { LineChart, ... } from "recharts"

// Depois:
const LineChart = dynamic(() => import("recharts").then(m => m.LineChart), { ssr: false })
```

**Item 5 — Migration index:**
```python
op.create_index("idx_questions_subject_year", "questions", ["subject", "year"])
```

---

## Vulnerabilidades de Segurança Identificadas (2026-05-26)

Revisão de segurança realizada com análise estática + filtragem de falsos positivos. Dois findings confirmados com confiança ≥ 8/10:

| # | Severidade | Arquivo | Problema | Status |
|---|-----------|---------|---------|--------|
| 1 | **High** | `backend/app/core/config.py:11` | `SECRET_KEY="change-me"` aceito em staging — JWTs forjáveis | ❌ Pendente fix |
| 2 | **Medium** | `backend/app/schemas/auth.py:51` | Reset de senha aceita senha mais fraca que o cadastro (`len >= 8` apenas) | ❌ Pendente fix |

**Fix #1 — config.py:**
```python
_INSECURE_ENVS = {"production", "staging"}
if self.APP_ENV in _INSECURE_ENVS and self.SECRET_KEY in _INSECURE_KEYS:
    raise ValueError("SECRET_KEY insegura detectada")
```

**Fix #2 — schemas/auth.py:**
Extrair validação de senha para função compartilhada e aplicar em `RegisterRequest` e `ResetPasswordRequest`.

---

## Correções e Bugs Resolvidos

| Bug | Fix |
|-----|-----|
| HTTPBearer retornava 403 para token ausente | `auto_error=False` + raise 401 manual em `deps.py` |
| Frontend redirecionava para `/app/dashboard` (rota inexistente) | Corrigido em 14+ arquivos: `/app/X` → `/X` |
| Neon fechava conexões ociosas | `pool_pre_ping=True` em `engine.py` |
| `contingency/status` levantava 404 sem plano ativo | Retorna objeto `ok` padrão |
| Login redirecionava para rota errada | `redirect ?? "/dashboard"` sem prefixo `/app/` |
| Sidebar empurrando conteúdo em mobile | Removido `position: relative` do CSS `.sidebar` (conflito com Tailwind `fixed`) |
| Auth layout quebrando tela de login | `(auth)/layout.tsx` virou wrapper vazio |
| OTP inputs transbordando em mobile | `w-10 h-12 sm:w-11 sm:h-14` |
| Dropdown notificações transbordando | `max-w-[calc(100vw-24px)]` |
| passlib incompatível com bcrypt 4.x | Substituído por bcrypt direto |
| `datetime.utcnow()` depreciado Python 3.12+ | Helper `utcnow()` retornando naive datetime |
| asyncpg rejeita tz-aware em TIMESTAMP | `.replace(tzinfo=None)` em todo o codebase |
| `useSearchParams()` quebrando build estático | Envolvido em `<Suspense>` em todas as ocorrências |
| CORS bloqueando `enemproapp.com.br` | `EXTRA_CORS_ORIGINS` env var comma-separated em `main.py` |
| Resend send levantando 500 no registro | `try/except` ao redor do envio de e-mail |

---

## Credenciais de Produção

| Variável | Status |
|----------|--------|
| `DATABASE_URL` | ✅ Configurado (Neon) |
| `REDIS_URL` | ✅ Configurado (Railway) |
| `SECRET_KEY` | ✅ Configurado |
| `STRIPE_SECRET_KEY` | ✅ Configurado (LIVE) |
| `STRIPE_WEBHOOK_SECRET` | ❌ Pendente — webhooks Stripe não funcionam |
| `STRIPE_PRICE_ID_1M/3M/6M` | ✅ Configurado |
| `RESEND_API_KEY` | ✅ Configurado |
| `GOOGLE_API_KEY` | ✅ Configurado (Gemini — correção de redação funciona) |
| `OPENAI_API_KEY` | ❌ Pendente — fallback GPT-4o inativo (Gemini é o primário) |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | ⚠️ Verificar se está configurado no Vercel |
| `VAPID_PUBLIC_KEY` | ✅ Configurado |
| `VAPID_PRIVATE_KEY` | ✅ Configurado |
| `APP_ENV` | ✅ `production` (docs FastAPI desativados) |
| `EXTRA_CORS_ORIGINS` | ✅ Configurado (URL Vercel backup) |

**Usuários de teste no banco de produção:**

| Email | Plano |
|-------|-------|
| rafael.lome301.1510@gmail.com | free |
| teste@saas-enem.com / Teste@123456 | premium_1m (ativo até 23/06/2026) |

---

## O Que Falta — Fase 5 (Deploy/Lançamento)

> **Última revisão completa:** 2026-05-28 — auditoria real do código + sessão de correções.
> Tudo que está ✅ foi implementado, commitado e deployado nesta sessão.

---

### Resumo Rápido

| Categoria | Total | ✅ Feito | ❌ Pendente | ⏸️ Adiado |
|-----------|-------|---------|------------|----------|
| Bugs críticos | 3 | 3 | 0 | 0 |
| Bugs significativos | 2 | 1 | 0 | 1 |
| Segurança | 2 | 2 | 0 | 0 |
| Observabilidade | 2 | 0 | 2 | 0 |
| Testes de fumaça | 10 fluxos | 0 | 10 | 0 |
| Lançamento | 4 | 0 | 4 | 0 |

---

### Bugs Críticos — TODOS RESOLVIDOS ✅

| # | O que era | O que foi feito | Commit |
|---|-----------|----------------|--------|
| C1 | Checkout de cartão fake (`setTimeout` → success sem chamar Stripe) | `CardSetupView` com `CardElement` + `stripe.confirmCardSetup`. Backend retorna `setup_client_secret` do `pending_setup_intent`. `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` adicionada ao Vercel. | `09dd147` |
| C2 | `STRIPE_WEBHOOK_SECRET` ausente — nenhum evento Stripe processado | Webhook criado no Stripe (`we_1Tc8OYGlckaqYJAXhqz5hsag`), secret adicionado no Railway. Verificado: endpoint retorna 400 para assinatura inválida. | — (Railway env) |
| C3 | Botão "Atualizar senha" sem onClick, sem endpoint no backend | `POST /auth/change-password` no backend (bcrypt + validação de força). Frontend com inputs controlados, toast e reset de campos. | `2c1adb8` |

---

### Bugs Significativos

| # | Status | O que era | O que foi feito |
|---|--------|-----------|----------------|
| S1 | ⏸️ Adiado | Toggle 2FA decorativo — só atualiza React state, não chama backend. Endpoints `/2fa/enable` e `/2fa/verify` existem mas não são usados. | Decisão 2026-05-28: não será implementado antes do lançamento. |
| S2 | ✅ Feito | "Matérias com dificuldade" hardcoded (`const active = i < 4`) | Chips leem `GET /diagnostic/result` e destacam áreas com `level === "weak"`. Read-only com legenda "Baseado no diagnóstico inicial". | `a402cc1` |

---

### Segurança — TODOS RESOLVIDOS ✅

| # | Severidade | O que era | O que foi feito | Commit |
|---|-----------|-----------|----------------|--------|
| SEC1 | High | `SECRET_KEY="change-me"` aceita em staging — JWTs forjáveis | Guard estendido para `APP_ENV in {"production", "staging"}`. Servidor falha no startup com mensagem clara. | `5112c92` |
| SEC2 | Medium | Reset de senha validava só `len >= 8`, aceitando senhas mais fracas que o cadastro | Extraída `_validate_password_strength()` compartilhada. Aplicada em `RegisterRequest`, `ResetPasswordRequest` e `ChangePasswordRequest`. | `5112c92` |

---

### Seeds em Produção — OK ✅

| Tabela | Status |
|--------|--------|
| `questions` | ✅ 1.558 questões reais do ENEM (2009–2025, 14 anos) |
| `essay_themes` | ✅ Auto-seed lazy — roda na primeira chamada a `GET /essays/themes` |
| `badges` | ✅ Auto-seed lazy — roda na primeira chamada à gamificação |

---

### Observabilidade — PENDENTE ❌

| Item | O que é | O que fazer |
|------|---------|------------|
| **UptimeRobot** | Monitora se o backend está online e alerta por e-mail se cair | Criar conta em uptimerobot.com → Add Monitor → HTTP(s) → URL: `https://backend-production-2daa.up.railway.app/health` → intervalo 5 min → e-mail de alerta |
| **Sentry** | Captura erros em tempo real com stack trace, contexto e frequência | Criar conta em sentry.io → criar projeto Python (backend) e Next.js (frontend) → instalar `sentry-sdk` no Railway + `@sentry/nextjs` no Vercel → adicionar `SENTRY_DSN` como env var nos dois |

---

### Testes de Fumaça — PENDENTE ❌

Todos os fluxos abaixo precisam ser testados **manualmente em produção** (enemproapp.com.br) antes do lançamento.

| Fluxo | Risco se quebrado | Status |
|-------|------------------|--------|
| Registro → OTP e-mail → verificação | Ninguém consegue criar conta | ❌ Não testado |
| Login com usuário existente | Ninguém consegue entrar | ❌ Não testado |
| Onboarding completo (autoavaliação → plano) | Primeiro uso quebrado | ❌ Não testado |
| Dashboard carrega corretamente | Tela principal vazia | ❌ Não testado |
| Criar e responder simulado completo | Feature principal | ❌ Não testado |
| Ver resultado de simulado | Sem feedback ao usuário | ❌ Não testado |
| Escrever e enviar redação (correção Gemini) | Feature de IA inativa | ❌ Não testado |
| Checkout PIX (Stripe real) | Monetização PIX quebrada | ❌ Não testado |
| Checkout Boleto (Stripe real) | Monetização boleto quebrada | ❌ Não testado |
| Checkout Cartão (Stripe Elements) | Monetização cartão quebrada | ❌ Não testado |
| Painel admin (métricas, usuários) | Sem visibilidade operacional | ❌ Não testado |
| PWA — instalar na tela inicial (mobile) | UX mobile comprometida | ❌ Não testado |

**Usuários de teste disponíveis em produção:**

| Email | Senha | Plano |
|-------|-------|-------|
| rafael.lome301.1510@gmail.com | — | free |
| teste@saas-enem.com | Teste@123456 | premium_1m (ativo até 23/06/2026) |

---

### Lançamento — PENDENTE ❌

| Item | O que é | Status |
|------|---------|--------|
| Analytics | Instalar GA4 ou Plausible para medir visitas, conversões e churn | ❌ Pendente |
| E-mail para waitlist | Disparar e-mail para leads que já demonstraram interesse | ❌ Pendente |
| Redes sociais | Post de lançamento (Instagram, LinkedIn, Twitter/X) | ❌ Pendente |
| Product Hunt BR | Submeter na plataforma para visibilidade | ❌ Pendente |

---

### Ordem Recomendada para Concluir

1. **UptimeRobot** — 5 minutos, zero código, alerta imediato se o backend cair
2. **Sentry** — 30 minutos, captura de erros em produção antes de ter usuários reais
3. **Testes de fumaça** — você testa manualmente os 12 fluxos acima
4. **Analytics** — GA4 ou Plausible antes de anunciar (para medir o lançamento)
5. **Lançamento** — e-mail, redes sociais, Product Hunt BR

---

## Histórico de Commits

```
9dcf812  ci: remove redundant Railway deploy workflow
0d07888  chore: bump version to 1.1.0 to test Railway auto-deploy
5691b4e  ci: hardcode Railway service ID in deploy workflow
5cf738e  ci: add GitHub Actions workflow for Railway backend auto-deploy
cd6fd2c  feat: replace 40-question diagnostic with quick self-assessment
333cb1a  fix: add enemproapp.com.br to CORS origins and update email domain references
39a0cb6  chore: retest Vercel auto-deploy with root directory set to frontend
e044479  fix: remove position:relative from .sidebar CSS to stop overriding Tailwind fixed
b2d2944  fix: comprehensive responsive design overhaul for mobile and desktop
dfcf8d1  fix: return 401 (not 403) when auth token is absent
901ec30  fix: return ok status from contingency/status when no active plan exists
b59aff2  fix: correct frontend routes and backend stability for production
4be8913  fix: replace passlib with direct bcrypt
37a355f  fix: wrap Resend email send in try/except
3873977  feat: make frontend 100% responsive
fb68a19  fix: make migration 0003 idempotent
999810f  fix: add if_not_exists=True to migration 0002 indexes
4724334  fix: wrap useSearchParams() calls in Suspense boundaries
a790467  feat: complete frontend design migration — all 19 pages redesigned
0c3288f  fix: security audit — 8 bugs and vulnerabilities corrected
9512a64  fix: local dev support + bugfixes
db71af0  feat: complete platform build — Stages 1.5 through 4.4
a46a13b  feat: initial commit — SaaS ENEM platform
```

---

## Credenciais e Tokens de Serviço

O arquivo `C:\Users\rafae\.saas-enem-tokens` fica **fora do repositório** intencionalmente — evita risco de commit acidental no GitHub. Contém `RAILWAY_TOKEN` e `NEON_API_KEY`.

| Serviço | Acesso | IDs |
|---------|--------|-----|
| **Vercel** | MCP plugin ou CLI já autenticado | Projeto: `prj_elbkZ49Dpv66rzhyBoiAJOtOkZoW` · Team: `rafaels-projects-e2dc01a7` |
| **Railway** | GraphQL API com `RAILWAY_TOKEN` do arquivo de tokens | Projeto: `85886534-e020-49a5-93a8-f04f6e109dfa` · Backend service: `c9305353-0587-4a82-a73f-ad3baf3082d0` · Redis service: `6a7d4c14-4078-4514-94ad-7212d784f62c` |
| **Neon** | REST API com `NEON_API_KEY` do arquivo de tokens | Projeto: `small-haze-24589687` · Org: `org-proud-base-74638694` |

**Ler o arquivo de tokens:**
```powershell
Get-Content C:\Users\rafae\.saas-enem-tokens
```

**Nota Railway:** CLI (`railway whoami`) não aceita o token UUID — usar API GraphQL diretamente via `curl`.

---

## Arquivos Legados (manter, não remover)

| Arquivo | Situação |
|---------|---------|
| `backend/app/services/asaas_client.py` | Cliente Asaas (pagamentos BR) — substituído pelo Stripe mas mantido no código com degradação graciosa (mock quando sem `ASAAS_API_KEY`). Não é usado em produção. |

---

## Decisões Técnicas Permanentes

| Decisão | Escolha | Motivo |
|---------|---------|--------|
| Auth tokens | localStorage (access + refresh separados) | Zustand persist é separado do token usado pelo interceptor |
| HTTPBearer | `auto_error=False` + raise 401 manual | `auto_error=True` levanta 403 para token ausente |
| datetime | `.replace(tzinfo=None)` em todo codebase | asyncpg rejeita tz-aware em TIMESTAMP WITHOUT TIME ZONE |
| CSS + Tailwind | Nunca colocar position/z-index em classes CSS fora de `@layer` | CSS fora de layer vence sobre `@layer utilities` do Tailwind |
| Shadcn | Base UI (não Radix) | APIs distintas — `type="multiple"` vs `multiple` boolean |
| CORS | `EXTRA_CORS_ORIGINS` comma-separated | Suporta domínio personalizado + URL Vercel de backup |
| useSearchParams | Sempre em `<Suspense>` | Next.js 15 exige para geração estática |
| Seeds | Não rodam no startup | `lifespan` só chama `create_all_tables()` — seeds precisam rodar manualmente |
