-- Somente projeto vazio confirmado. Não aplicar em base existente.
-- DDL de negócio revisado: sem seeds, Auth legado ou permissões anônimas amplas.
begin;
do $$ begin
  if current_setting('server_version_num')::int < 150000 then
    raise exception 'PostgreSQL 15+ necessário';
  end if;
  if to_regclass('auth.users') is null or to_regprocedure('auth.uid()') is null then
    raise exception 'Auth gerenciado do Supabase ausente. Não criar substituto remoto.';
  end if;
  if exists(select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where (n.nspname in ('cliente','vendedor','entregador')
      or (n.nspname='public' and c.relname ~ '^(raiz_|cliente_|vendedor_|entregador_)'))
      and c.relkind in ('r','p','v','m','S')) then
    raise exception 'Estrutura RAIZ existente: interromper e preparar migração incremental.';
  end if;
end $$;
create schema if not exists cliente;
create schema if not exists vendedor;
create schema if not exists entregador;

CREATE TABLE cliente.usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nome VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE,
    telefone VARCHAR(30),
    endereco TEXT NOT NULL,
    bairro VARCHAR(100) NOT NULL,
    cidade VARCHAR(100) NOT NULL,
    estado VARCHAR(2) NOT NULL,
    cep VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE cliente.produtos (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(200) NOT NULL,
    categoria VARCHAR(50) NOT NULL CHECK (categoria IN ('plantas', 'vasos', 'insumos', 'ferramentas')),
    vendedor_nome VARCHAR(150) NOT NULL DEFAULT 'Flora Verde',
    preco NUMERIC(10, 2) NOT NULL CHECK (preco >= 0),
    emoji VARCHAR(20) DEFAULT '🌿',
    tag VARCHAR(100),
    rating NUMERIC(3, 2) DEFAULT 0,
    reviews INT DEFAULT 0,
    estoque INT NOT NULL DEFAULT 10 CHECK (estoque >= 0),
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    descricao TEXT,
    cuidados TEXT,
    porte VARCHAR(50) DEFAULT 'Médio porte',
    fragil BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE cliente.favoritos (
    id SERIAL PRIMARY KEY,
    cliente_id UUID REFERENCES cliente.usuarios(id) ON DELETE CASCADE,
    produto_id INT REFERENCES cliente.produtos(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(cliente_id, produto_id)
);

CREATE TABLE cliente.carrinho (
    id SERIAL PRIMARY KEY,
    cliente_id UUID REFERENCES cliente.usuarios(id) ON DELETE CASCADE,
    produto_id INT REFERENCES cliente.produtos(id) ON DELETE CASCADE,
    quantidade INT NOT NULL DEFAULT 1 CHECK (quantidade > 0),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(cliente_id, produto_id)
);

CREATE TABLE cliente.pedidos (
    id BIGINT PRIMARY KEY,
    cliente_id UUID REFERENCES cliente.usuarios(id) ON DELETE SET NULL,
    cliente_nome VARCHAR(150) NOT NULL,
    data_formatada VARCHAR(60) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Confirmado' 
        CHECK (status IN ('Confirmado', 'Em preparação', 'Em transporte', 'Entregue', 'Cancelado')),
    timeline_step INT NOT NULL DEFAULT 0 CHECK (timeline_step BETWEEN 0 AND 3),
    subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    frete NUMERIC(10, 2) NOT NULL DEFAULT 15.00,
    total NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    forma_pagamento VARCHAR(50) NOT NULL DEFAULT 'Cartão de Crédito',
    endereco_entrega TEXT NOT NULL,
    avaliacao_nota INT CHECK (avaliacao_nota BETWEEN 1 AND 5),
    avaliacao_comentario TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE cliente.itens_pedido (
    id BIGSERIAL PRIMARY KEY,
    pedido_id BIGINT REFERENCES cliente.pedidos(id) ON DELETE CASCADE,
    produto_id INT REFERENCES cliente.produtos(id) ON DELETE SET NULL,
    produto_nome VARCHAR(200) NOT NULL,
    quantidade INT NOT NULL DEFAULT 1 CHECK (quantidade > 0),
    preco_unitario NUMERIC(10, 2) NOT NULL,
    emoji VARCHAR(20) DEFAULT '🌿',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE vendedor.lojas (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    tagline VARCHAR(255),
    descricao TEXT,
    horario_funcionamento VARCHAR(100),
    endereco TEXT,
    cnpj VARCHAR(30),
    faturamento_mensal NUMERIC(12, 2) DEFAULT 0,
    faturamento_crescimento_pct NUMERIC(5, 2) DEFAULT 0,
    visualizacoes_vitrine INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE vendedor.produtos (
    id SERIAL PRIMARY KEY,
    loja_id INT REFERENCES vendedor.lojas(id) ON DELETE CASCADE,
    nome VARCHAR(200) NOT NULL,
    categoria VARCHAR(50) NOT NULL CHECK (categoria IN ('plantas', 'vasos', 'insumos', 'ferramentas')),
    preco NUMERIC(10, 2) NOT NULL CHECK (preco >= 0),
    emoji VARCHAR(20) DEFAULT '🌿',
    tag VARCHAR(100),
    rating NUMERIC(3, 2) DEFAULT 0,
    reviews INT DEFAULT 0,
    estoque INT NOT NULL DEFAULT 10 CHECK (estoque >= 0),
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    descricao TEXT,
    cuidados TEXT,
    porte VARCHAR(50) DEFAULT 'Médio porte',
    fragil BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE vendedor.pedidos (
    id BIGINT PRIMARY KEY, -- Correlacionado ao ID do cliente.pedidos
    loja_id INT REFERENCES vendedor.lojas(id) ON DELETE SET NULL,
    cliente_nome VARCHAR(150) NOT NULL,
    data_pedido VARCHAR(60) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Pendente' 
        CHECK (status IN ('Pendente', 'Em preparo', 'Enviado', 'Entregue', 'Cancelado')),
    subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    endereco_entrega TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE vendedor.itens_pedido (
    id BIGSERIAL PRIMARY KEY,
    pedido_id BIGINT REFERENCES vendedor.pedidos(id) ON DELETE CASCADE,
    produto_id INT REFERENCES vendedor.produtos(id) ON DELETE SET NULL,
    produto_nome VARCHAR(200) NOT NULL,
    quantidade INT NOT NULL DEFAULT 1 CHECK (quantidade > 0),
    preco_unitario NUMERIC(10, 2) NOT NULL,
    emoji VARCHAR(20) DEFAULT '🌿',
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE vendedor.vendas_diarias (
    id SERIAL PRIMARY KEY,
    loja_id INT REFERENCES vendedor.lojas(id) ON DELETE CASCADE,
    dia_semana VARCHAR(20) NOT NULL, -- Seg, Ter, Qua, Qui, Sex, Sáb, Dom
    valor NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    data_referencia DATE DEFAULT CURRENT_DATE
);

CREATE TABLE entregador.perfil (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(150) NOT NULL,
    telefone VARCHAR(30),
    veiculo VARCHAR(100),
    online BOOLEAN NOT NULL DEFAULT FALSE,
    saldo_carteira NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    chave_pix VARCHAR(150),
    total_corridas_hoje INT NOT NULL DEFAULT 0,
    ganhos_hoje NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE entregador.corridas (
    id BIGINT PRIMARY KEY, -- Correlacionado ao ID do cliente.pedidos
    distancia VARCHAR(30),
    valor NUMERIC(10, 2) NOT NULL DEFAULT 15.00,
    coleta_loja VARCHAR(150) NOT NULL,
    coleta_endereco TEXT NOT NULL,
    entrega_destino VARCHAR(150) NOT NULL,
    entrega_endereco TEXT NOT NULL,
    item_descricao VARCHAR(200) NOT NULL,
    produto_id INT,
    fragil BOOLEAN DEFAULT TRUE,
    porte VARCHAR(50) DEFAULT 'Médio porte',
    nota_instrucao TEXT DEFAULT 'Manter o vaso em pé e evitar exposição direta ao sol.',
    status VARCHAR(50) NOT NULL DEFAULT 'Disponível'
        CHECK (status IN ('Disponível', 'Em andamento', 'Concluída', 'Cancelada')),
    etapa_atual INT NOT NULL DEFAULT 0 CHECK (etapa_atual BETWEEN 0 AND 3),
    checklist_vaso_ok BOOLEAN DEFAULT FALSE,
    checklist_folhagem_ok BOOLEAN DEFAULT FALSE,
    checklist_entrega_ok BOOLEAN DEFAULT FALSE,
    entregador_id INT REFERENCES entregador.perfil(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE entregador.historico_corridas (
    id BIGSERIAL PRIMARY KEY,
    corrida_id BIGINT, -- ID de referência da corrida (histórico/rastreio)
    entregador_id INT REFERENCES entregador.perfil(id) ON DELETE CASCADE,
    valor NUMERIC(10, 2) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Concluída',
    data_formatada VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE entregador.extrato_carteira (
    id BIGSERIAL PRIMARY KEY,
    entregador_id INT REFERENCES entregador.perfil(id) ON DELETE CASCADE,
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('ganho_corrida', 'saque_pix')),
    descricao VARCHAR(255) NOT NULL,
    valor NUMERIC(10, 2) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Concluído',
    data_formatada VARCHAR(50) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Fechado entre as etapas; a migração seguinte concede somente acessos específicos.
do $$ declare item record; begin
  for item in select schemaname,tablename from pg_tables
    where schemaname in ('cliente','vendedor','entregador') loop
    execute format('alter table %I.%I enable row level security',item.schemaname,item.tablename);
  end loop;
end $$;
revoke all on all tables in schema cliente,vendedor,entregador from public,anon,authenticated;
revoke all on all sequences in schema cliente,vendedor,entregador from public,anon,authenticated;
CREATE OR REPLACE VIEW public.cliente_usuarios WITH (security_invoker = true) AS SELECT * FROM cliente.usuarios;
CREATE OR REPLACE VIEW public.cliente_produtos WITH (security_invoker = true) AS SELECT * FROM cliente.produtos;
CREATE OR REPLACE VIEW public.cliente_favoritos WITH (security_invoker = true) AS SELECT * FROM cliente.favoritos;
CREATE OR REPLACE VIEW public.cliente_carrinho WITH (security_invoker = true) AS SELECT * FROM cliente.carrinho;
CREATE OR REPLACE VIEW public.cliente_pedidos WITH (security_invoker = true) AS SELECT * FROM cliente.pedidos;
CREATE OR REPLACE VIEW public.cliente_itens_pedido WITH (security_invoker = true) AS SELECT * FROM cliente.itens_pedido;
CREATE OR REPLACE VIEW public.vendedor_lojas WITH (security_invoker = true) AS SELECT * FROM vendedor.lojas;
CREATE OR REPLACE VIEW public.vendedor_produtos WITH (security_invoker = true) AS SELECT * FROM vendedor.produtos;
CREATE OR REPLACE VIEW public.vendedor_pedidos WITH (security_invoker = true) AS SELECT * FROM vendedor.pedidos;
CREATE OR REPLACE VIEW public.vendedor_itens_pedido WITH (security_invoker = true) AS SELECT * FROM vendedor.itens_pedido;
CREATE OR REPLACE VIEW public.vendedor_vendas_diarias WITH (security_invoker = true) AS SELECT * FROM vendedor.vendas_diarias;
CREATE OR REPLACE VIEW public.entregador_perfil WITH (security_invoker = true) AS SELECT * FROM entregador.perfil;
CREATE OR REPLACE VIEW public.entregador_corridas WITH (security_invoker = true) AS SELECT * FROM entregador.corridas;
CREATE OR REPLACE VIEW public.entregador_historico WITH (security_invoker = true) AS SELECT * FROM entregador.historico_corridas;
CREATE OR REPLACE VIEW public.entregador_extrato WITH (security_invoker = true) AS SELECT * FROM entregador.extrato_carteira;
revoke all on public.cliente_usuarios from public,anon,authenticated;
revoke all on public.cliente_produtos from public,anon,authenticated;
revoke all on public.cliente_favoritos from public,anon,authenticated;
revoke all on public.cliente_carrinho from public,anon,authenticated;
revoke all on public.cliente_pedidos from public,anon,authenticated;
revoke all on public.cliente_itens_pedido from public,anon,authenticated;
revoke all on public.vendedor_lojas from public,anon,authenticated;
revoke all on public.vendedor_produtos from public,anon,authenticated;
revoke all on public.vendedor_pedidos from public,anon,authenticated;
revoke all on public.vendedor_itens_pedido from public,anon,authenticated;
revoke all on public.vendedor_vendas_diarias from public,anon,authenticated;
revoke all on public.entregador_perfil from public,anon,authenticated;
revoke all on public.entregador_corridas from public,anon,authenticated;
revoke all on public.entregador_historico from public,anon,authenticated;
revoke all on public.entregador_extrato from public,anon,authenticated;
commit;
