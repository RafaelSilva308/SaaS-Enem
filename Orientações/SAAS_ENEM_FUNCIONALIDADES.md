# SaaS ENEM - Documento de Funcionalidades Detalhadas

**Data:** 2026
**Versão:** 1.0
**Projeto:** Plataforma de Preparação para ENEM

---

## 📋 Índice

1. [Autenticação e Onboarding](#autenticação-e-onboarding)
2. [Dashboard Principal](#dashboard-principal)
3. [Plano de Estudo Personalizado](#plano-de-estudo-personalizado)
4. [Simulados Inteligentes](#simulados-inteligentes)
5. [Análise de Desempenho](#análise-de-desempenho)
6. [Redação Assistida](#redação-assistida)
7. [Banco de Questões](#banco-de-questões)
8. [Mentoria e Comunidade](#mentoria-e-comunidade)
9. [Contador Regressivo e Urgência](#contador-regressivo-e-urgência)
10. [Plano de Contingência](#plano-de-contingência)
11. [Notificações](#notificações)
12. [Gamificação](#gamificação)
13. [Recursos Práticos](#recursos-práticos)
14. [Integração com Calendário](#integração-com-calendário)
15. [App Mobile](#app-mobile)
16. [Planos e Monetização](#planos-e-monetização)
17. [Análise Comparativa](#análise-comparativa)
18. [Recursos de Saúde Mental](#recursos-de-saúde-mental)
19. [Admin e Analytics](#admin-e-analytics)

---

## 1. Autenticação e Onboarding

### 1.1 Registro de Usuário

**Descrição:** Sistema de criação de conta com validações básicas.

**Campos Obrigatórios:**
- Nome completo
- Email
- Senha (mínimo 8 caracteres, 1 maiúscula, 1 número, 1 caractere especial)
- Data de nascimento (para calcular idade)
- Confirmar senha

**Funcionalidades:**
- Validação de email (envio de código de confirmação)
- Verificação se email já está cadastrado
- Termos de uso e política de privacidade obrigatórios
- Opção "Lembrar-me" para login futuro
- Recuperação de conta por email

**Dados a Armazenar:**
```
- user_id (UUID)
- name (string)
- email (string, único)
- password_hash (bcrypt)
- date_of_birth (date)
- email_verified (boolean)
- created_at (timestamp)
- updated_at (timestamp)
- account_status (active, suspended, deleted)
```

### 1.2 Login

**Descrição:** Autenticação segura de usuários existentes.

**Funcionalidades:**
- Login com email e senha
- Opção "Lembrar-me por 30 dias"
- Link "Esqueci minha senha"
- Autenticação dois fatores (2FA) via email ou SMS (opcional)
- Limite de tentativas de login (máximo 5 tentativas em 15 minutos)
- Log de IPs para detecção de atividades suspeitas

**Resposta de Sucesso:**
```json
{
  "token": "jwt_token",
  "user": {
    "id": "user_id",
    "name": "Nome do Usuário",
    "email": "email@example.com"
  },
  "expires_in": 86400
}
```

### 1.3 Quiz Diagnóstico Inicial

**Descrição:** Avaliação inicial para personalizar o plano de estudo.

**Estrutura:**
- Duração: 30-40 minutos
- Formato: 10 questões por disciplina (total 50 questões)
- Disciplinas avaliadas:
  - Linguagens, Códigos e suas Tecnologias
  - Matemática e suas Tecnologias
  - Ciências da Natureza e suas Tecnologias
  - Ciências Humanas e suas Tecnologias
  - Redação

**O que cada seção faz:**

**Linguagens (10 questões):**
- Questões sobre interpretação de texto, gramática, literatura, língua estrangeira
- Identifica nível de compreensão leitora
- Detecta dificuldades com norma culta

**Matemática (10 questões):**
- Variando de básico a avançado
- Cobre: álgebra, geometria, estatística, probabilidade, trigonometria
- Identifica lacunas em conceitos fundamentais

**Ciências da Natureza (10 questões):**
- Física, Química, Biologia (3-4 questões cada)
- Detecta pontos fracos em cada uma
- Avalia compreensão de conceitos

**Ciências Humanas (10 questões):**
- História, Geografia, Sociologia, Filosofia
- Identifica dificuldade com interpretação histórica
- Avalia contextualização

**Redação (não é questão, mas análise):**
- Usuário escreve uma redação de 30 minutos
- Sistema analisa estrutura básica
- Gera feedback inicial

**Resultado do Diagnóstico:**
```json
{
  "diagnostic_id": "uuid",
  "user_id": "uuid",
  "scores": {
    "linguagens": 65,
    "matematica": 45,
    "ciencias_natureza": 70,
    "ciencias_humanas": 80,
    "redacao": 50
  },
  "weak_areas": [
    {
      "subject": "matemica",
      "percentage": 45,
      "recommendation": "Comece pelos fundamentos de álgebra"
    }
  ],
  "learning_profile": "visual", // visual, auditory, kinesthetic
  "estimated_study_hours": 180, // horas necessárias
  "completed_at": "timestamp"
}
```

### 1.4 Seleção de Plano

**Descrição:** Tela para escolher qual plano (freemium, 6 meses, 3 meses, 1 mês).

**Funcionalidades:**
- Exibição clara dos planos disponíveis
- Comparação de funcionalidades por plano
- Seleção de método de pagamento
- Cupom de desconto (se houver)
- Período de trial (7 dias grátis para plano premium)

**Dados a Armazenar:**
```
- subscription_id (UUID)
- user_id (UUID)
- plan_type (free, premium_6m, premium_3m, premium_1m)
- status (active, expired, cancelled)
- start_date (timestamp)
- end_date (timestamp)
- payment_method (credit_card, pix, boleto)
- amount_paid (decimal)
```

---

## 2. Dashboard Principal

### 2.1 Vista Geral do Progresso

**Descrição:** Tela inicial que mostra status geral do usuário.

**Elementos Exibidos:**

**Card de Contador Regressivo:**
- Dias até o ENEM com grande destaque visual
- Data exata do ENEM
- Porcentagem do tempo já passado
- Mensagem motivacional ou de alerta

```
┌─────────────────────────────────┐
│    ⏰ 127 dias para o ENEM       │
│    Data: 02 de Novembro de 2026 │
│    Progresso: ████░░░░░░ 45%    │
└─────────────────────────────────┘
```

**Card de Metas Diárias:**
- Meta de horas de estudo do dia
- Horas já estudadas hoje
- Barra de progresso
- Botão "Começar Sessão de Estudo"

```
Meta Diária: 2h
Estudado hoje: 1h 15m
████░░░░░░ 62%
```

**Card de Simulados:**
- Próximo simulado agendado
- Data e hora
- Disciplina ou completo
- Botão "Fazer Agora" ou "Adiar"

**Card de Meus Estudos:**
- Última sessão de estudo
- Tempo estudado esta semana
- Disciplina mais estudada
- Gráfico de atividade semanal

**Card de Recomendações IA:**
- Tópico recomendado para estudar hoje
- Motivo da recomendação
- Botão "Começar" ou "Mais tarde"
- Alternativas de tópicos

### 2.2 Menu de Navegação Principal

**Estrutura de Menu:**
```
Dashboard
├── Plano de Estudo
├── Simulados
├── Banco de Questões
├── Redação
├── Análise de Desempenho
├── Comunidade/Mentoria
├── Configurações
│   ├── Perfil
│   ├── Notificações
│   ├── Privacidade
│   └── Plano/Billing
└── Sair
```

### 2.3 Notifications Badge

**Funcionalidade:**
- Ícone com número de notificações não lidas
- Dropdown rápido mostrando últimas 5 notificações
- Link "Ver todas"
- Opção "Marcar tudo como lido"

---

## 3. Plano de Estudo Personalizado

### 3.1 Geração Automática do Plano

**Descrição:** Sistema que cria cronograma de estudos automático baseado em dados do usuário.

**Inputs para Geração:**
- Resultado do diagnóstico inicial
- Dias até o ENEM (calculado automaticamente)
- Disponibilidade de horas diárias (definida pelo usuário)
- Força de cada disciplina (do diagnóstico)
- Preferência de horário de estudo (manhã/tarde/noite)
- Dias da semana disponível (seg-dom)
- Estilo de aprendizado (visual, auditory, kinesthetic)

**Algoritmo de Distribuição:**
```
1. Calcular total de horas disponíveis até ENEM
2. Distribuir por disciplina baseado em:
   - Pontuação no diagnóstico (disciplinas fracas recebem mais tempo)
   - Dificuldade do conteúdo
   - Frequência em provas passadas
3. Dividir em "sprints" semanais
4. Alocar tópicos específicos para cada semana
5. Adicionar revisão ao final de cada semana
6. Aumentar intensidade 2 semanas antes do ENEM
```

**Estrutura de Dados do Plano:**
```json
{
  "plan_id": "uuid",
  "user_id": "uuid",
  "created_at": "timestamp",
  "updated_at": "timestamp",
  "total_hours_available": 180,
  "daily_hours_goal": 2,
  "weeks": [
    {
      "week_number": 1,
      "start_date": "2026-02-01",
      "end_date": "2026-02-07",
      "theme": "Fundamentos de Português",
      "topics": [
        {
          "topic_id": "uuid",
          "name": "Interpretação de Texto",
          "hours_allocated": 8,
          "days": ["seg", "ter", "qua"],
          "priority": "high",
          "type": "theory"
        },
        {
          "topic_id": "uuid",
          "name": "Questões de Interpretação",
          "hours_allocated": 4,
          "days": ["qui", "sex"],
          "priority": "high",
          "type": "practice"
        }
      ]
    }
  ],
  "status": "active"
}
```

### 3.2 Visualização do Plano

**Formatos de Visualização:**

**Visão Timeline:**
- Calendário mostrando todo período até ENEM
- Cores diferentes para cada disciplina
- Tooltips ao passar sobre data mostrando conteúdo do dia
- Possibilidade de expandir para ver detalhes

**Visão Semanal:**
- Semana atual com dias horizontais
- Tópicos listados para cada dia
- Indicador visual de "concluído", "em progresso", "não iniciado"
- Tempo estimado em cada dia

```
SEMANA 1 (01/02 - 07/02)
────────────────────────────────────

Seg 01/02:
  ✓ Interpretação de Texto - 2h
  ○ Exercícios de Leitura - 1h

Ter 02/02:
  ✓ Interpretação de Texto - 2h
  ○ Exercícios de Leitura - 1h

...
```

**Visão por Disciplina:**
- Lista de tópicos por disciplina
- Data quando será estudado
- Duração
- Status de conclusão

### 3.3 Ajustes Manuais do Plano

**Funcionalidades:**
- Usuário pode alterar meta de horas diárias
- Pode marcar dias indisponíveis (feriados, viagens)
- Pode adiar ou adiantar tópicos
- Pode aumentar/diminuir tempo em tópicos específicos
- Sistema recalcula automaticamente o plano

**Constraint do Sistema:**
- Não permite reduzir horas totais a menos de 60 (mínimo para passar)
- Avisos se ultrapassar 4 horas diárias (exaustão)
- Avisos se cair abaixo de 30 minutos diários (insuficiente)

### 3.4 Sprints Semanais

**Descrição:** Cada semana é uma "sprint" com tema e meta específica.

**Componentes:**
- **Tema da Semana:** "Fundamentos de Português", "Geometria Plana", etc.
- **Meta:** X horas de estudo + 1 simulado parcial
- **Tópicos:** Lista de 3-5 tópicos para cobrir
- **Recursos:** Links para aulas, artigos, vídeos
- **Checkpoint:** Quiz de 15 minutos no final da semana

**Exibição:**
- Progresso da semana (quanto já cumpriu)
- Dias restantes da semana
- Próximo tópico a estudar
- Opção "Acelerar" se está adiantado
- Opção "Estender" se precisa de mais tempo

### 3.5 Revisão Programada

**Descrição:** Sistema de revisão automática baseado em curva de retenção.

**Algoritmo (Spaced Repetition):**
```
1º revisão: 1 dia após conclusão
2º revisão: 3 dias após conclusão
3º revisão: 1 semana após conclusão
4º revisão: 2 semanas após conclusão
5º revisão: 1 mês antes do ENEM
```

**Implementação:**
- Sistema marca tópicos como "para revisar"
- Insere automaticamente sessões de revisão no plano
- Usuário recebe notificação quando é hora de revisar
- Revisão = fazer 5-10 questões sobre o tópico

---

## 4. Simulados Inteligentes

### 4.1 Tipos de Simulados

**A. Simulados Completos**
- Prova inteira como no ENEM real
- Duração: 5h 30m (ou 2 sessões de 2h 45m)
- 180 questões + redação
- Agendamento semanal (recomendado)

**Estrutura:**
```
ENEM Completo - Simulado #5
Tempo Total: 5h 30m

Dia 1 (2h 45m):
- Ciências Humanas: 45 questões
- Linguagens: 45 questões
- Redação: 1 tema

Dia 2 (2h 45m):
- Ciências da Natureza: 45 questões
- Matemática: 45 questões
```

**B. Simulados por Disciplina**
- Apenas 1 disciplina
- Duração: 45 minutos
- 45 questões
- Pode ser agendado ou feito sob demanda

**C. Simulados por Tema**
- Apenas 1 tema específico
- Duração: 15-20 minutos
- 10-15 questões
- Útil para testar conhecimento de um tópico

**D. Quiz Rápido**
- 5 questões aleatórias
- Duração: 5-10 minutos
- Sem limite de tempo (apenas indicativo)
- Perfeito para "preencher tempo morto"

### 4.2 Agendamento de Simulados

**Funcionalidades:**
- Calendar mostrando próximos simulados
- Usuário pode agendar simulados completos (recomendado: 1 por semana)
- Avisos 24h antes do simulado
- Opção de adiar para outro horário
- Sistema auto-agenda simulados semanalmente (se usuário permitir)

**Dados a Armazenar:**
```json
{
  "scheduled_exam_id": "uuid",
  "user_id": "uuid",
  "exam_type": "complete|by_subject|by_topic",
  "subject": "ciencias_humanas", // nullable se completo
  "topic": "história_brasil", // nullable se não for por tema
  "scheduled_at": "timestamp",
  "status": "scheduled|started|completed|skipped",
  "start_time": "timestamp",
  "end_time": "timestamp"
}
```

### 4.3 Interface de Realização do Simulado

**Modo Simulado "ENEM Real":**

**Antes de Começar:**
- Instruções sobre a prova
- Opção de fazer em ambiente controlado (sem pausa)
- Recomendação: "Minimize distrações, use fones"
- Checkbox de confirmação

**Durante o Simulado:**
```
┌─────────────────────────────────────────┐
│ Simulado #5 - Ciências Humanas          │
│ Tempo restante: 45:32  Questão: 15/45   │
├─────────────────────────────────────────┤
│ [Questão 15]                            │
│ Qual foi o principal impacto da...      │
│                                         │
│ A) Opção A                              │
│ B) Opção B (você clicou aqui)           │
│ C) Opção C                              │
│ D) Opção D                              │
│ E) Opção E                              │
│                                         │
│ [Anterior] [Próxima] [Marcar Dúvida]   │
│ [Pausar] [Finalizar Simulado]           │
└─────────────────────────────────────────┘

Navegador de Questões (direita):
[1] [2] [3] [4] [5]
[✓6] [✓7] [8] [9] [10]
[?11] [12] [?13] [14] [X15]

Legend:
✓ = Respondida
? = Marcada com dúvida
X = Atual
```

**Funcionalidades Durante:**
- Mudança de questões (anterior/próxima ou clique direto)
- Marcar questão com dúvida para revisar depois
- Visualizar quantas questões restam
- Timer do lado com alerta quando faltam 5 minutos
- Pausa permitida (apenas 1x, máximo 5 min) para simulado real
- Botão "Finalizar Simulado" quando terminar

**Após Finalizar:**
- Tela de confirmação "Tem certeza? Não pode voltar"
- Processamento de respostas (feedback imediato ou após análise)

### 4.4 Correção Automática

**Sistema de Correção:**
- Comparação com gabarito oficial do ENEM
- Cálculo automático de pontos
- Feedback imediato ou em até 24h (dependendo plano)

**Dados a Armazenar:**
```json
{
  "exam_result_id": "uuid",
  "scheduled_exam_id": "uuid",
  "user_id": "uuid",
  "total_questions": 45,
  "correct_answers": 38,
  "wrong_answers": 6,
  "unanswered": 1,
  "raw_score": 38,
  "score_estimate": 780, // TRI estimado
  "performance_by_subject": {
    "historia": { correct: 10, total: 10 },
    "geografia": { correct: 9, total: 10 },
    "sociologia": { correct: 9, total: 10 },
    "filosofia": { correct: 10, total: 15 }
  },
  "completed_at": "timestamp",
  "answers": [
    {
      "question_id": "uuid",
      "user_answer": "A",
      "correct_answer": "A",
      "is_correct": true,
      "marked_as_doubt": false,
      "topic": "revolução_francesa",
      "difficulty_level": "medium"
    }
  ]
}
```

### 4.5 Análise Detalhada de Resultados

**Tela de Resultados:**

**Resumo Geral:**
```
┌──────────────────────────────┐
│ Simulado #5 - Ciências Humanas│
│                               │
│ Pontuação: 780 (TRI estimado) │
│ Acertos: 38/45 (84%)         │
│ Erros: 6                      │
│ Não respondidas: 1            │
└──────────────────────────────┘
```

**Performance por Disciplina:**
```
História:      10/10 (100%) ████████████ Excelente!
Geografia:      9/10 (90%)  ███████████░ Muito Bom
Sociologia:     9/10 (90%)  ███████████░ Muito Bom
Filosofia:     10/15 (67%)  ████████░░░░ Pode Melhorar
```

**Comparação com Seus Simulados Anteriores:**
```
Gráfico de linha mostrando evolução:
Sim#1: 650
Sim#2: 680
Sim#3: 720
Sim#4: 750
Sim#5: 780 (você está aqui)
```

**Questões Erradas (com Explicações):**

Para cada questão errada:
```
┌─────────────────────────────────┐
│ Questão 23 - Filosofia          │
│ Dificuldade: Média              │
│ Tema: Iluminismo                │
│                                 │
│ Qual filósofo...                │
│ A) Voltaire                     │
│ B) Rousseau                     │
│ C) Diderot                      │
│ ❌ D) [VOCÊ CLICOU AQUI]        │
│ ✓ E) Montesquieu [CORRETA]      │
│                                 │
│ EXPLICAÇÃO:                     │
│ Montesquieu foi o filósofo...  │
│ Voltaire era conhecido por...   │
│                                 │
│ [📚 Revisar este tema]          │
│ [▶ Assistir vídeo explicativo]  │
│ [❓ Adicionar à dúvidas]         │
└─────────────────────────────────┘
```

**Questões Marcadas com Dúvida:**
- Lista separada das que o usuário marcou
- Permite estudar essas questões novamente

**Recomendações do Sistema:**
```
🎯 Baseado no seu desempenho:

1. Você errou 2 questões sobre "Iluminismo"
   → Recomendamos estudar este tema novamente
   → Tempo sugerido: 2h

2. Você não respondeu 1 questão (sobre Filosofia)
   → Isso sugere falta de conhecimento ou tempo
   → Tempo sugerido: 1h de revisão + controle de tempo

3. Seu melhor desempenho: História (100%)
   → Continue assim!
```

---

## 5. Análise de Desempenho

### 5.1 Dashboard de Desempenho

**Descrição:** Página mostrando análise completa do progresso do usuário.

**Elementos Principais:**

**Gráfico de Evolução Geral:**
- Eixo X: Simulados (ou semanas)
- Eixo Y: Score estimado (TRI ou porcentagem)
- Linha mostrando tendência
- Meta do usuário destacada (linha tracejada)
- Estatísticas: Min, Máx, Média

```
Score ao longo dos simulados:
 │
 900 │     ╱╲    ╱
 800 │    ╱  ╲  ╱
 700 │   ╱    ╲╱
 600 │  ╱
 500 │──────────────→ Simulados
```

**Estatísticas Gerais:**
```
📊 Seus Números:
- Simulados realizados: 5
- Questões respondidas: 225
- Taxa média de acerto: 82%
- Tempo médio de resposta: 1min 15s
- Horas estudadas: 45h
- Dias de estudo consecutivos: 12
```

### 5.2 Análise por Disciplina

**Estrutura:**

Para cada disciplina (Linguagens, Matemática, CN, CH, Redação):

```
┌────────────────────────────────┐
│ LINGUAGENS                     │
├────────────────────────────────┤
│ Desempenho Geral: 78%          │
│ Tendência: ↑ Melhorando        │
│ Último simulado: 750           │
│                                │
│ Performance por Tópico:        │
│ ✓ Interpretação: 90%           │
│ ○ Gramática: 75%               │
│ ✗ Literatura: 65%              │
│ ✓ Redação: 85%                 │
│                                │
│ Problemas Frequentes:          │
│ 1. Confunde vírgula com ponto  │
│ 2. Dificuldade com análise de   │
│    obras do séc. XVIII         │
│                                │
│ [Estudar estes tópicos]        │
└────────────────────────────────┘
```

### 5.3 Identificação de Padrões de Erros

**Categorização de Erros:**

**A. Erro Conceitual:**
- Usuário não compreende o conceito
- Solução: Estudar teoria, assistir vídeo, fazer exercícios básicos

**B. Erro de Atenção:**
- Usuário sabe o conteúdo mas cometeu erro de leitura/distração
- Solução: Praticar velocidade e concentração, ler com atenção

**C. Erro de Cálculo:**
- Apenas em matemática, erro na conta
- Solução: Revisar procedimento de cálculo, mais prática

**D. Erro por Falta de Tempo:**
- Usuário não respondeu ou respondeu muito rápido
- Solução: Treinar gestão de tempo, fazer simulados práticos

**Sistema de Detecção:**
```
Se usuário errou essa questão em 3+ simulados diferentes
  → Classificar como "Erro Conceitual"
  → Adicionar tópico à lista de prioridades

Se usuário cometeu erro similar em questão diferente
  → Classificar como "Padrão de Erro"
  → Alertar usuário sobre o padrão

Se usuário respondeu muito rápido (< 15 segundos)
  → Marcar como "Possível falta de atenção"
  
Se usuário não respondeu questão mas respondeu as próximas
  → Marcar como "Falta de tempo"
```

### 5.4 Comparação com Média de Outros Usuários

**Funcionalidade (apenas se permitido por LGPD):**

```
COMPARAÇÃO ANÔNIMA COM OUTROS USUÁRIOS

Sua Pontuação: 750
Pontuação Média: 685
Você está: 65 pontos acima da média! 🎉

Distribution:
     10% │ ░
     20% │ ░░░
     30% │ ░░░░░░
     40% │ ░░░░░░░░░░░ (você está aqui)
     50% │ ░░░░░░░
     60% │ ░░░░
     70% │ ░░

Por Disciplina:
Linguagens:    Você: 750 | Média: 700 | Acima ✓
Matemática:    Você: 650 | Média: 680 | Abaixo ✗
```

### 5.5 Previsão de Score Final

**Algoritmo de Previsão:**

```
Inputs:
- Scores de todos os simulados até agora
- Dias faltando para ENEM
- Padrão de melhora (taxa de crescimento)
- Plano de estudo a cumprir

Cálculo:
score_prediction = average_recent_scores + (growth_rate * days_remaining / 100)

Exemplo:
- Scores recentes: [720, 740, 750]
- Média: 737
- Taxa de crescimento: +10 pontos por simulado
- Dias faltando: 50
- Simulados faltando estimado: 7
- Previsão: 737 + (10 * 7) = 807
```

**Exibição:**
```
📈 PREVISÃO DE SCORE FINAL

Score Previsto: 807
Intervalo de Confiança: 780 - 835
Confiança: 85% (baseado em 5 simulados)

Cenários:
Pessimista: 750 (se parar de estudar)
Realista: 807 (seguindo plano)
Otimista: 850 (aceleração estudos)
```

**Atualização Automática:**
- Após cada simulado, o sistema recalcula
- Envia notificação se previsão subiu ou caiu significativamente

### 5.6 Metas e Marcos

**Sistema de Metas:**

**Meta Global:**
- Usuário define score desejado (ex: 700, 750, 800)
- Sistema calcula se é alcançável com os dados atuais

**Metas por Disciplina:**
- Sistema sugere meta para cada disciplina
- Exemplo: "Para atingir 750 geral, você precisa de:"
  - Linguagens: 750
  - Matemática: 700
  - CN: 750
  - CH: 800
  - Redação: 900

**Marcos de Progresso:**
```
Marcos Desbloqueados:
✓ 10 questões respondidas
✓ Primeiro simulado completo
✓ 1 semana de estudos
○ 100 questões respondidas
○ 3ª semana de estudos
○ 750 points em simulado
○ Redação 800+
```

---

## 6. Redação Assistida

### 6.1 Submissão de Redação

**Interface de Escrita:**

```
┌─────────────────────────────────────┐
│ REDAÇÃO                             │
│ Tema: Educação em tempos de crise   │
│ Tempo: 1h                           │
├─────────────────────────────────────┤
│                                     │
│ [    Digite sua redação aqui...     │
│  _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _ _  │
│  Mínimo 7 linhas / 300 palavras    │
│  Atual: 0 palavras                 │
│                                     │
│                                     │
│                                     │
├─────────────────────────────────────┤
│ [Salvar como Rascunho] [Enviar]    │
└─────────────────────────────────────┘

Contador de Palavras ao lado:
0 | 100 | 200 | 300 | 400 |...
```

**Dados a Armazenar:**
```json
{
  "essay_id": "uuid",
  "user_id": "uuid",
  "theme_id": "uuid",
  "essay_title": "Educação em tempos de crise",
  "essay_text": "...",
  "word_count": 350,
  "line_count": 15,
  "submitted_at": "timestamp",
  "status": "submitted|draft|under_review|reviewed",
  "is_from_sim": true, // do simulado
  "simulado_id": "uuid" // se aplicável
}
```

### 6.2 Avaliação Automática IA

**Sistema de Análise (IA powered):**

**Análise Estrutural:**
- Detectar se tem introdução, desenvolvimento, conclusão
- Verificar tamanho mínimo (300 palavras)
- Contar parágrafos

**Análise de Argumento:**
- Qualidade da argumentação (superficial vs. profunda)
- Coerência entre parágrafos
- Uso de evidências/exemplos
- Pertinência com o tema

**Análise de Linguagem:**
- Vocabulário (variação, sofisticação)
- Conectivos utilizados (coesão)
- Erros gramaticais detectados
- Pontuação correta

**Análise de Conformidade ENEM:**
- Atende as 5 competências do ENEM?
  1. Domínio da escrita
  2. Compreensão da proposta
  3. Seleção de informações
  4. Organização de ideias
  5. Proposta de solução

### 6.3 Feedback Detalhado

**Relatório de Análise:**

```
┌──────────────────────────────────┐
│ ANÁLISE DE SUA REDAÇÃO           │
│ Data: 15/05/2026                 │
├──────────────────────────────────┤
│                                  │
│ PONTUAÇÃO ESTIMADA: 720/1000    │
│ ██████░░░░ 72%                   │
│                                  │
│ POR COMPETÊNCIA ENEM:            │
│                                  │
│ 1️⃣ Domínio da Escrita: 800       │
│    ✓ Bom domínio gramatical      │
│    ⚠ Alguns erros menores        │
│    Detalhes: 2 vírgulas mal...   │
│                                  │
│ 2️⃣ Compreensão: 900             │
│    ✓ Compreendeu bem o tema     │
│    ✓ Argumentação clara          │
│                                  │
│ 3️⃣ Seleção de Informações: 700  │
│    ○ Você poderia utilizar       │
│      exemplos mais específicos    │
│    Sugestão: Cite dados/estudos  │
│                                  │
│ 4️⃣ Organização de Ideias: 750   │
│    ✓ Boa estrutura               │
│    ⚠ Faltou conectivos           │
│    Conectivos: "Assim", "Logo"   │
│                                  │
│ 5️⃣ Proposta de Solução: 600     │
│    ✗ Solução genérica            │
│    Sugestão: Especifique mais    │
│    Como implementar sua ideia?   │
│                                  │
├──────────────────────────────────┤
│ ERROS GRAMATICAIS ENCONTRADOS:   │
│                                  │
│ Linha 3: "...por que..." (deveria│
│ ser "porque")                    │
│ Linha 7: Vírgula desnecessária   │
│ Linha 12: Sujeito indeterminado  │
│                                  │
│ [Ver detalhes] [Corrigir]        │
├──────────────────────────────────┤
│ PONTOS FORTES:                   │
│ • Vocabulário vasto              │
│ • Estrutura lógica bem definida  │
│ • Tema bem explorado             │
│                                  │
│ PONTOS A MELHORAR:               │
│ • Proposta de solução mais clara │
│ • Mais exemplos específicos      │
│ • Conectivos temáticos           │
│                                  │
│ [Escrever Novamente] [Guardar]  │
└──────────────────────────────────┘
```

### 6.4 Histórico de Redações

**Gestão de Redações Anteriores:**

```
MINHAS REDAÇÕES

Redação #1 - 20/04/2026
Tema: Educação em tempos de crise
Score: 720
Status: Analisada
[Ver feedback] [Reescrever com dicas]

Redação #2 - 25/04/2026
Tema: Sustentabilidade
Score: 780
Status: Analisada
[Ver feedback] [Reescrever com dicas]

Redação #3 - 01/05/2026
Tema: Saúde Mental
Score: Aguardando análise...
Status: Enviada
[Cancelar] [Ver análise quando pronta]

Redação #4 - 10/05/2026
Tema: Violência nas Escolas
Score: (Rascunho)
Status: Rascunho
[Continuar] [Descartar] [Submeter]
```

### 6.5 Banco de Temas

**Temas Disponíveis para Treino:**

```
TEMAS PARA REDAÇÃO

Tema Sugerido: "Educação e Inclusão Social"
(Baseado em tendências atuais do ENEM)
[Começar Redação]

Temas Propostos pelo ENEM (passados):
- 2024: Desafios para a preservação...
- 2023: Seja protagonista na história...
- 2022: Discussão sobre representação...
- 2021: Invisibilidade e registro...

Outros Temas para Treino:
[  ] Sustentabilidade
[  ] Saúde Mental
[  ] Tecnologia e Privacidade
[  ] Educação em tempos de crise
[  ] Violência Urbana
[  ] Acesso à Saúde

[Filtrar] [Sugerir tema aleatório]
```

### 6.6 Revisão Humana (Plano Premium)

**Funcionalidade Adicional (Premium):**

**Fluxo:**
1. Usuário submete redação para revisão humana (pago)
2. Sistema enfileira para corretor
3. Corretor (professor) analisa em até 48h
4. Feedback detalhado com anotações
5. Usuário recebe notificação

**Dados a Armazenar:**
```json
{
  "human_review_id": "uuid",
  "essay_id": "uuid",
  "reviewer_id": "uuid", // Professor
  "requested_at": "timestamp",
  "completed_at": "timestamp",
  "human_score": 820,
  "detailed_feedback": "...",
  "annotations": [
    {
      "line": 3,
      "type": "grammar|style|argument",
      "suggestion": "Use 'porque' em lugar de 'por que'"
    }
  ]
}
```

---

## 7. Banco de Questões

### 7.1 Catálogo de Questões

**Estrutura do Banco:**

```json
{
  "question_id": "uuid",
  "source": "enem_2024|enem_2023|custom",
  "subject": "matematica|linguagens|cn|ch",
  "topic": "geometria|algebra|funcoes|...",
  "subtopic": "triangulos|equacoes_primeiro_grau|...",
  "difficulty": "easy|medium|hard",
  "year": 2024,
  "statement": "Qual é o valor de...?",
  "image_url": "...", // Se houver imagem na questão
  "options": [
    { "letter": "A", "text": "Opção A" },
    { "letter": "B", "text": "Opção B" },
    { "letter": "C", "text": "Opção C" },
    { "letter": "D", "text": "Opção D" },
    { "letter": "E", "text": "Opção E" }
  ],
  "correct_answer": "C",
  "explanation": "Explicação detalhada...",
  "explanation_video_url": "youtube.com/...", // Se houver
  "time_estimate": 180, // segundos
  "tri_weight": 1.2, // para cálculo de TRI
  "total_attempts": 15000,
  "correct_percentage": 68,
  "times_answered_correctly": 10200,
  "related_topics": ["equacoes", "algebra"],
  "created_at": "timestamp"
}
```

### 7.2 Interface de Busca/Filtro

**Filtros Disponíveis:**

```
BUSCAR QUESTÕES

Disciplina:
  ☐ Linguagens
  ☐ Matemática
  ☐ Ciências Natureza
  ☐ Ciências Humanas

Tópico:
  [Buscar tópico...] ▼

Nível de Dificuldade:
  ☐ Fácil
  ☐ Médio
  ☐ Difícil
  ☐ Personalizado

Ano:
  ☐ 2024
  ☐ 2023
  ☐ 2022
  ☐ Todos

Fonte:
  ☐ ENEM Original
  ☐ Criadas por nós
  ☐ Ambas

Status:
  ☐ Não respondidas
  ☐ Respondidas corretamente
  ☐ Erradas
  ☐ Marcadas com dúvida

[Buscar] [Limpar Filtros] [Salvar Busca]

Resultados: 234 questões encontradas
[Mostrar: 10 | 25 | 50] [Ordenar por: Dificuldade ▼]
```

### 7.3 Modo de Estudo por Tema

**Seleção de Tema e Prática:**

```
ESTUDAR POR TEMA

Disciplina: Matemática ▼

Temas Principais:
├─ Álgebra
│  ├─ Equações do 1º grau (15 questões)
│  ├─ Equações do 2º grau (18 questões)
│  └─ Funções (22 questões)
├─ Geometria
│  ├─ Triângulos (12 questões)
│  └─ Círculos (10 questões)
└─ Estatística (25 questões)

[Selecionar "Equações do 1º grau"]

MODO ESTUDO - Equações do 1º grau

Questões disponíveis: 15
Você respondeu corretamente: 8
Taxa de acerto: 53%
Tempo médio: 1m 45s

[Começar Prática] [Ver Dúvidas] [Ver Erradas]
```

### 7.4 Modo Prática Dirigida

**Durante a Prática:**

```
PRÁTICA: Equações do 1º grau
Questão: 3/15

Resolva:
2x + 5 = 13

A) x = 2
B) x = 3
C) x = 4
D) x = 5
E) x = 6

[Anterior] [Próxima] [Marcar Dúvida] [Ver Solução]
```

**Após Responder (Feedback Imediato):**

```
┌──────────────────────────┐
│ ✓ RESPOSTA CORRETA!      │
│                          │
│ Você clicou: C           │
│ Resposta certa: C        │
│                          │
│ Explicação:              │
│ 2x + 5 = 13              │
│ 2x = 13 - 5              │
│ 2x = 8                   │
│ x = 4                    │
│                          │
│ [Próxima] [Detalhes]    │
└──────────────────────────┘

ou

┌──────────────────────────┐
│ ✗ RESPOSTA ERRADA        │
│                          │
│ Você clicou: B           │
│ Resposta certa: C        │
│                          │
│ Explicação:              │
│ [Vídeo explicativo]      │
│ [Estudar este tópico]    │
│                          │
│ [Próxima] [Revisar]     │
└──────────────────────────┘
```

### 7.5 Gestão de Dúvidas

**Marcação de Dúvidas:**

```
MINHAS DÚVIDAS

Matemática:
  3 dúvidas pendentes
  
  ❓ Equações do 1º grau (2)
     [Ver questões] [Estudar]
     
  ❓ Geometria Plana (1)
     [Ver questões] [Estudar]

Linguagens:
  2 dúvidas pendentes
  
  ❓ Literatura (2)
     [Ver questões] [Estudar]

[Resolver Todas Agora]
```

**Fluxo de Resolução de Dúvida:**
1. Usuário clica em dúvida
2. Vê questão novamente
3. Opções: "Assistir explicação", "Estudar tópico", "Tentar novamente"
4. Após resolver, marca como "Dúvida resolvida"

### 7.6 Estatísticas por Questão

**Dados Coletados:**
```json
{
  "question_stats_id": "uuid",
  "question_id": "uuid",
  "user_id": "uuid",
  "attempts": 3,
  "correct": 1,
  "wrong": 2,
  "skipped": 0,
  "average_time": 210, // segundos
  "marked_as_doubt": true,
  "last_attempted": "timestamp"
}
```

**Exibição:**
```
SUAS ESTATÍSTICAS NESTA QUESTÃO

Tentativas: 3
Acertos: 1 (33%)
Erros: 2 (67%)
Nunca respondida: 0

Tempo:
Sua média: 3m 30s
Média dos usuários: 2m 45s
Você gasta: 45s a mais

Status: Marcada com dúvida
[Resolver dúvida] [Praticar similar]
```

---

## 8. Mentoria e Comunidade

### 8.1 Fórum de Dúvidas

**Estrutura do Fórum:**

```
COMUNIDADE - FÓRUM

Categorias:
├─ Dúvidas de Conteúdo
│  ├─ Matemática (234 tópicos, 1.2k respostas)
│  ├─ Linguagens (189 tópicos)
│  ├─ Ciências Natureza (156 tópicos)
│  └─ Ciências Humanas (201 tópicos)
├─ Dúvidas sobre Plataforma
├─ Motivação e Apoio
└─ Dicas de Estudo
```

**Criar Nova Dúvida:**

```
┌────────────────────────────────┐
│ FAZER UMA PERGUNTA             │
├────────────────────────────────┤
│ Título:                        │
│ [Como resolver equação de 2º...│
│                                │
│ Categoria:                     │
│ [Matemática           ▼]       │
│                                │
│ Descrição:                     │
│ [Estou com dúvida em...] ▼    │
│                                │
│ Anexar imagem (opcional):      │
│ [📷 Selecionar arquivo]        │
│                                │
│ [Cancelar] [Postar]            │
└────────────────────────────────┘
```

**Visualizar Tópico:**

```
COMO RESOLVER EQUAÇÃO DE 2º GRAU?
👤 João Silva | há 2 horas | Categoria: Matemática

Texto da dúvida...
📷 [Imagem com cálculo]

┌────────────────────────────────┐
│ RESPOSTAS: 3                   │
├────────────────────────────────┤
│ ✓ RESPOSTA MARCADA COMO MELHOR │
│ 👤 Prof. Ana (Mentor)          │
│ há 1 hora                      │
│                                │
│ A forma correta de resolver... │
│ [📐 Passo a passo com imagem]   │
│                                │
│ 👍 Útil (42) 💬 (3)            │
│ [Responder] [Reportar]         │
│                                │
├────────────────────────────────┤
│ 👤 Maria Santos (Aluno)        │
│ há 45 min                      │
│                                │
│ Obrigada pela resposta! Agora  │
│ entendi melhor...              │
│                                │
│ 👍 Útil (8) 💬 (1)             │
│ [Responder] [Reportar]         │
│                                │
├────────────────────────────────┤
│ 👤 Carlos (Aluno)              │
│ há 30 min                      │
│                                │
│ Não entendi ainda...           │
│                                │
│ 👍 Útil (2) 💬 (0)             │
│ [Responder] [Reportar]         │
└────────────────────────────────┘

[Responder para este tópico]
```

**Gamificação do Fórum:**
- Usuários que respondem bem ganham badges
- Sistema de reputação (como Stack Overflow)
- Respostas marcadas como "melhores" ganham destaque

### 8.2 Sessões de Mentoria ao Vivo

**Funcionalidade Premium:**

**Busca e Agendamento:**

```
MENTORIA AO VIVO

Professores Disponíveis:
🟢 Prof. Maria (Matemática)
   Rating: 4.9/5 ⭐
   Tempo resposta médio: 2 min
   R$ 120/hora
   [Agendar sessão]

🟢 Prof. Carlos (Português)
   Rating: 4.8/5 ⭐
   Próximo disponível: Seg 14:00
   R$ 150/hora
   [Agendar sessão]

🔴 Prof. João (Física)
   Rating: 4.7/5 ⭐
   Indisponível até amanhã
```

**Durante a Sessão:**

```
┌──────────────────────────────┐
│ 🎥 Sessão de Mentoria        │
│ Prof. Maria (Matemática)     │
│ Tempo: 45:32 / 1h            │
├──────────────────────────────┤
│ [Vídeo do professor]         │
│ [Chat]                       │
│ [Compartilhar tela]          │
│ [Quadro digital]             │
│ [Gravando esta sessão]       │
└──────────────────────────────┘
```

**Após Sessão:**
- Gravação disponível para rever
- Resumo enviado por email
- Avaliação do professor

### 8.3 Grupos de Estudo Pareados

**Matching Automático:**

```
GRUPOS DE ESTUDO

Sistema de pareamento inteligente:
- Nível de estudo similar
- Mesmos horários disponíveis
- Tópicos de interesse similar
- Localização próxima (opcional)

Seu Grupo (4 membros):
👤 João (750 points) - Foco: Matemática
👤 Maria (780 points) - Foco: Português
👤 Carlos (720 points) - Foco: Geral
👤 Você (760 points) - Foco: Geral

Próxima reunião: Sábado 14:00
[Entrar no grupo] [Messenger] [Sair]

Histórico de Grupos:
✓ Grupo 1 (Semana 1) - Completado
✓ Grupo 2 (Semana 2) - Completado
○ Grupo 3 (Semana 3) - Em progresso
```

### 8.4 Feed de Comunidade

**Atividades dos Outros Usuários (Anônimo):**

```
FEED COMUNITÁRIO

🎉 João atingiu 800 pontos em simulado!
   "Consegui! Estou feliz demais!"

💪 Maria completou 1 semana de estudos
   Streak: 7 dias consecutivos!

📚 Carlos respondeu sua dúvida sobre...
   Prof. marcou como "melhor resposta"

🏆 Novo usuário entrou no top 10!
   Score: 850 pontos

[Ver mais] [Compartilhar sua vitória]
```

---

## 9. Contador Regressivo e Urgência

### 9.1 Contador Principal

**Exibição Destacada no Dashboard:**

```
┌─────────────────────────────────┐
│           ⏰ CONTAGEM REGRESSIVA  │
├─────────────────────────────────┤
│                                 │
│        127 DIAS                │
│      3.048 HORAS              │
│     182.880 MINUTOS            │
│   10.972.800 SEGUNDOS          │
│                                 │
│   ENEM 2026: 02 de Novembro     │
│                                 │
│   Tempo já gasto: 45% ▓░░░░░░  │
│                                 │
├─────────────────────────────────┤
│ Mêtrica: Você está no PRAZO ✓  │
│ Velocidade: Aumentar um pouco   │
└─────────────────────────────────┘
```

### 9.2 Notificações de Urgência

**Tipos de Alertas:**

**A. Alerta Amarelo (Aviso):**
- Quando usuário não atingiu meta de estudo 2x na semana
- Mensagem: "Você está um pouco abaixo do planejado"

**B. Alerta Vermelho (Crítico):**
- Quando usuário não estuda por 3 dias seguidos
- Quando está 15+ dias atrás do plano
- Mensagem: "É hora de intensificar! Faltam X dias"

**C. Alerta Verde (Parabéns):**
- Quando usuário cumpre meta 5+ dias seguidos
- Quando alcança novo score pessoal
- Mensagem: "Você está indo muito bem!"

### 9.3 Modo Sprint Final

**Ativado Automaticamente 2 Semanas Antes:**

```
⚡ MODO SPRINT FINAL ATIVADO

Você tem apenas 14 dias até o ENEM!
É hora de dar o máximo!

PLANO INTENSIFICADO:
├─ Meta diária: 4 horas (dobrou)
├─ Simulados: 2 por semana (em vez de 1)
├─ Recomendação: Focar em tópicos fracos
└─ Pausas: Só o necessário

RECOMENDAÇÕES PARA HOJE:
1. Simulado Completo - 2h 45m
   [Começar Agora]

2. Praticar Matemática - 1h
   Foco: Seus 3 tópicos mais fracos
   [Praticar]

3. Revisar Redação - 30m
   [Fazer Redação]

[Ativar Modo Foco]
```

### 9.4 Modo Foco

**Quando Ativado:**
- Remove todas as distrações (comunidade, gamificação)
- Deixa apenas estudo e simulados visíveis
- Bloqueia notificações não urgentes
- Aumenta dark mode
- Desativa gamificação temporária
- Sessão ininterrupta de estudo

---

## 10. Plano de Contingência

### 10.1 Detecção de Atraso

**Sistema Automático de Monitoramento:**

```
Lógica:
Se (horas_estudadas_atual < horas_plano_esperado) {
  dias_atrasado = calcular_dias_atraso();
  
  if (dias_atrasado > 7) {
    nivel_alerta = "ALTO";
    plano_contingencia = gerar_novo_plano();
  }
}
```

**Cálculo:**
- Horas esperadas até hoje: 80
- Horas estudadas até hoje: 65
- Atraso: -15 horas (18% de atraso)
- Nível de alerta: MÉDIO

### 10.2 Geração Automática de Novo Plano

**Ao Detectar Atraso Significativo:**

```
⚠️  VOCÊ ESTÁ ATRASADO

Análise:
- Horas esperadas: 80
- Horas estudadas: 65
- Atraso: 15 horas (18%)
- Dias restantes: 45

Novo Plano Ajustado:
├─ Meta diária: 3.5h (em vez de 2h)
├─ Foco em tópicos críticos apenas
├─ Menos revisão, mais prática
└─ Simulados reduzidos a 1 por semana

TÓPICOS CRÍTICOS (estudar AGORA):
1. Equações do 2º grau (Matemática)
2. Literatura Brasileira (Português)
3. Genética (Biologia)

[Aceitar novo plano] [Customizar] [Cancelar]
```

### 10.3 Priorização Inteligente de Tópicos

**Algoritmo de Ranking:**

```
Score de Prioridade = (Frequência_ENEM * 0.4) + 
                      (Taxa_Erro_Usuario * 0.3) + 
                      (Dificuldade * 0.2) +
                      (Dias_Restantes_Fator * 0.1)

Exemplo Top 10:
1. Análise Combinatória (Matemática) - Score: 92
2. Interpretação de Texto (Português) - Score: 90
3. Revolução Francesa (História) - Score: 88
4. Termologia (Física) - Score: 85
5. Ácidos e Bases (Química) - Score: 83
6. Coordenadas Geográficas (Geografia) - Score: 81
7. Energia Cinética (Física) - Score: 79
8. Antropologia (Sociologia) - Score: 77
9. Sistemas Circulatório (Biologia) - Score: 75
10. Trigonometria (Matemática) - Score: 73
```

### 10.4 Sessões Turbo

**Sessões Curtas Para Quem Tem Pouco Tempo:**

```
SESSÕES TURBO

Disponíveis apenas se está atrasado.
Sessões de 10-15 minutos com foco máximo.

Sessão Turbo Matemática:
⚡ 15 minutos
📊 5 questões difíceis
🎯 Foco: Seus tópicos fracos

[Começar Agora]

Sessão Turbo Português:
⚡ 12 minutos
📖 3 textos para análise
🎯 Foco: Interpretação

[Começar Agora]

Sessão Turbo CN:
⚡ 15 minutos
🔬 5 questões integradas
🎯 Foco: Conceitos críticos

[Começar Agora]
```

### 10.5 Dashboard de Contingência

**Página Especial se Está Atrasado:**

```
🚨 STATUS DE CONTINGÊNCIA

Você está 18% atrasado no plano original.
MAS isso é recuperável!

Cenários Possíveis:

❌ PESSIMISTA: Se não estudar nada hoje
   Score previsto: 680 (↓ 50 pontos)

⚠️  REALISTA: Se cumprir novo plano
   Score previsto: 780 (mantém)

✅ OTIMISTA: Se intensificar + novo plano
   Score previsto: 820 (↑ 40 pontos)

AÇÕES RECOMENDADAS PARA HOJE:
1. Fazer Sessão Turbo (15 min)
2. Praticar 1 tópico crítico (1h)
3. Fazer 20 questões de prática (1h)
4. Total: 2h 15m (acima da meta!)

[Começar Sessão Turbo]
```

---

## 11. Notificações

### 11.1 Sistema de Notificações

**Canais:**
- Push (app mobile/web)
- Email
- SMS (plano premium)
- In-app

**Preferências do Usuário:**
- Pode ativar/desativar por tipo
- Pode escolher horários preferidos
- Pode definir "período de silêncio" (ex: 22h-08h)

### 11.2 Tipos de Notificações

**Notificações de Estudo:**
```
1. "Lembrete de Estudo"
   Hora: 14:00 (horário preferido)
   Frequência: Diária
   Mensagem: "Hora de estudar! Você tem 45 min?"

2. "Meta Não Atingida"
   Hora: 23:30
   Frequência: Se não atingir meta
   Mensagem: "Você estudou 30 min, meta era 2h"

3. "Simulado Agendado"
   Hora: 24h antes
   Frequência: Por simulado
   Mensagem: "Seu simulado começa amanhã às 14h!"

4. "Sessão de Revisão"
   Hora: Sob demanda
   Frequência: Spaced repetition
   Mensagem: "Está na hora de revisar Álgebra!"
```

**Notificações de Progresso:**
```
5. "Novo Score Pessoal"
   Hora: Imediata
   Frequência: Quando atinge
   Mensagem: "Parabéns! Novo recorde: 800 pontos! 🎉"

6. "Meta Alcançada"
   Hora: Fim do dia
   Frequência: Quando cumpre meta
   Mensagem: "Você estudou 2h hoje! Ótimo trabalho! ✓"

7. "Streak de Dias"
   Hora: Noite
   Frequência: Milestones (7, 14, 30 dias)
   Mensagem: "7 dias estudando! Parabéns! 🔥"

8. "Badge Desbloqueado"
   Hora: Imediata
   Frequência: Por badge
   Mensagem: "Você desbloqueou 'Matemático'!"
```

**Notificações de Conteúdo:**
```
9. "Resposta no Fórum"
   Hora: Imediata
   Frequência: Alguém responde sua pergunta
   Mensagem: "Maria respondeu sua dúvida sobre..."

10. "Feedback de Redação"
    Hora: Imediata
    Frequência: Quando análise está pronta
    Mensagem: "Sua redação foi analisada! Score: 720"

11. "Mentor Disponível"
    Hora: Sob demanda
    Frequência: Se cadastrado para notificações
    Mensagem: "Prof. Maria está disponível para mentoria!"
```

**Notificações de Urgência:**
```
12. "Você Está Atrasado"
    Hora: Manhã (08h)
    Frequência: Se 3+ dias sem estudar
    Mensagem: "3 dias sem estudar! É hora de voltar!"

13. "Modo Sprint Ativado"
    Hora: Início da semana
    Frequência: 2 semanas antes do ENEM
    Mensagem: "SPRINT FINAL! 14 dias para o ENEM!"

14. "Dias Críticos"
    Hora: Noite
    Frequência: Últimos 7 dias
    Mensagem: "Faltam 7 dias! Você está preparado?"
```

### 11.3 Personalização de Notificações

**Painel de Configuração:**

```
CONFIGURAÇÕES DE NOTIFICAÇÕES

Notificações Gerais:
[ON] Ativar notificações
[ON] Som de notificação
[ON] Vibração

Canais:
[ON] Push (app)
[ON] Email
[ON] SMS (premium)
[ON] In-app

Notificações de Estudo:
[ON] Lembrete de estudo
    Horário preferido: 14:00 ▼
[ON] Meta não atingida
[ON] Simulado agendado
[ON] Sessão de revisão

Notificações de Progresso:
[ON] Novo score pessoal
[ON] Meta alcançada
[ON] Streak de dias
[ON] Badge desbloqueado

Notificações de Conteúdo:
[ON] Resposta no fórum
[ON] Feedback de redação
[ON] Mentor disponível

Notificações de Urgência:
[ON] Você está atrasado
[ON] Modo sprint ativado
[ON] Dias críticos

Período de Silêncio:
[ON] 22:00 às 08:00
[Customizar]

[Salvar]
```

---

## 12. Gamificação

### 12.1 Sistema de Streaks

**Contador de Dias Consecutivos:**

```
🔥 SEU STREAK

|||||||||||||_____
Dias consecutivos: 12

Meta desta semana: 15 dias
Seu recorde: 23 dias (parabéns!)

[Continuar o streak]
```

**Lógica:**
- +1 dia se estudar mínimo 30 minutos
- Reseta se passar 1 dia sem estudar
- Notificação ao amanhecer do 7º dia, 14º, 30º
- Milestones: 7, 14, 30, 60, 90 dias

### 12.2 Badges e Conquistas

**Lista de Badges Possíveis:**

```
🎖️ BADGES DESBLOQUEÁVEIS

INICIANTE:
□ 🏃 "Largada" - Completar 1º simulado
□ 📚 "Leitor" - Responder 50 questões
□ ✍️ "Escritor" - Submeter 1ª redação

INTERMEDIÁRIO:
□ 🎯 "Mira Certeira" - 100% de acerto em tema
□ 🔥 "Consistente" - 7 dias de streak
□ 📈 "Ascensão" - Aumentar 50 pontos em simulado
□ 🧠 "Matemático" - 90%+ em matemática
□ 📖 "Linguista" - 90%+ em linguagens

AVANÇADO:
□ 🏆 "Campeão" - Alcançar 800+ em simulado
□ ⚡ "Sprinter" - Completar 3 simulados em 1 semana
□ 🎓 "Mestre" - 500+ questões respondidas
□ 🌟 "Consistência" - 30 dias de streak
□ 💪 "Superação" - Melhorar 100 pontos vs diagnóstico

EXTRAS:
□ 🤝 "Ajudador" - 5 respostas úteis no fórum
□ 🎬 "Criativo" - 10 redações submetidas
□ 🚀 "Velocidade" - 1000+ questões respondidas
```

**Exibição:**
```
SEUS BADGES

Desbloqueados:
✓ Largada (15/05)
✓ Leitor (22/05)
✓ Escritor (25/05)
✓ Consistente (30/05)

Próximos:
○ Mira Certeira (faltam 5% de acerto)
○ Ascensão (faltam 30 pontos)
○ Campeão (faltam 20 pontos)

[Ver certificado] [Compartilhar]
```

### 12.3 Sistema de Pontos

**Pontos Conquistados Por:**
- Responder questão: 10 pontos
- Acertar questão: +5 pontos bônus
- Completar simulado: 100 pontos
- Responder dúvida no fórum: 25 pontos
- Resposta marcada como "melhor": +50 pontos
- Atingir meta diária: 50 pontos
- 7 dias de streak: 100 pontos

**Levels:**
```
SEUS PONTOS

Nível: 8
Pontos Atuais: 2.450 / 3.000
Progresso: ████████░░ 82%

Próximo Nível: 9
Recompensa: Desconto em mentoria

Histórico:
+100 → Completou simulado
+50 → Atingiu meta diária
+25 → Respuesta útil no fórum
+10 → Respondeu questão
```

### 12.4 Ranking e Leaderboard

**Ranking Global (Anônimo):**

```
🏆 RANKING TOP 10

1. 🥇 Aluno X - 8.450 pontos
2. 🥈 Aluno Y - 8.230 pontos
3. 🥉 Aluno Z - 7.890 pontos
4. Você - 2.450 pontos

[Ver ranking completo]

Ranking Semanal:
1. Aluno A - 650 pontos (esta semana)
2. Aluno B - 620 pontos
3. Você - 450 pontos

Você está melhorando! Suba 1 posição!
```

**Ranking de Disciplina:**
```
RANKING - MATEMÁTICA

1. Aluno K - 850 pontos (TRI)
2. Aluno L - 820 pontos
3. Você - 650 pontos

Para entrar top 3, você precisa:
- Estudar 10h mais em Matemática
- Acertar 30+ questões
```

---

## 13. Recursos Práticos

### 13.1 Material para Download

**Tipos de Materiais:**

```
BAIXAR MATERIAIS

RESUMOS POR DISCIPLINA:
□ Português (5 PDFs)
  - Interpretação de Texto
  - Gramática Completa
  - Literatura Brasileira
  - Literatura Portuguesa
  - Redação ENEM

□ Matemática (7 PDFs)
  - Álgebra Essencial
  - Geometria Plana
  - Geometria Espacial
  - Trigonometria
  - Estatística e Probabilidade
  - Funções
  - Sequências e Progressões

□ Ciências Natureza (6 PDFs)
  - Física Fundamental
  - Óptica e Ondas
  - Química Geral
  - Reações Químicas
  - Biologia Molecular
  - Ecologia

□ Ciências Humanas (5 PDFs)
  - História do Brasil
  - História Geral
  - Geografia Brasileira
  - Geografia Geral
  - Sociologia e Filosofia

TABELAS E FORMULAS:
□ Fórmulas Matemática (1 PDF)
□ Tabela Periódica (1 PDF)
□ Datas Históricas (1 PDF)

[Baixar Todos] [Baixar por Categoria]
```

### 13.2 Lista de Tópicos para Estudar

**Checklist de Conteúdo:**

```
CHECKLIST - MATEMÁTICA

Álgebra:
□ Números Reais
□ Produtos Notáveis
□ Fatoração
□ Equações do 1º Grau
□ Sistemas de Equações
□ Equações do 2º Grau
□ Inequações
□ Funções

Geometria:
□ Ponto, Reta, Plano
□ Ângulos
□ Triângulos
□ Quadriláteros
□ Circunferência
□ Áreas e Perímetros
□ Geometria Espacial

[Marcar todos como completos]
[Status: 12/25 (48%)]
```

### 13.3 Dicas de Memorização

**Banco de Mnemônicos:**

```
DICAS DE MEMORIZAÇÃO

Português - "Regra do Acento"
"PARA-PA" = Palavras paroxítonas recebem acento
Exemplo: "Óptico, Lógica, Público"

Matemática - "Produto Notável"
(a+b)² = a² + 2ab + b²
Dica: "Quadrado do primeiro, mais duas vezes o
primeiro vezes o segundo, mais quadrado do segundo"

História - "Revoluções Industriais"
1ª: "Mecanização" (água e vapor)
2ª: "Eletricidade" (força motriz)
3ª: "Computação" (informação)

Biologia - "Mitocôndria"
"Mitocôndria = Motor da célula"
Porque produz energia (ATP)

[Ver mais dicas] [Contribuir com dica]
```

---

## 14. Integração com Calendário

### 14.1 Sincronização Google Calendar

**Funcionalidade:**

```
INTEGRAÇÃO CALENDÁRIO

Conectar Google Calendar
[Autorizar Google Calendar]

Ao conectar, o sistema:
✓ Sincroniza simulados agendados
✓ Sincroniza sessões de estudo
✓ Sincroniza prazos de tópicos
✓ Adiciona feriados automaticamente
✓ Sugere horários livres para estudo

Sua disponibilidade será usada para:
- Recomendar melhor hora para estudar
- Agendar sessões de mentoria
- Ajustar plano conforme sua agenda

[Status: Conectado ✓]
[Desconectar]
```

### 14.2 Visualização Integrada

**Ver Agenda ENEM no Google Calendar:**

```
Maio 2026:

Seg 1/5: Plano de Estudo - Linguagens (2h)
Ter 2/5: Praticar Português (1.5h)
Qua 3/5: Revisão de Tópicos (1h)
...

Google Calendar Sincronizado ✓
```

---

## 15. App Mobile

### 15.1 Versão iOS/Android

**Funcionalidades Principais:**
- Tudo da versão web
- Offline access (questões baixadas)
- Notificações push melhoradas
- Acesso via biometria (fingerprint, face ID)
- Modo escuro nativo
- Sincronização automática

**Recursos Adicionais Mobile:**
- Câmera para fotografar enunciados
- OCR para converter imagem em texto
- Voice to text (ditado)
- Widget de contador regressivo (iOS/Android)

### 15.2 Widget do Contador

**iOS/Android Widget:**

```
┌─────────────────────┐
│  ⏰ ENEM 2026      │
│                     │
│    127 DIAS        │
│                     │
│ 🔥 12 dias streak  │
│                     │
│ Meta hoje: 0/2h    │
│                     │
│ [Abrir App]       │
└─────────────────────┘
```

---

## 16. Planos e Monetização

### 16.1 Plano Freemium

**O Que Inclui:**
- Acesso a 100 questões básicas
- 1 simulado por mês
- Dashboard básico
- Comunidade (ler e responder)
- Relatórios simples
- App mobile

**Limitações:**
- Sem recomendações IA
- Sem análise detalhada
- Sem mentoria
- Sem redação assistida
- Sem histórico completo

### 16.2 Plano 6 Meses

**Preço:** R$ 149,90
**Duração:** Até 6 meses antes do ENEM ou fim do período
**O Que Inclui:**
- ✓ Todas as questões do banco (ilimitado)
- ✓ Simulados ilimitados
- ✓ Plano de estudo personalizado
- ✓ Análise IA de desempenho
- ✓ Redação assistida (IA)
- ✓ Comunidade (ler + responder)
- ✓ Relatórios detalhados
- ✓ Integração calendário
- ✓ App mobile premium
- ✓ 5 sessões de mentoria ao vivo
- ✓ Suporte por email

**Não Inclui:**
- ✗ Correção humana de redações

### 16.3 Plano 3 Meses

**Preço:** R$ 99,90
**Duração:** 3 meses
**O Que Inclui:**
- Tudo do plano 6 meses, EXCETO:
  - Apenas 2 sessões de mentoria (em vez de 5)
  - Histórico limitado a 3 meses

### 16.4 Plano 1 Mês

**Preço:** R$ 59,90
**Duração:** 1 mês
**O Que Inclui:**
- Tudo do plano 3 meses, EXCETO:
  - Apenas 1 sessão de mentoria
  - Plano de estudo genérico (não tão personalizado)

### 16.5 Add-ons Premium

**Mentoria Adicional:**
- R$ 120-200 por hora (dep. professor)
- Agendamento flexível
- Sessão gravada

**Correção Humana de Redação:**
- R$ 35 por redação
- Feedback em até 48h
- Professor especializado

**Pacotes de Mentoria:**
- 5 sessões: R$ 500 (R$ 100/sessão)
- 10 sessões: R$ 900 (R$ 90/sessão)
- 20 sessões: R$ 1.600 (R$ 80/sessão)

### 16.6 Período Trial

**7 Dias Grátis:**
- Novo usuário recebe 7 dias de plano premium
- Após, volta para freemium ou escolhe plano pago
- Cartão de crédito necessário para trial

---

## 17. Análise Comparativa

### 17.1 Desempenho vs Edições Passadas

**Comparação com ENEM Históricos:**

```
COMPARAÇÃO COM EDIÇÕES PASSADAS

Seu Desempenho (Simulado #5):
Linguagens: 750
Matemática: 650
CN: 700
CH: 800
Redação: 720
TOTAL: 3.620

ENEM 2024 (Oficial):
Linguagens (média): 720
Matemática (média): 680
CN (média): 710
CH (média): 770
Redação (média): 700
TOTAL (média): 3.580

Sua Comparação:
- Linguagens: +30 acima da média ✓
- Matemática: -30 abaixo da média ✗
- CN: -10 abaixo da média ✗
- CH: +30 acima da média ✓
- Redação: +20 acima da média ✓

Previsão: Você está ACIMA da média geral!
```

### 17.2 Frequência de Tópicos

**Análise de Padrões:**

```
TÓPICOS MAIS FREQUENTES (últimos 10 ENEM)

Matemática:
1. Funções (11 questões) - Frequência: 100%
2. Geometria Espacial (10 questões) - 100%
3. Estatística (8 questões) - 90%
4. Progressões (7 questões) - 80%

Física:
1. Mecânica (15 questões) - 100%
2. Termodinâmica (6 questões) - 80%
3. Óptica (4 questões) - 50%

Você está preparado em:
✓ Funções (90%)
✓ Termodinâmica (95%)

Focar em:
✗ Progressões (70%)
✗ Óptica (45%)
```

---

## 18. Recursos de Saúde Mental

### 18.1 Suporte Emocional

**Seção de Bem-Estar:**

```
BEM-ESTAR E SAÚDE MENTAL

Artigos Úteis:
📄 "Como Gerenciar Ansiedade no ENEM"
📄 "Sono e Produtividade nos Estudos"
📄 "Gestão de Tempo sem Estresse"
📄 "Nutrição para Pré-prova"

Exercícios de Respiração:
🧘 "Respiração 4-7-8 para Calma"
🧘 "Meditação Mindfulness (5 min)"
🧘 "Alongamento Pré-estudo"

Comunidade de Apoio:
💬 Fórum "Motivação e Apoio"
👥 Grupos de suporte anônimos
📞 Número de helpline (se necessário)

Dicas Diárias:
"Hoje não é sobre ser perfeito,
é sobre ser consistente."
```

### 18.2 Tracking de Saúde

**Monitor de Bem-Estar:**

```
COMO VOCÊ ESTÁ HOJE?

Humor: [😊 😐 😢] 😊

Sono noite passada: [______] 7h

Estresse atual: [░░░░░░░] Médio

Descrição (opcional):
[Estou cansado mas confiante]

[Salvar]

Sua tendência emocional (últimas 2 semanas):
Dia 1:  😊
Dia 2:  😊
Dia 3:  😐
Dia 4:  😊
Dia 5:  😐
...
Tendência: Estável ✓
```

### 18.3 Pausas Recomendadas

**Sistema de Pausas Saudáveis:**

```
DEPOIS DE 50 MINUTOS ESTUDANDO:

⏸️ PAUSA!

Você estudou 50 minutos. Tira um descanso!

Recomendações:
- Levante e alongue (5 min)
- Beba água
- Respire fundo 5x
- Evite celular/redes sociais

[Continuar em 5 minutos] [Continuar em 10 min] [Parar]
```

---

## 19. Admin e Analytics

### 19.1 Dashboard Admin

**Métricas Gerais:**

```
ADMIN DASHBOARD

Estatísticas Gerais:
- Total de Usuários: 25.430
- Usuários Ativos (últimos 7 dias): 18.230
- Novos Usuários (semana): 2.340
- Taxa de Retenção (30 dias): 78%

Receita:
- MRR (Monthly Recurring Revenue): R$ 125.400
- Novos Pagamentos (semana): R$ 28.500
- Churn Rate: 3.2%

Engajamento:
- Simulados realizados (semana): 4.230
- Questões respondidas (semana): 58.920
- Tempo médio de estudo/dia: 1h 45m

Saúde da Plataforma:
- Uptime: 99.8%
- Tempo resposta médio: 320ms
- Taxa de erro: 0.2%
```

### 19.2 Relatórios Detalhados

**Exportação de Dados:**

```
GERAR RELATÓRIOS

Período: [2026-05-01 a 2026-05-15] ▼

Relatório de:
☐ Usuários
☐ Receita
☐ Engajamento
☐ Conteúdo
☐ Performance

Formato:
[PDF] [CSV] [Excel]

[Gerar Relatório] [Agendar] [Enviar por Email]
```

### 19.3 Moderação de Comunidade

**Gerenciar Fórum:**

```
MODERAÇÃO

Tópicos Pendentes: 3
├─ [Tópico Inapropriado] → [Aprovar] [Rejeitar]
├─ [Spam] → [Aprovar] [Rejeitar]
└─ [Dúvida sobre Drogas] → [Aprovar] [Rejeitar]

Usuários Banidos: 2
├─ João Silva (3 violações)
└─ Maria Santos (Spam)

Reclamações: 5
├─ [Ver detalhes] [Tomar ação]
```

---

## Conclusão

Este documento detalha todas as funcionalidades do SaaS ENEM. Recomenda-se implementação em fases:

**Fase 1 (MVP):**
- Autenticação
- Dashboard básico
- Plano de estudo
- Simulados
- Banco de questões

**Fase 2:**
- Análise de desempenho
- Redação assistida
- Comunidade

**Fase 3:**
- Gamificação
- Mentoria
- Mobile app

**Fase 4:**
- Analytics avançada
- Integrações
- Features premium

---

**Data de Criação:** 15 de Maio de 2026
**Versão:** 1.0
**Próxima Revisão:** Após MVP
