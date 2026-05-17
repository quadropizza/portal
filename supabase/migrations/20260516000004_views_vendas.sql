-- =====================================================================
-- Views agregadas de vendas pra dashboards (Fase 2)
-- Alimenta gráficos de horário de pico, dia da semana, ranking produtos.
-- =====================================================================

-- Por dia (faturamento e qtd de vendas dia a dia)
create or replace view vendas_por_dia as
select
  empresa_id,
  data_hora::date              as data,
  count(*)                     as qtd_vendas,
  sum(total)                   as faturamento,
  case when count(*) > 0
       then sum(total) / count(*) end as ticket_medio
from venda_individual
where deleted_at is null
group by empresa_id, data_hora::date;

-- Por dia da semana (média por dia operado)
create or replace view vendas_por_dia_semana as
with por_dia as (
  select empresa_id,
         extract(year from data_hora)::int  as ano,
         extract(month from data_hora)::int as mes,
         data_hora::date as data,
         extract(dow from data_hora)::int   as dow,  -- 0=domingo
         sum(total)                          as fat,
         count(*)                            as qtd
  from venda_individual
  where deleted_at is null
  group by 1,2,3,4,5
)
select
  empresa_id, ano, mes, dow,
  count(*) as dias_operados,
  sum(qtd) as qtd_vendas,
  sum(fat) as faturamento,
  case when count(*) > 0 then sum(fat)/count(*) end as media_fat_por_dia,
  case when sum(qtd) > 0 then sum(fat)/sum(qtd) end as ticket_medio
from por_dia
group by 1,2,3,4;

-- Por hora (vendas concentradas em qual horário)
create or replace view vendas_por_hora as
select
  empresa_id,
  extract(year from data_hora)::int  as ano,
  extract(month from data_hora)::int as mes,
  extract(hour from data_hora)::int  as hora,
  count(*)                            as qtd_vendas,
  sum(total)                          as faturamento
from venda_individual
where deleted_at is null
group by 1,2,3,4;

-- Por produto (ranking de mais vendidos)
create or replace view vendas_por_produto as
select
  vii.venda_individual_id is not null as ok,  -- placeholder pra silenciar
  vi.empresa_id,
  extract(year from vi.data_hora)::int  as ano,
  extract(month from vi.data_hora)::int as mes,
  vii.produto_id,
  vii.produto_codigo_origem,
  coalesce(p.nome, vii.produto_nome_origem) as nome,
  p.categoria,
  sum(vii.quantidade)         as qtd_total,
  sum(vii.valor_total)        as fat_total
from venda_individual_item vii
join venda_individual vi on vi.id = vii.venda_individual_id
left join produto p on p.id = vii.produto_id
where vi.deleted_at is null
group by vi.empresa_id, ano, mes, vii.produto_id, vii.produto_codigo_origem, p.nome, vii.produto_nome_origem, p.categoria;

-- Por forma de pagamento (mix)
create or replace view vendas_por_pagamento as
select
  empresa_id,
  extract(year from data_hora)::int  as ano,
  extract(month from data_hora)::int as mes,
  case
    when forma_pagamento ilike '%DINHEIRO%'                       then 'Dinheiro'
    when forma_pagamento ilike '%PIX%'                            then 'PIX'
    when forma_pagamento ilike '%CARTAO DE DEBITO%'               then 'Cartão de débito'
    when forma_pagamento ilike '%CARTAO DE CREDITO%'              then 'Cartão de crédito'
    when forma_pagamento ilike '%VOUCHER%'                        then 'Voucher'
    else 'Outros'
  end                                 as forma,
  count(*)                            as qtd_vendas,
  sum(total)                          as faturamento
from venda_individual
where deleted_at is null
group by 1,2,3,4;
