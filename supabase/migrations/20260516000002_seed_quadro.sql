-- =====================================================================
-- Seed inicial · Quadrô Pizza
-- Empresa única, categorias de despesa, produtos do catálogo abril/maio,
-- 8 fichas técnicas levantadas pelo dono (insumos como SEED).
-- Rode UMA VEZ na criação do projeto Supabase.
-- =====================================================================

-- Empresa
insert into empresa (id, nome, cnpj, endereco, segmento)
values ('11111111-1111-1111-1111-111111111111',
        'Quadrô Pizza',
        '60.723.998/0001-84',
        'Rua Uruguai 458, Bloco C2 · Itajaí/SC · ao lado do Teatro da Univali',
        'pizzaria')
on conflict (cnpj) do nothing;

-- Categorias de despesa (lucas e ale separados — decisão §7.4)
insert into categoria_despesa (empresa_id, nome, grupo, ordem) values
  ('11111111-1111-1111-1111-111111111111', 'CMV · Insumos pizza', 'cmv', 10),
  ('11111111-1111-1111-1111-111111111111', 'CMV · Bebidas', 'cmv', 11),
  ('11111111-1111-1111-1111-111111111111', 'CMV · Embalagem', 'cmv', 12),
  ('11111111-1111-1111-1111-111111111111', 'Folha · Atendentes', 'folha', 20),
  ('11111111-1111-1111-1111-111111111111', 'Folha · Bonificações', 'folha', 21),
  ('11111111-1111-1111-1111-111111111111', 'Folha · Vale alimentação', 'folha', 22),
  ('11111111-1111-1111-1111-111111111111', 'Folha · INSS/FGTS', 'folha', 23),
  ('11111111-1111-1111-1111-111111111111', 'Aluguel loja', 'aluguel', 30),
  ('11111111-1111-1111-1111-111111111111', 'Aluguel sala 2', 'aluguel', 31),
  ('11111111-1111-1111-1111-111111111111', 'Simples Nacional', 'impostos', 40),
  ('11111111-1111-1111-1111-111111111111', 'ICMS', 'impostos', 41),
  ('11111111-1111-1111-1111-111111111111', 'COFINS', 'impostos', 42),
  ('11111111-1111-1111-1111-111111111111', 'IRPJ', 'impostos', 43),
  ('11111111-1111-1111-1111-111111111111', 'CSLL', 'impostos', 44),
  ('11111111-1111-1111-1111-111111111111', 'PIS', 'impostos', 45),
  ('11111111-1111-1111-1111-111111111111', 'DARFs / outras arrecadações', 'impostos', 46),
  ('11111111-1111-1111-1111-111111111111', 'Financiamento bancário', 'bancarias', 50),
  ('11111111-1111-1111-1111-111111111111', 'Empréstimo', 'bancarias', 51),
  ('11111111-1111-1111-1111-111111111111', 'Fatura cartão (PJ)', 'bancarias', 52),
  ('11111111-1111-1111-1111-111111111111', 'Tarifas bancárias', 'bancarias', 53),
  ('11111111-1111-1111-1111-111111111111', 'Energia elétrica', 'outros', 60),
  ('11111111-1111-1111-1111-111111111111', 'Telefonia / Internet', 'outros', 61),
  ('11111111-1111-1111-1111-111111111111', 'Software (LIVN / Alude)', 'outros', 62),
  ('11111111-1111-1111-1111-111111111111', 'Administração (Piguet)', 'outros', 63),
  ('11111111-1111-1111-1111-111111111111', 'Diversos', 'outros', 64),
  ('11111111-1111-1111-1111-111111111111', 'Pró-labore Lucas', 'pro_labore_lucas', 90),
  ('11111111-1111-1111-1111-111111111111', 'Pró-labore Alessandra', 'pro_labore_alessandra', 91)
on conflict (empresa_id, nome) do nothing;

-- Insumos da ficha técnica (custo_origem='seed' — primeira NF substitui)
insert into insumo (empresa_id, nome, unidade_padrao, custo_medio_atual, custo_origem) values
  ('11111111-1111-1111-1111-111111111111', 'Massa quadrô grande', 'un', 0.95, 'seed'),
  ('11111111-1111-1111-1111-111111111111', 'Massa mini', 'un', 0.71, 'seed'),
  ('11111111-1111-1111-1111-111111111111', 'Molho de tomate', 'kg', 10.00, 'seed'),
  ('11111111-1111-1111-1111-111111111111', 'Queijo mussarela', 'kg', 31.11, 'seed'),
  ('11111111-1111-1111-1111-111111111111', 'Calabresa', 'kg', 25.00, 'seed'),
  ('11111111-1111-1111-1111-111111111111', 'Frango', 'kg', 18.33, 'seed'),
  ('11111111-1111-1111-1111-111111111111', 'Catupiry', 'kg', 36.67, 'seed'),
  ('11111111-1111-1111-1111-111111111111', 'Bacon', 'kg', 35.00, 'seed'),
  ('11111111-1111-1111-1111-111111111111', 'Milho', 'kg', 16.25, 'seed'),
  ('11111111-1111-1111-1111-111111111111', 'Pepperoni', 'kg', 70.00, 'seed'),
  ('11111111-1111-1111-1111-111111111111', 'Presunto', 'kg', 21.25, 'seed'),
  ('11111111-1111-1111-1111-111111111111', 'Gorgonzola', 'kg', 50.00, 'seed'),
  ('11111111-1111-1111-1111-111111111111', 'Cebola', 'kg', 5.00, 'seed'),
  ('11111111-1111-1111-1111-111111111111', 'Ovo', 'un', 0.70, 'seed'),
  ('11111111-1111-1111-1111-111111111111', 'Embalagem grande', 'un', 0.75, 'seed'),
  ('11111111-1111-1111-1111-111111111111', 'Caixinha mini', 'un', 1.15, 'seed')
on conflict (empresa_id, nome) do nothing;

-- Produtos (códigos do PDV Fast Report)
insert into produto (empresa_id, codigo, nome, categoria, preco_venda, produzido_em_lote) values
  -- Pizzas grandes
  ('11111111-1111-1111-1111-111111111111', '2',   'Calabresa',              'pizza_grande', 19.99, true),
  ('11111111-1111-1111-1111-111111111111', '3',   'Frango com Catupiry',    'pizza_grande', 19.99, true),
  ('11111111-1111-1111-1111-111111111111', '4',   'Milho com Bacon',        'pizza_grande', 19.99, true),
  ('11111111-1111-1111-1111-111111111111', '6',   '4 Queijos',              'pizza_grande', 19.99, true),
  ('11111111-1111-1111-1111-111111111111', '7',   'Portuguesa',             'pizza_grande', 19.99, true),
  ('11111111-1111-1111-1111-111111111111', '13',  'Pepperoni',              'pizza_grande', 19.99, true),
  ('11111111-1111-1111-1111-111111111111', '45',  'Ovomaltine',             'pizza_grande', 19.99, true),
  ('11111111-1111-1111-1111-111111111111', '115', 'Chocolate ao Leite',     'pizza_grande', 19.99, true),
  ('11111111-1111-1111-1111-111111111111', '117', 'Chocolate Branco',       'pizza_grande', 19.99, true),
  -- Mini quadrô
  ('11111111-1111-1111-1111-111111111111', '70',  'Mini Calabresa',         'pizza_mini', 12.90, true),
  ('11111111-1111-1111-1111-111111111111', '72',  'Mini Frango Catupiry',   'pizza_mini', 12.90, true),
  ('11111111-1111-1111-1111-111111111111', '109', 'Mini Nutella',           'pizza_mini', 12.90, true),
  -- Bebidas
  ('11111111-1111-1111-1111-111111111111', '11',  'Coca Cola 350ml',                'bebida', 6.00, false),
  ('11111111-1111-1111-1111-111111111111', '12',  'Coca Cola Zero 350ml',           'bebida', 6.00, false),
  ('11111111-1111-1111-1111-111111111111', '14',  'Sprite 350ml',                   'bebida', 6.00, false),
  ('11111111-1111-1111-1111-111111111111', '16',  'Sprite Zero 350ml',              'bebida', 6.00, false),
  ('11111111-1111-1111-1111-111111111111', '17',  'Fanta Laranja 350ml',            'bebida', 6.00, false),
  ('11111111-1111-1111-1111-111111111111', '18',  'Coca Cola 200ml',                'bebida', 4.00, false),
  ('11111111-1111-1111-1111-111111111111', '19',  'Coca Cola Zero 200ml',           'bebida', 4.00, false),
  ('11111111-1111-1111-1111-111111111111', '21',  'Kapo Del Valle Uva 200ml',       'bebida', 4.00, false),
  ('11111111-1111-1111-1111-111111111111', '23',  'Guaraná Antártica 350ml',        'bebida', 6.00, false),
  ('11111111-1111-1111-1111-111111111111', '84',  'Del Valle Limonada 290ml',       'bebida', 7.00, false),
  ('11111111-1111-1111-1111-111111111111', '86',  'Del Valle Frut Laranja 450ml',   'bebida', 7.00, false),
  ('11111111-1111-1111-1111-111111111111', '88',  'Del Valle Frut Uva 450ml',       'bebida', 7.00, false),
  ('11111111-1111-1111-1111-111111111111', '90',  'Kapo Morango 200ml',             'bebida', 4.00, false),
  ('11111111-1111-1111-1111-111111111111', '94',  'Fanta Uva 350ml',                'bebida', 6.00, false)
on conflict (empresa_id, codigo) do nothing;

-- Fichas técnicas das 8 pizzas que o dono levantou em maio/2026
-- (Mini Calabresa, Mini Frango Catupiry, 6 quadrô grandes)
-- Script: cria ficha v1 ativa e itens com qtd em unidade-padrão do insumo.
do $$
declare
  v_emp uuid := '11111111-1111-1111-1111-111111111111';
  v_prod uuid;
  v_ft   uuid;
  v_insumos_id record;
begin
  -- Mini Calabresa (cód 70)
  select id into v_prod from produto where empresa_id=v_emp and codigo='70';
  if v_prod is not null then
    insert into ficha_tecnica (produto_id, versao, ativa, observacoes)
    values (v_prod, 1, true, 'Versão seed do .docx · 2026-05-16') returning id into v_ft;
    insert into ficha_tecnica_item (ficha_tecnica_id, insumo_id, quantidade, unidade)
    select v_ft, id, q, u from (values
      ('Massa mini',         1::numeric, 'un'),
      ('Molho de tomate',    0.005,      'kg'),
      ('Queijo mussarela',   0.035,      'kg'),
      ('Calabresa',          0.020,      'kg'),
      ('Caixinha mini',      1::numeric, 'un')
    ) as f(nome, q, u)
    join insumo on insumo.empresa_id=v_emp and insumo.nome=f.nome;
  end if;

  -- Mini Frango Catupiry (cód 72)
  select id into v_prod from produto where empresa_id=v_emp and codigo='72';
  if v_prod is not null then
    insert into ficha_tecnica (produto_id, versao, ativa, observacoes)
    values (v_prod, 1, true, 'Versão seed do .docx · 2026-05-16') returning id into v_ft;
    insert into ficha_tecnica_item (ficha_tecnica_id, insumo_id, quantidade, unidade)
    select v_ft, id, q, u from (values
      ('Massa mini',         1::numeric, 'un'),
      ('Molho de tomate',    0.005,      'kg'),
      ('Queijo mussarela',   0.035,      'kg'),
      ('Frango',             0.030,      'kg'),
      ('Catupiry',           0.010,      'kg'),
      ('Caixinha mini',      1::numeric, 'un')
    ) as f(nome, q, u)
    join insumo on insumo.empresa_id=v_emp and insumo.nome=f.nome;
  end if;

  -- Frango Catupiry grande (cód 3)
  select id into v_prod from produto where empresa_id=v_emp and codigo='3';
  if v_prod is not null then
    insert into ficha_tecnica (produto_id, versao, ativa, observacoes)
    values (v_prod, 1, true, 'Versão seed do .docx · 2026-05-16') returning id into v_ft;
    insert into ficha_tecnica_item (ficha_tecnica_id, insumo_id, quantidade, unidade)
    select v_ft, id, q, u from (values
      ('Massa quadrô grande', 1::numeric, 'un'),
      ('Molho de tomate',     0.005,      'kg'),
      ('Queijo mussarela',    0.045,      'kg'),
      ('Frango',              0.030,      'kg'),
      ('Catupiry',            0.015,      'kg'),
      ('Embalagem grande',    1::numeric, 'un')
    ) as f(nome, q, u)
    join insumo on insumo.empresa_id=v_emp and insumo.nome=f.nome;
  end if;

  -- Calabresa grande (cód 2)
  select id into v_prod from produto where empresa_id=v_emp and codigo='2';
  if v_prod is not null then
    insert into ficha_tecnica (produto_id, versao, ativa, observacoes)
    values (v_prod, 1, true, 'Versão seed do .docx · 2026-05-16') returning id into v_ft;
    insert into ficha_tecnica_item (ficha_tecnica_id, insumo_id, quantidade, unidade)
    select v_ft, id, q, u from (values
      ('Massa quadrô grande', 1::numeric, 'un'),
      ('Molho de tomate',     0.005,      'kg'),
      ('Queijo mussarela',    0.045,      'kg'),
      ('Calabresa',           0.040,      'kg'),
      ('Embalagem grande',    1::numeric, 'un')
    ) as f(nome, q, u)
    join insumo on insumo.empresa_id=v_emp and insumo.nome=f.nome;
  end if;

  -- Milho com Bacon (cód 4)
  select id into v_prod from produto where empresa_id=v_emp and codigo='4';
  if v_prod is not null then
    insert into ficha_tecnica (produto_id, versao, ativa, observacoes)
    values (v_prod, 1, true, 'Versão seed do .docx · 2026-05-16') returning id into v_ft;
    insert into ficha_tecnica_item (ficha_tecnica_id, insumo_id, quantidade, unidade)
    select v_ft, id, q, u from (values
      ('Massa quadrô grande', 1::numeric, 'un'),
      ('Molho de tomate',     0.005,      'kg'),
      ('Queijo mussarela',    0.045,      'kg'),
      ('Bacon',               0.010,      'kg'),
      ('Milho',               0.040,      'kg'),
      ('Embalagem grande',    1::numeric, 'un')
    ) as f(nome, q, u)
    join insumo on insumo.empresa_id=v_emp and insumo.nome=f.nome;
  end if;

  -- 4 Queijos (cód 6)
  select id into v_prod from produto where empresa_id=v_emp and codigo='6';
  if v_prod is not null then
    insert into ficha_tecnica (produto_id, versao, ativa, observacoes)
    values (v_prod, 1, true, 'Versão seed do .docx · 2026-05-16') returning id into v_ft;
    insert into ficha_tecnica_item (ficha_tecnica_id, insumo_id, quantidade, unidade)
    select v_ft, id, q, u from (values
      ('Massa quadrô grande', 1::numeric, 'un'),
      ('Molho de tomate',     0.005,      'kg'),
      ('Queijo mussarela',    0.045,      'kg'),
      ('Presunto',            0.025,      'kg'),
      ('Gorgonzola',          0.005,      'kg'),
      ('Embalagem grande',    1::numeric, 'un')
    ) as f(nome, q, u)
    join insumo on insumo.empresa_id=v_emp and insumo.nome=f.nome;
  end if;

  -- Pepperoni (cód 13)
  select id into v_prod from produto where empresa_id=v_emp and codigo='13';
  if v_prod is not null then
    insert into ficha_tecnica (produto_id, versao, ativa, observacoes)
    values (v_prod, 1, true, 'Versão seed do .docx · 2026-05-16') returning id into v_ft;
    insert into ficha_tecnica_item (ficha_tecnica_id, insumo_id, quantidade, unidade)
    select v_ft, id, q, u from (values
      ('Massa quadrô grande', 1::numeric, 'un'),
      ('Molho de tomate',     0.005,      'kg'),
      ('Queijo mussarela',    0.045,      'kg'),
      ('Pepperoni',           0.020,      'kg'),
      ('Embalagem grande',    1::numeric, 'un')
    ) as f(nome, q, u)
    join insumo on insumo.empresa_id=v_emp and insumo.nome=f.nome;
  end if;

  -- Portuguesa (cód 7)
  select id into v_prod from produto where empresa_id=v_emp and codigo='7';
  if v_prod is not null then
    insert into ficha_tecnica (produto_id, versao, ativa, observacoes)
    values (v_prod, 1, true, 'Versão seed do .docx · 2026-05-16') returning id into v_ft;
    insert into ficha_tecnica_item (ficha_tecnica_id, insumo_id, quantidade, unidade)
    select v_ft, id, q, u from (values
      ('Massa quadrô grande', 1::numeric, 'un'),
      ('Molho de tomate',     0.005,      'kg'),
      ('Queijo mussarela',    0.045,      'kg'),
      ('Presunto',            0.040,      'kg'),
      ('Cebola',              0.020,      'kg'),
      ('Ovo',                 0.5,        'un'),
      ('Embalagem grande',    1::numeric, 'un')
    ) as f(nome, q, u)
    join insumo on insumo.empresa_id=v_emp and insumo.nome=f.nome;
  end if;
end $$;
