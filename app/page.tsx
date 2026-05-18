import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Index() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data } = await supabase.from("usuario").select("perfil").eq("id", user.id).maybeSingle();
  const perfil = (data as { perfil?: string } | null)?.perfil;
  if (perfil === "atendente") redirect("/visao-atendente");
  redirect("/visao-geral");
}
