"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

/**
 * Login fechado · só 2 usuários (Lucas e Alessandra).
 * Decisão §7.22 do CLAUDE.md: sem signup, sem reset dentro do app.
 *
 * O Supabase Auth aceita só email — então internamente usamos
 * `<username>@quadropizza.local` como email sintético. Pro usuário,
 * basta digitar o username sem domínio.
 */
const SUFIXO_EMAIL = "@quadropizza.local";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [usuario, setUsuario] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    setLoading(true);
    const email = usuario.trim().toLowerCase() + SUFIXO_EMAIL;
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
    setLoading(false);
    if (error) {
      setErro("Usuário ou senha incorretos.");
      return;
    }
    router.push("/visao-geral");
    router.refresh();
  }

  return (
    <main className="min-h-screen bg-creme flex items-center justify-center p-6">
      <div className="card-bruto card-bruto-lg w-full max-w-md bg-white">
        <div className="text-center mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="Quadrô" className="w-64 h-auto mx-auto mb-4" />
          <div className="text-sm font-[family-name:var(--font-mono)] text-preto/60">
            portal de gestão
          </div>
        </div>

        <form onSubmit={entrar} className="space-y-4">
          <div>
            <label className="eyebrow block mb-1">Usuário</label>
            <input
              type="text"
              required
              autoComplete="username"
              autoFocus
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              className="w-full px-4 py-3 border-3 border-preto rounded-xl bg-creme-claro font-[family-name:var(--font-corpo)] focus:outline-none focus:ring-4 focus:ring-amarelo"
              placeholder="lucasgabrieldossantos"
            />
          </div>

          <div>
            <label className="eyebrow block mb-1">Senha</label>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full px-4 py-3 border-3 border-preto rounded-xl bg-creme-claro font-[family-name:var(--font-corpo)] focus:outline-none focus:ring-4 focus:ring-amarelo"
            />
          </div>

          {erro && (
            <div className="bg-vermelho text-white border-3 border-preto rounded-xl px-4 py-3 text-sm font-[family-name:var(--font-subtitulo)]">
              {erro}
            </div>
          )}

          <Button type="submit" disabled={loading} className="w-full" variant="vermelho">
            {loading ? "Entrando..." : "Entrar"}
          </Button>
        </form>

        <div className="mt-6 pt-6 border-t-2 border-dashed border-preto/20 text-xs text-center text-preto/50 font-[family-name:var(--font-mono)]">
          uso interno · acesso restrito<br />
          Lucas / Alessandra
        </div>
      </div>
    </main>
  );
}
