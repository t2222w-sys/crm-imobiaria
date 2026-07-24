import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Carregar variáveis de ambiente do .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

console.log('=== TESTE DE LIGAÇÃO AO SUPABASE ===');
console.log('URL:', supabaseUrl);
console.log('Key (Truncada):', supabaseAnonKey ? `${supabaseAnonKey.substring(0, 15)}...` : 'NÃO CONFIGURADA');

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Erro: Variáveis de ambiente VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não encontradas.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function runTest() {
  try {
    console.log('\n1. Testando inserção na tabela [vendedores_imoveis]...');
    const { data: imovel, error: errImovel } = await supabase
      .from('vendedores_imoveis')
      .insert([
        {
          proprietario_nome: 'Vendedor Teste',
          proprietario_contacto: '912345678',
          tipologia: 'T2',
          preco_objetivo: 150000.00,
          preco_minimo: 140000.00,
          flexibilidade_negociacao: 'Media',
          area_m2: 85.50,
          rua: 'Rua das Flores, 10',
          cidade: 'Beja',
          freguesia: 'Salvador',
          andar: '1',
          tem_elevador: false,
          tem_garagem: true,
          tem_quintal: true,
          tem_arrecadacao: false,
          urgencia: 'Media',
          observacoes: 'Imóvel de teste para validação inicial da base de dados.'
        }
      ])
      .select()
      .single();

    if (errImovel) throw errImovel;
    console.log('✅ Imóvel inserido com sucesso! ID:', imovel.id);

    console.log('\n2. Testando inserção na tabela [compradores_leads]...');
    const { data: comprador, error: errComprador } = await supabase
      .from('compradores_leads')
      .insert([
        {
          comprador_nome: 'Comprador Teste',
          comprador_contacto: '987654321',
          tipologias_pretendidas: ['T2', 'T3'],
          orcamento_maximo: 160000.00,
          zonas_pretendidas: ['Beja', 'Arredores'],
          precisa_garagem: true,
          requisito_elevador_ou_rc: false,
          preferencia_espaco_exterior: true,
          urgencia: 'Alta',
          observacoes: 'Comprador de teste interessado em Beja.'
        }
      ])
      .select()
      .single();

    if (errComprador) throw errComprador;
    console.log('✅ Comprador inserido com sucesso! ID:', comprador.id);

    console.log('\n3. Testando consulta de correspondências (Matching Engine View)...');
    const { data: matches, error: errMatches } = await supabase
      .from('view_matches_compradores_imoveis')
      .select('*')
      .eq('comprador_id', comprador.id);

    if (errMatches) throw errMatches;
    console.log('✅ Consulta da View executada com sucesso!');
    console.log(`Número de matches encontrados para este comprador: ${matches.length}`);
    if (matches.length > 0) {
      console.log('Detalhes do Match:');
      console.log(`- Comprador: ${matches[0].comprador_nome}`);
      console.log(`- Proprietário do Imóvel: ${matches[0].proprietario_nome}`);
      console.log(`- Localização: ${matches[0].freguesia}, ${matches[0].cidade}`);
      console.log(`- Score de Match: ${matches[0].match_score}/100`);
    }

    console.log('\n4. Limpando dados de teste da base de dados...');
    const { error: delComprador } = await supabase
      .from('compradores_leads')
      .delete()
      .eq('id', comprador.id);
    if (delComprador) console.error('Erro ao limpar comprador:', delComprador);

    const { error: delImovel } = await supabase
      .from('vendedores_imoveis')
      .delete()
      .eq('id', imovel.id);
    if (delImovel) console.error('Erro ao limpar imóvel:', delImovel);

    console.log('✅ Limpeza concluída!');
    console.log('\n🎉 TESTE BEM SUCEDIDO! Conectividade e lógica do Supabase validadas com sucesso.');

  } catch (error: any) {
    console.error('\n❌ Erro durante a execução dos testes:', error.message || error);
    process.exit(1);
  }
}

runTest();
