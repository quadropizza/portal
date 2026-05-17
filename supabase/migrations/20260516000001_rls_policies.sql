-- =====================================================================
-- Row Level Security · todas tabelas filtradas por empresa_id
-- Decisão §7 do CLAUDE.md (multi-empresa-ready, mesmo em uso pessoal)
-- =====================================================================

-- Função auxiliar: qual empresa o usuário logado pertence
create or replace function current_empresa() returns uuid language sql stable security definer as $$
  select empresa_id from usuario where id = auth.uid() and deleted_at is null limit 1
$$;

-- Helper macro: aplica RLS padrão (read/write filtrado por current_empresa)
do $$
declare t text;
begin
  foreach t in array array[
    'empresa','usuario','arquivo_anexo',
    'produto','ficha_tecnica','ficha_tecnica_item',
    'insumo','estoque_insumo_movimento','estoque_pizza_movimento',
    'producao_lote','producao_lote_item','contagem','contagem_item',
    'venda_diaria','venda_item','venda_individual','venda_individual_item',
    'fornecedor','obrigacao_a_pagar','obrigacao_item','obrigacao_pagamento',
    'categoria_despesa','categoria_regra_automatica','entrada','saida',
    'plano_acao_item','audit_log'
  ]
  loop
    execute format('alter table %I enable row level security', t);
  end loop;
end $$;

-- empresa: usuário vê só sua empresa
create policy empresa_select on empresa for select using (id = current_empresa());
create policy empresa_update on empresa for update using (id = current_empresa());

-- usuario: vê só usuários da própria empresa
create policy usuario_select on usuario for select using (empresa_id = current_empresa());
create policy usuario_insert on usuario for insert with check (empresa_id = current_empresa());
create policy usuario_update on usuario for update using (empresa_id = current_empresa());

-- Política padrão pras demais tabelas (filtro por empresa_id)
do $$
declare t text;
begin
  foreach t in array array[
    'arquivo_anexo','produto','insumo','estoque_insumo_movimento','estoque_pizza_movimento',
    'producao_lote','contagem','venda_diaria','venda_item','venda_individual',
    'fornecedor','obrigacao_a_pagar','categoria_despesa','categoria_regra_automatica',
    'entrada','saida','plano_acao_item','audit_log'
  ]
  loop
    execute format($f$
      create policy %I_all on %I for all
      using (empresa_id = current_empresa())
      with check (empresa_id = current_empresa())
    $f$, t, t);
  end loop;
end $$;

-- Tabelas filhas (sem empresa_id direto) — herdam via parent
create policy ficha_tecnica_all on ficha_tecnica for all
  using (exists (select 1 from produto p where p.id = ficha_tecnica.produto_id and p.empresa_id = current_empresa()))
  with check (exists (select 1 from produto p where p.id = ficha_tecnica.produto_id and p.empresa_id = current_empresa()));

create policy ficha_tecnica_item_all on ficha_tecnica_item for all
  using (exists (select 1 from ficha_tecnica ft join produto p on p.id=ft.produto_id where ft.id = ficha_tecnica_item.ficha_tecnica_id and p.empresa_id = current_empresa()))
  with check (exists (select 1 from ficha_tecnica ft join produto p on p.id=ft.produto_id where ft.id = ficha_tecnica_item.ficha_tecnica_id and p.empresa_id = current_empresa()));

create policy producao_lote_item_all on producao_lote_item for all
  using (exists (select 1 from producao_lote pl where pl.id = producao_lote_item.producao_lote_id and pl.empresa_id = current_empresa()))
  with check (exists (select 1 from producao_lote pl where pl.id = producao_lote_item.producao_lote_id and pl.empresa_id = current_empresa()));

create policy contagem_item_all on contagem_item for all
  using (exists (select 1 from contagem c where c.id = contagem_item.contagem_id and c.empresa_id = current_empresa()))
  with check (exists (select 1 from contagem c where c.id = contagem_item.contagem_id and c.empresa_id = current_empresa()));

create policy venda_individual_item_all on venda_individual_item for all
  using (exists (select 1 from venda_individual v where v.id = venda_individual_item.venda_individual_id and v.empresa_id = current_empresa()))
  with check (exists (select 1 from venda_individual v where v.id = venda_individual_item.venda_individual_id and v.empresa_id = current_empresa()));

create policy obrigacao_item_all on obrigacao_item for all
  using (exists (select 1 from obrigacao_a_pagar o where o.id = obrigacao_item.obrigacao_id and o.empresa_id = current_empresa()))
  with check (exists (select 1 from obrigacao_a_pagar o where o.id = obrigacao_item.obrigacao_id and o.empresa_id = current_empresa()));

create policy obrigacao_pagamento_all on obrigacao_pagamento for all
  using (exists (select 1 from obrigacao_a_pagar o where o.id = obrigacao_pagamento.obrigacao_id and o.empresa_id = current_empresa()))
  with check (exists (select 1 from obrigacao_a_pagar o where o.id = obrigacao_pagamento.obrigacao_id and o.empresa_id = current_empresa()));
