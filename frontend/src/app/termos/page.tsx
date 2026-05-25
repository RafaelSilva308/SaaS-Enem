import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Termos de Uso — ENEM Pro",
}

const SECTIONS = [
  {
    title: "1. Aceitação dos termos",
    content: `Ao criar uma conta no ENEM Pro, você concorda com estes Termos de Uso. Se não concordar com algum ponto, não utilize o serviço.`,
  },
  {
    title: "2. Descrição do serviço",
    content: `O ENEM Pro é uma plataforma SaaS de preparação para o ENEM que oferece:
• Plano de estudos personalizado gerado com IA com base em diagnóstico inicial.
• Banco de questões com mais de 500 questões das edições 2019–2024.
• Simulados adaptativos com algoritmo TRI (Teoria de Resposta ao Item).
• Correção de redação por IA (Gemini Flash / GPT-4o) avaliando as 5 competências do ENEM.
• Gamificação (XP, streaks, badges, ranking).
• Notificações inteligentes sobre progresso e atrasos.`,
  },
  {
    title: "3. Planos e pagamentos",
    content: `3.1. Oferecemos um plano gratuito (Freemium) com funcionalidades limitadas e planos pagos (Premium) com acesso completo.
3.2. Os preços são: R$59,90/mês, R$99,90/trimestre ou R$149,90/semestre, cobrados via Stripe (cartão de crédito).
3.3. Planos pagos incluem 7 dias de período de teste gratuito.
3.4. O cancelamento pode ser feito a qualquer momento. O acesso permanece ativo até o final do período pago.
3.5. Não há reembolso proporcional por cancelamento antecipado, exceto em casos previstos pelo Código de Defesa do Consumidor.`,
  },
  {
    title: "4. Conta do usuário",
    content: `4.1. Você é responsável por manter a confidencialidade de sua senha.
4.2. É proibida a criação de contas falsas ou o compartilhamento de credenciais entre usuários.
4.3. Reservamo-nos o direito de suspender contas que violem estes termos.
4.4. Você pode excluir sua conta a qualquer momento em Configurações → Excluir conta.`,
  },
  {
    title: "5. Uso aceitável",
    content: `É proibido:
• Usar o serviço para fins ilegais ou que violem direitos de terceiros.
• Tentar acessar áreas restritas ou comprometer a segurança da plataforma.
• Realizar engenharia reversa, scraping ou reprodução do conteúdo sem autorização.
• Compartilhar o acesso à plataforma com outros usuários (cada conta é individual).`,
  },
  {
    title: "6. Propriedade intelectual",
    content: `6.1. O conteúdo gerado pelos usuários (redações, respostas) pertence ao próprio usuário.
6.2. O conteúdo da plataforma (questões, algoritmos, design, código) é propriedade do ENEM Pro ou de seus licenciantes.
6.3. As questões do ENEM são de domínio público (INEP/MEC) e utilizadas nos termos da legislação vigente.`,
  },
  {
    title: "7. Limitação de responsabilidade",
    content: `7.1. O ENEM Pro não garante resultado específico no ENEM ou em qualquer processo seletivo.
7.2. O serviço é fornecido "como está". Não nos responsabilizamos por interrupções temporárias de serviço.
7.3. Nossa responsabilidade está limitada ao valor pago pelo usuário nos últimos 12 meses.`,
  },
  {
    title: "8. Modificações",
    content: `Podemos alterar estes Termos com aviso prévio de 30 dias por e-mail. O uso continuado do serviço após a notificação implica aceitação das mudanças.`,
  },
  {
    title: "9. Lei aplicável",
    content: `Estes Termos são regidos pela legislação brasileira. Fica eleito o foro da Comarca de São Paulo/SP para dirimir quaisquer controvérsias.`,
  },
  {
    title: "10. Contato",
    content: `Dúvidas sobre estes Termos: contato@enemproapp.com.br`,
  },
]

export default function TermosPage() {
  return (
    <div className="min-h-dvh bg-background">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 inline-block">
          ← Voltar
        </Link>

        <h1 className="text-3xl font-bold mb-2">Termos de Uso</h1>
        <p className="text-muted-foreground mb-10">
          Última atualização: 20 de maio de 2026 · ENEM Pro (SaaS ENEM Ltda.)
        </p>

        <div className="space-y-8">
          {SECTIONS.map(s => (
            <section key={s.title}>
              <h2 className="text-lg font-semibold mb-3">{s.title}</h2>
              <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {s.content}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-12 pt-8 border-t border-border text-sm text-muted-foreground">
          <Link href="/privacidade" className="hover:text-foreground transition-colors">Política de Privacidade</Link>
          {" · "}
          <Link href="/" className="hover:text-foreground transition-colors">ENEM Pro</Link>
        </div>
      </div>
    </div>
  )
}
