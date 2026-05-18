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
    <header className="h-14 md:h-16 bg-creme-claro border-b-4 border-preto flex items-center justify-between px-4 md:px-8">
      <div className="pl-12 md:pl-0">
        <div className="eyebrow text-[9px] md:text-[10px]">// LOGADO COMO</div>
        <div className="font-[family-name:var(--font-subtitulo)] text-sm md:text-base truncate max-w-[180px] md:max-w-none">{userName}</div>
      </div>
      <button
        onClick={sair}
        className="flex items-center gap-1.5 text-xs md:text-sm font-[family-name:var(--font-subtitulo)] hover:text-vermelho transition"
      >
        <LogOut size={14} />
        Sair
      </button>
    </header>
  );
}
