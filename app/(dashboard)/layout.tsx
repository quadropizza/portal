import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // O nome bonito vem da tabela `usuario`; fallback é o local-part do email
  const { data: perfil } = await supabase
    .from("usuario")
    .select("nome")
    .eq("id", user.id)
    .maybeSingle();
  const nome = (perfil as { nome?: string } | null)?.nome
    ?? user.email?.split("@")[0]
    ?? "Usuário";

  return (
    <div className="min-h-screen flex bg-creme">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header userName={nome} />
        <main className="flex-1 p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
