# Quadrô Portal

Plataforma de gestão da **Quadrô Pizza** — pizzaria artesanal em Itajaí/SC,
ao lado da Univali.

> ⚠️ **Repositório privado.** Anexos com dados financeiros reais (extratos
> bancários, NFs em aberto, relatórios de venda, ficha técnica de custos)
> **nunca** são versionados — ficam só no Supabase Storage. Veja `.gitignore`.

## O que é

Sistema interno que substitui a planilha + protótipo estático atual por uma
plataforma com:

- 📊 Dashboard de vendas e horários de pico (alimentado por upload do PDF do PDV Fast Report)
- 📦 Estoque duplo — insumos (kg/un) e pizzas prontas (lote 3x/semana, validade 10 dias)
- 💸 Importação de extrato Sicredi com categorização automática e conciliação com NFs em aberto
- 📄 NFs em aberto cobrindo NF de fornecedor, boleto avulso, DARF e FGTS
- 📋 DRE mensal com duas visões de lucro (operacional vs sócio)
- 🤖 Plano de ação **automático** gerado todo dia 1 com base no mês que fechou
- ✨ Insights positivos e negativos (não é só alertômetro de problema)

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js 15 (App Router) + TypeScript + Tailwind v4 |
| UI | shadcn/ui customizado com tokens da marca |
| Backend | Supabase (Postgres + Auth + Storage + Edge Functions) |
| Deploy | Vercel (front) + Supabase (back) |
| Custo | US$ 0-25/mês no começo |

## Documentação canônica

**Tudo que importa está no [`CLAUDE.md`](./CLAUDE.md):**
- Identidade visual e tokens
- Modelagem de dados (todas as tabelas)
- Decisões já tomadas (não reabrir sem motivo forte)
- Motor de regras de insights (R001-R008, V001-V010, P001-P009)
- Roadmap em 9 fases
- Catálogo de parsers (Fast Report, Sicredi, NF-e, boletos, DARF, FGTS)

Esse arquivo é o briefing pra qualquer pessoa (ou IA) que entrar no projeto.
Leia inteiro antes de tocar em código.

## Status atual

**Fase 0** (concluída): protótipo estático em HTML com dados de abril/2026
hard-coded — publicado em
[fariasmendonsa-lgtm.github.io/drequadroabril](https://fariasmendonsa-lgtm.github.io/drequadroabril/).

**Fase 1** (em planejamento): Next.js + Supabase + schema do banco.

## Quadrô Pizza

- **CNPJ:** 60.723.998/0001-84
- **Endereço:** Rua Uruguai 458, Itajaí/SC (Bloco C2, ao lado do Teatro da Univali)
- **Sócios operacionais:** Lucas e Alessandra
- **Contato:** 47 99766-1485

## Licença

Privado — uso interno da Quadrô Pizza.
