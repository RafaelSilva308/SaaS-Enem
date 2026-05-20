# SaaS ENEM - Diagramas de Fluxo

## 1. Fluxo de Registro e Onboarding

```mermaid
graph TD
    A["Usuário Acessa a Plataforma"] --> B{"Tem Conta?"}
    B -->|Não| C["Clica em Registrar"]
    C --> D["Preenche Formulário de Registro"]
    D --> E["Valida Dados"]
    E -->|Erro| F["Exibe Mensagem de Erro"]
    F --> D
    E -->|Sucesso| G["Envia Email de Confirmação"]
    G --> H["Usuário Confirma Email"]
    H --> I["Cria Senha"]
    I --> J["Termos de Uso"]
    J --> K{"Aceita?"}
    K -->|Não| L["Cancela Registro"]
    K -->|Sim| M["Quiz Diagnóstico"]
    M --> N["Calcula Resultado Diagnóstico"]
    N --> O["Sugere Plano"]
    O --> P["Seleciona Plano"]
    P --> Q{"Período Trial?"}
    Q -->|Sim| R["Ativa 7 dias grátis"]
    Q -->|Não| S["Integra Pagamento"]
    S --> T["Cria Assinatura"]
    R --> U["Gera Plano de Estudo"]
    T --> U
    U --> V["Dashboard Principal"]
    
    B -->|Sim| W["Clica em Login"]
    W --> X["Email e Senha"]
    X --> Y{"Credenciais OK?"}
    Y -->|Não| Z["Erro de Autenticação"]
    Z --> X
    Y -->|Sim| AA{"2FA Ativado?"}
    AA -->|Sim| AB["Envia Código 2FA"]
    AB --> AC["Usuário Valida 2FA"]
    AC --> V
    AA -->|Não| V
```

---

## 2. Fluxo de Simulado

```mermaid
graph TD
    A["Usuário no Dashboard"] --> B["Clica em Simulados"]
    B --> C{"Qual Tipo?"}
    C -->|Completo| D["Agenda Simulado"]
    C -->|Disciplina| E["Seleciona Disciplina"]
    C -->|Tema| F["Seleciona Tema"]
    
    D --> G{"Agora ou Depois?"}
    G -->|Depois| H["Registra Agendamento"]
    H --> I["Envia Notificação"]
    G -->|Agora| J["Começa Simulado"]
    
    E --> K["Seleção de Dificuldade"]
    K --> J
    F --> K
    
    J --> L["Exibe Instruções"]
    L --> M["Usuário Aceita"]
    M --> N["Inicia Cronômetro"]
    N --> O["Exibe Questão 1"]
    
    O --> P["Usuário Responde"]
    P --> Q{"Mais Questões?"}
    Q -->|Sim| R["Próxima Questão"]
    R --> O
    Q -->|Não| S["Usuário Clica Finalizar"]
    
    S --> T{"Confirmação?"}
    T -->|Não| U["Volta para Questões"]
    U --> O
    T -->|Sim| V["Processa Respostas"]
    
    V --> W["Compara com Gabarito"]
    W --> X["Calcula Score TRI"]
    X --> Y["Gera Feedback Automático"]
    Y --> Z["Exibe Resultados"]
    
    Z --> AA{"Quer Detalhes?"}
    AA -->|Sim| AB["Análise Questão por Questão"]
    AB --> AC["Comparação com Histórico"]
    AC --> AD["Recomendações IA"]
    AA -->|Não| AE["Salva Resultado"]
    AD --> AE
    AE --> AF["Atualiza Dashboard"]
```

---

## 3. Fluxo de Análise de Desempenho

```mermaid
graph TD
    A["Usuário Clica em Análise"] --> B["Carrega Dashboard"]
    B --> C["Busca Todos Simulados"]
    C --> D["Calcula Estatísticas"]
    
    D --> E["Score Médio"]
    D --> F["Tendência"]
    D --> G["Evolução por Disciplina"]
    
    E --> H["Exibe Gráfico Geral"]
    F --> H
    G --> H
    
    H --> I["Usuário Seleciona Disciplina"]
    I --> J["Carrega Dados da Disciplina"]
    J --> K["Calcula Performance por Tópico"]
    K --> L["Identifica Erros Frequentes"]
    
    L --> M{"Tipo de Erro?"}
    M -->|Conceitual| N["Recomenda: Estudar Teoria"]
    M -->|Atenção| O["Recomenda: Praticar Velocidade"]
    M -->|Cálculo| P["Recomenda: Revisar Procedimento"]
    M -->|Tempo| Q["Recomenda: Treinar Gestão de Tempo"]
    
    N --> R["Exibe Detalhes"]
    O --> R
    P --> R
    Q --> R
    
    R --> S["Usuário Clica em Recomendação"]
    S --> T["Sistema Gera Plano de Ação"]
    T --> U["Adiciona Tópicos ao Plano"]
    U --> V["Atualiza Metas Diárias"]
    V --> W["Notifica Usuário"]
```

---

## 4. Fluxo de Redação

```mermaid
graph TD
    A["Usuário Vai para Redação"] --> B["Seleciona Tema"]
    B --> C{"Novo ou Existente?"}
    C -->|Novo| D["Exibe Tema e Propostas"]
    C -->|Existente| E["Carrega Rascunho"]
    
    D --> F["Usuário Começa Escrever"]
    E --> F
    
    F --> G["Sistema Conta Palavras"]
    G --> H["Auto-salva a Cada Minuto"]
    H --> I["Cronômetro Roda"]
    
    I --> J{"Usuário Clica Salvar?"}
    J -->|Salvar Rascunho| K["Salva como Rascunho"]
    J -->|Submeter| L["Valida Mínimo de Palavras"]
    
    L -->|Erro| M["Mensagem de Erro"]
    M --> F
    
    L -->|OK| N["Submete Redação"]
    N --> O["Sistema Enfileira para IA"]
    O --> P["IA Analisa (30 seg a 2 min)"]
    
    P --> Q["Identifica Estrutura"]
    P --> R["Avalia Argumentação"]
    P --> S["Verifica Gramática"]
    P --> T["Analisa Competências ENEM"]
    
    Q --> U["Gera Relatório"]
    R --> U
    S --> U
    T --> U
    
    U --> V["Exibe Score Estimado"]
    V --> W["Mostra Feedback Detalhado"]
    W --> X["Oferece Próximas Ações"]
    
    X --> Y{"Usuário Quer?"}
    Y -->|Reescrever| Z["Volta ao Editor"]
    Z --> F
    Y -->|Pedir Revisão Humana| AA["Abre Tela de Compra"]
    AA --> AB["Processa Pagamento"]
    AB --> AC["Enfileira para Professor"]
    AC --> AD["Aguarda Feedback Humano"]
    Y -->|Guardar| AE["Salva Resultado"]
```

---

## 5. Fluxo de Plano de Estudo Personalizado

```mermaid
graph TD
    A["Sistema Gera Plano"] --> B["Coleta Dados do Usuário"]
    B --> C["Resultado Diagnóstico"]
    B --> D["Dias até ENEM"]
    B --> E["Disponibilidade Diária"]
    B --> F["Força de Cada Disciplina"]
    
    C --> G["Calcula Total de Horas"]
    D --> G
    E --> G
    
    G --> H["Distribui Horas por Disciplina"]
    H --> I["Disciplinas Fracas = Mais Tempo"]
    I --> J["Cria Sprints Semanais"]
    
    J --> K["Semana 1: Fundamentos"]
    J --> L["Semana 2: Aprofundamento"]
    J --> M["Semana 3+: Integração"]
    
    K --> N["Aloca Tópicos por Dia"]
    L --> N
    M --> N
    
    N --> O["Adiciona Sessões de Revisão"]
    O --> P["Spaced Repetition Schedule"]
    P --> Q["Intensifica 2 Semanas Antes"]
    
    Q --> R["Exibe Plano ao Usuário"]
    R --> S{"Usuário Aprova?"}
    S -->|Não| T["Oferece Customização"]
    T --> U["Ajusta Horas Diárias"]
    T --> V["Marca Dias Indisponíveis"]
    T --> W["Reajusta Tópicos"]
    U --> R
    V --> R
    W --> R
    
    S -->|Sim| X["Ativa Plano"]
    X --> Y["Sistema Começa a Monitorar"]
    Y --> Z["Envia Notificações Diárias"]
```

---

## 6. Fluxo de Detecção de Atraso e Contingência

```mermaid
graph TD
    A["Sistema Monitora Progresso"] --> B["Compara com Plano"]
    B --> C{"Horas Estudadas < Esperado?"}
    
    C -->|Não| D["Tudo OK ✓"]
    D --> E["Continua Monitorando"]
    
    C -->|Sim| F["Calcula Dias de Atraso"]
    F --> G{"Atraso > 7 dias?"}
    
    G -->|Não| H["Alerta Amarelo"]
    H --> I["Notifica Usuário"]
    I --> E
    
    G -->|Sim| J["Alerta Vermelho"]
    J --> K["Sistema Gera Novo Plano"]
    K --> L["Calcula Novo Cronograma"]
    L --> M["Aumenta Horas Diárias"]
    M --> N["Prioriza Tópicos Críticos"]
    N --> O["Remove Revisões Menos Urgentes"]
    
    O --> P["Exibe Novo Plano"]
    P --> Q{"Usuário Aceita?"}
    Q -->|Não| R["Oferece Customização"]
    R --> P
    
    Q -->|Sim| S["Ativa Modo Sprint"]
    S --> T["Meta Diária Dobra"]
    T --> U["Modo Foco Disponível"]
    U --> V["Intensifica Recomendações"]
    V --> E
```

---

## 7. Fluxo de Comunidade/Fórum

```mermaid
graph TD
    A["Usuário Acessa Comunidade"] --> B["Vê Feed de Tópicos"]
    B --> C{"Qual Ação?"}
    
    C -->|Ver Tópico| D["Clica em Tópico"]
    C -->|Criar Novo| E["Clica em Fazer Pergunta"]
    C -->|Buscar| F["Usa Barra de Busca"]
    
    D --> G["Carrega Tópico"]
    G --> H["Exibe Pergunta Original"]
    H --> I["Exibe Respostas"]
    I --> J["Ordena por Utilidade/Data"]
    J --> K["Usuário Lê Respostas"]
    K --> L{"Tem Mais a Fazer?"}
    L -->|Responder| M["Clica Responder"]
    L -->|Marcar Útil| N["Clica em Thumbs Up"]
    L -->|Reportar| O["Clica em Reportar"]
    L -->|Sair| P["Volta ao Feed"]
    
    M --> Q["Abre Editor de Resposta"]
    Q --> R["Usuário Digita Resposta"]
    R --> S["Pode Adicionar Imagem"]
    S --> T["Submete Resposta"]
    T --> U["Sistema Salva"]
    U --> V["Notifica Autor Original"]
    V --> P
    
    E --> W["Abre Formulário Novo Tópico"]
    W --> X["Seleciona Categoria"]
    X --> Y["Digita Título"]
    Y --> Z["Digita Descrição"]
    Z --> AA["Adiciona Imagem Opcional"]
    AA --> AB["Submete Tópico"]
    AB --> AC["Sistema Valida Conteúdo"]
    AC -->|Apropriado| AD["Publica Tópico"]
    AC -->|Inapropriado| AE["Rejeita e Notifica"]
    AD --> AF["Notifica Comunidade"]
    AF --> P
    
    F --> AG["Filtra por Categoria"]
    AG --> AH["Busca Texto"]
    AH --> AI["Exibe Resultados"]
    AI --> D
```

---

## 8. Fluxo de Mentoria

```mermaid
graph TD
    A["Usuário Acessa Mentoria"] --> B["Vê Professores Disponíveis"]
    B --> C["Clica em Professor"]
    C --> D["Exibe Perfil do Professor"]
    D --> E{"Quer Agendar?"}
    
    E -->|Não| F["Volta à Lista"]
    E -->|Sim| G["Clica Agendar Sessão"]
    
    G --> H["Seleciona Data e Hora"]
    H --> I["Seleciona Tópico/Dúvida"]
    I --> J["Sistema Calcula Preço"]
    J --> K["Exibe Resumo"]
    K --> L{"Confirma?"}
    
    L -->|Não| M["Volta para Seleção"]
    M --> H
    L -->|Sim| N["Processa Pagamento"]
    
    N --> O{"Pagamento OK?"}
    O -->|Erro| P["Mensagem de Erro"]
    P --> N
    O -->|OK| Q["Cria Agendamento"]
    
    Q --> R["Notifica Professor"]
    R --> S["Notifica Aluno"]
    S --> T["Aguarda Sessão"]
    T --> U{"Horário Chegou?"]
    
    U -->|Não| V["Envia Lembretes"]
    V --> U
    U -->|Sim| W["Abre Sala de Videoconferência"]
    
    W --> X["Aluno Entra"]
    X --> Y["Professor Entra"]
    Y --> Z["Inicia Gravação"]
    Z --> AA["Sessão de 1 Hora"]
    
    AA --> AB["Professor Pode Compartilhar Tela"]
    AA --> AC["Usuário Pode Ver Quadro"]
    AA --> AD["Chat Disponível"]
    
    AB --> AE["Fim da Sessão"]
    AC --> AE
    AD --> AE
    
    AE --> AF["Para Gravação"]
    AF --> AG["Salva Vídeo"]
    AG --> AH["Envia Link ao Aluno"]
    AH --> AI["Envia Resumo por Email"]
    AI --> AJ["Aluno Avalia Sessão"]
```

---

## 9. Fluxo de Gamificação

```mermaid
graph TD
    A["Usuário Realiza Ação"] --> B{"Qual Ação?"}
    
    B -->|Responde Questão| C["Ganha 10 pontos"]
    B -->|Acerta Questão| D["Ganha +5 pontos"]
    B -->|Completa Simulado| E["Ganha 100 pontos"]
    B -->|Estuda 30+ min| F["Dia do Streak +1"]
    B -->|Responde Fórum| G["Ganha 25 pontos"]
    B -->|Resposta Marcada Melhor| H["Ganha +50 pontos"]
    
    C --> I["Atualiza Total de Pontos"]
    D --> I
    E --> I
    F --> I
    G --> I
    H --> I
    
    I --> J["Verifica Levelup"]
    J --> K{"Pontos >= Próx. Level?"}
    
    K -->|Não| L["Continua"]
    K -->|Sim| M["Sobe de Level"]
    M --> N["Exibe Notificação"]
    N --> O["Toca Som de Vitória"]
    O --> L
    
    I --> P["Verifica Badges"]
    P --> Q{"Condição de Badge?"}
    
    Q -->|Não| R["Continua"]
    Q -->|Sim| S["Desbloqueia Badge"]
    S --> T["Exibe Popup"]
    T --> U["Salva Badge no Perfil"]
    U --> R
    
    F --> V["Verifica Streak"]
    V --> W{"Milestone?"}
    W -->|Não| R
    W -->|Sim 7 dias| X["Desbloqueia Badge 7 dias"]
    X --> R
    W -->|Sim 30 dias| Y["Desbloqueia Badge 30 dias"]
    Y --> R
```

---

## 10. Fluxo de Notificações

```mermaid
graph TD
    A["Sistema Detecta Evento"] --> B{"Tipo de Evento?"}
    
    B -->|Hora de Estudar| C["Notificação: Lembrete Estudo"]
    B -->|Meta Não Atingida| D["Notificação: Meta Não Atingida"]
    B -->|Score Alto| E["Notificação: Novo Recorde"]
    B -->|Badge Desbloqueado| F["Notificação: Badge"]
    B -->|Resposta no Fórum| G["Notificação: Nova Resposta"]
    B -->|Feedback Redação| H["Notificação: Redação Analisada"]
    B -->|Atraso Detectado| I["Notificação: Você Está Atrasado"]
    
    C --> J["Sistema Verifica Preferências"]
    D --> J
    E --> J
    F --> J
    G --> J
    H --> J
    I --> J
    
    J --> K{"Push ativado?"}
    J --> L{"Email ativado?"}
    J --> M{"SMS ativado?"}
    J --> N{"In-app ativado?"}
    
    K -->|Sim| O["Envia Push"]
    K -->|Não| P["Pula Push"]
    
    L -->|Sim| Q["Envia Email"]
    L -->|Não| R["Pula Email"]
    
    M -->|Sim| S["Envia SMS"]
    M -->|Não| T["Pula SMS"]
    
    N -->|Sim| U["Mostra In-app"]
    N -->|Não| V["Pula In-app"]
    
    O --> W{"Dentro do Horário?"}
    Q --> W
    S --> W
    U --> W
    
    W -->|Não (silêncio)| X["Agenda para Depois"]
    W -->|Sim| Y["Envia Notificação"]
    
    Y --> Z["Usuário Recebe"]
    Z --> AA{"Clica?"}
    AA -->|Sim| AB["Abre a Página Relacionada"]
    AA -->|Não| AC["Marca como Lida"]
```

---

## 11. Fluxo de Pagamento e Assinatura

```mermaid
graph TD
    A["Usuário Seleciona Plano"] --> B["Clica em Contratar"]
    B --> C["Exibe Tela de Checkout"]
    C --> D["Seleciona Método Pagamento"]
    D --> E{"Qual Método?"}
    
    E -->|Cartão Crédito| F["Preenche Dados Cartão"]
    E -->|PIX| G["Gera QR Code PIX"]
    E -->|Boleto| H["Gera Boleto"]
    
    F --> I["Aplica Cupom Desconto?"]
    G --> I
    H --> I
    
    I -->|Sim| J["Valida Cupom"]
    J -->|OK| K["Aplica Desconto"]
    J -->|Inválido| L["Erro de Cupom"]
    L --> I
    K --> M["Exibe Total Final"]
    I -->|Não| M
    
    M --> N["Usuário Confirma"]
    N --> O["Processa Pagamento"]
    
    O --> P{"Pagamento OK?"}
    
    P -->|Erro| Q["Mensagem de Erro"]
    Q --> R["Oferece Retry"]
    R --> O
    
    P -->|OK| S["Cria Assinatura"]
    S --> T{"Primeiro Pagamento?"}
    
    T -->|Sim| U["Ativa Trial 7 dias?"]
    U -->|Sim| V["Data Vencimento = Hoje + 7 dias"]
    U -->|Não| W["Data Vencimento = Hoje + 30 dias"]
    T -->|Não| X["Renovação OK"]
    
    V --> Y["Envia Confirmação Email"]
    W --> Y
    X --> Y
    
    Y --> Z["Ativa Plano Premium"]
    Z --> AA["Desbloqueia Funcionalidades"]
    AA --> AB["Redireciona ao Dashboard"]
    
    AB --> AC["Sistema Monitora Vencimento"]
    AC --> AD["3 dias antes: Aviso"]
    AD --> AE{"Usuário Renova?"}
    AE -->|Sim| AF["Processa Renovação"]
    AE -->|Não| AG["Aviso 1 dia antes"]
    AG --> AH["Avisa no Vencimento"]
    AH --> AI["Downgrade para Free"]
```

---

## 12. Fluxo de Login com 2FA

```mermaid
graph TD
    A["Usuário Acessa Login"] --> B["Digita Email e Senha"]
    B --> C["Sistema Valida Credenciais"]
    C -->|Erro| D["Mensagem de Erro"]
    D --> B
    
    C -->|OK| E{"2FA Ativado?"}
    E -->|Não| F["Cria Token JWT"]
    F --> G["Redireciona ao Dashboard"]
    
    E -->|Sim| H["Gera Código 2FA"]
    H --> I["Seleciona Canal Entrega"]
    I -->|Email| J["Envia Email com Código"]
    I -->|SMS| K["Envia SMS com Código"]
    
    J --> L["Exibe Tela de 2FA"]
    K --> L
    
    L --> M["Usuário Digita Código"]
    M --> N["Sistema Valida Código"]
    N -->|Erro| O["Mensagem de Erro"]
    O --> M
    N -->|OK| P{"Lembrar por 30 dias?"}
    
    P -->|Sim| Q["Salva Device ID"]
    P -->|Não| R["Apenas Login Atual"]
    
    Q --> F
    R --> F
```

---

## 13. Fluxo de Seleção de Questões por Filtro

```mermaid
graph TD
    A["Usuário Vai para Banco de Questões"] --> B["Vê Filtros"]
    B --> C["Seleciona Disciplina"]
    C --> D["Seleciona Tópico"]
    D --> E["Seleciona Dificuldade"]
    E --> F["Seleciona Ano"]
    F --> G["Seleciona Status"]
    
    G --> H["Clica Buscar"]
    H --> I["Sistema Query Banco"]
    I --> J["Aplica Todos Filtros"]
    J --> K["Retorna Questões"]
    
    K --> L["Exibe Resultados"]
    L --> M["X questões encontradas"]
    M --> N["Usuário Seleciona Modo"]
    
    N -->|Modo Teste| O["Começa Teste"]
    N -->|Modo Estudo| P["Começa Modo Estudo"]
    N -->|Modo Prática| Q["Começa Prática"]
    
    O --> R["Questões Aleatórias"]
    P --> S["Mostra Explicação Primeiro"]
    Q --> T["Questão com Feedback Imediato"]
    
    R --> U["Usuário Responde"]
    S --> U
    T --> U
    
    U --> V{"Próxima?"}
    V -->|Sim| W["Próxima Questão"]
    W --> U
    V -->|Não| X["Encerra Sessão"]
    X --> Y["Exibe Estatísticas"]
```

---

## 14. Fluxo de Cálculo de Previsão de Score

```mermaid
graph TD
    A["Sistema Monitora Simulados"] --> B["Coleta Dados"]
    B --> C["Scores Anteriores"]
    B --> D["Dias Faltando"]
    B --> E["Taxa de Crescimento"]
    
    C --> F["Calcula Média Recente"]
    D --> G["Calcula Dias Restantes"]
    E --> H["Analisa Padrão de Melhora"]
    
    F --> I["Aplica Fórmula de Previsão"]
    G --> I
    H --> I
    
    I --> J["Score_Previsto = Média + Taxa*Dias"]
    J --> K["Calcula Intervalo de Confiança"]
    K --> L["Margem de +/- 50 pontos"]
    
    L --> M["Gera 3 Cenários"]
    M --> N["Pessimista: -50"]
    M --> O["Realista: Previsão"]
    M --> P["Otimista: +50"]
    
    N --> Q["Exibe Resultado"]
    O --> Q
    P --> Q
    
    Q --> R["Compara com Meta"]
    R --> S{"Score_Previsto >= Meta?"}
    S -->|Sim| T["Verde ✓ Você vai conseguir!"]
    S -->|Não| U["Laranja ⚠ Possível, mas difícil"]
    T --> V["Notifica Usuário"]
    U --> V
```

---

## 15. Fluxo de Adaptação Dinâmica de Plano

```mermaid
graph TD
    A["Usuário Realiza Simulado"] --> B["Sistema Processa Resultado"]
    B --> C["Identifica Pontos Fracos"]
    C --> D["Calcula Score por Tópico"]
    
    D --> E{"Taxa Acerto < 60%?"}
    E -->|Sim| F["Tópico é Fraco"]
    E -->|Não| G["Tópico OK"]
    
    F --> H["Sistema Aumenta Tempo"]
    H --> I["Adiciona Mais Questões"]
    I --> J["Cria Sessões de Revisão"]
    J --> K["Atualiza Plano de Estudo"]
    
    K --> L["Insere Tópico em Próximas Semanas"]
    L --> M["Aumenta Frequência de Prática"]
    M --> N["Notifica Usuário"]
    
    G --> O["Mantém Planejamento"]
    O --> N
    
    N --> P["Exibe Novo Plano"]
    P --> Q{"Usuário Aprova?"}
    Q -->|Não| R["Oferece Ajustes Manuais"]
    Q -->|Sim| S["Ativa Novo Plano"]
    R --> P
```

---

## 16. Fluxo Geral da Aplicação

```mermaid
graph TD
    A["Acesso à Aplicação"] --> B{"Usuário Logado?"}
    B -->|Não| C["Tela de Login/Registro"]
    B -->|Sim| D["Dashboard Principal"]
    
    C --> E{"Ação?"}
    E -->|Login| F["Autentica"]
    E -->|Registro| G["Onboarding"]
    
    F --> D
    G --> D
    
    D --> H{"Menu Selecionado?"}
    H -->|Plano de Estudo| I["Exibe Plano"]
    H -->|Simulados| J["Lista de Simulados"]
    H -->|Banco de Questões| K["Busca de Questões"]
    H -->|Redação| L["Editor de Redação"]
    H -->|Análise| M["Dashboard de Análise"]
    H -->|Comunidade| N["Fórum"]
    H -->|Configurações| O["Painel de Config"]
    
    I --> P{"Ação?"}
    P -->|Começar| Q["Inicia Estudo"]
    P -->|Ajustar| R["Customiza Plano"]
    P -->|Ver| S["Visualiza Semanas"]
    
    J --> T{"Ação?"}
    T -->|Agendar| U["Cria Agendamento"]
    T -->|Fazer Agora| V["Inicia Simulado"]
    
    K --> W{"Ação?"}
    W -->|Filtrar| X["Aplica Filtros"]
    W -->|Praticar| Y["Começa Prática"]
    
    L --> Z{"Ação?"}
    Z -->|Escrever| AA["Abre Editor"]
    Z -->|Ver Feedback| AB["Exibe Análise"]
    
    M --> AC{"Ver?"}
    AC -->|Gráficos| AD["Exibe Gráficos"]
    AC -->|Recomendações| AE["Exibe Sugestões"]
    
    N --> AF{"Ação?"}
    AF -->|Ver Tópico| AG["Exibe Tópico"]
    AF -->|Criar| AH["Novo Tópico"]
    
    O --> AI{"Config?"}
    AI -->|Perfil| AJ["Edita Perfil"]
    AI -->|Notificações| AK["Ajusta Notificações"]
    AI -->|Billing| AL["Gerencia Assinatura"]
    
    Q --> AM["Executa Ação"]
    R --> AM
    S --> AM
    U --> AM
    V --> AM
    X --> AM
    Y --> AM
    AA --> AM
    AB --> AM
    AD --> AM
    AE --> AM
    AG --> AM
    AH --> AM
    AJ --> AM
    AK --> AM
    AL --> AM
    
    AM --> AN["Sistema Processa"]
    AN --> AO["Atualiza Dados"]
    AO --> AP["Retorna Resultado"]
    AP --> AQ{"Continuar?"}
    AQ -->|Sim| H
    AQ -->|Não| AR["Volta Dashboard"]
    AR --> D
```

---

## Legenda dos Diagramas

- **Retângulo** = Ação ou Estado
- **Losango** = Decisão (condição)
- **Seta** = Fluxo/Sequência
- **Cores** (conceitual):
  - Verde = Sucesso
  - Vermelho = Erro
  - Amarelo = Aviso
  - Azul = Informação

---

**Nota:** Estes diagramas podem ser convertidos para imagens SVG/PNG usando ferramentas como:
- Mermaid Live Editor (https://mermaid.live)
- draw.io
- Lucidchart

Ou incorporados diretamente em documentação usando a sintaxe Mermaid.
