# SaaS ENEM - Modelo de Banco de Dados

## Índice
1. [Diagrama ER](#diagrama-er)
2. [Criação de Tabelas](#criação-de-tabelas)
3. [Relationships](#relationships)
4. [Índices](#índices)
5. [Queries Úteis](#queries-úteis)

---

## Diagrama ER

```
┌─────────────────────┐
│      users          │
├─────────────────────┤
│ id (PK)             │
│ name                │
│ email (UNIQUE)      │
│ password_hash       │
│ date_of_birth       │
│ email_verified      │
│ account_status      │
│ created_at          │
│ updated_at          │
└──────────┬──────────┘
           │
        1:N (user_id)
           │
      ┌────┴────┐
      │          │
      ↓          ↓
┌──────────────┐  ┌──────────────────┐
│subscriptions │  │learning_profiles │
├──────────────┤  ├──────────────────┤
│id (PK)       │  │id (PK)           │
│user_id (FK)  │  │user_id (FK)      │
│plan_type     │  │learning_style    │
│status        │  │preferred_time    │
│start_date    │  │daily_hours_goal  │
│end_date      │  │created_at        │
│amount_paid   │  └──────────────────┘
│payment_id    │
│created_at    │
└──────────────┘
      
┌──────────────────────┐
│   diagnostics        │
├──────────────────────┤
│ id (PK)              │
│ user_id (FK)         │
│ linguagens_score     │
│ matematica_score     │
│ cn_score             │
│ ch_score             │
│ redacao_score        │
│ estimated_hours      │
│ completed_at         │
└──────┬───────────────┘
       │ 1:N
       │
       ↓
┌──────────────────────┐
│ study_plans          │
├──────────────────────┤
│ id (PK)              │
│ user_id (FK)         │
│ diagnostic_id (FK)   │
│ total_hours          │
│ daily_hours_goal     │
│ status               │
│ created_at           │
│ updated_at           │
└──────┬───────────────┘
       │ 1:N
       │
       ↓
┌──────────────────────┐
│ weekly_sprints       │
├──────────────────────┤
│ id (PK)              │
│ study_plan_id (FK)   │
│ week_number          │
│ start_date           │
│ end_date             │
│ theme                │
│ hours_allocated      │
│ status               │
└──────┬───────────────┘
       │ 1:N
       │
       ↓
┌──────────────────────┐
│ topics               │
├──────────────────────┤
│ id (PK)              │
│ weekly_sprint_id(FK) │
│ name                 │
│ subject              │
│ hours_allocated      │
│ type (theory/practic)│
│ priority             │
│ completed           │
└──────────────────────┘

┌──────────────────────┐
│   exams              │
├──────────────────────┤
│ id (PK)              │
│ exam_type            │
│ subject              │
│ total_questions      │
│ duration_minutes     │
│ passing_score        │
│ created_at           │
└──────┬───────────────┘
       │ 1:N
       │
       ↓
┌──────────────────────┐
│ scheduled_exams      │
├──────────────────────┤
│ id (PK)              │
│ user_id (FK)         │
│ exam_id (FK)         │
│ scheduled_at         │
│ status               │
│ start_time           │
│ end_time             │
│ created_at           │
└──────┬───────────────┘
       │ 1:1
       │
       ↓
┌──────────────────────┐
│ exam_results         │
├──────────────────────┤
│ id (PK)              │
│ user_id (FK)         │
│ scheduled_exam_id(FK)│
│ total_questions      │
│ correct_answers      │
│ wrong_answers        │
│ unanswered           │
│ raw_score            │
│ score_estimate(TRI)  │
│ completed_at         │
└──────┬───────────────┘
       │ 1:N
       │
       ↓
┌──────────────────────┐
│ exam_answers         │
├──────────────────────┤
│ id (PK)              │
│ exam_result_id (FK)  │
│ question_id (FK)     │
│ user_answer          │
│ correct_answer       │
│ is_correct           │
│ marked_as_doubt      │
│ time_spent           │
└──────────────────────┘

┌──────────────────────┐
│   questions          │
├──────────────────────┤
│ id (PK)              │
│ source (enem_xxx)    │
│ subject              │
│ topic                │
│ subtopic             │
│ difficulty           │
│ year                 │
│ statement            │
│ image_url            │
│ correct_answer       │
│ explanation          │
│ video_explanation    │
│ time_estimate        │
│ tri_weight           │
│ total_attempts       │
│ correct_percentage   │
│ created_at           │
└──────┬───────────────┘
       │ 1:N
       │
       ↓
┌──────────────────────┐
│ question_options     │
├──────────────────────┤
│ id (PK)              │
│ question_id (FK)     │
│ letter               │
│ text                 │
│ position             │
└──────────────────────┘

┌──────────────────────┐
│     essays           │
├──────────────────────┤
│ id (PK)              │
│ user_id (FK)         │
│ theme_id (FK)        │
│ text                 │
│ word_count           │
│ line_count           │
│ status               │
│ submitted_at         │
│ created_at           │
└──────┬───────────────┘
       │ 1:1
       │
       ↓
┌──────────────────────┐
│ essay_analyses       │
├──────────────────────┤
│ id (PK)              │
│ essay_id (FK)        │
│ ai_score             │
│ competency1_score    │
│ competency2_score    │
│ competency3_score    │
│ competency4_score    │
│ competency5_score    │
│ feedback             │
│ analysed_at          │
└──────────────────────┘

┌──────────────────────┐
│    community_posts   │
├──────────────────────┤
│ id (PK)              │
│ user_id (FK)         │
│ category             │
│ title                │
│ content              │
│ created_at           │
│ updated_at           │
│ status               │
└──────┬───────────────┘
       │ 1:N
       │
       ↓
┌──────────────────────┐
│ community_replies    │
├──────────────────────┤
│ id (PK)              │
│ post_id (FK)         │
│ user_id (FK)         │
│ content              │
│ is_solution          │
│ helpful_count        │
│ created_at           │
│ updated_at           │
└──────────────────────┘

┌──────────────────────┐
│   mentoring_sessions │
├──────────────────────┤
│ id (PK)              │
│ student_id (FK)      │
│ teacher_id (FK)      │
│ scheduled_at         │
│ topic                │
│ status               │
│ start_time           │
│ end_time             │
│ video_url            │
│ feedback             │
│ rating               │
│ price                │
│ created_at           │
└──────────────────────┘

┌──────────────────────┐
│    badges            │
├──────────────────────┤
│ id (PK)              │
│ name                 │
│ description          │
│ icon_url             │
│ condition            │
│ tier (bronze/silver) │
│ created_at           │
└──────┬───────────────┘
       │ M:N
       │
       ↓
┌──────────────────────┐
│ user_badges          │
├──────────────────────┤
│ user_id (FK, PK)     │
│ badge_id (FK, PK)    │
│ unlocked_at          │
└──────────────────────┘

┌──────────────────────┐
│   notifications      │
├──────────────────────┤
│ id (PK)              │
│ user_id (FK)         │
│ type                 │
│ title                │
│ message              │
│ related_entity_id    │
│ is_read              │
│ created_at           │
│ read_at              │
└──────────────────────┘
```

---

## Criação de Tabelas

### 1. Tabela: users

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    date_of_birth DATE NOT NULL,
    email_verified BOOLEAN DEFAULT FALSE,
    account_status VARCHAR(50) DEFAULT 'active', -- active, suspended, deleted
    phone VARCHAR(20),
    profile_picture_url TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(account_status);
```

### 2. Tabela: subscriptions

```sql
CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    plan_type VARCHAR(50) NOT NULL, -- free, premium_6m, premium_3m, premium_1m
    status VARCHAR(50) DEFAULT 'active', -- active, expired, cancelled
    start_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    end_date TIMESTAMP NOT NULL,
    payment_method VARCHAR(50), -- credit_card, pix, boleto
    amount_paid DECIMAL(10, 2),
    payment_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    auto_renewal BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX idx_subscriptions_status ON subscriptions(status);
CREATE INDEX idx_subscriptions_end_date ON subscriptions(end_date);
```

### 3. Tabela: learning_profiles

```sql
CREATE TABLE learning_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    learning_style VARCHAR(50), -- visual, auditory, kinesthetic
    preferred_time VARCHAR(20), -- morning, afternoon, evening
    daily_hours_goal DECIMAL(3, 1) DEFAULT 2.0,
    available_days JSON, -- ["seg", "ter", "qua", "qui", "sex"]
    timezone VARCHAR(50) DEFAULT 'America/Sao_Paulo',
    language VARCHAR(10) DEFAULT 'pt-BR',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_learning_profiles_user ON learning_profiles(user_id);
```

### 4. Tabela: diagnostics

```sql
CREATE TABLE diagnostics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    linguagens_score INT,
    matematica_score INT,
    cn_score INT,
    ch_score INT,
    redacao_score INT,
    estimated_hours INT,
    weak_areas JSON, -- [{subject: "matematica", percentage: 45, recommendation: "..."}]
    learning_profile VARCHAR(50),
    completed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_diagnostics_user ON diagnostics(user_id);
CREATE INDEX idx_diagnostics_completed ON diagnostics(completed_at);
```

### 5. Tabela: study_plans

```sql
CREATE TABLE study_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    diagnostic_id UUID,
    total_hours_available INT NOT NULL,
    daily_hours_goal DECIMAL(3, 1) NOT NULL DEFAULT 2.0,
    weeks_remaining INT,
    status VARCHAR(50) DEFAULT 'active', -- active, paused, completed
    is_contingency BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (diagnostic_id) REFERENCES diagnostics(id) ON DELETE SET NULL
);

CREATE INDEX idx_study_plans_user ON study_plans(user_id);
CREATE INDEX idx_study_plans_status ON study_plans(status);
```

### 6. Tabela: weekly_sprints

```sql
CREATE TABLE weekly_sprints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    study_plan_id UUID NOT NULL,
    week_number INT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    theme VARCHAR(255),
    total_hours_allocated DECIMAL(5, 1),
    hours_completed DECIMAL(5, 1) DEFAULT 0,
    status VARCHAR(50) DEFAULT 'not_started', -- not_started, in_progress, completed
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (study_plan_id) REFERENCES study_plans(id) ON DELETE CASCADE
);

CREATE INDEX idx_weekly_sprints_plan ON weekly_sprints(study_plan_id);
CREATE INDEX idx_weekly_sprints_dates ON weekly_sprints(start_date, end_date);
```

### 7. Tabela: topics

```sql
CREATE TABLE topics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    weekly_sprint_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    subject VARCHAR(100), -- linguagens, matematica, cn, ch
    hours_allocated DECIMAL(3, 1),
    type VARCHAR(50), -- theory, practice, review
    priority VARCHAR(50), -- low, medium, high, critical
    scheduled_days JSON, -- ["seg", "ter", "qua"]
    is_completed BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (weekly_sprint_id) REFERENCES weekly_sprints(id) ON DELETE CASCADE
);

CREATE INDEX idx_topics_sprint ON topics(weekly_sprint_id);
CREATE INDEX idx_topics_subject ON topics(subject);
```

### 8. Tabela: questions

```sql
CREATE TABLE questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source VARCHAR(50), -- enem_2024, enem_2023, custom
    subject VARCHAR(100), -- linguagens, matematica, cn, ch
    topic VARCHAR(255),
    subtopic VARCHAR(255),
    difficulty VARCHAR(50), -- easy, medium, hard
    year INT,
    statement TEXT NOT NULL,
    image_url TEXT,
    correct_answer VARCHAR(10), -- A, B, C, D, E
    explanation TEXT,
    explanation_video_url TEXT,
    time_estimate_seconds INT DEFAULT 180,
    tri_weight DECIMAL(3, 2) DEFAULT 1.0,
    total_attempts INT DEFAULT 0,
    correct_percentage INT DEFAULT 0,
    times_answered_correctly INT DEFAULT 0,
    related_topics JSON, -- ["algebra", "funcoes"]
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE INDEX idx_questions_subject ON questions(subject);
CREATE INDEX idx_questions_topic ON questions(topic);
CREATE INDEX idx_questions_difficulty ON questions(difficulty);
CREATE INDEX idx_questions_year ON questions(year);
CREATE FULLTEXT INDEX idx_questions_statement ON questions(statement);
```

### 9. Tabela: question_options

```sql
CREATE TABLE question_options (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    question_id UUID NOT NULL,
    letter VARCHAR(1) NOT NULL, -- A, B, C, D, E
    text TEXT NOT NULL,
    position INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
    UNIQUE(question_id, letter)
);

CREATE INDEX idx_question_options_question ON question_options(question_id);
```

### 10. Tabela: exams

```sql
CREATE TABLE exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_type VARCHAR(50), -- complete, by_subject, by_topic, quiz
    subject VARCHAR(100), -- linguagens, matematica, cn, ch, null se completo
    topic VARCHAR(255),
    total_questions INT NOT NULL,
    duration_minutes INT NOT NULL,
    passing_score INT,
    is_template BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE INDEX idx_exams_type ON exams(exam_type);
```

### 11. Tabela: scheduled_exams

```sql
CREATE TABLE scheduled_exams (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    exam_id UUID NOT NULL,
    scheduled_at TIMESTAMP NOT NULL,
    status VARCHAR(50) DEFAULT 'scheduled', -- scheduled, started, completed, skipped
    start_time TIMESTAMP NULL,
    end_time TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
);

CREATE INDEX idx_scheduled_exams_user ON scheduled_exams(user_id);
CREATE INDEX idx_scheduled_exams_scheduled ON scheduled_exams(scheduled_at);
CREATE INDEX idx_scheduled_exams_status ON scheduled_exams(status);
```

### 12. Tabela: exam_results

```sql
CREATE TABLE exam_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    scheduled_exam_id UUID NOT NULL,
    exam_id UUID NOT NULL,
    total_questions INT,
    correct_answers INT,
    wrong_answers INT,
    unanswered INT,
    raw_score INT,
    score_estimate INT, -- TRI estimado
    performance_by_subject JSON, -- {historia: {correct: 10, total: 10}, ...}
    completed_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (scheduled_exam_id) REFERENCES scheduled_exams(id) ON DELETE CASCADE,
    FOREIGN KEY (exam_id) REFERENCES exams(id) ON DELETE CASCADE
);

CREATE INDEX idx_exam_results_user ON exam_results(user_id);
CREATE INDEX idx_exam_results_scheduled ON exam_results(scheduled_exam_id);
CREATE INDEX idx_exam_results_completed ON exam_results(completed_at);
```

### 13. Tabela: exam_answers

```sql
CREATE TABLE exam_answers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    exam_result_id UUID NOT NULL,
    question_id UUID NOT NULL,
    user_answer VARCHAR(10),
    correct_answer VARCHAR(10),
    is_correct BOOLEAN,
    marked_as_doubt BOOLEAN DEFAULT FALSE,
    time_spent_seconds INT,
    topic VARCHAR(255),
    difficulty VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (exam_result_id) REFERENCES exam_results(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE
);

CREATE INDEX idx_exam_answers_result ON exam_answers(exam_result_id);
CREATE INDEX idx_exam_answers_question ON exam_answers(question_id);
CREATE INDEX idx_exam_answers_correct ON exam_answers(is_correct);
```

### 14. Tabela: essays

```sql
CREATE TABLE essays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    theme_id UUID,
    theme_title VARCHAR(255),
    text LONGTEXT NOT NULL,
    word_count INT,
    line_count INT,
    status VARCHAR(50) DEFAULT 'draft', -- draft, submitted, under_review, reviewed
    is_from_simulado BOOLEAN DEFAULT FALSE,
    simulado_id UUID,
    submitted_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_essays_user ON essays(user_id);
CREATE INDEX idx_essays_status ON essays(status);
CREATE INDEX idx_essays_submitted ON essays(submitted_at);
```

### 15. Tabela: essay_analyses

```sql
CREATE TABLE essay_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    essay_id UUID NOT NULL UNIQUE,
    ai_score INT, -- 0-1000
    competency1_score INT, -- Domínio da escrita
    competency2_score INT, -- Compreensão da proposta
    competency3_score INT, -- Seleção de informações
    competency4_score INT, -- Organização de ideias
    competency5_score INT, -- Proposta de solução
    structural_feedback TEXT,
    argument_feedback TEXT,
    language_feedback TEXT,
    grammar_errors JSON,
    suggestions JSON,
    analysed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (essay_id) REFERENCES essays(id) ON DELETE CASCADE
);

CREATE INDEX idx_essay_analyses_essay ON essay_analyses(essay_id);
```

### 16. Tabela: question_stats

```sql
CREATE TABLE question_stats (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    question_id UUID NOT NULL,
    attempts INT DEFAULT 0,
    correct INT DEFAULT 0,
    wrong INT DEFAULT 0,
    skipped INT DEFAULT 0,
    average_time_seconds INT,
    marked_as_doubt BOOLEAN DEFAULT FALSE,
    last_attempted TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
    UNIQUE(user_id, question_id)
);

CREATE INDEX idx_question_stats_user ON question_stats(user_id);
CREATE INDEX idx_question_stats_question ON question_stats(question_id);
```

### 17. Tabela: community_posts

```sql
CREATE TABLE community_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    category VARCHAR(100), -- duvidas_conteudo, duvidas_plataforma, motivacao, dicas
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    image_url TEXT,
    view_count INT DEFAULT 0,
    reply_count INT DEFAULT 0,
    helpful_count INT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'published', -- published, pending, rejected, deleted
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_community_posts_user ON community_posts(user_id);
CREATE INDEX idx_community_posts_category ON community_posts(category);
CREATE INDEX idx_community_posts_status ON community_posts(status);
CREATE INDEX idx_community_posts_created ON community_posts(created_at);
CREATE FULLTEXT INDEX idx_community_posts_title ON community_posts(title, content);
```

### 18. Tabela: community_replies

```sql
CREATE TABLE community_replies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL,
    user_id UUID NOT NULL,
    parent_reply_id UUID, -- Para replies aninhadas
    content TEXT NOT NULL,
    is_solution BOOLEAN DEFAULT FALSE,
    is_teacher_reply BOOLEAN DEFAULT FALSE,
    helpful_count INT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'published',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    
    FOREIGN KEY (post_id) REFERENCES community_posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_reply_id) REFERENCES community_replies(id) ON DELETE CASCADE
);

CREATE INDEX idx_community_replies_post ON community_replies(post_id);
CREATE INDEX idx_community_replies_user ON community_replies(user_id);
CREATE INDEX idx_community_replies_solution ON community_replies(is_solution);
```

### 19. Tabela: mentoring_sessions

```sql
CREATE TABLE mentoring_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL,
    teacher_id UUID NOT NULL,
    scheduled_at TIMESTAMP NOT NULL,
    topic VARCHAR(255),
    status VARCHAR(50) DEFAULT 'scheduled', -- scheduled, started, completed, cancelled
    start_time TIMESTAMP NULL,
    end_time TIMESTAMP NULL,
    duration_minutes INT,
    video_url TEXT,
    recording_url TEXT,
    feedback TEXT,
    student_rating INT, -- 1-5
    student_feedback TEXT,
    price DECIMAL(8, 2),
    payment_status VARCHAR(50), -- pending, paid, refunded
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (student_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_mentoring_sessions_student ON mentoring_sessions(student_id);
CREATE INDEX idx_mentoring_sessions_teacher ON mentoring_sessions(teacher_id);
CREATE INDEX idx_mentoring_sessions_scheduled ON mentoring_sessions(scheduled_at);
```

### 20. Tabela: badges

```sql
CREATE TABLE badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    icon_url TEXT,
    condition_type VARCHAR(100), -- first_simulado, streak_7, score_800, etc
    condition_value VARCHAR(255),
    tier VARCHAR(50), -- bronze, silver, gold, platinum
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_badges_tier ON badges(tier);
```

### 21. Tabela: user_badges

```sql
CREATE TABLE user_badges (
    user_id UUID NOT NULL,
    badge_id UUID NOT NULL,
    unlocked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (user_id, badge_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (badge_id) REFERENCES badges(id) ON DELETE CASCADE
);

CREATE INDEX idx_user_badges_user ON user_badges(user_id);
```

### 22. Tabela: notifications

```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    type VARCHAR(100), -- study_reminder, new_score, badge_unlocked, forum_reply, etc
    title VARCHAR(255),
    message TEXT,
    related_entity_type VARCHAR(100), -- exam, essay, post, badge, etc
    related_entity_id UUID,
    is_read BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP NULL,
    delivery_status JSON, -- {push: true, email: true, sms: false}
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(is_read);
CREATE INDEX idx_notifications_created ON notifications(created_at);
```

### 23. Tabela: study_sessions

```sql
CREATE TABLE study_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    topic_id UUID,
    session_type VARCHAR(50), -- theory, practice, review, quiz
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    duration_minutes INT,
    questions_attempted INT,
    questions_correct INT,
    session_score INT,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (topic_id) REFERENCES topics(id) ON DELETE SET NULL
);

CREATE INDEX idx_study_sessions_user ON study_sessions(user_id);
CREATE INDEX idx_study_sessions_start ON study_sessions(start_time);
```

### 24. Tabela: user_streaks

```sql
CREATE TABLE user_streaks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    current_streak INT DEFAULT 0,
    longest_streak INT DEFAULT 0,
    last_studied_date DATE,
    streak_broken_count INT DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_user_streaks_user ON user_streaks(user_id);
```

### 25. Tabela: user_points

```sql
CREATE TABLE user_points (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    total_points INT DEFAULT 0,
    current_level INT DEFAULT 1,
    experience_points INT DEFAULT 0,
    lifetime_points INT DEFAULT 0,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_user_points_user ON user_points(user_id);
CREATE INDEX idx_user_points_level ON user_points(current_level);
```

### 26. Tabela: point_history

```sql
CREATE TABLE point_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    action_type VARCHAR(100), -- question_answer, simulado_complete, forum_reply, etc
    points_earned INT,
    related_entity_id UUID,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_point_history_user ON point_history(user_id);
CREATE INDEX idx_point_history_created ON point_history(created_at);
```

### 27. Tabela: essay_themes

```sql
CREATE TABLE essay_themes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    year INT,
    source VARCHAR(50), -- enem_official, suggested, custom
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_essay_themes_active ON essay_themes(is_active);
CREATE INDEX idx_essay_themes_year ON essay_themes(year);
```

---

## Relationships

### 1-to-Many

- **users** → **subscriptions** (1 usuário pode ter múltiplas assinaturas)
- **users** → **diagnostics** (1 usuário pode fazer múltiplos diagnósticos)
- **users** → **study_plans** (1 usuário pode ter múltiplos planos)
- **users** → **scheduled_exams** (1 usuário pode agendar múltiplos simulados)
- **users** → **exam_results** (1 usuário pode ter múltiplos resultados)
- **users** → **essays** (1 usuário pode escrever múltiplas redações)
- **users** → **community_posts** (1 usuário pode fazer múltiplas postagens)
- **users** → **community_replies** (1 usuário pode responder múltiplas vezes)
- **users** → **study_sessions** (1 usuário pode ter múltiplas sessões)
- **users** → **notifications** (1 usuário pode receber múltiplas notificações)
- **study_plans** → **weekly_sprints** (1 plano tem múltiplas semanas)
- **weekly_sprints** → **topics** (1 sprint tem múltiplos tópicos)
- **questions** → **question_options** (1 questão tem múltiplas opções)
- **exams** → **scheduled_exams** (1 exame pode ser agendado múltiplas vezes)
- **scheduled_exams** → **exam_results** (1 agendamento gera 1 resultado)
- **exam_results** → **exam_answers** (1 resultado tem múltiplas respostas)
- **essays** → **essay_analyses** (1 redação é analisada 1 vez)
- **community_posts** → **community_replies** (1 post tem múltiplas respostas)
- **badges** → **user_badges** (1 badge pode ser desbloqueado por múltiplos usuários)

### Many-to-Many

- **users** ↔ **badges** (via user_badges)

---

## Índices

```sql
-- Índices principais já criados nas tabelas acima

-- Índices adicionais úteis para performance:

-- Para busca de simulados por data
CREATE INDEX idx_scheduled_exams_user_scheduled 
ON scheduled_exams(user_id, scheduled_at);

-- Para busca de resultados por período
CREATE INDEX idx_exam_results_user_completed 
ON exam_results(user_id, completed_at);

-- Para análise de progresso semanal
CREATE INDEX idx_weekly_sprints_user_dates 
ON weekly_sprints(study_plan_id, start_date, end_date);

-- Para busca de sessões de estudo por período
CREATE INDEX idx_study_sessions_user_date 
ON study_sessions(user_id, start_time);

-- Para relatórios de comunidade
CREATE INDEX idx_community_posts_user_created 
ON community_posts(user_id, created_at);

-- Para busca rápida de questões
CREATE INDEX idx_questions_source_year 
ON questions(source, year);

-- Para análise de erros frequentes
CREATE INDEX idx_exam_answers_question_correct 
ON exam_answers(question_id, is_correct);
```

---

## Queries Úteis

### 1. Obter Plano de Estudo do Usuário

```sql
SELECT 
    sp.id,
    sp.daily_hours_goal,
    sp.total_hours_available,
    COUNT(DISTINCT ws.id) as weeks,
    SUM(t.hours_allocated) as total_allocated_hours
FROM study_plans sp
LEFT JOIN weekly_sprints ws ON sp.id = ws.study_plan_id
LEFT JOIN topics t ON ws.id = t.weekly_sprint_id
WHERE sp.user_id = ? AND sp.status = 'active'
GROUP BY sp.id;
```

### 2. Calcular Score Médio do Usuário

```sql
SELECT 
    AVG(er.score_estimate) as avg_score,
    MIN(er.score_estimate) as min_score,
    MAX(er.score_estimate) as max_score,
    COUNT(er.id) as total_exams
FROM exam_results er
WHERE er.user_id = ?
GROUP BY er.user_id;
```

### 3. Obter Taxa de Acerto por Disciplina

```sql
SELECT 
    q.subject,
    COUNT(ea.id) as total_questions,
    SUM(CASE WHEN ea.is_correct THEN 1 ELSE 0 END) as correct_answers,
    ROUND(
        (SUM(CASE WHEN ea.is_correct THEN 1 ELSE 0 END) * 100.0 / COUNT(ea.id)), 
        2
    ) as correct_percentage
FROM exam_answers ea
JOIN questions q ON ea.question_id = q.id
WHERE ea.exam_result_id IN (
    SELECT id FROM exam_results WHERE user_id = ?
)
GROUP BY q.subject
ORDER BY correct_percentage DESC;
```

### 4. Detectar Usuário Atrasado no Plano

```sql
SELECT 
    u.id,
    u.name,
    u.email,
    sp.daily_hours_goal,
    SUM(ss.duration_minutes) / 60.0 as hours_studied,
    sp.total_hours_available,
    (sp.total_hours_available - (SUM(ss.duration_minutes) / 60.0)) as hours_missing
FROM users u
JOIN study_plans sp ON u.id = sp.user_id
LEFT JOIN study_sessions ss ON u.id = ss.user_id
WHERE sp.status = 'active'
    AND DATEDIFF(NOW(), ss.start_time) <= 30
GROUP BY u.id
HAVING hours_missing > (sp.daily_hours_goal * 7);
```

### 5. Listar Tópicos Prioritários por Usuário

```sql
SELECT 
    t.name,
    t.subject,
    qs.correct as correct_answers,
    qs.attempts as total_attempts,
    ROUND((qs.correct * 100.0 / qs.attempts), 2) as success_rate
FROM topics t
JOIN study_plans sp ON EXISTS (
    SELECT 1 FROM weekly_sprints ws 
    WHERE ws.study_plan_id = sp.id AND ws.id = t.weekly_sprint_id
)
LEFT JOIN question_stats qs ON t.id = qs.user_id -- Adjust join
WHERE sp.user_id = ? AND t.priority = 'critical'
ORDER BY success_rate ASC;
```

### 6. Obter Badges Desbloqueados por Usuário

```sql
SELECT 
    b.id,
    b.name,
    b.description,
    b.icon_url,
    b.tier,
    ub.unlocked_at
FROM user_badges ub
JOIN badges b ON ub.badge_id = b.id
WHERE ub.user_id = ?
ORDER BY ub.unlocked_at DESC;
```

### 7. Calcular Pontuação e Nível Atual

```sql
SELECT 
    up.user_id,
    up.total_points,
    up.current_level,
    CEIL(up.experience_points / 1000) as next_level_progress,
    COUNT(DISTINCT ub.badge_id) as badges_unlocked
FROM user_points up
LEFT JOIN user_badges ub ON up.user_id = ub.user_id
WHERE up.user_id = ?
GROUP BY up.user_id;
```

### 8. Listar Redações Pendentes de Análise

```sql
SELECT 
    e.id,
    e.user_id,
    u.name as user_name,
    e.theme_title,
    e.word_count,
    e.submitted_at,
    TIMESTAMPDIFF(HOUR, e.submitted_at, NOW()) as hours_waiting
FROM essays e
JOIN users u ON e.user_id = u.id
WHERE e.status = 'submitted'
    AND e.submitted_at IS NOT NULL
    AND NOT EXISTS (
        SELECT 1 FROM essay_analyses ea WHERE ea.essay_id = e.id
    )
ORDER BY e.submitted_at ASC;
```

### 9. Análise de Erros Frequentes

```sql
SELECT 
    q.topic,
    q.subject,
    COUNT(ea.id) as times_wrong,
    ROUND(COUNT(ea.id) * 100.0 / SUM(COUNT(ea.id)) OVER (PARTITION BY q.subject), 2) as percent_of_errors
FROM exam_answers ea
JOIN questions q ON ea.question_id = q.id
WHERE ea.exam_result_id IN (
    SELECT id FROM exam_results WHERE user_id = ?
)
AND ea.is_correct = FALSE
GROUP BY q.topic, q.subject
ORDER BY times_wrong DESC
LIMIT 10;
```

### 10. Previsão de Score Final

```sql
SELECT 
    u.id,
    u.name,
    AVG(er.score_estimate) as avg_recent_score,
    MAX(er.completed_at) as last_exam_date,
    COUNT(er.id) as exams_taken,
    -- Cálculo simplificado de previsão
    ROUND(
        AVG(er.score_estimate) + 
        ((MAX(er.score_estimate) - MIN(er.score_estimate)) / COUNT(er.id)) * 
        DATEDIFF(DATE('2026-11-02'), CURDATE()),
        0
    ) as predicted_final_score
FROM users u
JOIN exam_results er ON u.id = er.user_id
WHERE u.id = ?
    AND er.completed_at >= DATE_SUB(NOW(), INTERVAL 2 MONTH)
GROUP BY u.id;
```

### 11. Dashboard de Comunidade

```sql
SELECT 
    cp.id,
    cp.title,
    cp.category,
    u.name as author_name,
    cp.view_count,
    cp.reply_count,
    cp.helpful_count,
    cp.created_at,
    COUNT(cr.id) as reply_count
FROM community_posts cp
JOIN users u ON cp.user_id = u.id
LEFT JOIN community_replies cr ON cp.id = cr.post_id
WHERE cp.status = 'published'
GROUP BY cp.id
ORDER BY cp.created_at DESC
LIMIT 20;
```

### 12. Relatório de Estudo por Período

```sql
SELECT 
    DATE(ss.start_time) as study_date,
    u.name,
    COUNT(DISTINCT ss.id) as study_sessions,
    SUM(ss.duration_minutes) as total_minutes,
    AVG(ss.session_score) as avg_score,
    SUM(ss.questions_correct) as total_correct_answers
FROM study_sessions ss
JOIN users u ON ss.user_id = u.id
WHERE ss.user_id = ?
    AND ss.start_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)
GROUP BY DATE(ss.start_time)
ORDER BY study_date DESC;
```

### 13. Assinaturas Expirando

```sql
SELECT 
    s.id,
    u.name,
    u.email,
    s.plan_type,
    s.end_date,
    DATEDIFF(s.end_date, CURDATE()) as days_until_expiry
FROM subscriptions s
JOIN users u ON s.user_id = u.id
WHERE s.status = 'active'
    AND s.end_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)
ORDER BY s.end_date ASC;
```

### 14. Questionário com Mais Dúvidas

```sql
SELECT 
    q.id,
    q.statement,
    q.subject,
    q.topic,
    COUNT(qs.id) as users_with_doubt,
    COUNT(CASE WHEN qs.marked_as_doubt THEN 1 END) as doubt_count
FROM questions q
LEFT JOIN question_stats qs ON q.id = qs.question_id 
    AND qs.marked_as_doubt = TRUE
GROUP BY q.id
HAVING doubt_count > 0
ORDER BY doubt_count DESC
LIMIT 20;
```

### 15. Performance vs Meta Diária

```sql
SELECT 
    u.id,
    u.name,
    lp.daily_hours_goal,
    DATE(ss.start_time) as study_date,
    SUM(ss.duration_minutes) / 60.0 as hours_studied,
    CASE 
        WHEN SUM(ss.duration_minutes) / 60.0 >= lp.daily_hours_goal THEN 'Atingiu'
        ELSE 'Não Atingiu'
    END as status,
    ROUND(
        (SUM(ss.duration_minutes) / 60.0) / lp.daily_hours_goal * 100, 
        2
    ) as percentage_of_goal
FROM users u
JOIN learning_profiles lp ON u.id = lp.user_id
LEFT JOIN study_sessions ss ON u.id = ss.user_id
WHERE u.id = ?
    AND ss.start_time >= DATE_SUB(NOW(), INTERVAL 30 DAY)
GROUP BY DATE(ss.start_time)
ORDER BY study_date DESC;
```

---

## Notas de Implementação

### 1. Migrations
Use uma ferramenta como **Flyway** ou **Liquibase** para versionamento de schema.

### 2. Connection Pool
Configure um pool de conexões apropriado:
- Minimum Pool Size: 5
- Maximum Pool Size: 20
- Connection Timeout: 30s

### 3. Backup
Implementar backup automático:
- Diário para dados
- Semanal full backup
- Retenção de 90 dias

### 4. Partitioning
Para tabelas grandes (exam_results, study_sessions):
```sql
ALTER TABLE exam_results
PARTITION BY RANGE (YEAR(completed_at)) (
    PARTITION p2024 VALUES LESS THAN (2025),
    PARTITION p2025 VALUES LESS THAN (2026),
    PARTITION p2026 VALUES LESS THAN (2027),
    PARTITION p_future VALUES LESS THAN MAXVALUE
);
```

### 5. Replicação
Implementar read replicas para queries pesadas de análise.

### 6. Caching
Usar Redis para cache de:
- Planos de estudo (TTL: 1h)
- Questões (TTL: 24h)
- Scores do usuário (TTL: 30min)
- Notificações (TTL: 5min)

### 7. Triggers
```sql
-- Atualizar timestamp automaticamente
CREATE TRIGGER update_users_timestamp
BEFORE UPDATE ON users
FOR EACH ROW
SET NEW.updated_at = CURRENT_TIMESTAMP;

-- Contar respostas certas automaticamente
CREATE TRIGGER update_exam_scores
AFTER INSERT ON exam_answers
FOR EACH ROW
BEGIN
    UPDATE exam_results
    SET correct_answers = correct_answers + 1
    WHERE id = NEW.exam_result_id AND NEW.is_correct = TRUE;
END;
```

---

**Data de Criação:** 15 de Maio de 2026
**Versão:** 1.0
**SGBD Recomendado:** MySQL 8.0+ / PostgreSQL 14+
