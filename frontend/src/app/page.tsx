import Link from "next/link"

export default function Home() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4">
      <div className="glass rounded-3xl p-12 text-center max-w-lg w-full glow-blue">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-brand mb-6">
          <span className="text-2xl font-bold text-white">E</span>
        </div>
        <h1 className="text-4xl font-bold text-gradient-brand mb-3">SaaS ENEM</h1>
        <p className="text-muted-foreground mb-8 text-lg leading-relaxed">
          Plano de estudos personalizado, simulados inteligentes e correção de redação por IA.
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Link
            href="/login"
            className="px-6 py-3 rounded-xl gradient-blue text-white font-semibold hover:opacity-90 transition-opacity"
          >
            Entrar
          </Link>
          <Link
            href="/register"
            className="px-6 py-3 rounded-xl glass border border-white/10 text-white font-semibold hover:border-white/20 transition-colors"
          >
            Criar conta grátis
          </Link>
        </div>
      </div>
    </main>
  )
}
