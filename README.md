# Quadrô Portal

Plataforma de gestão da **Quadrô Pizza** — pizzaria artesanal em Itajaí/SC,
ao lado da Univali.

> ⚠️ **Repositório privado.** Anexos com dados financeiros reais
> (extratos bancários, NFs em aberto, relatórios de venda, DRE)
> **nunca** são versionados — ficam só no Supabase Storage.
> Veja `.gitignore`.

## O que é

Sistema interno que substitui a planilha + protótipo estático atual por uma
plataforma completa de gestão:

- 📊 Dashboard de vendas e horários de pico (PDF do PDV Fast Report)
- 📦 Estoque duplo — insumos (kg/un) e pizzas prontas (lote 3x/semana)
- 💸 Importação de extrato Sicredi (**só saídas**, decisão §7.13) com categorização automática
- 📄 Obrigações a pagar cobrindo NF de fornecedor, boleto avulso, DARF e FGTS
- 📋 DRE mensal com duas visões de lucro (operacional vs sócio)
- 🤖 Plano de ação **automático** gerado todo dia 1 com base no mês que fechou
- ✨ Insights positivos e negativos (não é só alertômetro de problema)
- 🟡 Painel **"Tá faltando preencher"** mostra toda lacuna (produto sem ficha, insumo com custo seed, etc)

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js 15 (App Router) + TypeScript + Tailwind v4 |
| UI | Componentes próprios neo-brutalistas com tokens da marca |
| Backend | Supabase (Postgres + Auth + Storage + Edge Functions) |
| Estado servidor | TanStack Query |
| Deploy | Vercel (front) + Supabase (back) |
| Custo | US$ 0-25/mês no começo |

## Estrutura do projeto

```
app/
  (auth)/login/                  tela de login fechada
  (dashboard)/
    layout.tsx                   sidebar + header + auth check
    visao-geral/                 dashboard inicial
    vendas/dia/                  alimentar venda diária
    estoque/insumos/             lista de insumos
    financeiro/saidas/           categorização de extrato
    notas-fiscais/               upload XML/PDF/foto
    dre/                         DRE mensal
    plano-de-acao/               checklist automático
    catalogo/produtos/           CRUD produtos + ficha técnica
    configuracoes/
components/
  ui/                            Card, Button, EyebrowTitle
  layout/                        Sidebar, Header
  painel-lacunas.tsx             "Tá faltando preencher" (§7.23)
lib/
  supabase/{client,server,middleware}.ts
  utils.ts                       fmtBR, fmtPct, fmtDataBR
  parsers/                       pdv-pdf, nfe-xml, extrato-sicredi (em construção)
supabase/
  migrations/
    20260516000000_initial_schema.sql       todas as 25+ tabelas + views + triggers
    20260516000001_rls_policies.sql         RLS multi-empresa-ready
    20260516000002_seed_quadro.sql          empresa + 26 produtos + 8 fichas técnicas
types/supabase.ts                gerar com `npm run db:types` após linkar projeto
```

## Setup

### 1. Dependências
```bash
npm install
```

### 2. Supabase
```bash
# 1. Criar projeto em https://supabase.com/dashboard
# 2. Linkar
npx supabase login
npx supabase link --project-ref <SEU_REF>

# 3. Aplicar migrations
npm run db:push

# 4. Gerar tipos TypeScript
npm run db:types

# 5. Criar os 2 usuários no Supabase Console (Auth → Users → Add user)
#    - lucasgabrieldossantos@quadropizza.local · senha definida no setup
#    - alessandrafurlani@quadropizza.local · senha definida no setup
#    Marcar "Auto-confirm user" e DESATIVAR signup público em Auth → Settings
#    Decisão §7.22 do CLAUDE.md: auth fechada, sem signup nem reset no app.
#
# 6. Inserir registros em `usuario` linkando aos auth users:
#    insert into usuario (id, empresa_id, nome, email, perfil)
#    select id, '11111111-...', 'Lucas Gabriel dos Santos', email, 'dono'
#    from auth.users where email = 'lucasgabrieldossantos@quadropizza.local';
```

### 3. Variáveis de ambiente
```bash
cp .env.example .env.local
# preencher NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### 4. Rodar
```bash
npm run dev
# abre em http://localhost:3000
```

## Documentação canônica

**Tudo que importa está no [`CLAUDE.md`](./CLAUDE.md):**
- Identidade visual e tokens
- Modelagem de dados (todas as 25+ tabelas)
- 23 decisões já tomadas (não reabrir sem motivo forte)
- Motor de regras de insights (R001-R008, V001-V010, P001-P009)
- Roadmap em 9 fases
- Catálogo de parsers (Fast Report, Sicredi, NF-e, boletos, DARF, FGTS)

## Status

**Fase 0** ✅ protótipo estático com dados de abril/2026 hard-coded.

**Fase 1** ✅ **fundação backend** — você está aqui:
- Schema completo do banco (25+ tabelas, RLS, audit log, triggers, view de DRE, view de lacunas)
- Seed da Quadrô (empresa, 27 categorias, 16 insumos, 26 produtos, 8 fichas técnicas como seed)
- Next.js 15 + Tailwind v4 + Supabase clients
- Tela de login fechada (Lucas + Alessandra)
- Layout do dashboard com sidebar/header
- Visão Geral lendo DRE do banco
- Painel "Tá faltando preencher" cobrindo 6 tipos de lacuna
- Placeholders das outras 8 telas

**Fase 2** ⏭️ vendas e horários de pico — próximo passo.

## Quadrô Pizza

- **CNPJ:** 60.723.998/0001-84
- **Endereço:** Rua Uruguai 458 (Bloco C2), Itajaí/SC
- **Sócios operacionais:** Lucas Gabriel dos Santos e Alessandra Furlani
- **Contato:** 47 99766-1485
