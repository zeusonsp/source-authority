import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingForm } from "./onboarding-form";

export const metadata = {
  title: "Bem-vindo",
};

export default async function OnboardingPage() {
  // Layout (app) já garantiu requireAuth(). Aqui só checamos se o user já
  // tem membership — se sim, ele já passou do onboarding e deve ir pro
  // dashboard. Evita loop "/dashboard → /onboarding → /dashboard" caso o
  // usuário acesse /onboarding manualmente.
  const supabase = createClient();
  const { data: memberships } = await supabase
    .from("memberships")
    .select("id")
    .limit(1);

  if (memberships && memberships.length > 0) {
    redirect("/dashboard");
  }

  return (
    <div className="container py-12">
      <div className="mx-auto max-w-xl space-y-8">
        <div className="space-y-3">
          <span className="inline-flex rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
            Bem-vindo
          </span>
          <h1 className="text-3xl font-semibold tracking-tight">
            Vamos cadastrar sua empresa
          </h1>
          <p className="text-sm text-muted-foreground">
            Em menos de um minuto seu link mestre estará reservado e você terá
            acesso ao dashboard. Os campos abaixo podem ser editados depois em{" "}
            <span className="text-foreground">Configurações</span>.
          </p>
        </div>

        <OnboardingForm />
      </div>
    </div>
  );
}
