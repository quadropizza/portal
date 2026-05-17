-- =====================================================================
-- Plano de ação mensal + checklist de organização particular + view
-- de métricas básicas do mês (CMV%, CMO%, despesas%, retirada%,
-- ticket, dias operados, com classificação alto/médio/saudável)
-- =====================================================================

-- ---------------------------------------------------------------------
-- Extensão da tabela plano_acao_item
-- ---------------------------------------------------------------------
alter table plano_acao_item
  add column if not exists categoria_plano text not null default 'insight'
    check (categoria_plano in ('insight','organizacao','manual')),
  add column if not exists recorrente boolean not null default false,
  add column if not exists prazo date;

create index if not exists plano_acao_item_categoria_idx
  on plano_acao_item (empresa_id, ano, mes, categoria_plano);

-- ---------------------------------------------------------------------
-- Template do "checklist de organização particular"
-- Cada item é replicado a cada mês quando gerar_plano_mensal() roda.
-- O dono pode editar título/prazo/ordem livremente em /configuracoes.
-- ---------------------------------------------------------------------
create table if not exists template_organizacao (
  id            uuid primary key default uuid_generate_v4(),
  empresa_id    uuid not null references empresa,
  ordem         integer not null default 0,
  titulo        text not null,
  descricao     text,
  dia_do_mes    integer,                -- ex: 5 = "dia 5 de cada mês"; null = sem data fixa
  ativo         boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index on template_organizacao (empresa_id, ordem);

-- RLS
alter table template_organizacao enable row level security;
create policy template_organizacao_all on template_organizacao for all
  using (empresa_id = current_empresa())
  with check (empresa_id = current_empresa());

-- Seed dos itens fixos pra Quadrô (decisão de produto)
insert into template_organizacao (empresa_id, ordem, titulo, descricao, dia_do_mes) values
  ('11111111-1111-1111-1111-111111111111',  1, 'Conferir extrato bancário (semana 1)',
   'Baixar PDF do extrato Sicredi referente à semana, anexar em Financeiro → Saídas, categorizar lote.', 7),
  ('11111111-1111-1111-1111-111111111111',  2, 'Conferir extrato bancário (semana 2)',
   'Mesmo de cima, semana 8-14.', 14),
  ('11111111-1111-1111-1111-111111111111',  3, 'Conferir extrato bancário (semana 3)',
   'Semana 15-21.', 21),
  ('11111111-1111-1111-1111-111111111111',  4, 'Conferir extrato bancário (semana 4)',
   'Semana 22-fim do mês.', 28),
  ('11111111-1111-1111-1111-111111111111',  5, 'Contagem semanal de insumos',
   'Abrir Estoque → Contagem e lançar quantidade real. Investigar divergência > 5% do valor.', null),
  ('11111111-1111-1111-1111-111111111111',  6, 'Contagem de pizzas prontas',
   'Verificar pizzas em geladeira/freezer vs estoque calculado. Sinalizar pizzas perto da validade de 10 dias.', null),
  ('11111111-1111-1111-1111-111111111111',  7, 'Pagar Simples Nacional / DARFs do mês',
   'Verificar vencimentos em NFs em aberto → tributos. Pagar antes do vencimento pra evitar multa.', 20),
  ('11111111-1111-1111-1111-111111111111',  8, 'Pagar FGTS (GFD Digital)',
   'GFD vence dia 20. Conferir valor calculado bate com folha do mês.', 20),
  ('11111111-1111-1111-1111-111111111111',  9, 'Cadastrar todas NFs de compra recebidas',
   'XMLs de NF-e que chegaram por email — anexar em NFs/Boletos e vincular insumos.', null),
  ('11111111-1111-1111-1111-111111111111', 10, 'Lançar produções da semana',
   'Cada lote de pizza produzido na semana deve estar registrado em Estoque → Produção.', null),
  ('11111111-1111-1111-1111-111111111111', 11, 'Revisar plano do mês anterior',
   'Abrir mês anterior, marcar como concluído/arquivado o que foi feito ou superado.', 5),
  ('11111111-1111-1111-1111-111111111111', 12, 'Atualizar fichas técnicas se houve mudança',
   'Mudou fornecedor, gramatura, ou inclusão de sabor novo? Atualizar antes de produzir.', null),
  ('11111111-1111-1111-1111-111111111111', 13, 'Conferir folha das atendentes',
   'Mariana + Samara: horas trabalhadas, bonificações, VA. Pagar até dia 5 do mês.', 5),
  ('11111111-1111-1111-1111-111111111111', 14, 'Definir retirada dos sócios do mês',
   'Lucas e Alessandra: discutir valor a retirar considerando lucro operacional do mês anterior. Meta: ≤ 25% da receita.', null)
on conflict do nothing;

-- ---------------------------------------------------------------------
-- Função: gera o plano de ação do mês (insights + checklist organização)
-- Decisão §7.17: rodar dia 1 de cada mês via cron, mas pode ser chamada
-- manualmente (ex: ao fechar o mês mais cedo) ou re-rodada (idempotente
-- via on conflict — não duplica).
-- ---------------------------------------------------------------------
create or replace function gerar_plano_mensal(p_empresa uuid, p_ano int, p_mes int)
returns table (criados int, ja_existiam int)
language plpgsql
security definer
as $$
declare
  v_criados int := 0;
  v_ja int := 0;
  v_dre record;
  v_meta_cmv numeric;
  v_meta_retirada numeric;
  v_meta_ticket numeric;
  v_template record;
  v_inicio date;
  v_existente uuid;
begin
  v_inicio := make_date(p_ano, p_mes, 1);

  -- ler metas da empresa
  select
    (metas->>'cmv_maximo_pct')::numeric/100,
    (metas->>'pro_labore_max_pct_receita')::numeric/100,
    (metas->>'ticket_medio_meta')::numeric
  into v_meta_cmv, v_meta_retirada, v_meta_ticket
  from empresa where id = p_empresa;

  -- ler DRE do MÊS ANTERIOR (insumo do plano, decisão §7.17)
  select * into v_dre from dre_mensal
  where empresa_id = p_empresa
    and (ano*12 + mes) = (p_ano*12 + p_mes - 1);

  if v_dre.receita_bruta is not null and v_dre.receita_bruta > 0 then
    -- R001 · CMV alto
    if abs(v_dre.cmv)/v_dre.receita_bruta > v_meta_cmv then
      select id into v_existente from plano_acao_item
        where empresa_id=p_empresa and ano=p_ano and mes=p_mes and trigger_regra='R001' and deleted_at is null;
      if v_existente is null then
        insert into plano_acao_item (empresa_id, mes, ano, ordem, titulo, descricao, acao_pratica,
          impacto_estimado_reais, impacto_descricao, severidade, trigger_regra, categoria_plano)
        values (p_empresa, p_mes, p_ano, 10,
          format('Atacar CMV de %s%%', round(abs(v_dre.cmv)/v_dre.receita_bruta*100, 1)),
          format('No mês anterior, o CMV foi %s da receita. Meta: até %s%%.',
                 round(abs(v_dre.cmv)/v_dre.receita_bruta*100,1)::text||'%',
                 round(v_meta_cmv*100)::text),
          'Revisar fichas técnicas dos 8 sabores cadastrados, cotar com pelo menos 2 fornecedores alternativos para queijo, calabresa e bebidas, e validar gramatura padronizada.',
          (abs(v_dre.cmv)/v_dre.receita_bruta - v_meta_cmv) * v_dre.receita_bruta,
          'estimativa por mês ao trazer CMV pra meta',
          case when abs(v_dre.cmv)/v_dre.receita_bruta > 0.40 then 'urgente' else 'medio' end,
          'R001', 'insight');
        v_criados := v_criados + 1;
      else v_ja := v_ja + 1;
      end if;
    end if;

    -- R002 · Retirada alta
    if (v_dre.pro_labore_lucas + v_dre.pro_labore_alessandra)/v_dre.receita_bruta > v_meta_retirada then
      select id into v_existente from plano_acao_item
        where empresa_id=p_empresa and ano=p_ano and mes=p_mes and trigger_regra='R002' and deleted_at is null;
      if v_existente is null then
        insert into plano_acao_item (empresa_id, mes, ano, ordem, titulo, descricao, acao_pratica,
          impacto_estimado_reais, impacto_descricao, severidade, trigger_regra, categoria_plano)
        values (p_empresa, p_mes, p_ano, 11,
          'Reduzir retirada dos sócios',
          format('Retirada conjunta no mês anterior foi %s da receita (Lucas R$ %s + Ale R$ %s). Meta: até %s%%.',
            round((v_dre.pro_labore_lucas+v_dre.pro_labore_alessandra)/v_dre.receita_bruta*100,1)::text||'%',
            round(v_dre.pro_labore_lucas,0)::text,
            round(v_dre.pro_labore_alessandra,0)::text,
            round(v_meta_retirada*100)::text),
          format('Limite sugerido total: R$ %s (meta %s%% da receita). Discutir divisão entre os sócios.',
            round(v_meta_retirada * v_dre.receita_bruta, 0)::text,
            round(v_meta_retirada*100)::text),
          ((v_dre.pro_labore_lucas+v_dre.pro_labore_alessandra)/v_dre.receita_bruta - v_meta_retirada) * v_dre.receita_bruta,
          'libera caixa por mês',
          case when (v_dre.pro_labore_lucas+v_dre.pro_labore_alessandra)/v_dre.receita_bruta > 0.35 then 'urgente' else 'medio' end,
          'R002', 'insight');
        v_criados := v_criados + 1;
      else v_ja := v_ja + 1;
      end if;
    end if;

    -- R003 · Bancárias > 10%
    if v_dre.bancarias/v_dre.receita_bruta > 0.10 then
      select id into v_existente from plano_acao_item
        where empresa_id=p_empresa and ano=p_ano and mes=p_mes and trigger_regra='R003' and deleted_at is null;
      if v_existente is null then
        insert into plano_acao_item (empresa_id, mes, ano, ordem, titulo, descricao, acao_pratica,
          impacto_estimado_reais, severidade, trigger_regra, categoria_plano)
        values (p_empresa, p_mes, p_ano, 20,
          'Renegociar dívidas bancárias',
          format('Despesas bancárias somam %s da receita.',
            round(v_dre.bancarias/v_dre.receita_bruta*100,1)::text||'%'),
          'Buscar portabilidade do empréstimo. Renegociar parcela do Votorantim. Avaliar antecipação do cartão de crédito (custo vs benefício).',
          v_dre.bancarias * 0.30, 'medio', 'R003', 'insight');
        v_criados := v_criados + 1;
      else v_ja := v_ja + 1;
      end if;
    end if;

    -- R004 · Resultado operacional negativo
    if v_dre.lucro_operacional < 0 then
      insert into plano_acao_item (empresa_id, mes, ano, ordem, titulo, descricao,
        acao_pratica, severidade, trigger_regra, categoria_plano)
      values (p_empresa, p_mes, p_ano, 1,
        'Operação no vermelho — reagir',
        format('Lucro operacional do mês anterior: R$ %s. A receita não cobre custos básicos.',
          round(v_dre.lucro_operacional,0)::text),
        'Cortar/postergar despesas variáveis evitáveis. Estimular vendas no pico (20-21h). Revisar todos contratos fixos.',
        'urgente', 'R004', 'insight')
      on conflict do nothing;
      v_criados := v_criados + 1;
    end if;
  end if;

  -- Checklist de organização particular (sempre, todo mês)
  for v_template in
    select * from template_organizacao
    where empresa_id = p_empresa and ativo = true
    order by ordem
  loop
    select id into v_existente from plano_acao_item
      where empresa_id=p_empresa and ano=p_ano and mes=p_mes
        and categoria_plano='organizacao' and titulo=v_template.titulo and deleted_at is null;
    if v_existente is null then
      insert into plano_acao_item (empresa_id, mes, ano, ordem, titulo, descricao,
        severidade, categoria_plano, recorrente, prazo, origem)
      values (p_empresa, p_mes, p_ano, 100 + v_template.ordem,
        v_template.titulo, v_template.descricao,
        'controle', 'organizacao', true,
        case when v_template.dia_do_mes is not null
             then make_date(p_ano, p_mes, least(v_template.dia_do_mes,
                  extract(day from (date_trunc('month', v_inicio) + interval '1 month - 1 day'))::int))
             else null end,
        'automatico');
      v_criados := v_criados + 1;
    else v_ja := v_ja + 1;
    end if;
  end loop;

  return query select v_criados, v_ja;
end $$;

-- ---------------------------------------------------------------------
-- View: metricas_mensais
-- Dados básicos do mês com classificação alto/médio/saudável.
-- CMV, CMO (folha+encargos, exclui pró-labore), despesas operacionais,
-- pró-labore, ticket médio, dias operados, margens.
-- ---------------------------------------------------------------------
create or replace view metricas_mensais as
with vendas_mes as (
  select empresa_id,
         extract(year from data)::int as ano,
         extract(month from data)::int as mes,
         sum(faturamento_bruto)       as receita,
         sum(qtd_vendas)              as qtd_vendas,
         count(distinct data)         as dias_operados
  from venda_diaria where deleted_at is null
  group by 1,2,3
)
select
  d.empresa_id, d.ano, d.mes,
  coalesce(v.receita, 0)                                                    as receita_bruta,
  coalesce(v.qtd_vendas, 0)                                                 as qtd_vendas,
  coalesce(v.dias_operados, 0)                                              as dias_operados,
  case when v.qtd_vendas > 0 then v.receita / v.qtd_vendas else null end    as ticket_medio,
  abs(d.cmv)                                                                as cmv,
  case when v.receita > 0 then abs(d.cmv) / v.receita else null end         as cmv_pct,
  abs(d.folha)                                                              as cmo,
  case when v.receita > 0 then abs(d.folha) / v.receita else null end       as cmo_pct,
  abs(d.cmv) + abs(d.folha) + abs(d.impostos) + abs(d.aluguel)
    + abs(d.bancarias) + abs(d.outros)                                      as despesas_operacionais,
  case when v.receita > 0
       then (abs(d.cmv) + abs(d.folha) + abs(d.impostos) + abs(d.aluguel)
            + abs(d.bancarias) + abs(d.outros)) / v.receita
       else null end                                                        as despesas_op_pct,
  abs(d.pro_labore_lucas) + abs(d.pro_labore_alessandra)                    as pro_labore_total,
  case when v.receita > 0
       then (abs(d.pro_labore_lucas) + abs(d.pro_labore_alessandra)) / v.receita
       else null end                                                        as pro_labore_pct,
  abs(d.pro_labore_lucas)                                                   as pro_labore_lucas,
  abs(d.pro_labore_alessandra)                                              as pro_labore_alessandra,
  d.lucro_operacional,
  case when v.receita > 0 then d.lucro_operacional / v.receita else null end as margem_operacional,
  d.lucro_socio,
  case when v.receita > 0 then d.lucro_socio / v.receita else null end     as margem_liquida,
  -- classificação por meta (lê da empresa)
  (select (metas->>'cmv_maximo_pct')::numeric / 100 from empresa where id = d.empresa_id)        as meta_cmv,
  (select (metas->>'pro_labore_max_pct_receita')::numeric / 100 from empresa where id = d.empresa_id) as meta_retirada,
  (select (metas->>'ticket_medio_meta')::numeric from empresa where id = d.empresa_id)            as meta_ticket
from dre_mensal d
left join vendas_mes v on v.empresa_id = d.empresa_id and v.ano = d.ano and v.mes = d.mes;
