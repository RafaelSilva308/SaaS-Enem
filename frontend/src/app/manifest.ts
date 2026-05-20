import type { MetadataRoute } from "next"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ENEM Pro",
    short_name: "ENEM Pro",
    description: "Sua aprovação começa aqui — plano de estudos, simulados e redação com IA",
    start_url: "/app/dashboard",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0f172a",
    theme_color: "#1e3a8a",
    categories: ["education"],
    lang: "pt-BR",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon-maskable.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Plano de Estudos",
        url: "/app/plano",
        description: "Acesse seu plano semanal",
      },
      {
        name: "Novo Simulado",
        url: "/app/simulados",
        description: "Iniciar um simulado",
      },
    ],
  }
}
