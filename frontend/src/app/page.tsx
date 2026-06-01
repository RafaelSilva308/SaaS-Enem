import Link from "next/link"
import Script from "next/script"
import styles from "./landing.module.css"

export const metadata = {
  title: "ENEM Pro — Sua Aprovação Começa Aqui",
  description:
    "Plano de estudo personalizado por IA, simulados com score TRI, banco de questões real e correção de redação. Tudo que você precisa para passar no ENEM.",
}

export default function LandingPage() {
  return (
    <div className={styles.page}>

      {/* ── NAV ── */}
      <nav className={styles.nav}>
        <Link href="/" className={styles.logo}>
          ENEM<span className={styles.logoGrad}>Pro</span>
        </Link>
        <ul className={styles.navLinks}>
          <li><a href="#funcionalidades">Funcionalidades</a></li>
          <li><a href="#como-funciona">Como Funciona</a></li>
          <li><a href="#planos">Planos</a></li>
        </ul>
        <Link href="/register" className={styles.navCta}>Criar conta</Link>
      </nav>

      {/* ── HERO ── */}
      <section className={styles.hero}>
        <div className={styles.badge}>
          <span className={styles.badgeDot} />
          Disponível agora &mdash; Acesse hoje
        </div>

        <h1 className={styles.heroTitle}>
          Sua aprovação no ENEM<br />
          <span className={styles.grad}>começa com inteligência</span>
        </h1>

        <p className={styles.heroSub}>
          Plano de estudo personalizado por IA, simulados com score TRI real,
          banco de questões do ENEM e correção de redação em minutos — tudo em
          uma plataforma construída para você passar.
        </p>

        <div className={styles.heroBtns}>
          <Link href="/register" className={styles.btnPrimary}>
            Criar minha conta
          </Link>
          <a href="#funcionalidades" className={styles.btnOutline}>
            Ver funcionalidades
          </a>
        </div>

        <div className={styles.countdownWrap}>
          <div className={styles.countdownLabel}>⏰ ENEM 2026 &mdash; Novembro</div>
          <div className={styles.countdownUnits}>
            <div className={styles.countBlock}>
              <div className={styles.countNum} id="cd-dias">---</div>
              <div className={styles.countText}>DIAS</div>
            </div>
            <div className={styles.countSep}>:</div>
            <div className={styles.countBlock}>
              <div className={styles.countNum} id="cd-horas">--</div>
              <div className={styles.countText}>HORAS</div>
            </div>
            <div className={styles.countSep}>:</div>
            <div className={styles.countBlock}>
              <div className={styles.countNum} id="cd-min">--</div>
              <div className={styles.countText}>MIN</div>
            </div>
            <div className={styles.countSep}>:</div>
            <div className={styles.countBlock}>
              <div className={styles.countNum} id="cd-seg">--</div>
              <div className={styles.countText}>SEG</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className={styles.sectionAlt}>
        <div className={styles.container}>
          <div className={styles.statsGrid}>
            <div>
              <div className={styles.statNum}>1.558+</div>
              <div className={styles.statLabel}>Questões reais do ENEM</div>
            </div>
            <div>
              <div className={styles.statNum}>4</div>
              <div className={styles.statLabel}>Áreas do conhecimento</div>
            </div>
            <div>
              <div className={styles.statNum}>IA</div>
              <div className={styles.statLabel}>Correção de redação</div>
            </div>
            <div>
              <div className={styles.statNum}>TRI</div>
              <div className={styles.statLabel}>Score estimado</div>
            </div>
            <div>
              <div className={styles.statNum}>PWA</div>
              <div className={styles.statLabel}>Funciona como app</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="funcionalidades" className={styles.section}>
        <div className={styles.container}>
          <div className={styles.sectionLabel}>Funcionalidades</div>
          <h2 className={styles.sectionTitle}>Tudo que você precisa para gabaritar</h2>
          <p className={styles.sectionSub}>
            Uma plataforma completa que combina IA com as questões reais do ENEM.
          </p>

          <div className={styles.featuresGrid}>

            <div className={styles.featureCard}>
              <div className={`${styles.featureIcon} ${styles.iconPurple}`}>📋</div>
              <h3>Plano de Estudo Personalizado</h3>
              <p>Algoritmo que analisa seu diagnóstico inicial, seus pontos fracos e sua disponibilidade de tempo para gerar um cronograma semanal sob medida até o dia do ENEM.</p>
              <span className={`${styles.tag} ${styles.tagPurple}`}>IA Adaptativa</span>
            </div>

            <div className={styles.featureCard}>
              <div className={`${styles.featureIcon} ${styles.iconBlue}`}>📝</div>
              <h3>Simulados Inteligentes</h3>
              <p>Simulados completos, por área ou por tema com correção automática e cálculo de score TRI estimado — igual ao ENEM real. Veja cada questão errada com explicação detalhada.</p>
              <span className={`${styles.tag} ${styles.tagBlue}`}>TRI Estimado</span>
            </div>

            <div className={styles.featureCard}>
              <div className={`${styles.featureIcon} ${styles.iconCyan}`}>📊</div>
              <h3>Análise de Desempenho</h3>
              <p>Dashboard completo com sua evolução por disciplina, identificação de padrões de erro, previsão de score final e comparação anônima com outros estudantes.</p>
              <span className={`${styles.tag} ${styles.tagBlue}`}>Análise Profunda</span>
            </div>

            <div className={styles.featureCard}>
              <div className={`${styles.featureIcon} ${styles.iconGreen}`}>✍️</div>
              <h3>Redação Corrigida por IA</h3>
              <p>Submeta sua redação e receba análise das 5 competências do ENEM, feedback de argumentação e nota estimada em minutos — pelo mesmo padrão do INEP.</p>
              <span className={`${styles.tag} ${styles.tagGreen}`}>Resultado em Minutos</span>
            </div>

            <div className={styles.featureCard}>
              <div className={`${styles.featureIcon} ${styles.iconOrange}`}>🎯</div>
              <h3>Banco de Questões ENEM</h3>
              <p>1.558 questões reais de 14 anos de provas (2009–2025), filtradas por disciplina, tópico, dificuldade e ano. Modo prática com feedback imediato após cada resposta.</p>
              <span className={`${styles.tag} ${styles.tagPurple}`}>Questões Reais</span>
            </div>

            <div className={styles.featureCard}>
              <div className={`${styles.featureIcon} ${styles.iconPink}`}>🏆</div>
              <h3>Gamificação e Streaks</h3>
              <p>Sistema de pontos, badges, ranking e contador de dias consecutivos para manter sua motivação. Desbloqueie conquistas e suba no leaderboard enquanto estuda.</p>
              <span className={`${styles.tag} ${styles.tagGreen}`}>Motivação Garantida</span>
            </div>

            <div className={styles.featureCard}>
              <div className={`${styles.featureIcon} ${styles.iconBlue}`}>⚡</div>
              <h3>Modo Contingência</h3>
              <p>Ativado automaticamente quando você está atrasado no plano: reordena prioridades por frequência no ENEM, oferece sessões turbo de 15 minutos e alertas de urgência.</p>
              <span className={`${styles.tag} ${styles.tagPurple}`}>Automático</span>
            </div>

            <div className={styles.featureCard}>
              <div className={`${styles.featureIcon} ${styles.iconGreen}`}>📱</div>
              <h3>App Instalável (PWA)</h3>
              <p>Instale direto na tela inicial do celular sem precisar de loja de apps. Funciona como um app nativo com notificações push para metas e lembretes de estudo.</p>
              <span className={`${styles.tag} ${styles.tagGreen}`}>iOS e Android</span>
            </div>

          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="como-funciona" className={styles.sectionAlt}>
        <div className={styles.container}>
          <div className={styles.sectionLabel}>Como Funciona</div>
          <h2 className={styles.sectionTitle}>Do diagnóstico à aprovação</h2>
          <p className={styles.sectionSub}>
            Um processo guiado que te coloca no caminho certo desde o primeiro dia.
          </p>

          <div className={styles.steps}>
            <div className={styles.step}>
              <div className={styles.stepNum}>1</div>
              <div>
                <h3>Diagnóstico Inicial</h3>
                <p>Faça uma autoavaliação rápida nas 4 áreas do ENEM para mapear seus pontos fortes e fracos. Em 2 minutos o sistema já entende seu perfil e cria uma estratégia.</p>
              </div>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNum}>2</div>
              <div>
                <h3>Plano Gerado por IA</h3>
                <p>Com base no diagnóstico e nos dias restantes até o ENEM, o sistema gera um cronograma semanal com sprints temáticos, revisão espaçada e metas diárias.</p>
              </div>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNum}>3</div>
              <div>
                <h3>Estude, Pratique, Simule</h3>
                <p>Siga o plano, resolva questões reais do banco, faça simulados com score TRI e submeta redações para análise. A plataforma acompanha cada sessão.</p>
              </div>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNum}>4</div>
              <div>
                <h3>Analise seu Progresso</h3>
                <p>Veja sua evolução em tempo real, compare com médias históricas do ENEM, receba previsão de score e identifique exatamente o que precisa melhorar.</p>
              </div>
            </div>
            <div className={styles.step}>
              <div className={styles.stepNum}>5</div>
              <div>
                <h3>Sprint Final</h3>
                <p>Nas últimas semanas, o modo contingência entra em ação: prioridades reorganizadas, sessões turbo de 15 minutos e simulados diários. Chegue confiante no dia H.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── PRICING ── */}
      <section id="planos" className={styles.section}>
        <div className={styles.container}>
          <div className={styles.sectionLabel}>Planos e Preços</div>
          <h2 className={styles.sectionTitle}>Invista na sua aprovação</h2>
          <p className={styles.sectionSub}>
            Um cursinho custa R$ 800–R$ 2.000/mês. O ENEM Pro custa menos que um jantar fora.
          </p>

          <div className={styles.pricingGrid}>

            <div className={styles.priceCard}>
              <div className={styles.pricePlan}>1 Mês</div>
              <div className={styles.priceVal}>R$ 29<span>,90/mês</span></div>
              <div className={styles.priceDesc}>Para começar e testar a plataforma.</div>
              <ul className={styles.priceFeatures}>
                <li>Plano de estudos personalizado por IA</li>
                <li>Banco de questões ilimitado</li>
                <li>Simulados ilimitados + score TRI</li>
                <li>Correção de redação por IA</li>
                <li>Análise de desempenho completa</li>
                <li>App instalável (PWA)</li>
              </ul>
              <Link href="/register" className={`${styles.priceBtn} ${styles.priceBtnOutline}`}>
                Assinar — 1 mês
              </Link>
            </div>

            <div className={`${styles.priceCard} ${styles.priceCardFeatured}`}>
              <div className={styles.popularBadge}>MAIS POPULAR</div>
              <div className={styles.pricePlan}>3 Meses</div>
              <div className={styles.priceVal}>R$ 79<span>,90/trimestre</span></div>
              <div className={styles.priceDiscount}>−11% · R$ 26,63/mês</div>
              <div className={styles.priceDesc}>Tempo suficiente para ver resultado real.</div>
              <ul className={styles.priceFeatures}>
                <li>Tudo do plano mensal</li>
                <li>Score TRI evoluindo semana a semana</li>
                <li>Economia de R$ 9,80 vs. mensal</li>
              </ul>
              <Link href="/register" className={`${styles.priceBtn} ${styles.priceBtnGrad}`}>
                Assinar — 3 meses
              </Link>
            </div>

            <div className={styles.priceCard}>
              <div className={styles.pricePlan}>6 Meses</div>
              <div className={styles.priceVal}>R$ 149<span>,90/semestre</span></div>
              <div className={styles.priceDiscount}>−17% · R$ 24,98/mês</div>
              <div className={styles.priceDesc}>Cobre todo o período até o ENEM.</div>
              <ul className={styles.priceFeatures}>
                <li>Tudo dos planos anteriores</li>
                <li>Melhor custo-benefício</li>
                <li>Economia de R$ 29,50 vs. mensal</li>
              </ul>
              <Link href="/register" className={`${styles.priceBtn} ${styles.priceBtnOutline}`}>
                Assinar — 6 meses
              </Link>
            </div>

          </div>

          <p style={{ textAlign: "center", marginTop: "2rem", color: "var(--text-faint)", fontSize: "0.85rem" }}>
            Pagamento seguro via Stripe &middot; Cancele quando quiser &middot; Sem fidelidade
          </p>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className={styles.ctaSection}>
        <div className={styles.container}>
          <div className={styles.ctaBox}>
            <div className={styles.sectionLabel} style={{ textAlign: "center" }}>Comece Hoje</div>
            <h2 className={styles.ctaTitle}>
              O ENEM não espera.<br />Você também não deveria.
            </h2>
            <p className={styles.ctaSub}>
              Crie sua conta, faça o diagnóstico e receba seu plano personalizado em minutos.
              Acesso imediato após assinar.
            </p>
            <div className={styles.ctaBtns}>
              <Link href="/register" className={styles.btnPrimary}>Criar minha conta</Link>
              <Link href="/login" className={styles.btnOutline}>Já tenho conta</Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className={styles.footer}>
        <p>
          &copy; 2026 ENEM Pro &middot; Todos os direitos reservados &middot;{" "}
          <Link href="/termos">Termos de Uso</Link> &middot;{" "}
          <Link href="/privacidade">Privacidade</Link>
        </p>
      </footer>

      {/* Countdown script */}
      <Script id="countdown" strategy="afterInteractive">{`
        (function() {
          var target = new Date('2026-11-08T00:00:00-03:00').getTime();
          function pad(n) { return String(n).padStart(2, '0'); }
          function tick() {
            var diff = target - Date.now();
            if (diff <= 0) { diff = 0; }
            var days  = Math.floor(diff / 86400000);
            var hours = Math.floor((diff % 86400000) / 3600000);
            var mins  = Math.floor((diff % 3600000)  / 60000);
            var secs  = Math.floor((diff % 60000)    / 1000);
            var d = document.getElementById('cd-dias');
            var h = document.getElementById('cd-horas');
            var m = document.getElementById('cd-min');
            var s = document.getElementById('cd-seg');
            if (d) d.textContent = pad(days);
            if (h) h.textContent = pad(hours);
            if (m) m.textContent = pad(mins);
            if (s) s.textContent = pad(secs);
          }
          tick();
          setInterval(tick, 1000);
        })();
      `}</Script>

    </div>
  )
}
