-- ==============================================================================
-- SCRIPT DE MIGRAÇÃO TOTAL PARA O SUPABASE (JoaoCarlosCPereira's Org)
-- ==============================================================================

-- 1. Extensões
create extension if not exists "uuid-ossp";

-- 2. Tipos ENUM
do $$ begin
    create type nivel_urgencia as enum ('Alta', 'Media', 'Baixa');
exception
    when duplicate_object then null;
end $$;

do $$ begin
    create type nivel_flexibilidade as enum ('Alta', 'Media', 'Baixa');
exception
    when duplicate_object then null;
end $$;

do $$ begin
    create type estado_match as enum ('Pendente', 'Visita Agendada', 'Proposta Apresentada', 'Negócio Fechado', 'Arquivado');
exception
    when duplicate_object then null;
end $$;

-- 3. Tabela: perfis_agentes
create table if not exists public.perfis_agentes (
    id uuid primary key default gen_random_uuid(),
    nome text not null,
    email text not null unique,
    senha text not null,
    role text not null default 'Agente',
    parent_agente_id uuid references public.perfis_agentes(id) on delete set null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Tabela: vendedores_imoveis
create table if not exists public.vendedores_imoveis (
    id uuid primary key default gen_random_uuid(),
    proprietario_nome text not null,
    proprietario_contacto text not null,
    proprietario_email character varying,
    tipologia text not null,
    tipo_imovel text not null default 'Apartamento',
    preco_objetivo numeric(12, 2) not null,
    preco_minimo numeric(12, 2) not null,
    flexibilidade_negociacao nivel_flexibilidade not null default 'Media',
    area_m2 numeric(8, 2) not null,
    rua text not null,
    cidade text not null,
    freguesia text not null,
    andar text not null,
    tem_elevador boolean not null default false,
    tem_garagem boolean not null default false,
    tem_quintal boolean not null default false,
    tem_arrecadacao boolean not null default false,
    urgencia nivel_urgencia not null default 'Media',
    observacoes text,
    estado_imovel text not null default 'Ativo',
    origem_contacto text not null default 'Outro',
    agente_id uuid references public.perfis_agentes(id) on delete set null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Tabela: compradores_leads
create table if not exists public.compradores_leads (
    id uuid primary key default gen_random_uuid(),
    comprador_nome text not null,
    comprador_contacto text not null,
    comprador_email character varying,
    tipologias_pretendidas text[] not null default '{"T2"}',
    tipos_imovel_pretendidos text[] not null default '{"Apartamento"}',
    orcamento_maximo numeric(12, 2) not null,
    zonas_pretendidas text[] not null default '{"Beja"}',
    precisa_garagem boolean not null default false,
    requisito_elevador_ou_rc boolean not null default false,
    preferencia_espaco_exterior boolean not null default false,
    urgencia nivel_urgencia not null default 'Media',
    observacoes text,
    foi_contactado boolean not null default false,
    data_contacto timestamp with time zone,
    estado_comprador text not null default 'Ativo',
    origem_contacto text not null default 'Outro',
    agente_id uuid references public.perfis_agentes(id) on delete set null,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 6. Tabela: matches_interacoes
create table if not exists public.matches_interacoes (
    id uuid primary key default gen_random_uuid(),
    comprador_id uuid not null references public.compradores_leads(id) on delete cascade,
    imovel_id uuid not null references public.vendedores_imoveis(id) on delete cascade,
    estado estado_match not null default 'Pendente',
    valor_proposta text default '0',
    credito_aprovado text default 'N/A',
    capital_proprio_valor text,
    aguardar_credito boolean default false,
    aguardar_avaliacao boolean default false,
    notas text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(comprador_id, imovel_id)
);

-- 7. Tabela: atividades_agenda
create table if not exists public.atividades_agenda (
    id uuid primary key default gen_random_uuid(),
    tipos_atividade text[] not null default '{"Outro"}',
    data_hora timestamp with time zone not null,
    comprador_id uuid references public.compradores_leads(id) on delete cascade,
    imovel_id uuid references public.vendedores_imoveis(id) on delete cascade,
    notas text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 8. Tabela: localidades_portugal
create table if not exists public.localidades_portugal (
    id uuid primary key default gen_random_uuid(),
    distrito text,
    concelho text not null,
    freguesia text not null
);

-- 9. View de Matching com Scoring e Filtragem de Compatibilidade
create or replace view public.view_matches_compradores_imoveis as
select 
    c.id as comprador_id,
    c.comprador_nome,
    c.urgencia as comprador_urgencia,
    c.agente_id as comprador_agente_id,
    i.id as imovel_id,
    i.proprietario_nome,
    i.tipologia,
    i.preco_objetivo,
    i.preco_minimo,
    i.cidade,
    i.freguesia,
    i.urgencia as imovel_urgencia,
    i.agente_id as imovel_agente_id,
    coalesce(mi.estado, 'Pendente') as estado_match,
    mi.notas as notas_match,
    mi.id as interacao_id,
    mi.valor_proposta,
    mi.credito_aprovado,
    mi.capital_proprio_valor,
    mi.aguardar_credito,
    mi.aguardar_avaliacao,
    (
        -- Cálculo do Score de Compatibilidade (0 a 100)
        (case 
            when i.preco_objetivo <= c.orcamento_maximo then 40
            when i.preco_minimo <= c.orcamento_maximo then 20
            else 0
         end) +
        (case 
            when c.precisa_garagem = false then 20
            when c.precisa_garagem = true and i.tem_garagem = true then 20
            else 0
         end) +
        (case 
            when c.preferencia_espaco_exterior = false then 20
            when c.preferencia_espaco_exterior = true and i.tem_quintal = true then 20
            else 0
         end) +
        (case 
            when c.urgencia = 'Alta' and i.urgencia = 'Alta' then 20
            when c.urgencia = 'Alta' or i.urgencia = 'Alta' then 15
            when c.urgencia = 'Media' and i.urgencia = 'Media' then 10
            else 5
         end)
    ) as match_score
from 
    public.compradores_leads c
cross join 
    public.vendedores_imoveis i
left join 
    public.matches_interacoes mi on mi.comprador_id = c.id and mi.imovel_id = i.id
where
    (i.preco_minimo <= c.orcamento_maximo or c.orcamento_maximo = 0)
    and (i.tipologia = any(c.tipologias_pretendidas) or array_length(c.tipologias_pretendidas, 1) is null)
    and (i.tipo_imovel = any(c.tipos_imovel_pretendidos) or array_length(c.tipos_imovel_pretendidos, 1) is null)
    and (
        not c.requisito_elevador_ou_rc 
        or (i.andar in ('0', 'RC', 'R/C', 'rc', 'r/c', 'R/c') or i.tem_elevador = true)
    );

-- 10. Habilitar RLS e Criar Políticas Permissivas
alter table public.perfis_agentes enable row level security;
alter table public.vendedores_imoveis enable row level security;
alter table public.compradores_leads enable row level security;
alter table public.matches_interacoes enable row level security;
alter table public.atividades_agenda enable row level security;
alter table public.localidades_portugal enable row level security;

create policy "Acesso Total Agentes" on public.perfis_agentes for all using (true) with check (true);
create policy "Acesso Total Imoveis" on public.vendedores_imoveis for all using (true) with check (true);
create policy "Acesso Total Compradores" on public.compradores_leads for all using (true) with check (true);
create policy "Acesso Total Matches" on public.matches_interacoes for all using (true) with check (true);
create policy "Acesso Total Atividades" on public.atividades_agenda for all using (true) with check (true);
create policy "Acesso Total Localidades" on public.localidades_portugal for all using (true) with check (true);

-- ==============================================================================
-- 11. INSERÇÃO DOS DADOS EXISTENTES (MIGRAÇÃO)
-- ==============================================================================

-- Inserir Perfis de Agentes
insert into public.perfis_agentes (id, nome, email, senha, role, parent_agente_id, created_at) values
('0a8669a8-1bd1-41ad-8e7b-cd099b27e39e', 'Administrador', 'admin@imo.com', 'admin123', 'Admin', null, '2026-07-31 17:13:46.522857+00'),
('092ef34e-d809-403a-ad8e-3596387f9df6', 'João', 'joao@imo.com', 'joao123', 'Agente', null, '2026-07-31 17:13:46.522857+00'),
('1eb2fbaf-8e2e-478f-96b0-bde8badf669f', 'Tomás', 'tomas@imo.com', 'tomas123', 'Agente', null, '2026-07-31 17:13:46.522857+00'),
('19aa3afb-51ce-4fb9-a1a0-8dbc752f5135', 'Teste', 'teste@imo.com', '123456', 'Agente', null, '2026-08-03 11:25:29.455191+00'),
('66a88c69-0670-4282-bcf0-50db60f0891b', 'Tomás', 't.afonso.rs@gmail.com', '123456', 'Agente', '092ef34e-d809-403a-ad8e-3596387f9df6', '2026-08-27 15:55:28.182366+00')
on conflict (id) do nothing;

-- Inserir Imóveis
insert into public.vendedores_imoveis (id, proprietario_nome, proprietario_contacto, proprietario_email, tipologia, tipo_imovel, preco_objetivo, preco_minimo, flexibilidade_negociacao, area_m2, rua, cidade, freguesia, andar, tem_elevador, tem_garagem, tem_quintal, tem_arrecadacao, urgencia, observacoes, created_at, updated_at, estado_imovel, origem_contacto, agente_id) values
('d12eabc6-81a9-4767-be1c-6d3122499f7e', 'Vasyl', '963482454', null, 'T3', 'Apartamento', 230000.00, 200000.00, 'Media', 112.00, 'Largo da Alcaçarias', 'Beja', 'União das Freguesias de Beja (Salvador e Santa Maria da Feira)', '1', false, true, false, true, 'Media', null, '2026-07-28 09:36:03.829248+00', '2026-07-28 09:36:09.51+00', 'Ativo', 'Outro', '092ef34e-d809-403a-ad8e-3596387f9df6'),
('6370bf2a-d934-4b85-b570-a5e654849e9b', 'Luis Quinta', '967787391', null, 'T2', 'Apartamento', 165000.00, 160000.00, 'Media', 90.00, 'Rua Pablo Neruda, 9  A R/C', 'Beja', 'União das Freguesias de Beja (Santiago Maior e São João Baptista)', 'RC', false, false, false, true, 'Alta', null, '2026-07-30 20:24:32.009888+00', '2026-07-30 20:24:31.916+00', 'Ativo', 'Cliente Antigo', '092ef34e-d809-403a-ad8e-3596387f9df6'),
('dd18bbff-cfee-438e-a002-32a6b4fab229', 'Lurdes e Ursula', '968626439', null, 'T0', 'Terreno Agrícola', 115000.00, 90000.00, 'Media', 45000.00, 'Vale de Vargo', 'Vale de Vargo', 'Vale de Vargo', 'RC', false, false, false, false, 'Alta', null, '2026-07-30 21:33:01.912603+00', '2026-07-30 21:33:00.7+00', 'Ativo', 'Redes Sociais', '092ef34e-d809-403a-ad8e-3596387f9df6'),
('f4bfc3ff-4fec-428b-977c-72c39ab2bc1f', 'Paulo Carrascal', '967622834', null, 'T2', 'Apartamento', 999999.00, 999999.00, 'Media', 100.00, 'Pedra Mourinha', 'Portimão', 'Portimão', 'RC', false, false, false, false, 'Media', null, '2026-08-04 14:44:35.448176+00', '2026-08-19 16:35:17.615+00', 'Ativo', 'Cliente Antigo', '092ef34e-d809-403a-ad8e-3596387f9df6'),
('c1a4d621-73d1-4027-aff8-105f5a9eba1e', 'Unibeja', '999999999', null, 'T0', 'Loja', 70000.00, 70000.00, 'Media', 131.00, 'Rua Infante D.Henrique Nº: 41 RCh Dto', 'Beja', 'União das Freguesias de Beja (Santiago Maior e São João Baptista)', 'RC', false, false, false, false, 'Media', null, '2026-08-03 16:29:42.741829+00', '2026-08-19 16:36:29.846+00', 'Ativo', 'Proprietario', '092ef34e-d809-403a-ad8e-3596387f9df6'),
('e6c10180-0eeb-40e3-b35b-413ba7cfb09d', 'fernando Totoloto', '965810487', null, 'T4', 'Moradia', 400000.00, 400000.00, 'Media', 180.00, 'Rua 25 de ABril', 'Beja', 'União das Freguesias de Beja (Santiago Maior e São João Baptista)', 'unico', false, true, true, true, 'Media', 'dkjhaskjdh', '2026-07-28 09:42:45.917609+00', '2026-08-20 14:39:29.447+00', 'Ativo', 'Loja / Escritório', '092ef34e-d809-403a-ad8e-3596387f9df6'),
('855e37a7-346f-4be4-9aed-e4eee297eef3', 'RustiPax - Luis ALho', '917597360', null, 'T3', 'Apartamento', 185000.00, 175000.00, 'Media', 108.00, 'Rua Dr.Belard da Fonseca, Beja', 'Beja', 'União das Freguesias de Beja (Salvador e Santa Maria da Feira)', '2º', false, false, false, false, 'Media', 'partilha 5% de margem\n2º ANDAR SEM ELEVADOR\nhttps://rustipax.pt/propriedade/apartamento-t3-com-boa-exposicao-solar-e-localizacao-privilegiada/', '2026-08-27 16:06:23.629457+00', '2026-08-27 16:23:14.544+00', 'Num Parceiro', 'Proprietário', '092ef34e-d809-403a-ad8e-3596387f9df6')
on conflict (id) do nothing;

-- Inserir Compradores
insert into public.compradores_leads (id, comprador_nome, comprador_contacto, comprador_email, tipologias_pretendidas, tipos_imovel_pretendidos, orcamento_maximo, zonas_pretendidas, precisa_garagem, requisito_elevador_ou_rc, preferencia_espaco_exterior, urgencia, observacoes, foi_contactado, data_contacto, created_at, updated_at, estado_comprador, origem_contacto, agente_id) values
('1845ed83-4fbb-4b51-b9b2-96e203a8ac7b', 'José Godinh o (Todina)', '963870681', null, '{"T2"}', '{"Apartamento"}', 140000.00, '{"Beja"}', false, true, false, 'Media', null, true, '2026-07-28 09:48:00+00', '2026-07-28 09:48:11.92954+00', '2026-07-28 09:54:55.674+00', 'Ativo', 'Outro', '092ef34e-d809-403a-ad8e-3596387f9df6'),
('9011e9fa-f6e8-472f-bce9-4aaf88bc802e', 'Maria João Galantinho  Lampreia', '967760485', 'mariajoaolampreia@gmail.com', '{"T2"}', '{"Apartamento"}', 160000.00, '{"Beja"}', false, true, false, 'Media', 'A senhora é professora no IPB e parece ter problemas de saude (coluna??)', true, '2026-07-23 09:38:00+00', '2026-07-28 09:39:09.836422+00', '2026-07-30 21:34:11.128+00', 'Ativo', 'Website Imo', '092ef34e-d809-403a-ad8e-3596387f9df6'),
('095b961d-f876-40c5-8900-b3248f735249', 'Luis Gomes (primo da Lena)', '937479152', null, '{"T2"}', '{"Escritório"}', 0.00, '{"Beja"}', false, false, false, 'Media', ' um loja ou escritorio para arrendar com 2 wcs com um mínimo de 50m2\nPode ser um primeiro andar', false, null, '2026-07-30 20:07:05.319997+00', '2026-07-31 09:36:32.703+00', 'Ativo', 'Cliente Antigo', '092ef34e-d809-403a-ad8e-3596387f9df6'),
('a22725b2-b8d7-4045-afff-58088ab5ed2e', 'Tierri ferreira', '926971385', null, '{"T2"}', '{"Apartamento"}', 165000.00, '{"Beja"}', false, false, false, 'Media', 'Procura casas semelhantes nos próximos meses', true, '2026-07-31 12:08:00+00', '2026-07-31 12:09:27.404723+00', '2026-07-31 12:09:38.412+00', 'Ativo', 'Website Imo', '092ef34e-d809-403a-ad8e-3596387f9df6'),
('c6b25e94-18e9-4e59-8e82-d82d9592e76c', 'Paulo Carrascal', '967622834', null, '{"T2","T1"}', '{"Apartamento"}', 180000.00, '{"Beja"}', false, true, false, 'Media', null, true, '2026-08-04 14:45:00+00', '2026-08-04 14:46:14.066305+00', '2026-08-04 14:46:12.417+00', 'Ativo', 'Cliente Antigo', '092ef34e-d809-403a-ad8e-3596387f9df6'),
('e9a6602b-11a5-42bd-8a5b-2c11fa6d596a', 'José Vilhena', '966315288', null, '{"T2"}', '{"Apartamento"}', 180000.00, '{"Beja"}', false, false, false, 'Media', 'Investidor', true, '2026-08-04 14:50:00+00', '2026-08-04 14:50:57.106204+00', '2026-08-04 14:50:55.528+00', 'Ativo', 'Idealista', '092ef34e-d809-403a-ad8e-3596387f9df6'),
('f82047b1-b8c0-4bb3-a4dd-3a9cdc42a30e', 'Alexandra Gomes', '912334712', null, '{"T2","T3"}', '{"Apartamento"}', 200000.00, '{"Beja","Beja e arredores"}', false, false, false, 'Media', null, true, '2026-08-20 09:05:00+00', '2026-08-06 09:10:24.728414+00', '2026-08-06 09:10:22.603+00', 'Ativo', 'Imovirtual', '092ef34e-d809-403a-ad8e-3596387f9df6'),
('782bf203-e831-4fb2-9f8b-9f72c8ffa28f', 'ana margarida almeida', '12345678', null, '{"T2","T1"}', '{"Apartamento"}', 150000.00, '{"Beja"}', false, false, true, 'Media', null, true, '2026-08-20 14:16:00+00', '2026-08-20 14:11:42.724255+00', '2026-08-20 14:17:52.451+00', 'Ativo', 'outro', '092ef34e-d809-403a-ad8e-3596387f9df6'),
('09ddf356-0be6-4b06-9e63-75bb09fe165e', 'Inês arriço', '968327031', null, '{"T2","T3"}', '{"Apartamento","Moradia"}', 200000.00, '{"Beja"}', false, false, false, 'Media', 'Pronta a entrar, Zona do mira serra', true, '2026-08-27 16:24:00+00', '2026-08-27 16:21:49.989483+00', '2026-08-27 16:43:44.126+00', 'Ativo', 'Tomás', '092ef34e-d809-403a-ad8e-3596387f9df6'),
('886d1f88-7057-493b-bd7a-b7d1a671a2e6', 'Rui carvoeiras (transportes)', '965589291', null, '{"T2"}', '{"Apartamento"}', 200000.00, '{"Beja"}', false, false, false, 'Media', 'Arredores com muitas restriçoes Penedo Gordo talvez\nprimeiro ou segundo', false, null, '2026-08-27 16:01:21.240773+00', '2026-08-27 16:45:58.88+00', 'Ativo', 'Zé Carvoeiras', '092ef34e-d809-403a-ad8e-3596387f9df6'),
('f50d2e3f-77b4-4a23-8733-480792cfc106', 'Joao Palhinha', '967843324', 'joaop@slb.pt', '{"T2"}', '{"Terreno Agrícola","Loja"}', 120000.00, '{"Mertola, Alvito, Barrancos, Vidigueira"}', false, false, true, 'Media', 'é socio do SLB desde os 10 anos, inchem !', true, '2026-08-27 20:21:00+00', '2026-08-27 20:22:04.416719+00', '2026-08-27 20:22:04.077+00', 'Ativo', 'Parceria / Outro Agente', '092ef34e-d809-403a-ad8e-3596387f9df6')
on conflict (id) do nothing;

-- Inserir Interações / Propostas
insert into public.matches_interacoes (id, comprador_id, imovel_id, estado, notas, created_at, updated_at, valor_proposta, credito_aprovado, capital_proprio_valor, aguardar_credito, aguardar_avaliacao) values
('71ee4f01-c683-4395-8731-682b10431332', '9011e9fa-f6e8-472f-bce9-4aaf88bc802e', '6370bf2a-d934-4b85-b570-a5e654849e9b', 'Proposta Apresentada', null, '2026-07-30 20:25:56.217093+00', '2026-07-30 21:34:11.345+00', '160000', 'N/A', null, false, false),
('e75099dd-ece8-4154-8be1-2c17b060ab33', 'a22725b2-b8d7-4045-afff-58088ab5ed2e', '6370bf2a-d934-4b85-b570-a5e654849e9b', 'Proposta Apresentada', null, '2026-07-31 12:09:27.67446+00', '2026-07-31 12:09:38.72+00', '0', 'N/A', null, false, false),
('59ac44ba-4093-46ce-925b-c301cc6c79c4', 'f82047b1-b8c0-4bb3-a4dd-3a9cdc42a30e', '6370bf2a-d934-4b85-b570-a5e654849e9b', 'Proposta Apresentada', null, '2026-08-06 09:10:24.883943+00', '2026-08-06 09:10:22.864+00', '0', 'N/A', '0', false, false),
('c46cdadd-387a-43ca-bd06-10d836ac84bb', '782bf203-e831-4fb2-9f8b-9f72c8ffa28f', '6370bf2a-d934-4b85-b570-a5e654849e9b', 'Proposta Apresentada', null, '2026-08-20 14:17:52.657119+00', '2026-08-20 14:17:53.171+00', '150000', 'N/A', '0', true, false)
on conflict (id) do nothing;

-- Inserir Atividades da Agenda
insert into public.atividades_agenda (id, tipos_atividade, data_hora, comprador_id, imovel_id, notas, created_at) values
('52246f2f-c526-436c-887e-b207c1fecc76', '{"Visita a Imóvel"}', '2026-07-30 23:00:00+00', null, 'e6c10180-0eeb-40e3-b35b-413ba7cfb09d', null, '2026-07-29 20:46:33.359695+00'),
('e7c7ea8d-6dc3-4965-a280-399ca500f0a7', '{"Escritura / Fecho"}', '2026-08-20 09:00:00+00', null, '6370bf2a-d934-4b85-b570-a5e654849e9b', null, '2026-08-19 16:15:02.170477+00'),
('a6f9459a-d355-405e-8606-b4d74261689a', '{"Visita a Imóvel"}', '2026-08-20 23:00:00+00', 'c6b25e94-18e9-4e59-8e82-d82d9592e76c', 'dd18bbff-cfee-438e-a002-32a6b4fab229', null, '2026-08-20 14:37:56.567997+00')
on conflict (id) do nothing;
