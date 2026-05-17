import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: perfilRow } = await supabase
    .from("usuario")
    .select("nome, perfil")
    .eq("id", user.id)
    .maybeSingle();
  const perfil = (perfilRow as { nome?: string; perfil?: string } | null);
  const nome = perfil?.nome ?? user.email?.split("@")[0] ?? "Usuário";
  const isAtendente = perfil?.perfil === "atendente";

  // Atendente só acessa /estoque/contagem-pizza e /fiados
  if (isAtendente) {
    const h = await headers();
    const path = h.get("x-pathname") ?? h.get("next-url") ?? "";
    const allowed = ["/estoque/contagem-pizza", "/fiados", "/visao-atendente"];
    if (path && !allowed.some((p) => path.startsWith(p))) {
      redirect("/visao-atendente");
    }
  }

  return (
    <div className="min-h-screen flex bg-creme">
      <Sidebar perfil={perfil?.perfil ?? "dono"} />
      <div className="flex-1 flex flex-col">
        <Header userName={nome} />
        <main className="flex-1 p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
