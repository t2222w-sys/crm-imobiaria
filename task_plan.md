# Plano de Tarefas (task_plan.md)

Este plano detalha as fases de desenvolvimento do Dashboard Imobiliário & Engine de Matching, com checklists de implementação e migrações.

---

## 📅 Checklist de Fases

### 🟢 FASE 0: Inicialização de Memória (Concluído)
- [x] Criar ficheiro `gemini.md` com o esquema de dados e regras de negócio.
- [x] Criar ficheiro `task_plan.md` (este ficheiro).
- [x] Criar ficheiro `findings.md` com as decisões de arquitetura e tabelas.
- [x] Criar ficheiro `progress.md` para registo de execuções.

### 🟡 FASE 1: Visão & Esquema de Dados (Supabase Setup)
- [ ] Aplicar migrações de base de dados no Supabase.
  - [ ] Criar tabelas `vendedores_imoveis` e `compradores_leads`.
  - [ ] Criar tipos ENUM para urgência e flexibilidade.
  - [ ] Criar a view de matching `view_matches_compradores_imoveis`.
  - [ ] Ativar RLS e aplicar políticas de segurança de desenvolvimento.
- [ ] Verificar a criação das tabelas através do dashboard do Supabase ou scripts SQL.

### ⚡ FASE 2: Conectividade & Script de Ligação (Link)
- [ ] Configurar as variáveis de ambiente `.env.local` com `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- [ ] Instalar as dependências `@supabase/supabase-js`, `lucide-react` para ícones.
- [ ] Criar o ficheiro cliente do Supabase em `src/lib/supabaseClient.ts`.
- [ ] Criar o script de teste em `tools/check_db.ts` (ou equivalente JS/TS executável) e validar a ligação e permissões de leitura/escrita.

### ⚙️ FASE 3: Arquitetura & Interface (Dashboard)
- [ ] Estruturar a aplicação React.
- [ ] Criar o componente de **Painel de Vendedores**:
  - [ ] Formulário de registo de novos imóveis.
  - [ ] Grid de imóveis listados.
- [ ] Criar o componente de **Painel de Compradores**:
  - [ ] Formulário de registo de novos compradores (suporte a seleção múltipla).
  - [ ] Grid de leads ativas.
- [ ] Criar o **Módulo de Matching**:
  - [ ] Listagem de compradores com respetivos matches calculados na base de dados.
- [ ] Adicionar filtros globais rápidos.

### 🎨 FASE 4: Estilo & Gatilhos (UI/UX Premium)
- [ ] Configurar a paleta de cores no CSS (`src/index.css`).
- [ ] Implementar design responsivo (Mobile-first).
- [ ] Adicionar micro-interações e sinalizadores de urgência.
- [ ] Realizar testes de ponta a ponta.

---

## 🛠️ Plano de Migrações do Supabase

### Migração `01_create_tables_and_matching_view.sql`
Esta migração irá criar a estrutura inicial na base de dados do Supabase. O código SQL está detalhado em `gemini.md`.
