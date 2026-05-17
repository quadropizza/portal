-- =====================================================================
-- Quadrô Portal · Schema inicial
-- Implementa modelagem da §5 do CLAUDE.md + decisões §7.13 a §7.23
-- =====================================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";

-- ---------------------------------------------------------------------
-- NÚCLEO (§5.1)
-- ---------------------------------------------------------------------

create table empresa (
  id            uuid primary key default uuid_generate_v4(),
  nome          text not null,
  cnpj          text unique,
  endereco      text,
  segmento      text default 'pizzaria',
  metas         jsonb not null default '{
    "cmv_maximo_pct": 35,
    "despesas_maximo_pct": 60,
    "ticket_medio_meta": 28,
    "pro_labore_max_pct_receita": 25,
    "validade_pizza_pronta_dias": 10
  }'::jsonb,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);

create table usuario (
  id            uuid primary key references auth.users on delete cascade,
  empresa_id    uuid not null references empresa,
  nome          text not null,
  email         text not null,
  perfil        text not null default 'dono',
  created_at    timestamptz not null default now(),
  deleted_at    timestamptz
);
create index on usuario (empresa_id);

create table arquivo_anexo (
  id            uuid primary key default uuid_generate_v4(),
  empresa_id    uuid not null references empresa,
  bucket        text not null,        -- 'pdv','nfe','extrato','boleto','ficha'
  caminho       text not null,        -- caminho no Supabase Storage
  nome_original text not null,
  mime_type     text,
  tamanho_bytes integer,
  data_upload   timestamptz not null default now(),
  parsed        boolean not null default false,
  parsing_erro  text,
  deleted_at    timestamptz
);
create index on arquivo_anexo (empresa_id, bucket, data_upload desc);

-- ---------------------------------------------------------------------
-- CATÁLOGO E FICHA TÉCNICA (§5.3)
-- ---------------------------------------------------------------------

create table produto (
  id                  uuid primary key default uuid_generate_v4(),
  empresa_id          uuid not null references empresa,
  codigo              text not null,                 -- "2","70","115" (do PDV)
  nome                text not null,
  categoria           text not null,                 -- 'pizza_grande','pizza_mini','bebida','sobremesa','outro'
  preco_venda         numeric(12,2),
  produzido_em_lote   boolean not null default false,
  ativo               boolean not null default true,
  observacoes         text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  deleted_at          timestamptz,
  unique (empresa_id, codigo)
);

create table ficha_tecnica (
  id            uuid primary key default uuid_generate_v4(),
  produto_id    uuid not null references produto,
  versao        integer not null default 1,
  ativa         boolean not null default true,
  observacoes   text,
  created_at    timestamptz not null default now(),
  deleted_at    timestamptz,
  unique (produto_id, versao)
);
-- só uma versão ativa por produto
create unique index ficha_tecnica_unica_ativa
  on ficha_tecnica (produto_id) where ativa = true and deleted_at is null;

create table ficha_tecnica_item (
  id                  uuid primary key default uuid_generate_v4(),
  ficha_tecnica_id    uuid not null references ficha_tecnica on delete cascade,
  insumo_id           uuid not null,             -- FK adicionada depois (insumo criado abaixo)
  quantidade          numeric(12,4) not null,
  unidade             text not null              -- 'kg','g','un','l','ml'
);
create index on ficha_tecnica_item (ficha_tecnica_id);

-- ---------------------------------------------------------------------
-- INSUMOS E ESTOQUE (§5.4 + decisão §7.21 custo_origem)
-- ---------------------------------------------------------------------

create table insumo (
  id                          uuid primary key default uuid_generate_v4(),
  empresa_id                  uuid not null references empresa,
  nome                        text not null,
  unidade_padrao              text not null,         -- 'kg','un','l'
  custo_medio_atual           numeric(12,4),         -- recalculado a cada NF
  custo_origem                text not null default 'seed', -- 'seed' | 'nf' | 'manual'
  ultimo_custo                numeric(12,4),
  ultima_compra_data          date,
  fornecedor_principal_id     uuid references fornecedor,
  ativo                       boolean not null default true,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  deleted_at                  timestamptz,
  unique (empresa_id, nome)
);
-- corrige FK circular agora que ficha_tecnica_item já existe
alter table ficha_tecnica_item
  add constraint ficha_tecnica_item_insumo_fk
  foreign key (insumo_id) references insumo;

create table estoque_insumo_movimento (
  id              uuid primary key default uuid_generate_v4(),
  empresa_id      uuid not null references empresa,
  data_hora       timestamptz not null default now(),
  insumo_id       uuid not null references insumo,
  tipo            text not null,                     -- 'entrada_nf','saida_producao','ajuste_contagem','perda'
  quantidade      numeric(12,4) not null,
  custo_unitario  numeric(12,4),
  origem_tipo     text,                              -- 'nota_fiscal','producao','contagem','manual'
  origem_id       uuid,
  observacao      text,
  deleted_at      timestamptz
);
create index on estoque_insumo_movimento (empresa_id, insumo_id, data_hora desc);

create table estoque_pizza_movimento (
  id              uuid primary key default uuid_generate_v4(),
  empresa_id      uuid not null references empresa,
  data_hora       timestamptz not null default now(),
  produto_id      uuid not null references produto,
  tipo            text not null,                     -- 'producao','venda','perda','ajuste_contagem'
  quantidade      integer not null,
  origem_tipo     text,
  origem_id       uuid,
  observacao      text,
  deleted_at      timestamptz
);
create index on estoque_pizza_movimento (empresa_id, produto_id, data_hora desc);

create table producao_lote (
  id              uuid primary key default uuid_generate_v4(),
  empresa_id      uuid not null references empresa,
  data            date not null,
  produtor_nome   text,
  observacoes     text,
  created_at      timestamptz not null default now(),
  deleted_at      timestamptz
);

create table producao_lote_item (
  id                  uuid primary key default uuid_generate_v4(),
  producao_lote_id    uuid not null references producao_lote on delete cascade,
  produto_id          uuid not null references produto,
  quantidade          integer not null
);

create table contagem (
  id              uuid primary key default uuid_generate_v4(),
  empresa_id      uuid not null references empresa,
  data            date not null,
  tipo            text not null,                     -- 'insumo','pizza','ambos'
  observacoes     text,
  created_at      timestamptz not null default now(),
  deleted_at      timestamptz
);

create table contagem_item (
  id                      uuid primary key default uuid_generate_v4(),
  contagem_id             uuid not null references contagem on delete cascade,
  insumo_id               uuid references insumo,
  produto_id              uuid references produto,
  quantidade_contada      numeric(12,4) not null,
  quantidade_esperada     numeric(12,4),
  divergencia             numeric(12,4) generated always as (quantidade_contada - coalesce(quantidade_esperada, 0)) stored,
  valor_divergencia       numeric(12,2),
  check (insumo_id is not null or produto_id is not null)
);

-- ---------------------------------------------------------------------
-- VENDAS (§5.2)
-- ---------------------------------------------------------------------

create table venda_diaria (
  id                          uuid primary key default uuid_generate_v4(),
  empresa_id                  uuid not null references empresa,
  data                        date not null,
  qtd_vendas                  integer not null default 0,
  faturamento_bruto           numeric(12,2) not null default 0,
  pagamento_dinheiro          numeric(12,2) not null default 0,
  pagamento_pix               numeric(12,2) not null default 0,
  pagamento_cartao_credito    numeric(12,2) not null default 0,
  pagamento_cartao_debito     numeric(12,2) not null default 0,
  pagamento_voucher           numeric(12,2) not null default 0,
  pagamento_outros            numeric(12,2) not null default 0,
  arquivo_origem_id           uuid references arquivo_anexo,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  deleted_at                  timestamptz,
  unique (empresa_id, data)
);

create table venda_item (
  id                  uuid primary key default uuid_generate_v4(),
  empresa_id          uuid not null references empresa,
  data                date not null,
  produto_id          uuid not null references produto,
  qtd_vendida         integer not null,
  valor_unitario      numeric(12,2) not null,
  valor_total         numeric(12,2) not null,
  arquivo_origem_id   uuid references arquivo_anexo,
  deleted_at          timestamptz
);
create index on venda_item (empresa_id, data);
create index on venda_item (empresa_id, produto_id);

create table venda_individual (
  id                  uuid primary key default uuid_generate_v4(),
  empresa_id          uuid not null references empresa,
  pdv_id              text not null,                 -- id da venda no Fast Report (ex: "10885")
  data_hora           timestamptz not null,
  total               numeric(12,2) not null,
  forma_pagamento     text,
  arquivo_origem_id   uuid references arquivo_anexo,
  deleted_at          timestamptz,
  unique (empresa_id, pdv_id, data_hora)
);
create index on venda_individual (empresa_id, data_hora);

create table venda_individual_item (
  id                          uuid primary key default uuid_generate_v4(),
  venda_individual_id         uuid not null references venda_individual on delete cascade,
  produto_id                  uuid references produto,
  produto_codigo_origem       text,                  -- guarda código mesmo se produto não cadastrado (lacuna)
  produto_nome_origem         text,
  quantidade                  integer not null,
  valor_unitario              numeric(12,2),
  valor_total                 numeric(12,2)
);

-- ---------------------------------------------------------------------
-- FORNECEDORES E OBRIGAÇÕES A PAGAR (§5.5 + decisão §7.14)
-- "obrigacao_a_pagar" substitui "nota_fiscal" como conceito amplo
-- ---------------------------------------------------------------------

create table fornecedor (
  id                      uuid primary key default uuid_generate_v4(),
  empresa_id              uuid not null references empresa,
  cnpj                    text,
  nome                    text not null,            -- razão social
  apelido                 text,                     -- "Copal","Oesa","Spal"
  categoria_padrao_id     uuid,
  ativo                   boolean not null default true,
  observacoes             text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  deleted_at              timestamptz,
  unique (empresa_id, cnpj)
);

create table obrigacao_a_pagar (
  id                  uuid primary key default uuid_generate_v4(),
  empresa_id          uuid not null references empresa,
  tipo                text not null,                 -- 'nf_fornecedor','boleto_avulso','tributo','encargo_trabalhista'
  fornecedor_id       uuid references fornecedor,    -- null em DARF/FGTS
  numero              text,
  serie               text,
  chave_acesso        text,                          -- 44 dígitos NF-e
  linha_digitavel     text,                          -- 47/48 dígitos boleto
  data_emissao        date,
  data_vencimento     date not null,
  valor_total         numeric(12,2) not null,
  valor_pago          numeric(12,2) not null default 0,
  status              text not null default 'em_aberto', -- 'em_aberto','pago','parcialmente_pago','cancelado'
  competencia         text,                          -- "04/2026" para tributos/encargos
  arquivo_xml_id      uuid references arquivo_anexo,
  arquivo_pdf_id      uuid references arquivo_anexo,
  parsed              boolean not null default false,
  observacoes         text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  deleted_at          timestamptz
);
create index on obrigacao_a_pagar (empresa_id, status, data_vencimento);
create index on obrigacao_a_pagar (empresa_id, fornecedor_id) where fornecedor_id is not null;

create table obrigacao_item (
  id                      uuid primary key default uuid_generate_v4(),
  obrigacao_id            uuid not null references obrigacao_a_pagar on delete cascade,
  descricao_original      text not null,
  insumo_id               uuid references insumo,    -- vínculo manual na 1ª vez, depois automático
  ncm                     text,
  quantidade              numeric(12,4),
  unidade                 text,
  valor_unitario          numeric(12,4),
  valor_total             numeric(12,2)
);

create table obrigacao_pagamento (
  id                  uuid primary key default uuid_generate_v4(),
  obrigacao_id        uuid not null references obrigacao_a_pagar,
  saida_id            uuid,                         -- FK criada depois (categoria_despesa primeiro)
  valor               numeric(12,2) not null,
  data_pagamento      date not null
);

-- ---------------------------------------------------------------------
-- FINANCEIRO (§5.6)
-- ---------------------------------------------------------------------

create table categoria_despesa (
  id              uuid primary key default uuid_generate_v4(),
  empresa_id      uuid not null references empresa,
  nome            text not null,                    -- "CMV","Aluguel","Pessoal Lucas","Pessoal Alessandra"
  grupo           text not null,                    -- 'cmv','folha','impostos','aluguel','bancarias','pro_labore_lucas','pro_labore_alessandra','outros'
  ordem           integer not null default 0,
  ativa           boolean not null default true,
  created_at      timestamptz not null default now(),
  deleted_at      timestamptz,
  unique (empresa_id, nome)
);

-- fecha FK pendente do fornecedor
alter table fornecedor
  add constraint fornecedor_categoria_fk
  foreign key (categoria_padrao_id) references categoria_despesa;

create table categoria_regra_automatica (
  id                          uuid primary key default uuid_generate_v4(),
  empresa_id                  uuid not null references empresa,
  fornecedor_id               uuid references fornecedor,
  texto_descricao_contem      text,
  categoria_id                uuid not null references categoria_despesa,
  prioridade                  integer not null default 100,
  ativa                       boolean not null default true,
  deleted_at                  timestamptz,
  check (fornecedor_id is not null or texto_descricao_contem is not null)
);

create table entrada (
  id                  uuid primary key default uuid_generate_v4(),
  empresa_id          uuid not null references empresa,
  data                date not null,
  descricao           text not null,
  valor               numeric(12,2) not null,
  categoria_id        uuid references categoria_despesa,
  forma_recebimento   text,
  observacoes         text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  deleted_at          timestamptz
);

create table saida (
  id                      uuid primary key default uuid_generate_v4(),
  empresa_id              uuid not null references empresa,
  data                    date not null,
  descricao_original      text not null,
  descricao               text,
  valor                   numeric(12,2) not null,
  categoria_id            uuid references categoria_despesa,
  fornecedor_id           uuid references fornecedor,
  forma_pagamento         text,                     -- 'pix','boleto','cartao','dinheiro','debito_conta'
  arquivo_origem_id       uuid references arquivo_anexo,
  obrigacao_id            uuid references obrigacao_a_pagar,
  observacoes             text,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  deleted_at              timestamptz
);
create index on saida (empresa_id, data desc);
create index on saida (empresa_id, categoria_id);

-- fecha FK do obrigacao_pagamento
alter table obrigacao_pagamento
  add constraint obrigacao_pagamento_saida_fk
  foreign key (saida_id) references saida;

-- ---------------------------------------------------------------------
-- PLANO DE AÇÃO E INSIGHTS (§5.7 + decisão §7.16/§7.17)
-- ---------------------------------------------------------------------

create table plano_acao_item (
  id                              uuid primary key default uuid_generate_v4(),
  empresa_id                      uuid not null references empresa,
  mes                             integer not null,
  ano                             integer not null,
  ordem                           integer not null default 0,
  titulo                          text not null,
  descricao                       text,
  acao_pratica                    text,
  impacto_estimado_reais          numeric(12,2),
  impacto_descricao               text,
  severidade                      text not null,    -- 'urgente','medio','controle','positivo'
  trigger_regra                   text,             -- 'R001','V005','P003' etc
  status                          text not null default 'pendente', -- 'pendente','em_andamento','concluido','arquivado'
  origem                          text not null default 'automatico', -- 'automatico','manual'
  concluido_em                    timestamptz,
  created_at                      timestamptz not null default now(),
  updated_at                      timestamptz not null default now(),
  deleted_at                      timestamptz
);
create index on plano_acao_item (empresa_id, ano, mes, severidade);

-- ---------------------------------------------------------------------
-- AUDIT LOG (decisão §7.15 — tudo editável e deletável com rastro)
-- ---------------------------------------------------------------------

create table audit_log (
  id              bigserial primary key,
  empresa_id      uuid,
  usuario_id      uuid references usuario,
  tabela          text not null,
  registro_id     uuid not null,
  acao            text not null,                    -- 'insert','update','delete','soft_delete','restore'
  diff            jsonb,                            -- {antes, depois}
  ip              inet,
  created_at      timestamptz not null default now()
);
create index on audit_log (empresa_id, tabela, created_at desc);
create index on audit_log (empresa_id, registro_id);

-- ---------------------------------------------------------------------
-- VIEW: dre_mensal (alimenta tela /dre)
-- ---------------------------------------------------------------------

create or replace view dre_mensal as
with periodo as (
  select empresa_id, extract(year from data)::int as ano, extract(month from data)::int as mes
  from saida where deleted_at is null
  union
  select empresa_id, extract(year from data)::int, extract(month from data)::int
  from venda_diaria where deleted_at is null
),
receita as (
  select empresa_id, extract(year from data)::int as ano, extract(month from data)::int as mes,
         sum(faturamento_bruto) as receita_bruta
  from venda_diaria
  where deleted_at is null
  group by 1,2,3
),
despesa_grupo as (
  select s.empresa_id,
         extract(year from s.data)::int as ano,
         extract(month from s.data)::int as mes,
         c.grupo,
         sum(s.valor) as total
  from saida s
  left join categoria_despesa c on c.id = s.categoria_id
  where s.deleted_at is null
  group by 1,2,3,4
)
select p.empresa_id, p.ano, p.mes,
       coalesce(r.receita_bruta, 0)                                                     as receita_bruta,
       coalesce(sum(case when d.grupo='cmv' then d.total end), 0)                       as cmv,
       coalesce(sum(case when d.grupo='folha' then d.total end), 0)                     as folha,
       coalesce(sum(case when d.grupo='impostos' then d.total end), 0)                  as impostos,
       coalesce(sum(case when d.grupo='aluguel' then d.total end), 0)                   as aluguel,
       coalesce(sum(case when d.grupo='bancarias' then d.total end), 0)                 as bancarias,
       coalesce(sum(case when d.grupo='outros' then d.total end), 0)                    as outros,
       coalesce(sum(case when d.grupo='pro_labore_lucas' then d.total end), 0)          as pro_labore_lucas,
       coalesce(sum(case when d.grupo='pro_labore_alessandra' then d.total end), 0)     as pro_labore_alessandra,
       coalesce(r.receita_bruta, 0)
         - coalesce(sum(case when d.grupo in ('cmv','folha','impostos','aluguel','bancarias','outros') then d.total end), 0)
                                                                                        as lucro_operacional,
       coalesce(r.receita_bruta, 0)
         - coalesce(sum(case when d.grupo in ('cmv','folha','impostos','aluguel','bancarias','outros','pro_labore_lucas','pro_labore_alessandra') then d.total end), 0)
                                                                                        as lucro_socio
from periodo p
left join receita r on r.empresa_id=p.empresa_id and r.ano=p.ano and r.mes=p.mes
left join despesa_grupo d on d.empresa_id=p.empresa_id and d.ano=p.ano and d.mes=p.mes
group by p.empresa_id, p.ano, p.mes, r.receita_bruta;

-- ---------------------------------------------------------------------
-- VIEW: painel_lacunas (decisão §7.23 — sinaliza tudo que falta)
-- ---------------------------------------------------------------------

create or replace view painel_lacunas as
-- Produtos sem ficha técnica ativa
select 'produto_sem_ficha' as tipo,
       p.empresa_id, p.id as registro_id,
       p.codigo || ' · ' || p.nome as descricao,
       '/catalogo/fichas-tecnicas/nova?produto=' || p.id as link_resolver,
       'media' as severidade
from produto p
where p.ativo = true
  and p.deleted_at is null
  and not exists (
    select 1 from ficha_tecnica ft
    where ft.produto_id = p.id and ft.ativa = true and ft.deleted_at is null
  )
union all
-- Insumos com custo ainda em 'seed'
select 'insumo_custo_seed' as tipo,
       i.empresa_id, i.id,
       i.nome || ' (custo R$ ' || coalesce(i.custo_medio_atual::text,'?') || ' aguardando NF)',
       '/estoque/insumos/' || i.id,
       'media'
from insumo i
where i.ativo = true and i.deleted_at is null and i.custo_origem = 'seed'
union all
-- Vendas com produto não cadastrado
select 'venda_produto_nao_cadastrado' as tipo,
       vi.empresa_id, vi.id,
       'PDV cód ' || vi.produto_codigo_origem || ' · ' || coalesce(vi.produto_nome_origem,'?'),
       '/catalogo/produtos/novo?codigo=' || vi.produto_codigo_origem,
       'alta'
from venda_individual_item vi
where vi.produto_id is null and vi.produto_codigo_origem is not null
union all
-- Saídas sem categoria atribuída
select 'saida_sem_categoria' as tipo,
       s.empresa_id, s.id,
       s.data::text || ' · ' || s.descricao_original || ' · R$ ' || s.valor::text,
       '/financeiro/saidas/' || s.id,
       'alta'
from saida s
where s.categoria_id is null and s.deleted_at is null
union all
-- Obrigações vencidas sem pagamento
select 'obrigacao_vencida' as tipo,
       o.empresa_id, o.id,
       'Vencido ' || o.data_vencimento::text || ' · R$ ' || o.valor_total::text,
       '/notas-fiscais/' || o.id,
       'urgente'
from obrigacao_a_pagar o
where o.status = 'em_aberto'
  and o.data_vencimento < current_date
  and o.deleted_at is null
union all
-- Fornecedores sem categoria padrão
select 'fornecedor_sem_categoria' as tipo,
       f.empresa_id, f.id,
       f.apelido || ' (' || f.nome || ')',
       '/fornecedores/' || f.id,
       'controle'
from fornecedor f
where f.ativo = true and f.deleted_at is null and f.categoria_padrao_id is null;

-- ---------------------------------------------------------------------
-- TRIGGERS · updated_at automático + audit log
-- ---------------------------------------------------------------------

create or replace function touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

do $$
declare t text;
begin
  foreach t in array array['empresa','produto','insumo','venda_diaria','fornecedor',
    'obrigacao_a_pagar','entrada','saida','plano_acao_item']
  loop
    execute format('create trigger trg_%s_touch before update on %I for each row execute function touch_updated_at()', t, t);
  end loop;
end $$;

create or replace function log_audit() returns trigger language plpgsql as $$
declare
  v_empresa uuid;
  v_user    uuid := auth.uid();
begin
  if tg_op = 'DELETE' then
    v_empresa := old.empresa_id;
    insert into audit_log (empresa_id, usuario_id, tabela, registro_id, acao, diff)
    values (v_empresa, v_user, tg_table_name, old.id, 'delete', jsonb_build_object('antes', to_jsonb(old)));
    return old;
  elsif tg_op = 'UPDATE' then
    v_empresa := new.empresa_id;
    if old.deleted_at is null and new.deleted_at is not null then
      insert into audit_log (empresa_id, usuario_id, tabela, registro_id, acao, diff)
      values (v_empresa, v_user, tg_table_name, new.id, 'soft_delete', jsonb_build_object('antes', to_jsonb(old)));
    elsif old.deleted_at is not null and new.deleted_at is null then
      insert into audit_log (empresa_id, usuario_id, tabela, registro_id, acao, diff)
      values (v_empresa, v_user, tg_table_name, new.id, 'restore', jsonb_build_object('antes', to_jsonb(old), 'depois', to_jsonb(new)));
    else
      insert into audit_log (empresa_id, usuario_id, tabela, registro_id, acao, diff)
      values (v_empresa, v_user, tg_table_name, new.id, 'update', jsonb_build_object('antes', to_jsonb(old), 'depois', to_jsonb(new)));
    end if;
    return new;
  else
    v_empresa := new.empresa_id;
    insert into audit_log (empresa_id, usuario_id, tabela, registro_id, acao, diff)
    values (v_empresa, v_user, tg_table_name, new.id, 'insert', jsonb_build_object('depois', to_jsonb(new)));
    return new;
  end if;
end $$;

do $$
declare t text;
begin
  foreach t in array array['produto','ficha_tecnica','ficha_tecnica_item','insumo',
    'venda_diaria','venda_item','venda_individual','fornecedor',
    'obrigacao_a_pagar','obrigacao_item','categoria_despesa','entrada','saida',
    'plano_acao_item','producao_lote','contagem']
  loop
    execute format('create trigger trg_%s_audit after insert or update or delete on %I for each row execute function log_audit()', t, t);
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- TRIGGER de negócio · produção baixa insumos via ficha técnica (§4.3)
-- ---------------------------------------------------------------------

create or replace function aplicar_producao() returns trigger language plpgsql as $$
declare
  v_lote producao_lote%rowtype;
  v_item record;
begin
  select * into v_lote from producao_lote where id = new.producao_lote_id;
  -- entrada de pizza pronta
  insert into estoque_pizza_movimento (empresa_id, data_hora, produto_id, tipo, quantidade, origem_tipo, origem_id)
  values (v_lote.empresa_id, v_lote.data::timestamptz, new.produto_id, 'producao', new.quantidade, 'producao', new.id);
  -- saída de insumos via ficha ativa
  for v_item in
    select fti.insumo_id, fti.quantidade as qtd_unitaria, fti.unidade, i.custo_medio_atual
    from ficha_tecnica ft
    join ficha_tecnica_item fti on fti.ficha_tecnica_id = ft.id
    join insumo i on i.id = fti.insumo_id
    where ft.produto_id = new.produto_id and ft.ativa = true and ft.deleted_at is null
  loop
    insert into estoque_insumo_movimento
      (empresa_id, data_hora, insumo_id, tipo, quantidade, custo_unitario, origem_tipo, origem_id)
    values (v_lote.empresa_id, v_lote.data::timestamptz, v_item.insumo_id, 'saida_producao',
            -(v_item.qtd_unitaria * new.quantidade), v_item.custo_medio_atual, 'producao', new.id);
  end loop;
  return new;
end $$;

create trigger trg_producao_aplicar
  after insert on producao_lote_item
  for each row execute function aplicar_producao();
