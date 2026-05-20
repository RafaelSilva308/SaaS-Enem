# Plano de Desenvolvimento — SaaS ENEM

> **Última revisão:** 2026-05-19 | **Fase atual:** Fase 1 — MVP Core (Stage 1.5 pendente)
>
> **Progresso:** Fase 0 ✅ · Stages 1.1–1.4 ✅ · Stage 1.5 ⏳ · Fases 2–4 ⏳
>
> **Legenda:** ✅ Concluído · ⏳ Pendente · 🔗 Pendente de infra/credencial externa

---

## Contexto

Plataforma SaaS completa de preparação ao ENEM com três pilares:
1. Plano de estudos personalizado por IA (algoritmo de distribuição por fraqueza)
2. Correção de redação por IA (5 competências ENEM, 0–1000 pontos)
3. Gamificação (streaks, badges, XP, leaderboard)

Monetização: Freemium + Premium (R$ 59,90/mês · R$ 99,90/trimestre · R$ 149,90/semestre)

---

## Stack Técnica

| Camada | Tecnologia | Observações |
|--------|-----------|-------------|
| Frontend | Next.js 15 (TypeScript) + TailwindCSS v4 | App Router, `src/` directory |
| UI | Shadcn/UI (Base UI) + Framer Motion | **Base UI ≠ Radix** — APIs distintas! |
| Estado | Zustand + persist | Cookie `auth_session` sincronizado para middleware |
| Backend | FastAPI (Python 3.14) | Async com asyncpg |
| ORM | SQLModel + Alembic | 27 tabelas, migrations async |
| DB | PostgreSQL (Neon) | `DATABASE_URL` com asyncpg |
| Cache/Filas | Redis + ARQ | Refresh tokens, cache de questões, jobs |
| Pagamentos | **Stripe** | PIX + boleto + cartão BR; substituiu Asaas |
| IA | OpenAI GPT-4o + Gemini Flash + LangChain | Redação por IA — Stage 2.5 |
| Email | Resend | OTP, reset senha, notificações |
| Deploy | Vercel (frontend) + Railway (backend) | Ainda não configurado |

**Design System:**
- Background: `#020617` · Primary: `#2563eb` · Secondary: `#10b981` · Accent: `#7c3aed`
- Glassmorphism dark theme — classes `.glass`, `.glass-sm`, `.glass-strong`, `.glow-*`, `.gradient-*`, `.text-gradient-*`
- Fonte: Outfit (Google Fonts) via `next/font`

---

## Estrutura de Arquivos (estado atual)

```
SaaS_Enem/
├── .gitignore
├── PLANO_DE_DESENVOLVIMENTO.md         ← este arquivo
├── SaaS_Enem_Especificacao_e_Desenvolvimento.md
├── Orientações/
│   ├── SAAS_ENEM_DATABASE.md           ← 27 tabelas SQL completas
│   ├── SAAS_ENEM_FLUXOS.md             ← 16 fluxogramas Mermaid
│   ├── SAAS_ENEM_FUNCIONALIDADES.md    ← 19 funcionalidades detalhadas
│   └── SAAS_ENEM_WIREFRAMES.md         ← 15 wireframes ASCII
│
├── backend/
│   ├── .env.example                    ← todas as variáveis documentadas
│   ├── pyproject.toml                  ← Ruff + pytest config
│   ├── requirements.txt                ← dependências fixadas
│   ├── alembic.ini
│   ├── alembic/
│   │   ├── env.py                      ← async config
│   │   └── versions/
│   │       └── 0001_initial_schema.py  ← 27 tabelas + 43 índices
│   ├── venv/                           ← Python 3.14 venv
│   └── app/
│       ├── main.py                     ← FastAPI app + CORS + lifespan
│       ├── core/
│       │   ├── config.py               ← Settings (pydantic-settings)
│       │   ├── security.py             ← JWT, bcrypt, TOTP, OTP
│       │   ├── redis.py                ← conexão async Redis
│       │   └── deps.py                 ← get_current_user / get_current_active_user
│       ├── db/
│       │   └── engine.py               ← async engine + get_session
│       ├── models/
│       │   └── models.py               ← 27 SQLModel classes + utcnow()
│       ├── schemas/
│       │   ├── auth.py
│       │   ├── diagnostic.py
│       │   ├── subscription.py
│       │   └── study_plan.py
│       ├── services/
│       │   ├── auth_service.py
│       │   ├── diagnostic_service.py
│       │   ├── subscription_service.py ← mock sem STRIPE_SECRET_KEY
│       │   └── study_plan_service.py   ← algoritmo de geração
│       ├── api/v1/routes/
│       │   ├── auth.py                 ← 10 endpoints
│       │   ├── diagnostic.py           ← 4 endpoints
│       │   ├── subscription.py         ← 6 endpoints
│       │   └── study_plan.py           ← 4 endpoints
│       └── data/
│           ├── seed_questions.py       ← 40 questões ENEM (10/área)
│           └── curriculum.py          ← 48 tópicos ENEM (12/área)
│
└── frontend/
    ├── .env.example
    ├── .prettierrc
    ├── src/
    │   ├── middleware.ts               ← protege /app/* via cookie auth_session
    │   ├── app/
    │   │   ├── layout.tsx              ← Outfit font + Toaster + dark class
    │   │   ├── globals.css             ← Design System completo
    │   │   ├── page.tsx                ← Landing com links login/register
    │   │   ├── (auth)/
    │   │   │   ├── layout.tsx
    │   │   │   ├── login/page.tsx
    │   │   │   ├── register/page.tsx
    │   │   │   ├── verify-email/page.tsx
    │   │   │   ├── forgot-password/page.tsx
    │   │   │   └── reset-password/page.tsx
    │   │   └── (app)/
    │   │       ├── layout.tsx          ← mounted guard + onboarding check
    │   │       ├── dashboard/page.tsx  ← stub (Stage 1.5)
    │   │       ├── onboarding/page.tsx ← wizard 5 etapas
    │   │       ├── plano/page.tsx      ← 3 views + ajuste
    │   │       └── configuracoes/
    │   │           └── billing/page.tsx
    │   ├── components/
    │   │   ├── shared/
    │   │   │   └── QuestionCard.tsx    ← reutilizável em simulados
    │   │   ├── study-plan/
    │   │   │   ├── ProgressRing.tsx
    │   │   │   └── TopicCard.tsx
    │   │   └── subscription/
    │   │       └── CheckoutModal.tsx   ← PIX/boleto/cartão
    │   ├── hooks/
    │   │   └── useTimer.ts             ← countdown com urgent/critical
    │   ├── lib/
    │   │   └── api.ts                  ← axios + interceptor refresh 401
    │   └── stores/
    │       └── auth-store.ts           ← Zustand + persist + cookie sync
```

---

## Decisões de Design Tomadas

| Decisão | Escolha | Razão |
|---------|---------|-------|
| Pagamento | Stripe (não Asaas) | SDK Python superior, Stripe Elements, webhook CLI, melhor documentação |
| Shadcn versão | Base UI (não Radix) | Instalado automaticamente pela versão atual do shadcn CLI |
| Auth tokens | localStorage + cookie `auth_session` | Middleware Next.js precisa de cookie; axios usa localStorage |
| datetime | `utcnow()` helper em `models.py` | `datetime.utcnow()` depreciado no Python 3.12+ |
| Modo mock | Todos os serviços externos | Sem credenciais → degradação graciosa para dev |
| ENEM date | 2 novembro 2026 | Hardcoded em `curriculum.py` (atualizar para 2027 no próximo ciclo) |

---

## ⚠️ Alertas de API (Base UI vs Radix)

Os componentes Shadcn instalados usam **Base UI**, não Radix. As APIs diferem:

| Componente | Prop Radix (errada) | Prop Base UI (correta) |
|-----------|--------------------|-----------------------|
| Accordion | `type="multiple"` | `multiple` (boolean) |
| Slider | `onValueChange={([v]) => ...}` | `onValueChange={(v) => Array.isArray(v) ? v[0] : v}` |
| Sheet/Trigger | `asChild` | Não existe — estilizar o trigger diretamente |
| Dialog | `asChild` no trigger | Não existe |

---

## Configuração Inicial Necessária

Para rodar o projeto localmente, criar `backend/.env` a partir de `backend/.env.example`:

```bash
# Mínimo para funcionar sem serviços externos
DATABASE_URL=postgresql+asyncpg://user:pass@host/dbname
SECRET_KEY=qualquer-string-de-32-chars-ou-mais
REDIS_URL=redis://localhost:6379
RESEND_API_KEY=   # deixar vazio → emails logados no console
STRIPE_SECRET_KEY= # deixar vazio → mock mode automático
```

Para frontend, criar `frontend/.env.local`:
```bash
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...  # opcional em dev
```

**Aplicar migration:**
```bash
cd backend && alembic upgrade head
```

**Testar webhook Stripe localmente:**
```bash
stripe listen --forward-to localhost:8000/api/v1/subscriptions/webhook
```

---

## FASE 0 — Infraestrutura & Setup ✅

### Stage 0.1 — Monorepo & Tooling ✅

- [x] Estrutura: `/frontend` (Next.js 15) + `/backend` (FastAPI) + `.gitignore` raiz
- [x] ESLint + Prettier (`prettier-plugin-tailwindcss`) no frontend
- [x] Ruff + pytest configurados no backend (`pyproject.toml`)
- [x] `.env.example` completos para frontend e backend
- [x] Design System em `globals.css` — tokens, glassmorphism, fonte Outfit, scrollbar
- [x] Dependências frontend: Shadcn/UI, Framer Motion, Zustand, Recharts, axios, zod, react-hook-form, sonner, @stripe/stripe-js
- [x] Dependências backend: FastAPI, SQLModel, Alembic, asyncpg, Redis, passlib, python-jose, pyotp, resend, stripe, slowapi, httpx
- [🔗] Repositório GitHub com branch protection
- [🔗] GitHub Actions CI (lint + type-check + testes)
- [🔗] Vercel + Railway configurados

### Stage 0.2 — Schema do Banco ✅

- [x] 27 SQLModel classes em `app/models/models.py` (JSONB, Text, Numeric, UUID corretos)
- [x] `utcnow()` helper — evita `datetime.utcnow()` depreciado no Python 3.12+
- [x] Migration `0001_initial_schema.py` — 27 tabelas + 43 índices compostos + `downgrade()` completo
- [x] `alembic/env.py` configurado para async (asyncpg)
- [x] `app/db/engine.py` — async engine + `AsyncSessionLocal` + `get_session` dependency
- [x] `app/data/seed_questions.py` — 40 questões ENEM reais (10/área, 2021–2023)
- [🔗] Neon PostgreSQL provisionado
- [🔗] Redis no Railway provisionado
- [🔗] `alembic upgrade head` aplicado em staging e prod

---

## FASE 1 — MVP Core ✅ (exceto Stage 1.5)

### Stage 1.1 — Sistema de Autenticação ✅

**Tabelas usadas:** `users`

**Backend — 10 endpoints `/api/v1/auth/`:**
- [x] `POST /register` — cria user, gera OTP 6 dígitos, envia via Resend (dev: loga no console)
- [x] `POST /verify-email` — valida OTP Redis (TTL 10min), marca `email_verified=true`
- [x] `POST /login` — valida credenciais + rate limit 5x/15min/IP + 2FA opcional → JWT 15min + refresh 30d
- [x] `POST /refresh` — rotação stateful (delete old → create new no Redis)
- [x] `POST /resend-otp` — reenvia OTP (adicionado após revisão de código)
- [x] `POST /forgot-password` — token 48 bytes TTL 1h; não revela se e-mail existe
- [x] `POST /reset-password` — valida token Redis, atualiza bcrypt hash
- [x] `POST /2fa/enable` — gera TOTP secret + URI QR code (temp no Redis por 10min)
- [x] `POST /2fa/verify` — confirma TOTP e persiste `totp_secret` no user
- [x] `GET /me` — retorna `UserResponse` tipado
- [x] `app/core/deps.py` — `get_current_user` + `get_current_active_user` injetáveis

**Frontend:**
- [x] `/login` — 2FA condicional (campo aparece após erro 422 do backend)
- [x] `/register` — indicador de força de senha em 4 níveis (barras animadas)
- [x] `/verify-email` — 6 inputs separados, autoavanço, paste automático, timer reenvio 60s
- [x] `/forgot-password` — success state sem revelar existência do e-mail
- [x] `/reset-password` — tela de erro explícita quando token ausente na URL
- [x] `src/middleware.ts` — lê cookie `auth_session` para proteger `/app/*`
- [x] `src/stores/auth-store.ts` — Zustand + persist localStorage + seta/limpa cookie `auth_session`
- [x] `src/lib/api.ts` — axios com interceptor de refresh automático em respostas 401

---

### Stage 1.2 — Quiz Diagnóstico & Perfil de Aprendizado ✅

**Tabelas usadas:** `users`, `learning_profiles`, `diagnostics`

**Backend — 4 endpoints `/api/v1/diagnostic/`:**
- [x] `GET /questions` — 40 questões seed (10/área), cache Redis 1h; fallback para seed sem DB
- [x] `POST /submit` — valida `learning_style` e `preferred_time` com `Literal`, normaliza `available_days`, calcula scores 0–100, identifica pontos fracos (<60%), cria `diagnostics` + `learning_profiles`
- [x] `GET /result` — resultado do usuário autenticado
- [x] `GET /status` — `{ has_completed: bool, diagnostic_id? }` para redirect do onboarding
- [x] `app/data/seed_questions.py` — 40 questões ENEM reais (2021–2023)

**Frontend — `/app/onboarding` — Wizard 5 etapas:**
- [x] Etapa 1: Boas-vindas com grid de features animadas
- [x] Etapa 2: Perfil de aprendizado (estilo, horário, slider horas/dia, toggle dias)
- [x] Etapa 3: Quiz — tabs por área, timer 40min (amarelo ≤5min, vermelho ≤1min), navegação livre
- [x] Etapa 4: Resultados animados (Framer Motion) — score geral, barras por área, pontos fracos
- [x] Etapa 5: Seleção de plano → conectado ao CheckoutModal (Stage 1.3)
- [x] `src/components/shared/QuestionCard.tsx` — reutilizável (modo resposta + modo resultado)
- [x] `src/hooks/useTimer.ts` — countdown com estados `isUrgent` e `isCritical`
- [x] `src/app/(app)/layout.tsx` — `mounted` guard (hydration), onboarding check, trata 401

---

### Stage 1.3 — Planos de Assinatura & Pagamento (Stripe) ✅

**Tabelas usadas:** `subscriptions`

**Backend — 6 endpoints `/api/v1/subscriptions/`:**
- [x] `GET /plans` — 4 planos com feature list completa (free/1m/3m/6m)
- [x] `POST /activate-free` — ativa freemium sem pagamento
- [x] `POST /create` — cria Stripe Customer + Subscription com trial 7 dias; suporte PIX/boleto/cartão; **mock automático quando `STRIPE_SECRET_KEY` não está configurado**
- [x] `GET /me` — status, dias restantes, método, `auto_renewal`
- [x] `POST /cancel` — desativa `auto_renewal` via `cancel_at_period_end` no Stripe
- [x] `POST /webhook` — processa `customer.subscription.updated`, `invoice.payment_succeeded`, etc.
- [x] `app/services/subscription_service.py` — modo mock retorna PIX/boleto/cartão fictícios para dev

**Variáveis de ambiente Stripe:**
```
STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
STRIPE_PRICE_ID_1M, STRIPE_PRICE_ID_3M, STRIPE_PRICE_ID_6M
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
```

**Frontend:**
- [x] `src/components/subscription/CheckoutModal.tsx`:
  - Seletor de método (PIX / Boleto / Cartão)
  - PIX: QR code + copia-e-cola + polling a cada 5s até confirmar
  - Boleto: link de download + código de barras com botão copiar
  - Cartão: formulário formatado (auto-mask número/validade/CVV)
- [x] `/app/configuracoes/billing` — status da assinatura, dias restantes, cancelamento com confirmação, banner upgrade para freemium

---

### Stage 1.4 — Geração & Visualização do Plano de Estudos ✅

**Tabelas usadas:** `study_plans`, `weekly_sprints`, `topics`, `learning_profiles`, `diagnostics`

**Algoritmo de geração (`study_plan_service.py`):**
1. Conta dias de estudo disponíveis até o ENEM (2 nov 2026) — respeita dias da semana do usuário
2. Distribui horas por disciplina com base nos scores do diagnóstico:
   - Fraco (<60%) → 40% das horas · Moderado (60–80%) → 35% · Forte (>80%) → 25%
3. Seleciona tópicos do currículo (48 tópicos, `app/data/curriculum.py`) por prioridade: `critical → high → medium → low`
4. Adiciona sessões de prática automáticas (50% das horas de teoria, para tópicos ≥ 3h)
5. Cria `WeeklySprints` (janelas de 7 dias) e distribui tópicos respeitando `hours_budget` de cada sprint
6. Intensifica 25% as últimas 2 semanas (sprint de revisão final)
7. Desativa plano anterior ao regenerar

**Backend — 4 endpoints `/api/v1/study-plans/`:**
- [x] `POST /generate` — gera plano completo (ou regenera com `force_regenerate: true`)
- [x] `GET /me` — plano ativo com sprint atual, próximo sprint, progresso por disciplina
- [x] `PUT /{plan_id}/adjust` — atualiza `learning_profile` e regenera plano
- [x] `POST /topics/{topic_id}/complete` — toggle conclusão, atualiza `hours_completed` do sprint, retorna XP

**Frontend — `/app/plano` — 3 visualizações:**
- [x] **Sprint atual (padrão):** tópicos agrupados por dia, `ProgressRing` animado, preview do próximo sprint
- [x] **Calendário:** todos os sprints em ordem cronológica com barra de progresso e cor dominante
- [x] **Por área:** Accordion com tópicos por disciplina e progresso individual
- [x] Painel "Ajustar" (Sheet lateral) — slider horas/dia, toggles de dias, estimativa em tempo real
- [x] Tela de geração inicial quando não há plano ativo
- [x] `src/components/study-plan/ProgressRing.tsx` — anel SVG reutilizável
- [x] `src/components/study-plan/TopicCard.tsx` — checkbox + badge área + tipo + horas + dias

---

### Stage 1.5 — Dashboard Principal ⏳

**Tabelas a usar:** `study_sessions`, `notifications`, `weekly_sprints`, `topics`, `user_points`

**Backend a construir:**
- [ ] `GET /dashboard` — agregado: countdown ENEM, meta do dia, sprint atual, próximo simulado (null por ora), recomendação (próximo tópico incompleto), notificações recentes, atividade semanal (horas por dia)
- [ ] `POST /study-sessions/start` — registra início, retorna `session_id`
- [ ] `POST /study-sessions/end` — calcula duração, atualiza `weekly_sprints.hours_completed`, award XP stub

**Frontend a construir:**
- [ ] `/app/dashboard` — layout completo com sidebar:
  - Top bar: logo, sino (badge notificações), avatar dropdown com logout
  - Sidebar desktop: navegação com ícones e estados ativos
  - Grid (2 cols desktop / 1 col mobile):
    - Card Countdown ENEM (glassmorphism, dígitos flip animados)
    - Card Meta Diária (ProgressRing de horas, botão "Iniciar Sessão")
    - Card Atividade Semanal (BarChart Recharts, 7 dias)
    - Card Próximo Simulado (stub)
    - Card Recomendação IA (próximo tópico incompleto do plano)
- [ ] Timer de sessão flutuante (persiste em localStorage, pause/resume/encerrar)
- [ ] **⚠️ Este stage completa o MVP** — após ele, usuário pode fazer o fluxo completo

---

## FASE 2 — Simulados & Redação por IA ⏳

### Stage 2.1 — Banco de Questões & Modo Estudo ⏳

**Tabelas:** `questions`, `question_options`, `question_stats`

**Backend:**
- [ ] `GET /questions` — paginado com filtros (área, tópico, dificuldade, ano, fonte)
- [ ] `POST /questions/answer` — resposta → gabarito + explicação + atualiza `question_stats`
- [ ] `GET /questions/doubts` + `POST /questions/{id}/mark-doubt`
- [ ] `GET /questions/recommended` — baseado em `question_stats` + diagnóstico

**Frontend:**
- [ ] `/app/banco-questoes` — sidebar filtros, lista paginada, toggle "Modo Estudo", aba "Dúvidas"
- [ ] Modo Estudo: tela cheia, feedback imediato (correto/errado + explicação), contador

---

### Stage 2.2 — Engine de Simulados & Timer ⏳

**Tabelas:** `exams`, `scheduled_exams`, `exam_results`, `exam_answers`

**Backend:**
- [ ] `POST /exams/create` — template (completo=180q / área=45q / tópico=10–15q / quiz=5q)
- [ ] `POST /scheduled-exams` — agendar
- [ ] `POST /scheduled-exams/{id}/start` — lock questões no Redis (TTL duração + 30min)
- [ ] `PUT /scheduled-exams/{id}/save-answer` — salva no Redis (sobrevive refresh)
- [ ] `POST /scheduled-exams/{id}/submit` — flush Redis → DB, score bruto, dispara job TRI
- [ ] `GET /scheduled-exams/{id}/result` — resultado (poll até TRI completar)

**Frontend:**
- [ ] `/app/simulados` — hub com calendário de agendados
- [ ] `/app/simulados/[id]/fazer` — timer, navegador de questões (grid colorido), pausar, finalizar
- [ ] `/app/simulados/[id]/resultado` — reveal animado, gráfico por área, revisão por questão

---

### Stage 2.3 — Engine de Estimativa TRI ⏳

**Tabelas:** `exam_results`, `exam_answers`, `questions`, `question_stats`

**Backend:**
- [ ] Algoritmo TRI — Modelo 3PL simplificado: theta via MLE → mapeado para escala 200–1000
- [ ] Job `calculate_tri_score(exam_result_id)` na fila Redis/ARQ
- [ ] `GET /performance/tri-history` — evolução TRI por área
- [ ] `GET /performance/enem-prediction` — projeção com intervalo de confiança

**Frontend:**
- [ ] Score TRI na tela de resultados + delta vs simulado anterior
- [ ] Componente `ProjecaoENEM` reutilizável (gauge chart)

---

### Stage 2.4 — Dashboard de Análise de Desempenho ⏳

**Tabelas:** `exam_results`, `exam_answers`, `question_stats`, `study_sessions`

**Backend:**
- [ ] `GET /performance/overview` — KPIs gerais
- [ ] `GET /performance/error-patterns` — Conceitual / Atenção / Cálculo / Tempo
- [ ] `GET /performance/subject/{subject}` — deep-dive por área
- [ ] `GET /performance/comparison` — vs média anônima de outros usuários

**Frontend:**
- [ ] `/app/desempenho` — LineChart Recharts por área, radar hexagonal, pizza de erros, tabela de tópicos fracos, projeção com slider

---

### Stage 2.5 — Correção de Redação por IA ⏳

**Tabelas:** `essays`, `essay_analyses`, `essay_themes`

**Backend:**
- [ ] `GET /essay-themes` — catálogo de temas
- [ ] `POST /essays` + `PUT /essays/{id}` — rascunho com auto-save debounced
- [ ] `POST /essays/{id}/submit` — enfileira job de IA (ARQ + Redis)
- [ ] Job `analyze_essay` — LangChain + Gemini Flash (GPT-4o para notas < 600): 5 competências, erros com linha, 3 sugestões
- [ ] Rate limiting: 2/mês freemium · ilimitado premium

**Frontend:**
- [ ] `/app/redacao` — grid de temas + aba "Minhas Redações"
- [ ] Editor: split-pane (tema | editor), contador linhas/palavras, auto-save, timer 30min
- [ ] Resultado: círculo animado, barras 5 competências, texto anotado com erros sublinhados

---

## FASE 3 — Gamificação, Comunidade & Mentoria ⏳

### Stage 3.1 — Engine de Gamificação ⏳

**Tabelas:** `user_points`, `point_history`, `user_streaks`, `badges`, `user_badges`

- [ ] Sistema XP: sessão +10/h · questão +5 · simulado +50 · redação +30 · nota>800 +100 · streak ×2–5 · sprint +75
- [ ] 20 níveis com limiares progressivos + notificação level-up
- [ ] Cron diário streak (00:01 Brasília) — incrementa ou reseta `user_streaks`
- [ ] `evaluate_badges(user_id)` após cada evento XP
- [ ] `GET /leaderboard` — top 50 anonimizado (7 dias + all-time)
- [ ] `GET /gamification/me` — nível, XP, badges, streak

**Frontend:**
- [ ] Widget XP/Nível no header (sempre visível)
- [ ] Animação level-up (confetti Framer Motion)
- [ ] Toast de badge com glow animado
- [ ] `/app/gamificacao` — anel de nível, heatmap streak, grid badges, leaderboard

---

### Stage 3.2 — Sistema de Notificações ⏳

**Tabelas:** `notifications`

- [ ] Serviço `create_notification()` usado por todos os serviços
- [ ] 14 tipos: `daily_reminder`, `streak_at_risk`, `badge_earned`, `level_up`, `essay_analyzed`, `simulado_reminder`, `delay_detected`, `sprint_completed`, `forum_reply`, `mentoring_confirmed`, `plan_updated`, `subscription_expiring`, `goal_not_reached`, `streak_broken`
- [ ] Crons diários: 8h (daily_reminder), 20h (streak_at_risk), meia-noite (delay_detection)
- [ ] `GET /notifications` + `PATCH /{id}/read` + `PATCH /read-all`
- [ ] Emails via Resend (resultado redação, assinatura expirando)

**Frontend:**
- [ ] Dropdown sino com últimas 5 notificações
- [ ] `/app/notificacoes` — lista completa com filtros
- [ ] `/app/configuracoes/notificacoes` — toggles por tipo

---

### Stage 3.3 — Fórum da Comunidade ⏳

**Tabelas:** `community_posts`, `community_replies`

- [ ] CRUD posts com paginação, filtros e busca
- [ ] Replies aninhados + marcar como solução + helpful count
- [ ] Freemium: somente leitura; Premium: pode postar
- [ ] Moderação admin

**Frontend:**
- [ ] `/app/comunidade` — sidebar categorias, lista posts, controles ordenação
- [ ] Detalhe: replies aninhados, solução destacada com borda verde
- [ ] Editor markdown com preview

---

### Stage 3.4 — Sessões de Mentoria ⏳

**Tabelas:** `mentoring_sessions`

- [ ] Diretório de professores com disponibilidade
- [ ] Agendamento com pagamento via **Stripe** (sessão individual)
- [ ] Rating pós-sessão (1–5 estrelas)
- [ ] Google Calendar OAuth: criar evento ao agendar

**Frontend:**
- [ ] `/app/mentoria` — diretório, "Minhas Sessões"
- [ ] Modal agendamento (horário → tema → pagamento → confirmar)
- [ ] Modal avaliação pós-sessão

---

### Stage 3.5 — Engine de Contingência ⏳

**Tabelas:** `study_plans`, `weekly_sprints`, `topics`, `question_stats`

- [ ] Cron noturno: detecta atraso (leve <30% / moderado 30–50% / severo >50%)
- [ ] `POST /study-plans/{id}/regenerate-contingency` — reordena por frequência ENEM + fraqueza
- [ ] Turbo Sessions: 10–15min no tópico mais fraco (5 questões + resumo)

**Frontend:**
- [ ] Banner de atraso no dashboard
- [ ] Modal contingência com preview do novo plano
- [ ] Turbo session popup inline

---

## FASE 4 — Admin, PWA & Lançamento ⏳

### Stage 4.1 — Admin Dashboard ⏳
- [ ] Middleware `role=admin`
- [ ] Métricas: DAU, MAU, MRR, churn
- [ ] CRUD usuários, moderação, CRUD questões (upload Cloudflare R2)
- [ ] `/admin/dashboard`, `/admin/users`, `/admin/moderation`, `/admin/questions`

### Stage 4.2 — Análise Comparativa ⏳
- [ ] TRI vs médias históricas ENEM 2018–2024
- [ ] Heatmap frequência de tópicos
- [ ] Comparação de coorte anônima
- [ ] Seção "Tópicos Mais Prováveis 2026"

### Stage 4.3 — PWA & Mobile ⏳
- [ ] `manifest.json` + `next-pwa` service worker
- [ ] Bottom nav mobile (5 abas)
- [ ] Web Push notifications
- [ ] Auditoria 375px / 390px / 414px

### Stage 4.4 — Testes de Carga & Lançamento ⏳
- [ ] k6: 500 usuários simultâneos nos endpoints críticos
- [ ] Auditoria segurança: SQL injection, JWT, CORS, sanitização
- [ ] Sentry (frontend + backend) + UptimeRobot
- [ ] LGPD: `DELETE /users/me`, cookie consent, privacy policy
- [ ] Soft launch: e-mail waitlist + referral tracking

---

## Resumo do Roadmap

| Stage | Status | Entrega |
|-------|--------|---------|
| 0.1 | ✅ | Monorepo, design system, dependências |
| 0.2 | ✅ | 27 tabelas, migration, seed questions |
| 1.1 | ✅ | Auth completo (10 endpoints + 5 páginas) |
| 1.2 | ✅ | Wizard onboarding + diagnóstico (4 endpoints) |
| 1.3 | ✅ | Assinaturas Stripe (6 endpoints + CheckoutModal + billing page) |
| 1.4 | ✅ | Geração do plano (4 endpoints + 3 views + TopicCard) |
| 1.5 | ⏳ | **Dashboard principal** ← próximo |
| 2.1 | ⏳ | Banco de questões + modo estudo |
| 2.2 | ⏳ | Engine de simulados + timer |
| 2.3 | ⏳ | Algoritmo TRI |
| 2.4 | ⏳ | Dashboard de análise |
| 2.5 | ⏳ | Correção de redação por IA |
| 3.1 | ⏳ | Gamificação (XP, streaks, badges) |
| 3.2 | ⏳ | Sistema de notificações |
| 3.3 | ⏳ | Fórum da comunidade |
| 3.4 | ⏳ | Sessões de mentoria |
| 3.5 | ⏳ | Engine de contingência |
| 4.1 | ⏳ | Admin dashboard |
| 4.2 | ⏳ | Análise comparativa |
| 4.3 | ⏳ | PWA + mobile |
| 4.4 | ⏳ | Testes de carga + lançamento |

---

## Restrições por Plano

| Feature | Freemium | Premium (qualquer) |
|---------|----------|--------------------|
| Plano de Estudos | 4 semanas | Completo (até ENEM) |
| Banco de Questões | 20/dia | Ilimitado |
| Simulados Completos | 1/mês | Ilimitado |
| Score TRI | Não | Sim |
| Correção Redação IA | 2/mês | Ilimitado |
| Análise de Desempenho | Básica | Completa |
| Comunidade | Leitura | Postar e responder |
| Mentoria | Não | Pay-per-session |
| Análise Comparativa | Não | Sim |
| Plano de Contingência | Não | Sim |

---

## Arquivos de Referência (Orientações/)

| Arquivo | Conteúdo |
|---------|----------|
| `SaaS_Enem_Especificacao_e_Desenvolvimento.md` | Spec técnica, stack original, cronograma, design system |
| `Orientações/SAAS_ENEM_DATABASE.md` | 27 tabelas com SQL completo + queries úteis |
| `Orientações/SAAS_ENEM_FUNCIONALIDADES.md` | 19 funcionalidades detalhadas |
| `Orientações/SAAS_ENEM_FLUXOS.md` | 16 fluxogramas Mermaid de user flows |
| `Orientações/SAAS_ENEM_WIREFRAMES.md` | 15 wireframes ASCII das telas principais |
