import Link from "next/link"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Política de Privacidade — ENEM Pro",
}

const SECTIONS = [
  {
    title: "1. Dados que coletamos",
    content: `Coletamos apenas os dados necessários para a prestação dos nossos serviços:
• Dados de cadastro: nome, e-mail, data de nascimento e senha (armazenada com hash bcrypt).
• Dados de uso: sessões de estudo, respostas de questões, redações enviadas e resultados de simulados.
• Dados de pagamento: processados diretamente pelo Stripe — não armazenamos dados de cartão.
• Dados técnicos: endereço IP para rate-limiting e tokens JWT para autenticação.`,
  },
  {
    title: "2. Como usamos seus dados",
    content: `Seus dados são usados exclusivamente para:
• Personalizar seu plano de estudos com base no diagnóstico inicial.
• Corrigir redações com auxílio de IA (Gemini Flash / GPT-4o).
• Calcular seu progresso, nível e gamificação.
• Enviar notificações sobre atrasos no plano, conquistas e lembretes de estudo.
• Processar pagamentos e gerenciar assinaturas.`,
  },
  {
    title: "3. Base legal (LGPD)",
    content: `Processamos seus dados com base nos seguintes fundamentos legais (Lei 13.709/2018):
• Execução de contrato: dados necessários para prestação do serviço contratado.
• Consentimento: notificações push e e-mail de marketing (você pode revogar a qualquer momento).
• Legítimo interesse: segurança da plataforma, prevenção de fraudes e análise de desempenho agregado.`,
  },
  {
    title: "4. Compartilhamento de dados",
    content: `Não vendemos seus dados. Compartilhamos apenas com:
• Stripe (processamento de pagamentos) — sujeito à política de privacidade do Stripe.
• Resend (envio de e-mails transacionais) — apenas e-mail de destino e conteúdo da mensagem.
• Anthropic / Google (IA para correção de redação) — apenas o texto da redação, sem PII associada.
• Neon / Railway (hospedagem de banco de dados e backend) — dados armazenados em servidores seguros.`,
  },
  {
    title: "5. Seus direitos (LGPD Art. 18)",
    content: `Você tem direito a:
• Confirmar a existência de tratamento e acessar seus dados.
• Corrigir dados incompletos, inexatos ou desatualizados.
• Portabilidade: exporte todos os seus dados em JSON via Configurações → Exportar meus dados.
• Exclusão: delete sua conta a qualquer momento em Configurações → Excluir conta. Seus dados serão anonimizados imediatamente.
• Revogação de consentimento para notificações push e e-mails de marketing.
• Apresentar reclamação à ANPD (Autoridade Nacional de Proteção de Dados).`,
  },
  {
    title: "6. Retenção de dados",
    content: `Mantemos seus dados pelo período necessário para a prestação do serviço. Após a exclusão da conta, os dados são anonimizados imediatamente. Registros financeiros são mantidos por 5 anos conforme obrigação legal fiscal.`,
  },
  {
    title: "7. Segurança",
    content: `Adotamos medidas técnicas e organizacionais para proteger seus dados:
• Senhas armazenadas com bcrypt (salt único por usuário).
• Comunicação via HTTPS com TLS 1.2+.
• Tokens JWT com expiração curta (15 min) e refresh token rotativo.
• Rate limiting em todas as rotas de autenticação.
• Headers de segurança HTTP (HSTS, CSP, X-Frame-Options).`,
  },
  {
    title: "8. Cookies",
    content: `Utilizamos apenas cookies essenciais para autenticação (session cookie httpOnly) e preferências de tema. Não utilizamos cookies de rastreamento de terceiros para publicidade.`,
  },
  {
    title: "9. Contato",
    content: `Para exercer seus direitos ou tirar dúvidas sobre privacidade, entre em contato:
E-mail: privacidade@saas-enem.com.br
Encarregado de dados (DPO): disponível no e-mail acima.`,
  },
]

export default function PrivacidadePage() {
  return (
    <div className="min-h-dvh bg-background">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors mb-8 inline-block">
          ← Voltar
        </Link>

        <h1 className="text-3xl font-bold mb-2">Política de Privacidade</h1>
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
          <Link href="/termos" className="hover:text-foreground transition-colors">Termos de Uso</Link>
          {" · "}
          <Link href="/" className="hover:text-foreground transition-colors">ENEM Pro</Link>
        </div>
      </div>
    </div>
  )
}
