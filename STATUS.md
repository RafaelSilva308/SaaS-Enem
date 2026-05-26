# SaaS ENEM — Status do Projeto

> **Última atualização:** 2026-05-26
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
- `GET /questions` — 40 questões seed (cache Redis 1h)
- `POST /submit` — diagnóstico completo via respostas às questões
- `POST /self-assessment` — diagnóstico rápido via autoavaliação (Fraco/Regular/Forte por área)
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
- `/onboarding` — wizard 5 etapas: boas-vindas → perfil → autoavaliação → resultado → plano
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

### Scripts utilitários (backend/scripts/)
- `create_test_user.py` — cria usuário + assinatura premium no banco de produção
- `_check_subs.py` — consulta status de usuários e assinaturas no banco (diagnóstico rápido)

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

| Item | Status | Ação necessária |
|------|--------|----------------|
| 5.4 Seeds em produção | ⚠️ Verificar | Confirmar se `essay_themes`, `badges` e `questions` estão populados no banco Neon |
| 5.7 Testes de fumaça | ⚠️ Parcial | Testar: simulado completo, correção de redação, admin, PWA, push notification |
| 5.8 Sentry + UptimeRobot | ❌ Pendente | Criar contas, instalar SDKs, configurar alertas |
| 5.9 STRIPE_WEBHOOK_SECRET | ❌ Pendente | Configurar webhook no Stripe Dashboard → copiar secret → Railway env var |
| 5.10 Lançamento | ❌ Pendente | Analytics, e-mail waitlist, redes sociais, Product Hunt BR |

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
