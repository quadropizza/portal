-- =====================================================================
-- Engine de regras (V001-V010 + P001-P009 + R005-R008 não cobertos)
-- Triggers de custo médio ao entrar NF, vinculação saída ↔ obrigação,
-- view detalhada da DRE.
-- =====================================================================

-- ---------------------------------------------------------------------
-- TRIGGER: ao inserir entrada_nf no estoque_insumo_movimento,
-- recalcular custo_medio_atual via média ponderada (decisão §7.6).
-- Marca custo_origem='nf' (sai do seed pra real — decisão §7.21).
-- ---------------------------------------------------------------------
create or replace function recalc_custo_medio() returns trigger language plpgsql as $$
declare
  v_estoque numeric;
  v_custo_atual numeric;
  v_qtd_entrada numeric;
  v_custo_entrada numeric;
  v_novo numeric;
begin
  if new.tipo <> 'entrada_nf' or new.custo_unitario is null then
    return new;
  end if;

  select custo_medio_atual into v_custo_atual from insumo where id = new.insumo_id;

  -- saldo de estoque antes (soma de movimentos posteriores ao próximo, kkkk; vai pelo simples: tudo de antes)
  select coalesce(sum(quantidade), 0) into v_estoque
  from estoque_insumo_movimento
  where insumo_id = new.insumo_id and id <> new.id and deleted_at is null;

  v_qtd_entrada := new.quantidade;
  v_custo_entrada := new.custo_unitario;

  if v_estoque > 0 and v_custo_atual is not null then
    v_novo := (v_estoque * v_custo_atual + v_qtd_entrada * v_custo_entrada) / (v_estoque + v_qtd_entrada);
  else
    v_novo := v_custo_entrada;
  end if;

  update insumo set
    custo_medio_atual = round(v_novo, 4),
    custo_origem      = 'nf',
    ultimo_custo      = v_custo_entrada,
    ultima_compra_data = new.data_hora::date
  where id = new.insumo_id;

  return new;
end $$;

create trigger trg_insumo_recalc_custo
  after insert on estoque_insumo_movimento
  for each row execute function recalc_custo_medio();

-- ---------------------------------------------------------------------
-- TRIGGER: ao inserir uma saída vinculada a obrigação, marca a
-- obrigação como paga/parcialmente paga (decisão §7.8).
-- ---------------------------------------------------------------------
create or replace function aplicar_pagamento_obrigacao() returns trigger language plpgsql as $$
declare
  v_valor_total numeric;
  v_pago numeric;
begin
  if new.obrigacao_id is null then return new; end if;
  select valor_total, valor_pago into v_valor_total, v_pago
  from obrigacao_a_pagar where id = new.obrigacao_id;
  v_pago := v_pago + new.valor;
  update obrigacao_a_pagar set
    valor_pago = v_pago,
    status = case
      when v_pago >= v_valor_total then 'pago'
      when v_pago > 0 then 'parcialmente_pago'
      else 'em_aberto'
    end
  where id = new.obrigacao_id;
  -- também registra em obrigacao_pagamento
  insert into obrigacao_pagamento (obrigacao_id, saida_id, valor, data_pagamento)
  values (new.obrigacao_id, new.id, new.valor, new.data);
  return new;
end $$;

create trigger trg_saida_aplica_pagamento
  after insert on saida
  for each row execute function aplicar_pagamento_obrigacao();

-- ---------------------------------------------------------------------
-- View: dre_mensal_detalhado (linhas por categoria, não só por grupo)
-- Alimenta a tela /dre com detalhamento estilo planilha.
-- ---------------------------------------------------------------------
create or replace view dre_mensal_detalhado as
select
  s.empresa_id,
  extract(year from s.data)::int  as ano,
  extract(month from s.data)::int as mes,
  c.grupo,
  c.nome as categoria_nome,
  c.ordem as categoria_ordem,
  sum(s.valor) as total
from saida s
left join categoria_despesa c on c.id = s.categoria_id
where s.deleted_at is null
group by s.empresa_id, ano, mes, c.grupo, c.nome, c.ordem;

-- ---------------------------------------------------------------------
-- Função: aplicar regras de vendas e positivas no plano mensal
-- Estende gerar_plano_mensal — chamada por ela.
-- ---------------------------------------------------------------------
create or replace function aplicar_regras_vendas_positivas(p_empresa uuid, p_ano int, p_mes int)
returns int language plpgsql as $$
declare
  v_criados int := 0;
  v_atual record;
  v_anterior record;
  v_mes_anterior_ano int;
  v_mes_anterior_mes int;
  v_meta_ticket numeric;
  v_existente uuid;
begin
  v_mes_anterior_ano := case when p_mes = 1 then p_ano - 1 else p_ano end;
  v_mes_anterior_mes := case when p_mes = 1 then 12 else p_mes - 1 end;

  select (metas->>'ticket_medio_meta')::numeric into v_meta_ticket
  from empresa where id = p_empresa;

  -- métricas do mês anterior (insumo) e do antepenúltimo (comparação)
  select * into v_atual from metricas_mensais
    where empresa_id = p_empresa and ano = v_mes_anterior_ano and mes = v_mes_anterior_mes;

  if v_atual.receita_bruta is null or v_atual.receita_bruta = 0 then
    return 0;
  end if;

  select * into v_anterior from metricas_mensais
    where empresa_id = p_empresa
      and (ano*12 + mes) = (v_mes_anterior_ano*12 + v_mes_anterior_mes - 1);

  -- ------ V005: pico horário (recorrente — informativo positivo) ------
  declare v_pico record;
  begin
    select hora, faturamento, qtd_vendas into v_pico
    from vendas_por_hora
    where empresa_id = p_empresa and ano = v_mes_anterior_ano and mes = v_mes_anterior_mes
    order by faturamento desc limit 1;
    if v_pico.hora is not null and v_pico.faturamento > 0.20 * v_atual.receita_bruta then
      select id into v_existente from plano_acao_item
        where empresa_id=p_empresa and ano=p_ano and mes=p_mes and trigger_regra='V005';
      if v_existente is null then
        insert into plano_acao_item (empresa_id, mes, ano, ordem, titulo, descricao,
          acao_pratica, severidade, trigger_regra, categoria_plano)
        values (p_empresa, p_mes, p_ano, 30,
          format('Pico identificado: %sh concentra %s%% do faturamento', v_pico.hora,
            round(v_pico.faturamento/v_atual.receita_bruta*100,0)::text),
          'Esse é o horário em que mais se vende.',
          format('Garantir 2 atendentes no horário %s-%sh. Pre-produzir pizzas mais vendidas (Frango/Calabresa) pra reduzir tempo de espera.', v_pico.hora, v_pico.hora+1),
          'controle', 'V005', 'insight');
        v_criados := v_criados + 1;
      end if;
    end if;
  end;

  -- ------ R005: ticket abaixo da meta ------
  if v_atual.ticket_medio < v_meta_ticket then
    select id into v_existente from plano_acao_item
      where empresa_id=p_empresa and ano=p_ano and mes=p_mes and trigger_regra='R005';
    if v_existente is null then
      insert into plano_acao_item (empresa_id, mes, ano, ordem, titulo, descricao,
        acao_pratica, impacto_estimado_reais, impacto_descricao, severidade,
        trigger_regra, categoria_plano)
      values (p_empresa, p_mes, p_ano, 25,
        format('Subir ticket médio (atual R$ %s, meta R$ %s)',
          round(v_atual.ticket_medio,2)::text, round(v_meta_ticket,2)::text),
        format('Cada R$ 1 a mais no ticket = +R$ %s/mês',
          round(v_atual.qtd_vendas,0)::text),
        'Testar combo "pizza + bebida + sobremesa". Treinar atendentes pra oferecer upgrade no pico.',
        (v_meta_ticket - v_atual.ticket_medio) * v_atual.qtd_vendas,
        'estimativa por mês se ticket atingir a meta', 'medio',
        'R005', 'insight');
      v_criados := v_criados + 1;
    end if;
  end if;

  -- ------ R006: dias fechados > 30% ------
  declare v_dias_mes int;
  begin
    v_dias_mes := extract(day from (date_trunc('month', make_date(v_mes_anterior_ano, v_mes_anterior_mes, 1)) + interval '1 month - 1 day'))::int;
    if v_atual.dias_operados::numeric / v_dias_mes < 0.70 then
      select id into v_existente from plano_acao_item
        where empresa_id=p_empresa and ano=p_ano and mes=p_mes and trigger_regra='R006';
      if v_existente is null then
        insert into plano_acao_item (empresa_id, mes, ano, ordem, titulo, descricao,
          acao_pratica, impacto_estimado_reais, severidade, trigger_regra, categoria_plano)
        values (p_empresa, p_mes, p_ano, 35,
          format('Operar mais dias (%s/%s no mês anterior)',
            v_atual.dias_operados::text, v_dias_mes::text),
          'Dias parados representam receita perdida que cobre custos fixos.',
          format('Identificar quais dias da semana ficaram fechados. Testar abrir pelo menos 1 dia a mais. Promoção pra atrair pra dias devagar.'),
          (v_dias_mes - v_atual.dias_operados) * (v_atual.receita_bruta / v_atual.dias_operados),
          'medio', 'R006', 'insight');
        v_criados := v_criados + 1;
      end if;
    end if;
  end;

  -- ------ V001: concentração top 3 produtos > 70% ------
  declare v_top3 numeric; v_total_prod numeric;
  begin
    select coalesce(sum(fat_total), 0) into v_total_prod
    from vendas_por_produto
    where empresa_id = p_empresa and ano = v_mes_anterior_ano and mes = v_mes_anterior_mes;

    select coalesce(sum(fat_total), 0) into v_top3
    from (
      select fat_total from vendas_por_produto
      where empresa_id = p_empresa and ano = v_mes_anterior_ano and mes = v_mes_anterior_mes
      order by fat_total desc limit 3
    ) t;

    if v_total_prod > 0 and v_top3 / v_total_prod > 0.70 then
      select id into v_existente from plano_acao_item
        where empresa_id=p_empresa and ano=p_ano and mes=p_mes and trigger_regra='V001';
      if v_existente is null then
        insert into plano_acao_item (empresa_id, mes, ano, ordem, titulo, descricao,
          acao_pratica, severidade, trigger_regra, categoria_plano)
        values (p_empresa, p_mes, p_ano, 40,
          format('Concentração em poucos sabores (%s%% no top 3)',
            round(v_top3/v_total_prod*100,0)::text),
          'Depender muito de poucos itens aumenta o risco se um deles falhar.',
          'Promover sabores secundários, considerar tirar sabores que não vendem, ou lançar combo destacando opções menos óbvias.',
          'controle', 'V001', 'insight');
        v_criados := v_criados + 1;
      end if;
    end if;
  end;

  -- ============ POSITIVAS (P001-P009) — só quando há mes anterior ============
  if v_anterior.receita_bruta is not null and v_anterior.receita_bruta > 0 then
    -- P001: crescimento de receita
    if v_atual.receita_bruta / v_anterior.receita_bruta >= 1.05 then
      select id into v_existente from plano_acao_item
        where empresa_id=p_empresa and ano=p_ano and mes=p_mes and trigger_regra='P001';
      if v_existente is null then
        insert into plano_acao_item (empresa_id, mes, ano, ordem, titulo, descricao,
          acao_pratica, severidade, trigger_regra, categoria_plano)
        values (p_empresa, p_mes, p_ano, 5,
          format('🚀 Faturamento subiu %s%% vs mês anterior',
            round((v_atual.receita_bruta/v_anterior.receita_bruta - 1)*100,1)::text),
          'Algo tá funcionando — vale identificar o que pra repetir.',
          'Anotar quais ações/promoções/contratações coincidem com o crescimento. Manter o que mudou.',
          'positivo', 'P001', 'insight');
        v_criados := v_criados + 1;
      end if;
    end if;

    -- P002: CMV voltou pra faixa saudável
    if v_atual.cmv_pct <= v_atual.meta_cmv and v_anterior.cmv_pct > v_anterior.meta_cmv then
      insert into plano_acao_item (empresa_id, mes, ano, ordem, titulo, descricao,
        severidade, trigger_regra, categoria_plano)
      values (p_empresa, p_mes, p_ano, 6,
        format('✅ CMV voltou pra meta (%s%%)', round(v_atual.cmv_pct*100,1)::text),
        'Manter os fornecedores atuais e o controle de gramatura.',
        'positivo', 'P002', 'insight')
      on conflict do nothing;
      v_criados := v_criados + 1;
    end if;

    -- P003: ticket médio subiu
    if v_atual.ticket_medio / v_anterior.ticket_medio >= 1.05 then
      insert into plano_acao_item (empresa_id, mes, ano, ordem, titulo, descricao,
        severidade, trigger_regra, categoria_plano)
      values (p_empresa, p_mes, p_ano, 7,
        format('💰 Ticket médio subiu R$ %s (de R$ %s pra R$ %s)',
          round(v_atual.ticket_medio - v_anterior.ticket_medio, 2)::text,
          round(v_anterior.ticket_medio, 2)::text,
          round(v_atual.ticket_medio, 2)::text),
        'Clientes tão levando mais por pedido. Pode ser combo, upsell ou produto novo de margem alta.',
        'positivo', 'P003', 'insight')
      on conflict do nothing;
      v_criados := v_criados + 1;
    end if;

    -- P006: voltou pro azul
    if v_atual.lucro_socio >= 0 and v_anterior.lucro_socio < 0 then
      insert into plano_acao_item (empresa_id, mes, ano, ordem, titulo, descricao,
        severidade, trigger_regra, categoria_plano)
      values (p_empresa, p_mes, p_ano, 8,
        '🎉 Mês fechou no azul de novo',
        'Lucro do sócio saiu do vermelho. Manter o que vem funcionando e atacar o que ainda pesa.',
        'positivo', 'P006', 'insight')
      on conflict do nothing;
      v_criados := v_criados + 1;
    end if;

    -- P008: mais dias operados
    if v_atual.dias_operados > v_anterior.dias_operados then
      insert into plano_acao_item (empresa_id, mes, ano, ordem, titulo, descricao,
        severidade, trigger_regra, categoria_plano)
      values (p_empresa, p_mes, p_ano, 9,
        format('📅 Operou %s dia(s) a mais que no mês anterior',
          (v_atual.dias_operados - v_anterior.dias_operados)::text),
        'Cada dia ativado é receita que antes era zero.',
        'positivo', 'P008', 'insight')
      on conflict do nothing;
      v_criados := v_criados + 1;
    end if;
  end if;

  return v_criados;
end $$;

-- ---------------------------------------------------------------------
-- Substitui gerar_plano_mensal pra chamar também aplicar_regras_vendas
-- ---------------------------------------------------------------------
create or replace function gerar_plano_mensal(p_empresa uuid, p_ano int, p_mes int)
returns table (criados int, ja_existiam int)
language plpgsql security definer as $$
declare
  v_criados int := 0;
  v_ja int := 0;
  v_dre record;
  v_meta_cmv numeric;
  v_meta_retirada numeric;
  v_template record;
  v_inicio date;
  v_existente uuid;
begin
  v_inicio := make_date(p_ano, p_mes, 1);

  select (metas->>'cmv_maximo_pct')::numeric/100,
         (metas->>'pro_labore_max_pct_receita')::numeric/100
  into v_meta_cmv, v_meta_retirada
  from empresa where id = p_empresa;

  select * into v_dre from dre_mensal
  where empresa_id = p_empresa
    and (ano*12 + mes) = (p_ano*12 + p_mes - 1);

  if v_dre.receita_bruta is not null and v_dre.receita_bruta > 0 then
    -- R001
    if abs(v_dre.cmv)/v_dre.receita_bruta > v_meta_cmv then
      select id into v_existente from plano_acao_item
        where empresa_id=p_empresa and ano=p_ano and mes=p_mes and trigger_regra='R001' and deleted_at is null;
      if v_existente is null then
        insert into plano_acao_item (empresa_id, mes, ano, ordem, titulo, descricao, acao_pratica,
          impacto_estimado_reais, impacto_descricao, severidade, trigger_regra, categoria_plano)
        values (p_empresa, p_mes, p_ano, 10,
          format('Atacar CMV de %s%%', round(abs(v_dre.cmv)/v_dre.receita_bruta*100, 1)),
          format('No mês anterior o CMV foi %s da receita. Meta: até %s%%.',
                 round(abs(v_dre.cmv)/v_dre.receita_bruta*100,1)::text||'%',
                 round(v_meta_cmv*100)::text),
          'Revisar fichas técnicas, cotar com 2 fornecedores alternativos, validar gramatura padronizada.',
          (abs(v_dre.cmv)/v_dre.receita_bruta - v_meta_cmv) * v_dre.receita_bruta,
          'estimativa por mês ao trazer CMV pra meta',
          case when abs(v_dre.cmv)/v_dre.receita_bruta > 0.40 then 'urgente' else 'medio' end,
          'R001', 'insight');
        v_criados := v_criados + 1;
      else v_ja := v_ja + 1;
      end if;
    end if;

    -- R002
    if (v_dre.pro_labore_lucas + v_dre.pro_labore_alessandra)/v_dre.receita_bruta > v_meta_retirada then
      select id into v_existente from plano_acao_item
        where empresa_id=p_empresa and ano=p_ano and mes=p_mes and trigger_regra='R002' and deleted_at is null;
      if v_existente is null then
        insert into plano_acao_item (empresa_id, mes, ano, ordem, titulo, descricao, acao_pratica,
          impacto_estimado_reais, impacto_descricao, severidade, trigger_regra, categoria_plano)
        values (p_empresa, p_mes, p_ano, 11,
          'Reduzir retirada dos sócios',
          format('Retirada conjunta foi %s da receita.',
            round((v_dre.pro_labore_lucas+v_dre.pro_labore_alessandra)/v_dre.receita_bruta*100,1)::text||'%'),
          format('Limite sugerido total: R$ %s (meta %s%% da receita).',
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

    -- R003
    if v_dre.bancarias/v_dre.receita_bruta > 0.10 then
      select id into v_existente from plano_acao_item
        where empresa_id=p_empresa and ano=p_ano and mes=p_mes and trigger_regra='R003' and deleted_at is null;
      if v_existente is null then
        insert into plano_acao_item (empresa_id, mes, ano, ordem, titulo, descricao, acao_pratica,
          impacto_estimado_reais, severidade, trigger_regra, categoria_plano)
        values (p_empresa, p_mes, p_ano, 20,
          'Renegociar dívidas bancárias',
          format('Despesas bancárias somam %s da receita.', round(v_dre.bancarias/v_dre.receita_bruta*100,1)::text||'%'),
          'Buscar portabilidade. Renegociar parcela do Votorantim. Avaliar custo da antecipação do cartão.',
          v_dre.bancarias * 0.30, 'medio', 'R003', 'insight');
        v_criados := v_criados + 1;
      else v_ja := v_ja + 1;
      end if;
    end if;

    -- R004
    if v_dre.lucro_operacional < 0 then
      insert into plano_acao_item (empresa_id, mes, ano, ordem, titulo, descricao,
        acao_pratica, severidade, trigger_regra, categoria_plano)
      values (p_empresa, p_mes, p_ano, 1,
        'Operação no vermelho — reagir',
        format('Lucro operacional do mês anterior: R$ %s.', round(v_dre.lucro_operacional,0)::text),
        'Cortar despesas variáveis evitáveis, estimular vendas no pico, revisar contratos fixos.',
        'urgente', 'R004', 'insight')
      on conflict do nothing;
      v_criados := v_criados + 1;
    end if;
  end if;

  -- Regras de vendas e positivas (V001, V005, P001-P003, P006, P008, R005, R006)
  v_criados := v_criados + aplicar_regras_vendas_positivas(p_empresa, p_ano, p_mes);

  -- Checklist de organização particular (sempre)
  for v_template in
    select * from template_organizacao
    where empresa_id = p_empresa and ativo = true order by ordem
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
-- Documentação: agendar via Supabase Cron (pg_cron) no dia 1 de cada mês
-- Rodar manualmente no SQL Editor:
--   select cron.schedule('gerar_plano_mensal_quadro', '0 6 1 * *',
--     $$ select gerar_plano_mensal('11111111-1111-1111-1111-111111111111',
--                  extract(year from current_date)::int,
--                  extract(month from current_date)::int) $$);
-- ---------------------------------------------------------------------
