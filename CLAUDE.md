# CLAUDE.md · Quadrô Pizza · Plataforma de Gestão

> Este arquivo é o briefing do projeto para o Claude Code (e qualquer IA/dev
> que entre depois). Leia tudo antes de codar. Atualize sempre que tomar uma
> decisão arquitetural ou mudar escopo.

---

## 1. Visão geral

**Nome interno:** Quadrô Portal
**Repositório base (protótipo estático Fase 0):** `fariasmendonsa-lgtm/drequadroabril`
**URL do protótipo atual:** `https://fariasmendonsa-lgtm.github.io/drequadroabril/`
**Uso:** **pessoal** da Quadrô Pizza (não é produto multi-tenant — ainda).
**Estado atual:** protótipo estático em `index.html` publicado no GitHub Pages,
com dados de abril/2026 hard-coded e checklist em `localStorage`.

**O que vamos construir agora:** plataforma com backend real, alimentação
diária via anexos (PDF do PDV, NF-e em XML, extrato Sicredi), dashboards de
faturamento e horários de pico, gestão de estoque dupla (insumos + pizzas
prontas), DRE com duas visões de lucro, plano de ação automático com regras
de negócio, e camada de insights tanto financeiros quanto de vendas.

---

## 2. Sobre o negócio

**Empresa:** Quadrô Pizza · CNPJ 60.723.998/0001-84 · Razão social: QUADRO PIZZA LTDA
**Endereço:** Rua Uruguai 458, Itajaí/SC · ao lado do Teatro da Univali (Bloco C2)
**Contato:** 47 99766-1485
**Banco principal:** Sicredi · Cooperativa 2606 · Conta 39803-4
**Sistema PDV atual:** Fast Report (vendedor: LIVN Software)
**Proposta:** pizza artesanal de formato único ("quadrô"), preço acessível,
público principal são estudantes da Univali.

**Operação real (afeta a modelagem):**
- Loja **não opera todos os dias** (em abril/2026, 10 dias fechados — fins de semana e algumas segundas)
- Pizzas são **produzidas ~3x por semana em lote**, congeladas, e vendidas ao longo dos dias seguintes
- Vida útil de pizza pronta congelada: **~10 dias** (gerar alerta de perda)
- Equipe: 2 atendentes (Mariana Gabriela, Samara Cristina)
- 2 sócios trabalhando na operação: **Lucas** e **Alessandra** (cada um com retirada própria)

### Identidade visual (NÃO DILUIR)

```css
--vermelho:         #D32027
--vermelho-escuro:  #9E1015
--amarelo:          #FFC528
--amarelo-escuro:   #E5A800
--creme:            #F2E8D5
--creme-claro:      #F8F1E0
--preto:            #1A1410
--verde:            #2E7D32
--verde-claro:      #4CAF50
--laranja:          #E8742C
```

Fontes (Google Fonts):
- **Bowlby One** — títulos chunky retrô
- **Archivo Black** — subtítulos / labels
- **Space Mono** — números, códigos, eyebrows tipo `// 01 · BLOCO`
- **DM Sans** — corpo

Padrões: faixa xadrez decorativa, sombras sólidas pretas (neo-brutalista),
bordas pretas 2.5-3px, cards arredondados 16-24px, estrelinhas amarelas como
ornamento, tags rotacionadas levemente.

Tom da copy: direto e brasileiro coloquial ("tá pedindo ajuste", "no
vermelho", "a casa fechou"). **Nunca consultoria corporativa formal.**

---

## 3. Arquitetura

### 3.1 Stack confirmado

- **Frontend:** Next.js 15 (App Router) + TypeScript + Tailwind v4
- **UI base:** shadcn/ui customizado com os tokens da §2
- **Gráficos:** Recharts
- **Forms:** react-hook-form + zod
- **Estado servidor:** TanStack Query
- **Estado cliente:** Zustand (quando precisar)
- **Backend:** **Supabase**
  - Postgres + Row Level Security
  - Auth (email + senha; sem login social na v1)
  - Storage para anexos (PDFs do PDV, XMLs de NF-e, PDFs de extrato)
  - Edge Functions (Deno) para parsers
- **Deploy:** Vercel (frontend) + Supabase (backend)
- **Custo esperado:** US$ 0-25/mês no começo

### 3.2 Por que Supabase

Auth + Postgres + Storage + Edge Functions num único serviço; RLS resolve
isolamento de dados (mesmo em uso pessoal, deixa pronto pra multi-empresa no
futuro); free tier aguenta o uso de uma loja por bastante tempo; integração
nativa com Next.js.

### 3.3 Estrutura de pastas

```
app/
  (auth)/login
  (dashboard)/
    visao-geral/                   dashboard inicial
    vendas/
      dia/                          alimentar venda diária + anexo PDV
      horarios/                     pico por horário/dia da semana
      produtos/                     vendas por item
      insights/                     insights de vendas (ver §6.2)
    estoque/
      insumos/                      lista, custo médio, alertas de preço
      pizzas/                       estoque de pizza pronta
      producao/                     registrar lote de produção
      contagem/                     contagem semanal + divergências
    financeiro/
      entradas/                     entradas via PDV (já vêm das vendas)
      saidas/                       categorização de saídas do extrato
      contas-a-pagar/               NFs em aberto + agendamento de pagamento
      categorias/                   gestão de categorias + regras automáticas
    notas-fiscais/                  upload XML/PDF + parsing
    dre/                            DRE mensal (operacional + sócio)
    plano-de-acao/                  checklist com regras automáticas
    catalogo/
      produtos/
      fichas-tecnicas/
      fornecedores/
    configuracoes/
  api/
    parse-pdv-pdf/
    parse-nfe-xml/
    parse-extrato-pdf/
components/
  ui/                              shadcn customizado com tokens
  charts/
  forms/
  layout/
lib/
  supabase/
  parsers/                         pdv-pdf, nfe-xml, extrato-sicredi
  rules-engine/                    motor de regras (ver §6)
  finance/                         DRE, breakeven, margens
  inventory/                       movimento de estoque, custo médio ponderado
types/
supabase/
  migrations/
  functions/                       edge functions
```

---

## 4. Fluxos operacionais (como o usuário vai usar de fato)

### 4.1 Diário (5 min)
1. Abre a aba **Vendas → Dia**
2. Anexa o PDF do Fast Report do dia anterior
3. Sistema extrai: qtd vendas, faturamento, formas de pagamento, vendas por item
4. **Baixa automaticamente** o estoque de pizza pronta (quantidade vendida por produto)
5. Usuário confere e confirma

### 4.2 Quando chega mercadoria (1 min por nota)
1. Abre **Notas Fiscais → Nova**
2. Anexa o XML da NF-e (ou PDF se não tiver XML)
3. Sistema parseia: fornecedor, itens, valores
4. Usuário vincula cada **item da nota a um insumo do catálogo** (apenas na primeira vez por item; depois fica memorizado)
5. Estoque de insumos é incrementado e custo médio é recalculado
6. **Alerta automático se o preço subiu significativamente** vs últimas compras

### 4.3 Ao produzir pizzas (~3x/semana, 2 min)
1. Abre **Estoque → Produção**
2. Lança quantas pizzas de cada sabor foram produzidas
3. Sistema **aumenta estoque de pizza pronta** e **baixa insumos** proporcional à ficha técnica

### 4.4 Contagem semanal (15 min)
1. Abre **Estoque → Contagem**
2. Escolhe se vai contar insumos, pizzas, ou ambos
3. Sistema mostra a **quantidade esperada** (calculada) ao lado do campo de quantidade real
4. Usuário lança o que contou; divergência é registrada e disponível em relatório

### 4.5 Quando recebe extrato (10 min)
1. Abre **Financeiro → Saídas → Importar extrato**
2. Anexa PDF do extrato Sicredi
3. Sistema lista todas as saídas
4. Para cada linha:
   - Se o fornecedor já está cadastrado com categoria padrão → sugere automaticamente
   - Se não está → usuário escolhe categoria
   - **Se a saída corresponde a uma NF em aberto, pode vincular** (paga a nota)
5. Usuário confirma o lote inteiro

### 4.6 Quando quer ver o resultado
1. Abre **DRE** → vê duas visões: lucro operacional e lucro do sócio
2. Abre **Plano de Ação** → vê o que o motor de regras sinalizou
3. Abre **Vendas → Insights** → vê tendências e oportunidades de vendas

---

## 5. Modelagem de dados

> RLS em todas as tabelas: `empresa_id = current_empresa()`. Hoje a empresa é
> fixa, mas o schema já contempla multi-empresa.

### 5.1 Núcleo

```sql
empresa (
  id uuid pk,
  nome text,
  cnpj text,
  endereco text,
  segmento text default 'pizzaria',
  metas jsonb default '{
    "cmv_maximo_pct": 35,
    "despesas_maximo_pct": 60,
    "ticket_medio_meta": 28,
    "pro_labore_max_pct_receita": 25
  }',
  created_at, updated_at
)

usuario (
  id uuid pk references auth.users,
  empresa_id uuid references empresa,
  nome text,
  email text,
  perfil text default 'dono',
  created_at
)

arquivo_anexo (
  id uuid pk,
  empresa_id uuid,
  bucket text,                    -- 'pdv','nfe','extrato'
  caminho text,                   -- caminho no Supabase Storage
  nome_original text,
  mime_type text,
  tamanho_bytes int,
  data_upload timestamptz,
  parsed bool default false,
  parsing_erro text null
)
```

### 5.2 Vendas

```sql
venda_diaria (
  id uuid pk,
  empresa_id uuid,
  data date,
  qtd_vendas int,
  faturamento_bruto decimal,
  pagamento_dinheiro decimal default 0,
  pagamento_pix decimal default 0,
  pagamento_cartao_credito decimal default 0,
  pagamento_cartao_debito decimal default 0,
  pagamento_voucher decimal default 0,
  pagamento_outros decimal default 0,
  arquivo_origem_id uuid references arquivo_anexo,
  unique(empresa_id, data)
)

venda_item (
  id uuid pk,
  empresa_id uuid,
  data date,
  produto_id uuid references produto,
  qtd_vendida int,
  valor_unitario decimal,
  valor_total decimal,
  arquivo_origem_id uuid references arquivo_anexo
)

-- Se o PDV exportar horário individual (a confirmar com usuário):
venda_individual (
  id uuid pk,
  empresa_id uuid,
  data_hora timestamptz,
  produto_id uuid,
  valor decimal,
  forma_pagamento text
)
```

> **Status atual da informação:** Fast Report exporta PDF. Falta confirmar
> se traz horário de cada venda. Se não trouxer, lançamento por **faixa
> horária manual** (almoço/jantar) ou inferência por padrão histórico será
> a alternativa.

### 5.3 Catálogo de produtos e fichas técnicas

```sql
produto (
  id uuid pk,
  empresa_id uuid,
  codigo text,                       -- "2","70","115" (do PDV)
  nome text,
  categoria text,                    -- 'pizza_grande','pizza_mini','bebida','sobremesa','outro'
  preco_venda decimal,
  produzido_em_lote bool default false,  -- pizzas grandes e mini = true; bebidas = false
  ativo bool default true
)

ficha_tecnica (
  id uuid pk,
  produto_id uuid references produto,
  versao int default 1,              -- histórico se receita mudar
  ativa bool default true,
  observacoes text
)

ficha_tecnica_item (
  id uuid pk,
  ficha_tecnica_id uuid,
  insumo_id uuid references insumo,
  quantidade decimal,                -- ex: 0.150
  unidade text                       -- 'kg','g','un','l','ml'
)
```

> O usuário **não tem ficha técnica documentada hoje**. A plataforma precisa
> de tela amigável de cadastro (passo zero antes de qualquer cálculo de
> estoque por venda funcionar). Sem ficha técnica preenchida, alertar.

### 5.4 Estoque duplo

```sql
insumo (
  id uuid pk,
  empresa_id uuid,
  nome text,                         -- "Queijo Mussarela", "Calabresa Aurora"
  unidade_padrao text,               -- 'kg','un','l'
  custo_medio_atual decimal,         -- recalculado a cada NF entrante (média ponderada)
  custo_origem text default 'seed',  -- 'seed' (do .docx, não confirmado por NF) | 'nf' (real) | 'manual' (digitado)
  ultimo_custo decimal,
  ultima_compra_data date,
  fornecedor_principal_id uuid references fornecedor,
  ativo bool default true
)
-- Quando custo_origem='seed', a UI mostra ícone amarelo e o insumo entra no
-- painel "Tá faltando preencher" — primeiro NF que vier substitui pra 'nf'.

estoque_insumo_movimento (
  id uuid pk,
  empresa_id uuid,
  data_hora timestamptz,
  insumo_id uuid,
  tipo text,                         -- 'entrada_nf','saida_producao','ajuste_contagem','perda'
  quantidade decimal,                -- positivo entrada, negativo saída
  custo_unitario decimal,            -- relevante em entradas
  origem_tipo text,                  -- 'nota_fiscal','producao','contagem','manual'
  origem_id uuid,
  observacao text
)

estoque_pizza_movimento (
  id uuid pk,
  empresa_id uuid,
  data_hora timestamptz,
  produto_id uuid,                   -- produtos com produzido_em_lote=true
  tipo text,                         -- 'producao','venda','perda','ajuste_contagem'
  quantidade int,
  origem_tipo text,
  origem_id uuid,
  observacao text
)

producao_lote (
  id uuid pk,
  empresa_id uuid,
  data date,
  produtor_nome text,
  observacoes text
)

producao_lote_item (
  id uuid pk,
  producao_lote_id uuid,
  produto_id uuid,
  quantidade int
)
-- Ao criar producao_lote_item, trigger gera:
--   1. estoque_pizza_movimento (entrada qtd, origem='producao')
--   2. estoque_insumo_movimento por cada item da ficha técnica × qtd produzida

contagem (
  id uuid pk,
  empresa_id uuid,
  data date,
  tipo text,                         -- 'insumo','pizza','ambos'
  observacoes text
)

contagem_item (
  id uuid pk,
  contagem_id uuid,
  insumo_id uuid null,
  produto_id uuid null,
  quantidade_contada decimal,
  quantidade_esperada decimal,
  divergencia decimal,
  valor_divergencia decimal          -- divergencia × custo_medio (insumo) ou × custo_pizza
)
```

### 5.5 Notas fiscais e fornecedores

```sql
fornecedor (
  id uuid pk,
  empresa_id uuid,
  cnpj text,
  nome text,                         -- razão social
  apelido text,                      -- "Copal", "Oesa", "Spal"
  categoria_padrao_id uuid references categoria_despesa,
  ativo bool default true,
  observacoes text
)

nota_fiscal (
  id uuid pk,
  empresa_id uuid,
  fornecedor_id uuid,
  numero text,
  serie text,
  chave_acesso text unique,          -- 44 dígitos NF-e
  data_emissao date,
  data_vencimento date null,
  valor_total decimal,
  status text default 'em_aberto',   -- 'em_aberto','pago','parcialmente_pago','cancelado'
  arquivo_xml_id uuid references arquivo_anexo,
  arquivo_pdf_id uuid references arquivo_anexo,
  parsed bool default false,
  observacoes text
)

nota_fiscal_item (
  id uuid pk,
  nota_fiscal_id uuid,
  descricao_original text,
  insumo_id uuid null,               -- vínculo manual na 1ª vez, depois automático
  ncm text,
  quantidade decimal,
  unidade text,
  valor_unitario decimal,
  valor_total decimal
)

nota_fiscal_pagamento (
  id uuid pk,
  nota_fiscal_id uuid,
  saida_id uuid references saida,
  valor decimal,
  data_pagamento date
)
```

### 5.6 Financeiro

```sql
categoria_despesa (
  id uuid pk,
  empresa_id uuid,
  nome text,                         -- "CMV", "Aluguel", "Pessoal Lucas", "Pessoal Alessandra"
  grupo text,                        -- 'cmv','folha','impostos','aluguel','bancarias','pro_labore_lucas','pro_labore_alessandra','outros'
  ordem int,
  ativa bool default true
)

-- IMPORTANTE: pro_labore_lucas e pro_labore_alessandra são DUAS categorias
-- separadas porque o usuário quer ver lucro com e sem retirada de cada sócio.

categoria_regra_automatica (
  id uuid pk,
  empresa_id uuid,
  fornecedor_id uuid null,           -- "TIM S A" → Telefone
  texto_descricao_contem text null,  -- regex/contém parcial
  categoria_id uuid,
  prioridade int                     -- maior primeiro
)

entrada (
  -- Entradas são geradas a partir de venda_diaria (não precisam ser lançadas
  -- separadamente). Esta tabela é para entradas atípicas: empréstimo recebido,
  -- aporte de sócio, devolução etc.
  id uuid pk,
  empresa_id uuid,
  data date,
  descricao text,
  valor decimal,
  categoria_id uuid,
  forma_recebimento text,
  observacoes text
)

saida (
  id uuid pk,
  empresa_id uuid,
  data date,
  descricao_original text,           -- como veio do extrato
  descricao text,                    -- editada pelo usuário se quiser
  valor decimal,
  categoria_id uuid,
  fornecedor_id uuid null,
  forma_pagamento text,              -- 'pix','boleto','cartao','dinheiro','debito_conta'
  arquivo_origem_id uuid references arquivo_anexo,  -- extrato que originou
  nota_fiscal_id uuid null,          -- se foi vinculada a uma NF em aberto
  observacoes text
)
```

### 5.7 Plano de ação

```sql
plano_acao_item (
  id uuid pk,
  empresa_id uuid,
  mes int,
  ano int,
  ordem int,
  titulo text,
  descricao text,
  acao_pratica text,
  impacto_estimado_reais decimal,
  impacto_descricao text,
  urgencia text,                     -- 'urgente','medio','controle'
  trigger_regra text,                -- ID da regra que gerou (R001, R002...)
  status text default 'pendente',    -- 'pendente','em_andamento','concluido','arquivado'
  concluido_em timestamptz null
)
```

---

## 6. Motor de regras (insights automáticos)

> Toda regra é documentada aqui ANTES de ser codada. Cada uma tem trigger,
> fórmula, severidade e template do item de plano que gera.

### 6.1 Regras financeiras (alimentam Plano de Ação)

#### R001 · CMV acima do saudável
- **Trigger:** `cmv_pct_mes > empresa.metas.cmv_maximo_pct` (default 35%)
- **Severidade:** alta se >40%, média se 36-40%
- **Plano gerado:** "Atacar CMV de X,X%" — revisar fornecedores + ficha técnica
- **Impacto estimado:** `(cmv_pct_atual - meta) * faturamento_mes`

#### R002 · Retirada de sócio acima do limite
- **Trigger:** `(pro_labore_lucas + pro_labore_alessandra) / faturamento > metas.pro_labore_max_pct_receita`
- **Severidade:** alta se >35%, média se 26-35%
- **Plano:** "Reduzir retirada dos sócios" com sugestão de teto

#### R003 · Despesas bancárias acima de 10%
- **Trigger:** `categoria_grupo('bancarias') / faturamento > 0.10`
- **Plano:** "Renegociar dívidas bancárias"

#### R004 · Resultado operacional negativo
- **Trigger:** `lucro_operacional < 0`
- **Severidade:** sempre alta
- **Adicional:** calcula breakeven e mostra

#### R005 · Ticket médio abaixo da meta
- **Trigger:** `ticket_medio < metas.ticket_medio_meta`
- **Plano:** "Aumentar ticket médio" com sugestões de combo

#### R006 · Dias fechados acima de 30% do mês
- **Trigger:** `dias_sem_venda / dias_uteis_mes > 0.30`
- **Plano:** "Ativar dias parados"

#### R007 · DRE com lacunas
- **Trigger:** mês sem estoque inicial/final preenchido, ou vendas sem separação por meio de pagamento
- **Severidade:** baixa mas persistente

#### R008 · Aluguel adicional sem justificativa
- **Trigger:** mais de 1 entrada de aluguel no mês
- **Plano:** pergunta de revisão (uso da sala 2?)

### 6.2 Regras de insights de vendas (alimentam aba Vendas → Insights)

#### V001 · Concentração em poucos produtos
- **Trigger:** top 3 produtos representam >70% do faturamento de itens
- **Insight:** "Você depende muito de X, Y, Z. Diversificar o mix reduz risco."

#### V002 · Produto encalhado
- **Trigger:** produto ativo no catálogo com 0 vendas nos últimos 30 dias
- **Insight:** "Pizza ABC não vendeu no mês — descontinuar ou repaginar?"

#### V003 · Crescimento ou queda mês a mês
- **Trigger:** `faturamento_atual / faturamento_mes_anterior` fora da faixa 0.95-1.05
- **Insight de queda (severo):** "Faturamento caiu X%, investigar"
- **Insight de crescimento (positivo):** "Faturamento subiu X% — manter o que tá funcionando"

#### V004 · Dia da semana subexplorado
- **Trigger:** dia da semana com média de faturamento < 60% da média geral
- **Insight:** "Terças tão devagar — testar promoção / combo"

#### V005 · Horário de pico identificado (se houver dado de hora)
- **Trigger:** faixa horária X concentra >40% das vendas do dia
- **Insight:** "70% das suas vendas acontecem entre 19h e 22h — escalar atendentes nesses horários"

#### V006 · Margem por produto baixa
- **Trigger:** `(preco_venda - custo_estimado_ficha_tecnica) / preco_venda < 0.40` (margem < 40%)
- **Insight:** "Pizza X tem margem de Y% — abaixo da média da casa. Revisar preço ou ficha técnica."

#### V007 · Preço de insumo subindo
- **Trigger:** preço de insumo em NF nova > 1.10 × custo_medio_atual
- **Insight:** "Queijo subiu 12% vs último custo médio — buscar cotação alternativa"

#### V008 · Combinação de itens (cross-sell potencial)
- **Trigger:** quando houver `venda_individual` com agrupamento por pedido, identificar pares frequentes
- **Insight:** "Quem compra Calabresa, em 60% das vezes leva Coca 200ml — sugerir combo"
- (Só ativa quando o dataset suportar; pode ficar pra v2)

#### V009 · Ticket médio por dia da semana
- **Trigger:** sempre disponível como visualização
- **Insight:** mostra qual dia tem ticket mais alto/baixo, sugere ação

#### V010 · Sazonalidade vs período de aula da Univali
- **Trigger:** queda significativa coincidindo com período de férias acadêmicas
- **Insight:** "Vendas caíram em julho — provavelmente férias da Univali. Plano de contingência para janeiro/julho."

### 6.3 Regras de insights POSITIVOS (severidade `positivo`)

> Tão importantes quanto as negativas. O dono quer ver o que tá funcionando
> pra repetir, não só o que tá quebrado. Aparecem na mesma tela do Plano de
> Ação, em bloco "✨ Tá funcionando — manter".

#### P001 · Faturamento mensal cresceu
- **Trigger:** `faturamento_atual / faturamento_mes_anterior >= 1.05`
- **Insight:** "Faturamento subiu X% vs mês anterior — qual ação puxou?"
- **Ação sugerida:** registrar no plano qual mudança contribuiu (campanha, novo sabor, dia ativado)

#### P002 · CMV caiu para faixa saudável
- **Trigger:** mês anterior tinha `cmv_pct > meta` E mês atual tem `cmv_pct <= meta`
- **Insight:** "CMV voltou pra faixa saudável (X%) — manter os fornecedores atuais"

#### P003 · Ticket médio subiu
- **Trigger:** `ticket_medio_atual / ticket_medio_mes_anterior >= 1.05`
- **Insight:** "Ticket médio subiu R$ X — clientes tão levando mais por pedido"

#### P004 · Dia da semana antes parado bombou
- **Trigger:** dia da semana que no mês anterior teve média <60% da geral, agora está >=90%
- **Insight:** "Terças tão saindo da letargia — o que mudou?"

#### P005 · Produto novo entrou no top 5
- **Trigger:** produto que não estava no top 5 do mês anterior agora está
- **Insight:** "Pizza X entrou pro top 5 — vale empurrar mais"

#### P006 · Lucro do sócio voltou pro positivo
- **Trigger:** mês anterior tinha lucro do sócio < 0 e mês atual >= 0
- **Insight:** "Mês fechou no azul de novo — segue o plano"

#### P007 · Despesas bancárias caíram
- **Trigger:** queda >=20% em despesas do grupo bancárias vs mês anterior
- **Insight:** "Bancárias caíram X% — renegociação tá rendendo"

#### P008 · Mais dias operados
- **Trigger:** `dias_operados_mes > dias_operados_mes_anterior`
- **Insight:** "Operou X dias a mais — abriu em dias que antes estavam fechados"

#### P009 · Margem de produto melhorou
- **Trigger:** produto com margem que subiu >5pp vs mês anterior (custo caiu ou preço subiu)
- **Insight:** "Margem da Pizza X subiu de A% pra B% — bom momento de empurrar"

> Adicione regras novas aqui antes de codar.

---

## 7. Decisões já tomadas (não reabrir sem motivo forte)

1. **Identidade visual está congelada** — vermelho/amarelo/creme/preto com tipografia chunky retrô.
2. **Backend é Supabase.** Não trocar pra Firebase/PocketBase/etc.
3. **Persistência é em banco** (não localStorage) na plataforma definitiva. **Anexos vão pro Supabase Storage** (PDFs do PDV, extratos, XMLs/PDFs de NF, fotos de boleto, .docx de ficha técnica) — nada fica só no PC do dono.
4. **Pro-labore Lucas e pro-labore Alessandra são categorias SEPARADAS** — o DRE precisa mostrar lucro operacional E lucro do sócio, e o usuário precisa ver o impacto da retirada de cada um.
5. **NF-e via XML é a fonte primária**; PDF é fallback. Os fornecedores são obrigados por lei a enviar XML.
6. **Custeio de insumos = média ponderada** (atualiza a cada entrada). PEPS/UEPS ficou descartado por complexidade.
7. **Categorização de saídas é semi-automática**: na primeira vez o usuário vincula fornecedor a categoria; nas próximas o sistema sugere automaticamente.
8. **Saída pode ser vinculada a NF em aberto** (paga a nota e fecha contas a pagar).
9. **Pizza é produzida em lote 3x/semana** e vendida ao longo de 10 dias; o estoque tem que diferenciar insumo de pizza pronta.
10. **Venda de pizza baixa o estoque de pizza pronta**; produção de pizza baixa o estoque de insumos (via ficha técnica). **Nunca os dois ao mesmo tempo na venda.**
11. **Tom da copy** continua direto e brasileiro coloquial.
12. **Mobile-first nos formulários de lançamento.** Dashboards podem priorizar desktop.
13. **Parser de extrato bancário ignora ENTRADAS** — todas as entradas reais já vêm do relatório de venda diária do PDV. O extrato é processado SÓ pelas saídas (PAGAMENTO PIX, COMPRAS NACIONAIS, LIQUIDACAO BOLETO, DEB.CTA.FATURA, IOF, JUROS, débitos automáticos etc). Evita duplicidade de receita e simplifica conciliação. Entrada atípica (aporte de sócio, devolução) continua sendo lançada manualmente.
14. **"Obrigação a pagar" é o conceito amplo** — substitui a ideia restrita de "NF de fornecedor". A tabela cobre 4 tipos: `nf_fornecedor` (com XML), `boleto_avulso` (sem NF-e, ex: Ivanor), `tributo` (DARF, GPS, ISS), `encargo_trabalhista` (FGTS, GFD). Cada um tem campos opcionais — DARF não tem fornecedor, FGTS não tem chave NF-e, mas todos têm vencimento, valor, status.
15. **Tudo é editável e deletável** pelo usuário — vendas, saídas, NFs, fichas, produtos, plano de ação, insights. Toda alteração/exclusão grava registro de auditoria (`audit_log`) com quem-quando-o-quê. Soft delete (`deleted_at`) por default para não perder histórico de DRE.
16. **Insights mostram TANTO bom quanto ruim** — não é só alertômetro de problema. Quando o mês tem crescimento, novo produto se destacou, ou ticket médio subiu, isso vira insight positivo com a mesma proeminência. Motor de regras tem severidade `positivo` além de `urgente`/`medio`/`controle`.
17. **Plano de ação do mês é gerado AUTOMATICAMENTE no fechamento** do mês anterior. Disparado por job (Supabase cron) no dia 1 de cada mês, lendo a DRE consolidada do mês que fechou. Função SQL `gerar_plano_mensal(empresa, ano, mes)` é idempotente (re-rodar não duplica). Cada item tem `categoria_plano` ∈ `{insight, organizacao, manual}`:
    - **insight** — vem das regras R001-R008 e P001-P009 aplicadas ao mês anterior
    - **organizacao** — checklist fixo de organização particular (ver §7.24)
    - **manual** — adicionado pelo dono dentro da tela
    Itens são editáveis (toggle status, expand/collapse de detalhe, soft delete).
18. **OFX do Sicredi não está disponível** — só PDF. Parser de extrato precisa ser robusto a quebras de layout (Sicredi quebra colunas em linhas longas). Roadmap: se Sicredi liberar OFX no futuro, migrar pra ele como fonte primária.
19. **Tela de ficha técnica permite criar e atualizar a qualquer momento** — cada alteração gera nova `versao` mantendo histórico. Custo de produção lançado em produções passadas usa a versão que estava ativa naquela data.
20. **Repositório git público é privado por padrão** — código pode ser aberto no futuro, mas anexos (extratos, NFs, vendas detalhadas) **nunca** vão pro git. Ficam só no Supabase Storage com RLS. `.gitignore` protege a pasta de trabalho local.
21. **Custo do item vem SEMPRE da NF, nunca do .docx da ficha técnica.** A ficha técnica define só as PROPORÇÕES de insumo por pizza (`0.045 kg queijo`, `0.020 kg calabresa` etc). O custo é calculado em tempo real como `Σ (qtd_ficha × insumo.custo_medio_atual)`. Quando o usuário sobe a ficha .docx pela primeira vez, os valores monetários ali viram **seed** (`custo_medio_atual` marcado com `origem='seed'`) — assim que chegar a primeira NF-e contendo aquele insumo, o seed é substituído pelo custo real e nunca mais é usado. Margem por produto e CMV teórico são SEMPRE recalculados a partir do estado atual dos insumos.
22. **Auth fechada — só 2 usuários pré-cadastrados:**
    - Usuário 1: `lucasgabrieldossantos` (Lucas)
    - Usuário 2: `alessandrafurlani` (Alessandra)
    - **Sem cadastro público** (rota de signup removida do Supabase Auth)
    - **Sem tela de "esqueci a senha" nem de alterar senha** dentro do app
    - Reset de senha (se necessário) só via Supabase Console manualmente pelo admin
    - As **senhas em si NUNCA são versionadas no git** — ficam só no Supabase Auth (hash bcrypt). Criação dos usuários é feita uma vez, manualmente, no Supabase Console (Auth → Users → Invite) ou via script `supabase/seed.local.sql` que carrega de `.env.local` (também ignorado pelo git).
    - Senhas definidas pelo dono no setup. Critério da Alessandra: 7 chars com mixed case e dígitos (suficiente pra uso interno; revisitar se app expor além da equipe).

23. **Checklist de organização particular** — junto com os insights do mês, o `gerar_plano_mensal` clona itens da tabela `template_organizacao` (14 itens fixos no seed) como tarefas recorrentes daquele mês: conferir extrato semana 1-4, contagem semanal de insumos, contagem de pizzas, pagar tributos (Simples/DARF/FGTS), cadastrar NFs recebidas, lançar produções, revisar plano do mês anterior, atualizar fichas técnicas, conferir folha, definir retirada dos sócios. O dono pode editar/desativar itens no template (tela `/configuracoes/checklist`) ou marcar concluído/apagar item específico daquele mês.

24. **Métricas básicas do mês** — view `metricas_mensais` calcula 8 KPIs com classificação automática `alto/medio/saudavel/neutro` baseada em `empresa.metas`:
    - **CMV %** (alto >40%, atenção >35%, saudável ≤35%)
    - **CMO %** = folha + encargos / receita (alto >20%, atenção >15%, saudável ≤15%)
    - **Despesas operacionais %** = tudo exceto pró-labore (alto >85%, atenção >70%)
    - **Retirada sócios %** (alto >35%, atenção >25%)
    - **Ticket médio** vs meta (alto se <85% da meta, atenção se <meta)
    - **Dias operados** vs dias do mês (alto se <55%, atenção se <70%)
    - **Margem operacional** (vermelho se <0, atenção se <10%)
    - **Margem líquida** (vermelho se <0, atenção se <10%)
    Cada KPI aparece como Card neo-brutalista com badge colorido. Lê metas de `empresa.metas` — dono ajusta em `/configuracoes`.

25. **Princípio "sinalizar lacunas"** — toda entidade com dado faltando dispara alerta visível no painel `Tá faltando preencher`. Casos cobertos:
    - Produto vendido sem ficha técnica cadastrada
    - Insumo na ficha sem custo confirmado (ainda no seed da .docx ou totalmente sem custo)
    - Insumo de NF não vinculado a nenhum item do catálogo
    - Venda com código de produto não cadastrado
    - Mês fechando sem estoque inicial/final preenchido
    - Fornecedor cadastrado sem categoria padrão
    - Saída do extrato sem categoria atribuída
    - Boleto vencido sem comprovante de pagamento
    Cada lacuna vira card no painel com link direto pra tela que resolve. **Sistema nunca chuta valor pra "fechar a conta"** — sempre prefere mostrar `?` e pedir preenchimento.

---

## 8. O que o Claude Code NÃO deve fazer

- ❌ Inventar valores ou métricas que não estão nos dados reais
- ❌ Mudar a identidade visual sem alinhar
- ❌ Trocar a stack proposta sem discutir
- ❌ Implementar regra de negócio sem documentar em §6 antes
- ❌ Esconder cálculos — toda métrica precisa ter fórmula clara
- ❌ Adicionar autenticação social antes do email/senha funcionar
- ❌ Construir tela de venda sem antes ter o catálogo de produtos funcionando
- ❌ Calcular consumo de insumo por venda **sem ficha técnica preenchida** (avisar o usuário, não chutar)
- ❌ Misturar pro-labore Lucas e Alessandra numa categoria só
- ❌ Inserir saída do extrato direto no banco sem o usuário confirmar a categorização

---

## 9. Roadmap em fases

### Fase 0 · Atual (concluída)
- [x] Protótipo estático com identidade visual
- [x] Dados de abril/2026 hard-coded
- [x] Checklist com localStorage
- [x] Publicado no GitHub Pages

### Fase 1 · Fundação backend (semanas iniciais)
- [ ] Setup Next.js 15 + Tailwind v4 + tokens
- [ ] Setup Supabase + auth email/senha
- [ ] Migrar componentes visuais do `index.html` pra componentes React
- [ ] Schema do banco (todas tabelas da §5)
- [ ] Tela de login + onboarding (cadastro de empresa + metas)
- [ ] Tela "Visão geral" lendo do banco (vazia no começo)

### Fase 2 · Vendas e horários de pico (módulo prioridade 1)
- [ ] Catálogo de produtos (CRUD)
- [ ] Importador de PDF do PDV (Edge Function)
- [ ] Tela de lançamento diário com anexo
- [ ] Dashboard de vendas: gráfico diário, por dia da semana, por produto
- [ ] Se PDV trouxer hora: dashboard de pico por horário
- [ ] Se não trouxer: lançamento por faixa horária manual

### Fase 3 · Saídas e despesas (módulo prioridade 2)
- [ ] CRUD de categorias de despesa (incluindo `pro_labore_lucas` e `pro_labore_alessandra`)
- [ ] CRUD de fornecedores
- [ ] Importador de extrato Sicredi (PDF)
- [ ] Tela de categorização em lote (com sugestão automática)
- [ ] Regras automáticas (fornecedor → categoria)

### Fase 4 · Estoque de insumos (módulo prioridade 3a)
- [ ] CRUD de insumos
- [ ] Importador de NF-e (XML)
- [ ] Vinculação NF item ↔ insumo (1ª vez manual, depois automática)
- [ ] Custo médio ponderado
- [ ] Alerta de variação de preço (V007)
- [ ] Tela de contagem semanal

### Fase 5 · Estoque de pizzas prontas + fichas técnicas (módulo prioridade 3b)
- [ ] CRUD de ficha técnica por produto
- [ ] Tela de registro de produção (lote)
- [ ] Triggers de baixa de insumos via ficha técnica
- [ ] Baixa de pizza pronta na venda diária
- [ ] Alerta de validade (>10 dias na geladeira)
- [ ] Contagem cruzada (pizza + insumo)

### Fase 6 · DRE com duas visões de lucro
- [ ] View Postgres: `dre_mensal` retornando linhas categorizadas
- [ ] Cálculo: lucro operacional (sem pro-labore Lucas/Alessandra)
- [ ] Cálculo: lucro do sócio (após pro-labore)
- [ ] Tela de DRE mensal com comparativo entre meses
- [ ] Exportação em PDF

### Fase 7 · Plano de ação automático
- [ ] Implementar regras R001-R008 como funções TS testáveis
- [ ] Job que roda mensalmente (ou ao fechar o mês) e gera itens de plano
- [ ] Tela do plano (parecida com a do protótipo) lendo do banco
- [ ] Histórico de itens concluídos

### Fase 8 · Insights de vendas
- [ ] Implementar regras V001-V010
- [ ] Tela "Insights" na aba de vendas
- [ ] Notificação por email quando regra crítica dispara (opcional)

### Fase 9 · Refinamentos
- [ ] Simulador de cenários (mexer em CMV/ticket/retirada e ver impacto)
- [ ] Análise ABC de produtos
- [ ] Sazonalidade vs calendário Univali
- [ ] App PWA pra usar como app mobile

---

## ESTADO ATUAL DO REPO (2026-05-16)

Fases entregues no commit principal:

- ✅ Fase 1: schema + auth fechada + dashboard Visão Geral + Painel Lacunas + Plano automático
- ✅ Fase 2: parser PDV + upload de vendas + dashboard com 5 gráficos + CRUD produtos
- ✅ Fase 3: parser extrato Sicredi (só saídas) + categorização em lote + CRUD fornecedores + categorias + obrigações
- ✅ Fase 4: CRUD insumos + parser NF-e XML (criação automática de obrigação) + contagem com divergência + trigger de custo médio
- ✅ Fase 5: CRUD ficha técnica com versionamento + registro de produção em lote (trigger baixa insumos)
- ✅ Fase 6: DRE mensal com 2 visões de lucro + comparação mês anterior + detalhamento por categoria
- ✅ Fase 7: gerar_plano_mensal idempotente + cron documentado (precisa ativar via pg_cron no Supabase)
- ✅ Fase 8: engine V001/V005 + R005/R006 + P001/P002/P003/P006/P008 aplicado dentro da geração mensal
- ⏭️ Fase 9: simulador, ABC, PWA — refinamentos pra depois conforme demanda

---

## 10. Dados de referência (abril/2026, do protótipo)

Esses números são a **baseline** do que a plataforma vai validar com dados
reais nos meses seguintes.

**Faturamento:** R$ 32.984,44 · 1.406 vendas · ticket R$ 23,46 · 20 dias operados
**CMV:** R$ 13.690,46 (41,5% — acima da meta saudável 30-35%)
**Resultado líquido:** −R$ 10.736,04 (prejuízo de 32,5% sobre receita)
**Maior despesa problema:** Retirada de sócios R$ 14.687 (Lucas R$ 6.889,18 + Alessandra R$ 7.797,87) = 44,5% da receita
**Equipe (folha):** R$ 4.123,53 (Mariana + Samara + encargos)
**Aluguel:** R$ 1.716,15 loja + R$ 1.754,82 sala 2 (uso da sala 2 a verificar)
**Dívidas bancárias:** R$ 5.035,29/mês

---

## 11. Glossário

- **CMV** — Custo da Mercadoria Vendida. Meta saudável pra pizzaria: 30-35%.
- **DRE** — Demonstrativo de Resultado do Exercício.
- **Pró-labore** — Retirada dos sócios. Na Quadrô separado em Lucas e Alessandra.
- **Lucro operacional** — Resultado antes de retirar pró-labore dos sócios. Mede saúde do negócio.
- **Lucro do sócio** — Lucro operacional menos pró-labore. O que sobra de fato.
- **Ponto de equilíbrio (breakeven)** — Faturamento mínimo onde resultado = 0. Fórmula: `custos_fixos / (1 − custos_variaveis_pct)`.
- **Ticket médio** — `faturamento / qtd_vendas`.
- **Ficha técnica** — Lista de insumos e quantidades que vão em cada pizza.
- **Quadrô** — Formato único da pizza da casa.
- **NF-e** — Nota Fiscal Eletrônica (XML obrigatório por lei).

---

## 12. Pendências em aberto pra confirmar com o usuário

Antes de começar Fase 2, conferir:

1. [x] **RESOLVIDO** — Fast Report exporta horário completo de cada venda (`hh:mm:ss` no campo "DATA DE EMISSÃO"). Libera o dashboard de horários de pico (V005) sem precisar de faixa manual.
2. [~] **PARCIAL** — Ficha técnica entregue para 8 produtos (Mini Calabresa, Mini Frango c/ Catupiry, Quadrô Frango c/ Catupiry, Calabresa, Milho c/ Bacon, 4 Queijos, Pepperoni, Portuguesa). Pendente: Mini Nutella (cód 109 aparece nas vendas mas sem ficha) e demais sabores ainda não levantados. Ação: ao importar primeiro relatório de PDV, listar todos os códigos vendidos sem ficha cadastrada e pedir cadastro pelo dono.
3. [ ] **Contagem inicial** de estoque de insumos e pizzas prontas pra começar a operar
4. [ ] Confirmar se Lucas e Alessandra são os **dois únicos sócios com retirada**
5. [ ] Identificar o que é a saída recorrente **"ALTHERA SOLUCOES"** (4× R$ 1.000 em abril) — categoria ainda não definida
6. [ ] Confirmar **uso da sala 2** (R$ 1.754,82/mês) — produção? estoque? ociosa?
7. [ ] **Anexar relatório de vendas + DRE de abril/2026** pra alimentar baseline histórico (o dono já sinalizou que vai mandar)
8. [ ] Decidir qual provedor de **OCR pra boleto/DARF/FGTS em imagem** — opções: Claude Vision direto na Edge Function (mais preciso pra foto torta de celular como as do WhatsApp), Tesseract (zero custo mas precisa pré-processamento de imagem), Google Vision API (preciso e barato mas mais um vendor). **Recomendação atual: Claude Vision.**

---

## 13. Formatos de anexo levantados (catálogo dos parsers)

> Esta seção é a especificação dos parsers. Cada upload na plataforma cai
> num dos formatos abaixo. Atualizar quando aparecer formato novo.

### 13.1 Relatório de Venda Detalhada — Fast Report PDV (PDF)
**Encoding:** Latin1 (cuidado com acentos quebrados na extração).
**Estrutura repetitiva por venda:**
```
VENDA: <id>    DATA DE EMISSÃO: dd/mm/yyyy hh:mm:ss    STATUS: EFETIVADA
CLIENTE: CONSUMIDOR FINAL
PRODUTO
<código> - <NOME PRODUTO>    UN <valor_un>    <qtd>    ...    <total>
TOTAL PRODUTOS: R$ X,XX
TIPO DE LANÇAMENTO: <código> - <nome forma pagamento>
```
**Campos extraídos:** id_venda, datahora, lista de itens (cod, nome, qtd, vu, vt), forma_pagamento, total.
**Idempotência:** chave única = (empresa_id, id_venda, datahora). Reuploads do mesmo período não duplicam.

### 13.2 Extrato bancário Sicredi (PDF)
**Limitação conhecida:** o PDF do Sicredi quebra a coluna "Documento" em linhas longas, fazendo `pdftotext` perder alinhamento em ~10-15% dos lançamentos. Solução:
1. Parser tenta extração estruturada (texto+coordenadas via `pdfjs` ou similar)
2. **Filtra fora todas as entradas** (decisão §7.13) — só processa linhas com valor negativo OU descrição em `[PAGAMENTO PIX, COMPRAS NACIONAIS, LIQUIDACAO BOLETO, DEB.CTA.FATURA, IOF, JUROS, ENC.FIN., DESCONTOS, TARIFAS]`
3. Casa cada saída com fornecedor por CNPJ na descrição (regex `\d{14}`) ou nome após o número
4. Sugere categoria pelo fornecedor (regra automática §5.6)
5. **Concilia com NF em aberto** quando descrição contém "LIQUIDACAO BOLETO" + CNPJ presente em obrigação não paga
6. Lote vai para tela de revisão antes de gravar — usuário aceita todas, edita algumas, ignora outras

### 13.3 Obrigações a pagar — 4 sub-formatos
**Boleto bancário PDF (texto):** extração por regex direto. Campos: linha digitável (44 dígitos), beneficiário, CNPJ benef, valor, vencimento, número documento.
**Foto de boleto (JPEG/PNG):** OCR (Claude Vision recomendado). Mesmos campos. A linha digitável é a fonte de verdade — o resto pode ser inferido a partir dela.
**DARF (PDF Receita Federal):** geralmente escaneado/gerado por sistema (SENDA). Campos: CNPJ, período de apuração, código de receita, valor principal/multa/juros, número documento, vencimento. **Sem fornecedor — categoria fixa "Impostos Federais".**
**GFD FGTS (PDF):** gerado por FGTS Digital. Campos: identificador, competência, qtd trabalhadores, valor FGTS mensal, vencimento. **Sem fornecedor — categoria fixa "Encargos Trabalhistas".**

### 13.4 NF-e (XML) — fornecedor de mercadoria
**Padrão SEFAZ:** namespace `http://www.portalfiscal.inf.br/nfe`. Extrair:
- `infNFe/emit` → fornecedor (CNPJ, razão social, endereço)
- `infNFe/det/*/prod` → cada item (NCM, descrição, qCom, vUnCom, vProd)
- `infNFe/total/ICMSTot/vNF` → valor total
- `infNFe/cobr/dup` → duplicatas (vencimento + valor parcela)
- chave de acesso = atributo `Id` (44 dígitos)

### 13.5 Ficha técnica (.docx ou cadastro manual)
**Formato livre por bloco:** título do produto + lista de insumos com `(quantidade unidade) → R$ valor`. Parser do docx pré-popula a tela de cadastro mas exige confirmação humana (não grava direto). Cadastro manual é o caminho oficial — o upload de .docx é só atalho de migração inicial.

---

## 14. Pra Claude Code: como começar

Quando reabrir o projeto:

1. Leia este `CLAUDE.md` inteiro antes de qualquer coisa
2. Confirme com o dono se a ordem das fases (§9) ainda está válida
3. Comece pela **Fase 1** — não tem como pular nada dela
4. Antes de codar Fase 2, valide as pendências da §12
5. Toda regra nova → entra na §6 antes de virar código
6. Toda decisão arquitetural → atualiza §7
7. Toda nova fonte de anexo → entra no catálogo §13 antes de virar parser
8. Não tente fazer "tudo de uma vez". Cada fase tem critério de aceite claro:
   o usuário consegue executar o fluxo correspondente de ponta a ponta.
9. **Nunca commite anexos** do dono no git (extratos, NFs, relatórios de venda, fichas técnicas). O `.gitignore` da raiz já protege, mas verifique antes de qualquer `git add` em massa.

---

_Última atualização: 16 de maio de 2026._
_Mantido por: Lucas / Alessandra (Quadrô Pizza) + Claude (Anthropic)._
