import { PlaceholderPage } from "@/components/app/placeholder-page";

export const metadata = {
  title: "Configurações",
};

export default function ConfiguracoesPage() {
  return (
    <PlaceholderPage
      title="Configurações"
      badge="Parcial · Fase 2"
      description="Esta tela será expandida ao longo da Fase 2 com 3 abas: Perfil (dados da empresa, slug, canais conectados), Plano (uso atual e upgrade) e Equipe (convidar membros, permissões). No momento o cadastro inicial da empresa acontece via /onboarding."
      variant="parcial"
    />
  );
}
