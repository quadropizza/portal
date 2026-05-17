"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export function Header({ userName }: { userName: string }) {
  const router = useRouter();
  const supabase = createClient();

  async function sair() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="h-16 bg-creme-claro border-b-4 border-preto flex items-center justify-between px-8">
      <div>
        <div className="eyebrow">// LOGADO COMO</div>
        <div className="font-[family-name:var(--font-subtitulo)]">{userName}</div>
      </div>
      <button
        onClick={sair}
        className="flex items-center gap-2 text-sm font-[family-name:var(--font-subtitulo)] hover:text-vermelho transition"
      >
        <LogOut size={16} />
        Sair
      </button>
    </header>
  );
}
