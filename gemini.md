# Constituição do Projeto: CRM Imobiliário & Engine de Matching

Este documento serve como o acordo de especificação e fonte de verdade para a estrutura de dados e regras de negócio do projeto.

---

## 📊 1. Esquema de Dados SQL (Supabase PostgreSQL)

```sql
-- Habilitar a extensão uuid-ossp se necessário
create extension if not exists "uuid-ossp";

-- Criar tipos ENUM para Urgência, Flexibilidade e Estado da Interação
create type nivel_urgencia as enum ('Alta', 'Media', 'Baixa');
create type nivel_flexibilidade as enum ('Alta', 'Media', 'Baixa');
create type estado_match as enum ('Pendente', 'Visita Agendada', 'Proposta Apresentada', 'Negócio Fechado', 'Arquivado');

-- 1. TABELA: vendedores_imoveis (Dados Concretos / Rígidos)
create table public.vendedores_imoveis (
    id uuid primary key default gen_random_uuid(),
    proprietario_nome text not null,
    proprietario_contacto text not null,
    tipologia text not null, -- Ex: 'T2', 'T3'
    tipo_imovel text not null default 'Apartamento', -- Ex: 'Apartamento', 'Moradia', 'Terreno Agrícola', 'Terreno para Construção'
    preco_objetivo numeric(12, 2) not null, -- Preço de listagem inicial
    preco_minimo numeric(12, 2) not null, -- Preço mínimo aceitável (confidencial)
    flexibilidade_negociacao nivel_flexibilidade not null default 'Media',
    area_m2 numeric(8, 2) not null,
    rua text not null,
    cidade text not null,
    freguesia text not null,
    andar text not null, -- Ex: 'R/C', '1', '2', 'Cave'
    tem_elevador boolean not null default false,
    tem_garagem boolean not null default false,
    tem_quintal boolean not null default false, -- Espaço exterior
    tem_arrecadacao boolean not null default false,
    urgencia nivel_urgencia not null default 'Media',
    observacoes text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. TABELA: compradores_leads (Dados Abrangentes / Requisitos Flexíveis)
create table public.compradores_leads (
    id uuid primary key default gen_random_uuid(),
    comprador_nome text not null,
    comprador_contacto text not null,
    tipologias_pretendidas text[] not null, -- Array de tipologias aceitáveis, ex: {'T2', 'T3'}
    tipos_imovel_pretendidos text[] not null default '{"Apartamento"}', -- Array de tipos de imóvel pretendidos, ex: {'Apartamento', 'Moradia'}
    orcamento_maximo numeric(12, 2) not null,
    zonas_pretendidas text[] not null, -- Array de zonas/cidades/freguesias aceitáveis, ex: {'Beja', 'Arredores'}
    precisa_garagem boolean not null default false,
    requisito_elevador_ou_rc boolean not null default false, -- Indica se tem de ser R/C ou ter elevador
    preferencia_espaco_exterior boolean not null default false, -- Terraço, varanda ou quintal
    urgencia nivel_urgencia not null default 'Media',
    observacoes text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. TABELA: matches_interacoes (CRM de Visitas e Negociações)
create table public.matches_interacoes (
    id uuid primary key default gen_random_uuid(),
    comprador_id uuid not null references public.compradores_leads(id) on delete cascade,
    imovel_id uuid not null references public.vendedores_imoveis(id) on delete cascade,
    estado estado_match not null default 'Pendente',
    notas text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    unique(comprador_id, imovel_id) -- Apenas um estado por par comprador-imóvel
);

-- Habilitar RLS (Row Level Security) em todas as tabelas
alter table public.vendedores_imoveis enable row level security;
alter table public.compradores_leads enable row level security;
alter table public.matches_interacoes enable row level security;

-- Criar políticas simples para permitir acesso total para desenvolvimento
create policy "Permitir acesso total a todos os utilizadores autenticados e anónimos em vendedores_imoveis"
on public.vendedores_imoveis for all using (true) with check (true);

create policy "Permitir acesso total a todos os utilizadores autenticados e anónimos em compradores_leads"
on public.compradores_leads for all using (true) with check (true);

create policy "Permitir acesso total a todos os utilizadores autenticados e anónimos em matches_interacoes"
on public.matches_interacoes for all using (true) with check (true);
```

---

## 🧮 2. Lógica do Algoritmo de Matching

Para calcular a compatibilidade entre uma lead de comprador e um imóvel de vendedor, criamos uma View SQL que realiza o cruzamento dos dados de acordo com os seguintes critérios:

### A. Filtros Rígidos (Hard Filters) - O imóvel *deve* satisfazer para ser listado:
1. **Preço**: O preço mínimo (`preco_minimo`) ou o preço objetivo (`preco_objetivo`) do imóvel tem de ser menor ou igual ao orçamento máximo do comprador (`orcamento_maximo`).
   *(Regra: `i.preco_minimo <= c.orcamento_maximo`)*
2. **Tipologia**: A tipologia do imóvel deve constar na lista de tipologias pretendidas pelo comprador.
   *(Regra: `i.tipologia = any(c.tipologias_pretendidas)`)*
3. **Tipo de Imóvel**: O tipo de imóvel do vendedor deve constar no array de tipos pretendidos pelo comprador.
   *(Regra: `i.tipo_imovel = any(c.tipos_imovel_pretendidos)`)*
4. **Localização**: A cidade ou freguesia do imóvel deve constar na lista de zonas pretendidas pelo comprador.
   *(Regra: `(i.cidade = any(c.zonas_pretendidas) or i.freguesia = any(c.zonas_pretendidas))`)*
5. **Acessibilidade**: Se o comprador exigir elevador ou R/C (`requisito_elevador_ou_rc` é true), o imóvel tem de estar no R/C (andar '0', 'RC', 'R/C', 'rc', 'r/c') OU o edifício tem de ter elevador (`tem_elevador` é true).
   *(Regra: `not c.requisito_elevador_ou_rc or (i.andar in ('0', 'RC', 'R/C', 'rc', 'r/c', 'R/c') or i.tem_elevador = true)`)*

### B. Cálculo de Pontuação (Scoring - 0 a 100%) - Para ordenação:
Se o imóvel passar nos filtros rígidos, calculamos o score com base em critérios adicionais:
1. **Preço Confortável (Até 40 pontos)**:
   - Se `preco_objetivo <= orcamento_maximo`: 40 pontos.
   - Se `preco_minimo <= orcamento_maximo` mas `preco_objetivo > orcamento_maximo`: 20 pontos (requer alguma negociação).
2. **Garagem (Até 20 pontos)**:
   - Se comprador `precisa_garagem` e imóvel `tem_garagem`: 20 pontos.
   - Se comprador não precisa: 20 pontos (não é um obstáculo).
   - Se comprador precisa e imóvel não tem: 0 pontos.
3. **Espaço Exterior (Até 20 pontos)**:
   - Se comprador prefere espaço exterior e imóvel tem quintal: 20 pontos.
   - Se comprador não tem preferência: 20 pontos.
   - Se comprador prefere e imóvel não tem: 0 pontos.
4. **Urgência (Até 20 pontos)**:
   - Se ambos têm urgência 'Alta': 20 pontos.
   - Se um tem urgência 'Alta' e outro 'Media': 15 pontos.
   - Se ambos têm urgência 'Media': 10 pontos.
   - Restantes combinações: 5 pontos.

### SQL para a View de Matching:

```sql
create or replace view public.view_matches_compradores_imoveis as
select 
    c.id as comprador_id,
    c.comprador_nome,
    c.urgencia as comprador_urgencia,
    i.id as imovel_id,
    i.proprietario_nome,
    i.tipologia,
    i.preco_objetivo,
    i.preco_minimo,
    i.cidade,
    i.freguesia,
    i.urgencia as imovel_urgencia,
    coalesce(mi.estado, 'Pendente') as estado_match,
    mi.notas as notas_match,
    mi.id as interacao_id,
    (
        -- Cálculo da Pontuação de Compatibilidade
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
    -- Filtros Rígidos (Hard Filters)
    (i.preco_minimo <= c.orcamento_maximo)
    and (i.tipologia = any(c.tipologias_pretendidas))
    and (i.cidade = any(c.zonas_pretendidas) or i.freguesia = any(c.zonas_pretendidas))
    and (i.tipo_imovel = any(c.tipos_imovel_pretendidos))
    and (
        not c.requisito_elevador_ou_rc 
        or (i.andar in ('0', 'RC', 'R/C', 'rc', 'r/c', 'R/c') or i.tem_elevador = true)
    );
```

---

## 💼 3. Regras de Negócio Gerais

1. **Urgência Destaque Visual**:
   - `Alta`: Vermelho (Urgente, exige ação imediata).
   - `Media`: Amarelo (Acompanhamento regular).
   - `Baixa`: Verde (Sem pressão de tempo).
2. **Preço Mínimo Oculto**:
   - O `preco_minimo` do vendedor é um dado confidencial. No dashboard de matching, deve ser indicado se o imóvel exige negociação, mas o valor do `preco_minimo` não deve ser exposto ao cliente final/comprador.
3. **CRM de Interações**:
   - O estado do negócio (`Pendente`, `Visita Agendada`, etc.) e as respetivas notas são gravados de forma persistente.
