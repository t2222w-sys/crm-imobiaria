import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from './lib/supabaseClient';
import { 
  Home, 
  Users, 
  Sparkles, 
  Phone, 
  Trash2, 
  Plus, 
  AlertTriangle, 
  Check, 
  X,
  PlusCircle,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Edit2
} from 'lucide-react';

// Interfaces baseadas no esquema SQL atualizado
interface Imovel {
  id: string;
  proprietario_nome: string;
  proprietario_contacto: string;
  tipologia: string;
  tipo_imovel: string;
  preco_objetivo: number;
  preco_minimo: number;
  flexibilidade_negociacao: 'Alta' | 'Media' | 'Baixa';
  area_m2: number;
  rua: string;
  cidade: string;
  freguesia: string;
  andar: string;
  tem_elevador: boolean;
  tem_garagem: boolean;
  tem_quintal: boolean;
  tem_arrecadacao: boolean;
  urgencia: 'Alta' | 'Media' | 'Baixa';
  observacoes?: string;
  created_at: string;
  updated_at: string; // Novo
}

interface Comprador {
  id: string;
  comprador_nome: string;
  comprador_contacto: string;
  tipologias_pretendidas: string[];
  tipos_imovel_pretendidos: string[];
  orcamento_maximo: number;
  zonas_pretendidas: string[];
  precisa_garagem: boolean;
  requisito_elevador_ou_rc: boolean;
  preferencia_espaco_exterior: boolean;
  urgencia: 'Alta' | 'Media' | 'Baixa';
  observacoes?: string;
  foi_contactado: boolean; // Novo
  data_contacto?: string | null; // Novo
  created_at: string;
  updated_at: string; // Novo
}

interface Match {
  comprador_id: string;
  comprador_nome: string;
  comprador_urgencia: 'Alta' | 'Media' | 'Baixa';
  imovel_id: string;
  proprietario_nome: string;
  tipologia: string;
  preco_objetivo: number;
  preco_minimo: number;
  cidade: string;
  freguesia: string;
  imovel_urgencia: 'Alta' | 'Media' | 'Baixa';
  estado_match: 'Pendente' | 'Visita Agendada' | 'Proposta Apresentada' | 'Negócio Fechado' | 'Arquivado';
  notas_match?: string;
  interacao_id?: string;
  match_score: number;
}

interface CalendarEvent {
  date: string;
  type: 'imovel' | 'imovel_update' | 'comprador' | 'comprador_update' | 'contacto' | 'crm';
  title: string;
  label: string;
  desc?: string;
  originalId: string;
}

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error';
}

function App() {
  // Validação de variáveis de ambiente em produção (Vercel)
  if (!isSupabaseConfigured) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#080c14',
        color: '#f8fafc',
        fontFamily: 'sans-serif',
        padding: '2rem',
        textAlign: 'center'
      }}>
        <div style={{
          backgroundColor: '#0f172a',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          padding: '2.5rem',
          borderRadius: '12px',
          maxWidth: '500px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          <AlertTriangle size={48} style={{ color: '#ef4444', marginBottom: '1rem' }} />
          <h2 style={{ marginBottom: '1rem', fontFamily: 'Outfit, sans-serif' }}>Configuração em Falta</h2>
          <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '1.5rem' }}>
            A aplicação não conseguiu ligar ao Supabase porque as variáveis de ambiente necessárias não foram encontradas.
          </p>
          <div style={{ textAlign: 'left', backgroundColor: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '6px', fontSize: '0.85rem', color: '#cbd5e1', marginBottom: '1.5rem', width: '100%' }}>
            <strong>Variáveis necessárias nas definições do Vercel:</strong>
            <ul style={{ marginLeft: '1.25rem', marginTop: '0.5rem' }}>
              <li><code>VITE_SUPABASE_URL</code></li>
              <li><code>VITE_SUPABASE_ANON_KEY</code></li>
            </ul>
          </div>
          <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
            Adicione estas variáveis no painel da Vercel (Settings &gt; Environment Variables) e faça um novo Deploy.
          </p>
        </div>
      </div>
    );
  }

  // Tabs e Estados Globais
  const [activeTab, setActiveTab] = useState<'vendedores' | 'compradores'>('vendedores');
  const [activeMainTab, setActiveMainTab] = useState<'matching' | 'calendario'>('matching'); // NOVO
  
  const [vendedores, setVendedores] = useState<Imovel[]>([]);
  const [compradores, setCompradores] = useState<Comprador[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedComprador, setSelectedComprador] = useState<Comprador | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Estados locais para a edição de notas por cada Match (key: compradorId_imovelId)
  const [editingNotas, setEditingNotas] = useState<{ [matchKey: string]: string }>({});

  // Estados de Edição de Registos (Modo de Edição)
  const [editingImovelId, setEditingImovelId] = useState<string | null>(null);
  const [editingCompradorId, setEditingCompradorId] = useState<string | null>(null);

  // Estados dos Formulários
  // Imóvel / Vendedor
  const [vNome, setVNome] = useState('');
  const [vContacto, setVContacto] = useState('');
  const [vTipologia, setVTipologia] = useState('T2');
  const [vTipoImovel, setVTipoImovel] = useState('Apartamento');
  const [vPrecoObj, setVPrecoObj] = useState('');
  const [vPrecoMin, setVPrecoMin] = useState('');
  const [vFlex, setVFlex] = useState<'Alta' | 'Media' | 'Baixa'>('Media');
  const [vArea, setVArea] = useState('');
  const [vRua, setVRua] = useState('');
  const [vCidade, setVCidade] = useState('');
  const [vFreguesia, setVFreguesia] = useState('');
  const [vAndar, setVAndar] = useState('RC');
  const [vElevador, setVElevador] = useState(false);
  const [vGaragem, setVGaragem] = useState(false);
  const [vQuintal, setVQuintal] = useState(false);
  const [vArrecadacao, setVArrecadacao] = useState(false);
  const [vUrgencia, setVUrgencia] = useState<'Alta' | 'Media' | 'Baixa'>('Media');
  const [vObs, setVObs] = useState('');

  // Lead / Comprador
  const [cNome, setCNome] = useState('');
  const [cContacto, setCContacto] = useState('');
  const [cTipologias, setCTipologias] = useState<string[]>(['T2']);
  const [cTiposImovel, setCTiposImovel] = useState<string[]>(['Apartamento']);
  const [cOrcamento, setCOrcamento] = useState('');
  const [cZonas, setCZonas] = useState<string[]>([]);
  const [cZonaInput, setCZonaInput] = useState('');
  const [cGaragem, setCGaragem] = useState(false);
  const [cElevadorRc, setCElevadorRc] = useState(false);
  const [cEspacoExt, setCEspacoExt] = useState(false);
  const [cUrgencia, setCUrgencia] = useState<'Alta' | 'Media' | 'Baixa'>('Media');
  const [cObs, setCObs] = useState('');
  const [cFoiContactado, setCFoiContactado] = useState(false); // Novo
  const [cDataContacto, setCDataContacto] = useState(''); // Novo

  // Autocomplete Sugestões (Supabase)
  const [concelhoSugestoes, setConcelhoSugestoes] = useState<string[]>([]);
  const [freguesiaSugestoes, setFreguesiaSugestoes] = useState<string[]>([]);

  // Calendário de Navegação
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());

  // Listas de Opções Estáticas para a Interface
  const tipologiasDisponiveis = ['T0', 'T1', 'T2', 'T3', 'T4', 'T5+'];
  const tiposImovelDisponiveis = [
    'Apartamento',
    'Moradia',
    'Terreno Agrícola',
    'Terreno para Construção'
  ];

  // Efeitos de Inicialização
  useEffect(() => {
    fetchData();
  }, []);

  // Quando o comprador selecionado muda, carregamos os matches dele
  useEffect(() => {
    if (selectedComprador) {
      fetchMatches(selectedComprador.id);
    } else {
      setMatches([]);
    }
  }, [selectedComprador, vendedores]);

  // Toasts Helper
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // Buscar dados base do Supabase
  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: vData, error: vErr } = await supabase
        .from('vendedores_imoveis')
        .select('*')
        .order('created_at', { ascending: false });

      if (vErr) throw vErr;
      setVendedores(vData || []);

      const { data: cData, error: cErr } = await supabase
        .from('compradores_leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (cErr) throw cErr;
      setCompradores(cData || []);

      if (cData && cData.length > 0 && !selectedComprador) {
        setSelectedComprador(cData[0]);
      }
    } catch (err: any) {
      showToast('Erro ao obter dados: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Buscar matches de um comprador específico da View de matching
  const fetchMatches = async (compradorId: string) => {
    try {
      const { data, error } = await supabase
        .from('view_matches_compradores_imoveis')
        .select('*')
        .eq('comprador_id', compradorId)
        .order('match_score', { ascending: false });

      if (error) throw error;
      setMatches(data || []);
      setEditingNotas({});
    } catch (err: any) {
      console.error('Erro ao ler matches:', err.message);
    }
  };

  // Buscar Concelhos via API do Supabase (Autocomplete)
  const fetchConcelhos = async (pesquisa: string) => {
    if (pesquisa.trim().length < 2) {
      setConcelhoSugestoes([]);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('localidades_portugal')
        .select('concelho')
        .ilike('concelho', `%${pesquisa}%`)
        .limit(10);

      if (!error && data) {
        const distinct = Array.from(new Set((data as { concelho: string }[]).map(item => item.concelho)));
        setConcelhoSugestoes(distinct);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Buscar Freguesias via API do Supabase (Autocomplete)
  const fetchFreguesias = async (pesquisa: string, concelhoContexto: string) => {
    if (pesquisa.trim().length < 1) {
      setFreguesiaSugestoes([]);
      return;
    }
    try {
      let query = supabase
        .from('localidades_portugal')
        .select('freguesia')
        .ilike('freguesia', `%${pesquisa}%`);

      if (concelhoContexto) {
        query = query.eq('concelho', concelhoContexto);
      }

      const { data, error } = await query.limit(10);
      if (!error && data) {
        const distinct = Array.from(new Set((data as { freguesia: string }[]).map(item => item.freguesia)));
        setFreguesiaSugestoes(distinct);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Tratar submissão de Novo Imóvel (ou Edição de Imóvel)
  const handleAddImovel = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!vNome.trim() || !vContacto.trim() || !vPrecoObj || !vPrecoMin || !vArea || !vRua.trim() || !vCidade.trim() || !vFreguesia.trim()) {
      showToast('Por favor, preenche todos os campos obrigatórios do imóvel.', 'error');
      return;
    }

    const pObj = parseFloat(vPrecoObj);
    const pMin = parseFloat(vPrecoMin);

    if (pMin > pObj) {
      showToast('O preço mínimo não pode ser superior ao preço objetivo.', 'error');
      return;
    }

    const imovelPayload = {
      proprietario_nome: vNome,
      proprietario_contacto: vContacto,
      tipologia: vTipologia,
      tipo_imovel: vTipoImovel,
      preco_objetivo: pObj,
      preco_minimo: pMin,
      flexibilidade_negociacao: vFlex,
      area_m2: parseFloat(vArea),
      rua: vRua,
      cidade: vCidade,
      freguesia: vFreguesia,
      andar: vAndar,
      tem_elevador: vElevador,
      tem_garagem: vGaragem,
      tem_quintal: vQuintal,
      tem_arrecadacao: vArrecadacao,
      urgencia: vUrgencia,
      observacoes: vObs || null,
      updated_at: new Date().toISOString() // Grava data de atualização
    };

    try {
      if (editingImovelId) {
        // MODO EDIÇÃO
        const { error } = await supabase
          .from('vendedores_imoveis')
          .update(imovelPayload)
          .eq('id', editingImovelId);

        if (error) throw error;
        showToast('Imóvel atualizado com sucesso!');
        setEditingImovelId(null);
      } else {
        // MODO INSERÇÃO
        const { error } = await supabase
          .from('vendedores_imoveis')
          .insert([imovelPayload])
          .select();

        if (error) throw error;
        showToast('Imóvel adicionado com sucesso!');
      }
      
      // Limpar formulário
      setVNome('');
      setVContacto('');
      setVTipologia('T2');
      setVTipoImovel('Apartamento');
      setVPrecoObj('');
      setVPrecoMin('');
      setVArea('');
      setVRua('');
      setVCidade('');
      setVFreguesia('');
      setVAndar('RC');
      setVElevador(false);
      setVGaragem(false);
      setVQuintal(false);
      setVArrecadacao(false);
      setVObs('');
      
      fetchData();
    } catch (err: any) {
      showToast('Erro ao gravar imóvel: ' + err.message, 'error');
    }
  };

  // Tratar submissão de Nova Lead (ou Edição de Comprador)
  const handleAddComprador = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!cNome.trim() || !cContacto.trim() || !cOrcamento || cTipologias.length === 0 || cTiposImovel.length === 0 || cZonas.length === 0) {
      showToast('Preenche todos os campos obrigatórios.', 'error');
      return;
    }

    const leadPayload = {
      comprador_nome: cNome,
      comprador_contacto: cContacto,
      tipologias_pretendidas: cTipologias,
      tipos_imovel_pretendidos: cTiposImovel,
      orcamento_maximo: parseFloat(cOrcamento),
      zonas_pretendidas: cZonas,
      precisa_garagem: cGaragem,
      requisito_elevador_ou_rc: cElevadorRc,
      preferencia_espaco_exterior: cEspacoExt,
      urgencia: cUrgencia,
      observacoes: cObs || null,
      foi_contactado: cFoiContactado,
      data_contacto: cFoiContactado && cDataContacto ? new Date(cDataContacto).toISOString() : null,
      updated_at: new Date().toISOString()
    };

    try {
      if (editingCompradorId) {
        // MODO EDIÇÃO
        const { error } = await supabase
          .from('compradores_leads')
          .update(leadPayload)
          .eq('id', editingCompradorId);

        if (error) throw error;
        showToast('Lead de comprador atualizada!');
        setEditingCompradorId(null);
      } else {
        // MODO INSERÇÃO
        const { error } = await supabase
          .from('compradores_leads')
          .insert([leadPayload])
          .select();

        if (error) throw error;
        showToast('Lead de comprador registada!');
      }

      // Limpar formulário
      setCNome('');
      setCContacto('');
      setCOrcamento('');
      setCTipologias(['T2']);
      setCTiposImovel(['Apartamento']);
      setCZonas([]);
      setCZonaInput('');
      setCGaragem(false);
      setCElevadorRc(false);
      setCEspacoExt(false);
      setCObs('');
      setCFoiContactado(false);
      setCDataContacto('');

      fetchData();
    } catch (err: any) {
      showToast('Erro ao registar comprador: ' + err.message, 'error');
    }
  };

  // Ativar modo de edição para Imóvel
  const startEditImovel = (imovel: Imovel) => {
    setActiveTab('vendedores');
    setEditingImovelId(imovel.id);
    
    setVNome(imovel.proprietario_nome);
    setVContacto(imovel.proprietario_contacto);
    setVTipologia(imovel.tipologia);
    setVTipoImovel(imovel.tipo_imovel);
    setVPrecoObj(imovel.preco_objetivo.toString());
    setVPrecoMin(imovel.preco_minimo.toString());
    setVFlex(imovel.flexibilidade_negociacao);
    setVArea(imovel.area_m2.toString());
    setVRua(imovel.rua);
    setVCidade(imovel.cidade);
    setVFreguesia(imovel.freguesia);
    setVAndar(imovel.andar);
    setVElevador(imovel.tem_elevador);
    setVGaragem(imovel.tem_garagem);
    setVQuintal(imovel.tem_quintal);
    setVArrecadacao(imovel.tem_arrecadacao);
    setVUrgencia(imovel.urgencia);
    setVObs(imovel.observacoes || '');
  };

  // Ativar modo de edição para Comprador
  const startEditComprador = (comprador: Comprador) => {
    setActiveTab('compradores');
    setEditingCompradorId(comprador.id);

    setCNome(comprador.comprador_nome);
    setCContacto(comprador.comprador_contacto);
    setCTipologias(comprador.tipologias_pretendidas);
    setCTiposImovel(comprador.tipos_imovel_pretendidos);
    setCOrcamento(comprador.orcamento_maximo.toString());
    setCZonas(comprador.zonas_pretendidas);
    setCGaragem(comprador.precisa_garagem);
    setCElevadorRc(comprador.requisito_elevador_ou_rc);
    setCEspacoExt(comprador.preferencia_espaco_exterior);
    setCUrgencia(comprador.urgencia);
    setCObs(comprador.observacoes || '');
    setCFoiContactado(comprador.foi_contactado);
    
    if (comprador.data_contacto) {
      // Converter ISO string para formato datetime-local (YYYY-MM-DDTHH:MM)
      const d = new Date(comprador.data_contacto);
      const tzOffset = d.getTimezoneOffset() * 60000; // offset em ms
      const localISOTime = (new Date(d.getTime() - tzOffset)).toISOString().slice(0, 16);
      setCDataContacto(localISOTime);
    } else {
      setCDataContacto('');
    }
  };

  // Atualizar ou inserir estado da interação/visita
  const handleUpdateInteracao = async (compradorId: string, imovelId: string, estado: string, notas: string) => {
    try {
      const { error } = await supabase
        .from('matches_interacoes')
        .upsert(
          {
            comprador_id: compradorId,
            imovel_id: imovelId,
            estado: estado,
            notas: notas,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'comprador_id,imovel_id' }
        );

      if (error) throw error;
      showToast('Interação atualizada!');
      fetchMatches(compradorId);
    } catch (err: any) {
      showToast('Erro ao atualizar interação: ' + err.message, 'error');
    }
  };

  // Atualizar contacto de um comprador de forma rápida (botão no match card)
  const handleToggleContactoRapido = async (comprador: Comprador, foiContactado: boolean) => {
    try {
      const dataStr = foiContactado ? new Date().toISOString() : null;
      const { error } = await supabase
        .from('compradores_leads')
        .update({
          foi_contactado: foiContactado,
          data_contacto: dataStr,
          updated_at: new Date().toISOString()
        })
        .eq('id', comprador.id);

      if (error) throw error;
      showToast(foiContactado ? 'Cliente marcado como contactado!' : 'Contacto removido.');
      
      // Atualiza o comprador selecionado na UI
      setSelectedComprador({
        ...comprador,
        foi_contactado: foiContactado,
        data_contacto: dataStr
      });
      fetchData();
    } catch (err: any) {
      showToast('Erro ao atualizar contacto: ' + err.message, 'error');
    }
  };

  // Apagar Imóvel
  const handleDeleteImovel = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Remover este imóvel permanentemente?')) return;

    try {
      const { error } = await supabase
        .from('vendedores_imoveis')
        .delete()
        .eq('id', id);

      if (error) throw error;
      showToast('Imóvel removido.');
      
      if (editingImovelId === id) setEditingImovelId(null);
      fetchData();
    } catch (err: any) {
      showToast('Erro ao remover: ' + err.message, 'error');
    }
  };

  // Apagar Comprador
  const handleDeleteComprador = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Remover este comprador permanentemente?')) return;

    try {
      const { error } = await supabase
        .from('compradores_leads')
        .delete()
        .eq('id', id);

      if (error) throw error;
      showToast('Comprador removido.');
      
      if (selectedComprador?.id === id) setSelectedComprador(null);
      if (editingCompradorId === id) setEditingCompradorId(null);
      fetchData();
    } catch (err: any) {
      showToast('Erro ao remover: ' + err.message, 'error');
    }
  };

  // Adicionar zona pretendida à lista
  const handleAddZona = () => {
    const concelho = cZonaInput.trim();
    if (concelho && !cZonas.includes(concelho)) {
      setCZonas([...cZonas, concelho]);
      setCZonaInput('');
    }
  };

  // Remover zona da lista
  const handleRemoveZona = (zonaToRemove: string) => {
    setCZonas(cZonas.filter(z => z !== zonaToRemove));
  };

  // Toggle de seleção múltipla de tipologias
  const handleToggleTipologia = (tip: string) => {
    if (cTipologias.includes(tip)) {
      if (cTipologias.length > 1) {
        setCTipologias(cTipologias.filter(t => t !== tip));
      } else {
        showToast('Selecione pelo menos uma tipologia.', 'error');
      }
    } else {
      setCTipologias([...cTipologias, tip]);
    }
  };

  // Toggle de seleção múltipla de tipos de imóvel
  const handleToggleTipoImovel = (tipo: string) => {
    if (cTiposImovel.includes(tipo)) {
      if (cTiposImovel.length > 1) {
        setCTiposImovel(cTiposImovel.filter(t => t !== tipo));
      } else {
        showToast('Selecione pelo menos um tipo de imóvel.', 'error');
      }
    } else {
      setCTiposImovel([...cTiposImovel, tipo]);
    }
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val);
  };

  // Obter cores para as tags de estado do CRM
  const getEstadoBadgeStyle = (estado: string) => {
    switch (estado) {
      case 'Visita Agendada':
        return { backgroundColor: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', borderColor: 'rgba(245, 158, 11, 0.3)' };
      case 'Proposta Apresentada':
        return { backgroundColor: 'rgba(139, 92, 246, 0.15)', color: '#a78bfa', borderColor: 'rgba(139, 92, 246, 0.3)' };
      case 'Negócio Fechado':
        return { backgroundColor: 'rgba(16, 185, 129, 0.15)', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.3)' };
      case 'Arquivado':
        return { backgroundColor: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' };
      default:
        return { backgroundColor: 'rgba(148, 163, 184, 0.15)', color: '#94a3b8', borderColor: 'rgba(148, 163, 184, 0.3)' };
    }
  };

  // --- LOGICA DE RENDERIZAÇÃO DO CALENDÁRIO DE ATIVIDADES ---
  
  // Coletar todos os eventos e agrupá-los por data formatada YYYY-MM-DD
  const getCalendarEvents = (): CalendarEvent[] => {
    const events: CalendarEvent[] = [];

    // 1. Registos de Imóveis (criado em)
    vendedores.forEach(v => {
      const d = v.created_at.split('T')[0];
      events.push({
        date: d,
        type: 'imovel',
        title: `Registo de Imóvel`,
        label: `${v.tipo_imovel} (${v.tipologia}) - Proprietário: ${v.proprietario_nome}`,
        desc: `Registado por ${formatCurrency(v.preco_objetivo)} em ${v.freguesia}, ${v.cidade}.`,
        originalId: v.id
      });

      // Se atualizado posteriormente
      const u = v.updated_at.split('T')[0];
      if (u !== d) {
        events.push({
          date: u,
          type: 'imovel_update',
          title: `Atualização de Imóvel`,
          label: `${v.tipo_imovel} (${v.tipologia}) - Proprietário: ${v.proprietario_nome}`,
          desc: `Modificado em ${v.freguesia}.`,
          originalId: v.id
        });
      }
    });

    // 2. Registos de Compradores (criado em)
    compradores.forEach(c => {
      const d = c.created_at.split('T')[0];
      events.push({
        date: d,
        type: 'comprador',
        title: `Nova Lead de Comprador`,
        label: `${c.comprador_nome} - Contacto: ${c.comprador_contacto}`,
        desc: `Orcamento: ${formatCurrency(c.orcamento_maximo)} para tipologias: ${c.tipologias_pretendidas.join(',')}.`,
        originalId: c.id
      });

      const u = c.updated_at.split('T')[0];
      if (u !== d) {
        events.push({
          date: u,
          type: 'comprador_update',
          title: `Atualização de Comprador`,
          label: `${c.comprador_nome}`,
          desc: `Alterações gravadas no perfil do cliente.`,
          originalId: c.id
        });
      }

      // Contactos de clientes
      if (c.foi_contactado && c.data_contacto) {
        const dc = c.data_contacto.split('T')[0];
        events.push({
          date: dc,
          type: 'contacto',
          title: `Contacto com Cliente`,
          label: `${c.comprador_nome}`,
          desc: `Contacto efetuado com sucesso para fins de qualificação da lead.`,
          originalId: c.id
        });
      }
    });



    return events;
  };

  const calendarEvents = getCalendarEvents();

  // Mudar de mês
  const prevMonth = () => {
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1));
  };

  // Renderizar a matriz de dias para o calendário mensal
  const renderCalendarDays = () => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();

    // Primeiro dia do mês (0 = Domingo, 1 = Segunda, etc.)
    const firstDayIndex = new Date(year, month, 1).getDay();
    // Ajustar para Segunda-feira ser o primeiro dia (0 = Segunda, ..., 6 = Domingo)
    const startDayOffset = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

    const totalDays = new Date(year, month + 1, 0).getDate();
    const totalDaysPrev = new Date(year, month, 0).getDate();

    const cells: React.ReactNode[] = [];

    // Preencher dias do mês anterior
    for (let i = startDayOffset - 1; i >= 0; i--) {
      const dayNum = totalDaysPrev - i;
      cells.push(
        <div key={`prev-${dayNum}`} className="calendar-day-cell outside">
          <span className="calendar-day-num">{dayNum}</span>
        </div>
      );
    }

    // Preencher dias do mês atual
    for (let i = 1; i <= totalDays; i++) {
      const cellDate = new Date(year, month, i);
      const cellDateStr = cellDate.toISOString().split('T')[0];

      // Filtrar eventos deste dia
      const dayEvents = calendarEvents.filter(e => e.date === cellDateStr);

      const isToday = new Date().toDateString() === cellDate.toDateString();
      const isSelected = selectedDay.toDateString() === cellDate.toDateString();

      cells.push(
        <div 
          key={`current-${i}`} 
          className={`calendar-day-cell ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
          onClick={() => setSelectedDay(cellDate)}
        >
          <span className="calendar-day-num">{i}</span>
          
          <div className="calendar-dots-container">
            {dayEvents.slice(0, 4).map((evt, idx) => (
              <div key={idx} className={`calendar-event-dot dot-${evt.type}`} title={evt.title} />
            ))}
            {dayEvents.length > 4 && (
              <span style={{ fontSize: '0.6rem', color: 'var(--accent-gold)', fontWeight: 700 }}>
                +{dayEvents.length - 4}
              </span>
            )}
          </div>
        </div>
      );
    }

    return cells;
  };

  const selectedDayStr = selectedDay.toISOString().split('T')[0];
  const selectedDayEvents = calendarEvents.filter(e => e.date === selectedDayStr);

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const totalMatchesCount = compradores.length > 0 ? matches.length : 0;

  return (
    <div className="app-container">
      {/* Notificações Toasts */}
      <div className="toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            {toast.type === 'success' ? <Check size={18} /> : <X size={18} />}
            <span>{toast.message}</span>
          </div>
        ))}
      </div>

      {/* Cabeçalho Superior */}
      <header className="app-header">
        <div className="brand-section">
          <div>
            <span className="brand-logo">Imo.</span>
            <div className="brand-tagline">CRM & Engine de Matching</div>
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-item">
            <span className="stat-val">{vendedores.length}</span>
            <span className="stat-label">Imóveis</span>
          </div>
          <div className="stat-item">
            <span className="stat-val">{compradores.length}</span>
            <span className="stat-label">Compradores</span>
          </div>
          <div className="stat-item">
            <span className="stat-val" style={{ color: 'var(--accent-gold)' }}>
              {loading ? '...' : totalMatchesCount}
            </span>
            <span className="stat-label">Matches Ativos</span>
          </div>
        </div>
      </header>

      {/* Layout Principal do Dashboard */}
      <main className="dashboard-layout">
        
        {/* Coluna de Formulários e Registos (Esquerda/Sidebar) */}
        <section className="sidebar-column">
          <nav className="tabs-header">
            <button 
              className={`tab-btn ${activeTab === 'vendedores' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('vendedores');
                setEditingImovelId(null);
              }}
            >
              <Home size={16} />
              <span>Vendedores (Imóveis)</span>
            </button>
            <button 
              className={`tab-btn ${activeTab === 'compradores' ? 'active' : ''}`}
              onClick={() => {
                setActiveTab('compradores');
                setEditingCompradorId(null);
              }}
            >
              <Users size={16} />
              <span>Compradores (Leads)</span>
            </button>
          </nav>

          {/* TAB VENDEDORES / IMÓVEIS */}
          {activeTab === 'vendedores' && (
            <div className="card">
              <div className="card-title-container">
                <h2 className="card-title">
                  {editingImovelId ? 'Editar Imóvel' : 'Inserir Novo Imóvel'}
                </h2>
                <Home size={20} style={{ color: 'var(--accent-gold)' }} />
              </div>

              <form onSubmit={handleAddImovel} className="form-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="form-group">
                  <label>Proprietário (Nome)*</label>
                  <input 
                    type="text" 
                    placeholder="Ex: João Silva" 
                    value={vNome}
                    onChange={(e) => setVNome(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group-row">
                  <div className="form-group">
                    <label>Contacto*</label>
                    <input 
                      type="text" 
                      placeholder="Ex: 912345678" 
                      value={vContacto}
                      onChange={(e) => setVContacto(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Tipo de Imóvel*</label>
                    <select value={vTipoImovel} onChange={(e) => setVTipoImovel(e.target.value)}>
                      {tiposImovelDisponiveis.map(tipo => (
                        <option key={tipo} value={tipo}>{tipo}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group-row">
                  <div className="form-group">
                    <label>Preço Objetivo (€)*</label>
                    <input 
                      type="number" 
                      placeholder="Preço anunciado" 
                      value={vPrecoObj}
                      onChange={(e) => setVPrecoObj(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Preço Mínimo (€)*</label>
                    <input 
                      type="number" 
                      placeholder="Preço confidencial" 
                      value={vPrecoMin}
                      onChange={(e) => setVPrecoMin(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group-row">
                  <div className="form-group">
                    <label>Tipologia*</label>
                    <select value={vTipologia} onChange={(e) => setVTipologia(e.target.value)}>
                      <option value="T0">T0</option>
                      <option value="T1">T1</option>
                      <option value="T2">T2</option>
                      <option value="T3">T3</option>
                      <option value="T4">T4</option>
                      <option value="T5+">T5+</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Área Útil (m²)*</label>
                    <input 
                      type="number" 
                      step="0.01" 
                      placeholder="Ex: 85.5" 
                      value={vArea}
                      onChange={(e) => setVArea(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group-row">
                  <div className="form-group">
                    <label>Andar / Piso*</label>
                    <input 
                      type="text" 
                      placeholder="Ex: R/C ou 2º" 
                      value={vAndar}
                      onChange={(e) => setVAndar(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Urgência de Venda*</label>
                    <select value={vUrgencia} onChange={(e) => setVUrgencia(e.target.value as any)}>
                      <option value="Baixa">🟢 Baixa</option>
                      <option value="Media">🟡 Média</option>
                      <option value="Alta">🔴 Alta</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Localização (Rua)*</label>
                  <input 
                    type="text" 
                    placeholder="Nome da rua e número" 
                    value={vRua}
                    onChange={(e) => setVRua(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group-row">
                  <div className="form-group autocomplete-wrapper">
                    <label>Cidade (Concelho)*</label>
                    <input 
                      type="text" 
                      placeholder="Ex: Beja" 
                      value={vCidade}
                      list="cidades-vendedores"
                      onChange={(e) => {
                        setVCidade(e.target.value);
                        fetchConcelhos(e.target.value);
                      }}
                      required
                    />
                    <datalist id="cidades-vendedores">
                      {concelhoSugestoes.map((c, idx) => <option key={idx} value={c} />)}
                    </datalist>
                  </div>
                  <div className="form-group autocomplete-wrapper">
                    <label>Freguesia*</label>
                    <input 
                      type="text" 
                      placeholder="Ex: Salvador" 
                      value={vFreguesia}
                      list="freguesias-vendedores"
                      onChange={(e) => {
                        setVFreguesia(e.target.value);
                        fetchFreguesias(e.target.value, vCidade);
                      }}
                      required
                    />
                    <datalist id="freguesias-vendedores">
                      {freguesiaSugestoes.map((f, idx) => <option key={idx} value={f} />)}
                    </datalist>
                  </div>
                </div>

                <div className="form-group">
                  <label>Características e Acessibilidade</label>
                  <div className="checkbox-group">
                    <label className="checkbox-label">
                      <input 
                        type="checkbox" 
                        checked={vElevador}
                        onChange={(e) => setVElevador(e.target.checked)}
                      />
                      Tem Elevador
                    </label>
                    <label className="checkbox-label">
                      <input 
                        type="checkbox" 
                        checked={vGaragem}
                        onChange={(e) => setVGaragem(e.target.checked)}
                      />
                      Tem Garagem
                    </label>
                    <label className="checkbox-label">
                      <input 
                        type="checkbox" 
                        checked={vQuintal}
                        onChange={(e) => setVQuintal(e.target.checked)}
                      />
                      Quintal / Varanda
                    </label>
                    <label className="checkbox-label">
                      <input 
                        type="checkbox" 
                        checked={vArrecadacao}
                        onChange={(e) => setVArrecadacao(e.target.checked)}
                      />
                      Arrecadação
                    </label>
                  </div>
                </div>

                <div className="form-group">
                  <label>Negociação*</label>
                  <select value={vFlex} onChange={(e) => setVFlex(e.target.value as any)}>
                    <option value="Baixa">Baixa Flexibilidade</option>
                    <option value="Media">Média Flexibilidade</option>
                    <option value="Alta">Alta Flexibilidade</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Observações Adicionais</label>
                  <textarea 
                    rows={2} 
                    placeholder="Notas internas..." 
                    value={vObs}
                    onChange={(e) => setVObs(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="submit" className="btn btn-primary" style={{ flexGrow: 1 }}>
                    <PlusCircle size={18} />
                    <span>{editingImovelId ? 'Guardar Alterações' : 'Gravar Imóvel'}</span>
                  </button>
                  {editingImovelId && (
                    <button 
                      type="button" 
                      className="btn btn-secondary"
                      onClick={() => {
                        setEditingImovelId(null);
                        setVNome('');
                        setVContacto('');
                        setVPrecoObj('');
                        setVPrecoMin('');
                        setVArea('');
                        setVRua('');
                        setVCidade('');
                        setVFreguesia('');
                        setVObs('');
                      }}
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </form>
            </div>
          )}

          {/* TAB COMPRADORES / LEADS */}
          {activeTab === 'compradores' && (
            <div className="card">
              <div className="card-title-container">
                <h2 className="card-title">
                  {editingCompradorId ? 'Editar Lead' : 'Registar Comprador (Lead)'}
                </h2>
                <Users size={20} style={{ color: 'var(--accent-gold)' }} />
              </div>

              <form onSubmit={handleAddComprador} className="form-container" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div className="form-group">
                  <label>Comprador (Nome)*</label>
                  <input 
                    type="text" 
                    placeholder="Ex: Maria Antunes" 
                    value={cNome}
                    onChange={(e) => setCNome(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Contacto Telefónico*</label>
                  <input 
                    type="text" 
                    placeholder="Ex: 961234567" 
                    value={cContacto}
                    onChange={(e) => setCContacto(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Tipo de Imóvel Pretendido* (Múltiplos)</label>
                  <div className="chips-container">
                    {tiposImovelDisponiveis.map(tipo => (
                      <div 
                        key={tipo}
                        className={`chip ${cTiposImovel.includes(tipo) ? 'active' : ''}`}
                        onClick={() => handleToggleTipoImovel(tipo)}
                      >
                        {cTiposImovel.includes(tipo) && <Check size={12} />}
                        <span>{tipo}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label>Tipologias Pretendidas* (Múltiplas)</label>
                  <div className="chips-container">
                    {tipologiasDisponiveis.map(tip => (
                      <div 
                        key={tip}
                        className={`chip ${cTipologias.includes(tip) ? 'active' : ''}`}
                        onClick={() => handleToggleTipologia(tip)}
                      >
                        {cTipologias.includes(tip) && <Check size={12} />}
                        <span>{tip}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label>Orçamento Máximo (€)*</label>
                  <input 
                    type="number" 
                    placeholder="Orçamento total disponível" 
                    value={cOrcamento}
                    onChange={(e) => setCOrcamento(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Zonas/Localidades Pretendidas*</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input 
                      type="text" 
                      placeholder="Ex: Beja, Salvador..." 
                      value={cZonaInput}
                      list="cidades-compradores"
                      onChange={(e) => {
                        setCZonaInput(e.target.value);
                        fetchConcelhos(e.target.value);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddZona();
                        }
                      }}
                    />
                    <datalist id="cidades-compradores">
                      {concelhoSugestoes.map((c, idx) => <option key={idx} value={c} />)}
                    </datalist>
                    <button 
                      type="button" 
                      className="btn btn-secondary" 
                      onClick={handleAddZona}
                      style={{ padding: '0.75rem 1rem' }}
                    >
                      <Plus size={18} />
                    </button>
                  </div>
                  <div className="chips-container" style={{ minHeight: '30px' }}>
                    {cZonas.map(zona => (
                      <span 
                        key={zona} 
                        className="chip active" 
                        style={{ backgroundColor: 'var(--bg-input)' }}
                        onClick={() => handleRemoveZona(zona)}
                      >
                        <span>{zona}</span>
                        <X size={12} />
                      </span>
                    ))}
                    {cZonas.length === 0 && (
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        Adicione pelo menos 1 concelho/zona.
                      </span>
                    )}
                  </div>
                </div>

                {/* GESTÃO DE CONTACTO DO CLIENTE (Novo) */}
                <div style={{ 
                  borderTop: '1px solid var(--border-color)', 
                  borderBottom: '1px solid var(--border-color)',
                  padding: '0.85rem 0',
                  margin: '4px 0',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.75rem'
                }}>
                  <label className="checkbox-label" style={{ fontWeight: 600 }}>
                    <input 
                      type="checkbox" 
                      checked={cFoiContactado}
                      onChange={(e) => setCFoiContactado(e.target.checked)}
                    />
                    Já foi contactado?
                  </label>
                  {cFoiContactado && (
                    <div className="form-group" style={{ animation: 'slideIn 0.2s ease' }}>
                      <label>Data e Hora do Contacto</label>
                      <input 
                        type="datetime-local" 
                        value={cDataContacto}
                        onChange={(e) => setCDataContacto(e.target.value)}
                        required={cFoiContactado}
                      />
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label>Requisitos Rígidos / Preferências</label>
                  <div className="checkbox-group">
                    <label className="checkbox-label">
                      <input 
                        type="checkbox" 
                        checked={cGaragem}
                        onChange={(e) => setCGaragem(e.target.checked)}
                      />
                      Exige Garagem
                    </label>
                    <label className="checkbox-label">
                      <input 
                        type="checkbox" 
                        checked={cElevadorRc}
                        onChange={(e) => setCElevadorRc(e.target.checked)}
                      />
                      Acessibilidade (Elevador ou R/C)
                    </label>
                    <label className="checkbox-label">
                      <input 
                        type="checkbox" 
                        checked={cEspacoExt}
                        onChange={(e) => setCEspacoExt(e.target.checked)}
                      />
                      Varanda / Espaço Exterior
                    </label>
                  </div>
                </div>

                <div className="form-group">
                  <label>Urgência de Compra*</label>
                  <select value={cUrgencia} onChange={(e) => setCUrgencia(e.target.value as any)}>
                    <option value="Baixa">🟢 Baixa (Procura ativa mas sem pressa)</option>
                    <option value="Media">🟡 Média (Acompanhamento regular)</option>
                    <option value="Alta">🔴 Alta (Urgente / Precisa comprar já)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Notas / Observações</label>
                  <textarea 
                    rows={2} 
                    placeholder="Preferencia especial do cliente..." 
                    value={cObs}
                    onChange={(e) => setCObs(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button type="submit" className="btn btn-primary" style={{ flexGrow: 1 }}>
                    <PlusCircle size={18} />
                    <span>{editingCompradorId ? 'Guardar Alterações' : 'Submeter Lead'}</span>
                  </button>
                  {editingCompradorId && (
                    <button 
                      type="button" 
                      className="btn btn-secondary"
                      onClick={() => {
                        setEditingCompradorId(null);
                        setCNome('');
                        setCContacto('');
                        setCOrcamento('');
                        setCTipologias(['T2']);
                        setCTiposImovel(['Apartamento']);
                        setCZonas([]);
                        setCObs('');
                      }}
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </form>
            </div>
          )}

          {/* LISTA GERAL DE ENTIDADES (RESUMIDA NA SIDEBAR) */}
          <div className="card">
            <h3 className="card-title" style={{ fontSize: '1.1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              {activeTab === 'vendedores' ? 'Lista de Imóveis (' + vendedores.length + ')' : 'Compradores Registados (' + compradores.length + ')'}
            </h3>
            
            <div className="items-list-scroll">
              {activeTab === 'vendedores' ? (
                vendedores.length > 0 ? (
                  vendedores.map(imovel => (
                    <div key={imovel.id} className="item-list-row" style={{ cursor: 'default' }}>
                      <div className="item-info-main">
                        <span className="item-title-name">{imovel.tipo_imovel} ({imovel.tipologia})</span>
                        <span className="item-subtitle-details">
                          {imovel.freguesia}, {imovel.cidade} | {formatCurrency(imovel.preco_objetivo)}
                        </span>
                        <div style={{ marginTop: '4px', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                          Modificado: {new Date(imovel.updated_at).toLocaleDateString('pt-PT')}
                        </div>
                      </div>
                      <div className="card-header-actions">
                        <button 
                          onClick={() => startEditImovel(imovel)} 
                          className="btn-edit-icon"
                          title="Editar Imóvel"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button 
                          onClick={(e) => handleDeleteImovel(imovel.id, e)} 
                          className="btn-danger-icon"
                          title="Remover Imóvel"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>
                    Nenhum imóvel registado até ao momento.
                  </div>
                )
              ) : (
                compradores.length > 0 ? (
                  compradores.map(comprador => (
                    <div 
                      key={comprador.id} 
                      className={`item-list-row ${selectedComprador?.id === comprador.id ? 'selected' : ''}`}
                      onClick={() => setSelectedComprador(comprador)}
                    >
                      <div className="item-info-main">
                        <span className="item-title-name">{comprador.comprador_nome}</span>
                        <span className="item-subtitle-details">
                          Orçamento: {formatCurrency(comprador.orcamento_maximo)}
                        </span>
                        <div style={{ marginTop: '4px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {comprador.foi_contactado ? (
                            <span style={{ color: 'var(--urgency-baixa)' }}>📞 Contactado</span>
                          ) : (
                            <span style={{ color: 'var(--urgency-alta)' }}>⚠️ Por contactar</span>
                          )}
                        </div>
                      </div>
                      <div className="card-header-actions" onClick={e => e.stopPropagation()}>
                        <button 
                          onClick={() => startEditComprador(comprador)} 
                          className="btn-edit-icon"
                          title="Editar Perfil"
                        >
                          <Edit2 size={15} />
                        </button>
                        <button 
                          onClick={(e) => handleDeleteComprador(comprador.id, e)} 
                          className="btn-danger-icon"
                          title="Remover Comprador"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>
                    Nenhum comprador registado até ao momento.
                  </div>
                )
              )}
            </div>
          </div>
        </section>

        {/* Coluna Central de Visualização Principal */}
        <section className="main-column">
          {/* Navegação entre abas da área de visualização principal */}
          <nav className="tabs-header" style={{ maxWidth: '400px' }}>
            <button 
              className={`tab-btn ${activeMainTab === 'matching' ? 'active' : ''}`}
              onClick={() => setActiveMainTab('matching')}
            >
              <Sparkles size={16} />
              <span>Matching Engine</span>
            </button>
            <button 
              className={`tab-btn ${activeMainTab === 'calendario' ? 'active' : ''}`}
              onClick={() => setActiveMainTab('calendario')}
            >
              <Calendar size={16} />
              <span>Calendário de Atividades</span>
            </button>
          </nav>

          {/* TAB 1: MATCHING ENGINE */}
          {activeMainTab === 'matching' && (
            <>
              <div className="section-header">
                <h1 className="section-title">Engine de Matching Inteligente</h1>
                <Sparkles size={24} style={{ color: 'var(--accent-gold)' }} />
              </div>

              <div className="matching-engine-container">
                {/* Seletor de Leads à Esquerda */}
                <div className="matching-leads-selector">
                  <label style={{ fontSize: '0.85rem', marginBottom: '0.25rem', display: 'block' }}>Selecionar Lead para Matching</label>
                  
                  <div className="leads-list">
                    {compradores.length > 0 ? (
                      compradores.map(comprador => (
                        <div 
                          key={comprador.id} 
                          className={`lead-selector-card ${selectedComprador?.id === comprador.id ? 'selected' : ''}`}
                          onClick={() => setSelectedComprador(comprador)}
                        >
                          <div>
                            <div style={{ fontWeight: 600, fontSize: '1rem' }}>{comprador.comprador_nome}</div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                              Orçamento: <strong style={{ color: '#fff' }}>{formatCurrency(comprador.orcamento_maximo)}</strong>
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                              Zonas: {comprador.zonas_pretendidas.join(', ')}
                            </div>
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                            <span className={`badge badge-urgency-${comprador.urgencia}`}>Urgência {comprador.urgencia}</span>
                            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                              {comprador.tipos_imovel_pretendidos.join('/')}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="empty-state" style={{ padding: '2rem 1.5rem' }}>
                        <Users className="empty-state-icon" />
                        <div className="empty-state-title">Sem Leads Ativas</div>
                        <div className="empty-state-desc">Registe compradores na coluna lateral esquerda para processar o matching.</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Painel de Resultados de Matching */}
                <div className="matching-results-panel">
                  {selectedComprador ? (
                    <>
                      <div className="results-header-info">
                        <div>
                          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 600 }}>
                            Matches para {selectedComprador.comprador_nome}
                          </h2>
                          <div className="lead-contact-info" style={{ marginTop: '6px', flexWrap: 'wrap' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginRight: '16px' }}>
                              <Phone size={14} style={{ color: 'var(--accent-gold)' }} />
                              <span>Contacto: <strong>{selectedComprador.comprador_contacto}</strong></span>
                            </div>
                            
                            {/* CRM DE CONTACTOS (Marcar Contacto) */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              {selectedComprador.foi_contactado ? (
                                <>
                                  <span style={{ color: 'var(--urgency-baixa)', fontSize: '0.8rem' }}>
                                    ✓ Contactado em {selectedComprador.data_contacto ? new Date(selectedComprador.data_contacto).toLocaleString('pt-PT').slice(0, 16) : ''}
                                  </span>
                                  <button 
                                    className="btn" 
                                    onClick={() => handleToggleContactoRapido(selectedComprador, false)}
                                    style={{ padding: '2px 8px', fontSize: '0.7rem', backgroundColor: 'rgba(255,255,255,0.05)' }}
                                  >
                                    Limpar
                                  </button>
                                </>
                              ) : (
                                <>
                                  <span style={{ color: 'var(--urgency-alta)', fontSize: '0.8rem', fontWeight: 600 }}>⚠️ Contacto Pendente</span>
                                  <button 
                                    className="btn btn-primary" 
                                    onClick={() => handleToggleContactoRapido(selectedComprador, true)}
                                    style={{ padding: '2px 8px', fontSize: '0.7rem' }}
                                  >
                                    Marcar Contactado
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                          <span className={`badge badge-urgency-${selectedComprador.urgencia}`}>Urgência {selectedComprador.urgencia}</span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                            {selectedComprador.tipos_imovel_pretendidos.join('/')} • {selectedComprador.tipologias_pretendidas.join('/')}
                          </span>
                        </div>
                      </div>

                      {/* Lista de Imóveis Compatíveis */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                        {matches.length > 0 ? (
                          matches.map(match => {
                            const imovelDetalhado = vendedores.find(v => v.id === match.imovel_id);
                            const requerNegociacao = match.preco_objetivo > selectedComprador.orcamento_maximo;
                            const matchKey = `${match.comprador_id}_${match.imovel_id}`;
                            
                            const notasValorLocal = editingNotas[matchKey] !== undefined 
                              ? editingNotas[matchKey] 
                              : (match.notas_match || '');

                            return (
                              <div key={match.imovel_id} className="match-card">
                                <div className="match-card-top">
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                      <span style={{ fontSize: '1.25rem', fontWeight: 700, fontFamily: 'var(--font-display)' }}>
                                        {imovelDetalhado?.tipo_imovel || 'Imóvel'} ({match.tipologia})
                                      </span>
                                      <span className={`badge badge-urgency-${match.imovel_urgencia}`}>
                                        Imóvel {match.imovel_urgencia}
                                      </span>
                                    </div>
                                    <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                                      Localização: <strong>{match.freguesia}, {match.cidade}</strong>
                                    </span>
                                  </div>

                                  <div className="match-score-radial" title={`Score de Match: ${match.match_score}/100`}>
                                    <span className="match-score-val">{match.match_score}%</span>
                                    <span className="match-score-label">Match</span>
                                  </div>
                                </div>

                                <div className="match-details-grid">
                                  <div className="match-details-item">
                                    <span className="match-details-lbl">Preço Proposto</span>
                                    <span className="match-details-val" style={{ color: 'var(--accent-gold)', fontSize: '0.95rem' }}>
                                      {formatCurrency(match.preco_objetivo)}
                                    </span>
                                  </div>
                                  <div className="match-details-item">
                                    <span className="match-details-lbl">Área Útil</span>
                                    <span className="match-details-val">
                                      {imovelDetalhado?.area_m2 ? `${imovelDetalhado.area_m2} m²` : '---'}
                                    </span>
                                  </div>
                                  <div className="match-details-item">
                                    <span className="match-details-lbl">Andar</span>
                                    <span className="match-details-val">{imovelDetalhado?.andar || '---'}</span>
                                  </div>
                                  <div className="match-details-item">
                                    <span className="match-details-lbl">Contacto Proprietário</span>
                                    <span className="match-details-val" style={{ fontSize: '0.8rem' }}>
                                      {match.proprietario_nome} ({imovelDetalhado?.proprietario_contacto || '---'})
                                    </span>
                                  </div>
                                </div>

                                {requerNegociacao && (
                                  <div className="match-negotiation-alert">
                                    <AlertTriangle size={16} />
                                    <span>
                                      <strong>Requer Negociação:</strong> Preço proposto ({formatCurrency(match.preco_objetivo)}) excede orçamento ({formatCurrency(selectedComprador.orcamento_maximo)}), viável por flexibilidade do vendedor.
                                    </span>
                                  </div>
                                )}

                                {/* CRM: ESTADO DO NEGÓCIO */}
                                <div style={{ 
                                  borderTop: '1px solid var(--border-color)', 
                                  paddingTop: '1rem',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  gap: '0.75rem' 
                                }}>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <Calendar size={15} style={{ color: 'var(--accent-gold)' }} />
                                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                                        CRM Estado:
                                      </span>
                                      <span 
                                        className="badge" 
                                        style={{ 
                                          ...getEstadoBadgeStyle(match.estado_match),
                                          fontSize: '0.7rem', 
                                          padding: '2px 8px'
                                        }}
                                      >
                                        {match.estado_match}
                                      </span>
                                    </div>

                                    <select 
                                      value={match.estado_match} 
                                      onChange={(e) => handleUpdateInteracao(match.comprador_id, match.imovel_id, e.target.value, match.notas_match || '')}
                                      style={{ 
                                        width: 'auto', 
                                        padding: '4px 8px', 
                                        fontSize: '0.8rem', 
                                        backgroundColor: 'var(--bg-card-hover)',
                                        borderRadius: '4px'
                                      }}
                                    >
                                      <option value="Pendente">Pendente</option>
                                      <option value="Visita Agendada">📆 Visita Agendada</option>
                                      <option value="Proposta Apresentada">✉️ Proposta Apresentada</option>
                                      <option value="Negócio Fechado">🎉 Negócio Fechado</option>
                                      <option value="Arquivado">📁 Arquivado</option>
                                    </select>
                                  </div>

                                  <div style={{ display: 'flex', gap: '8px' }}>
                                    <input 
                                      type="text" 
                                      placeholder="Escreva feedback do negócio ou da visita..." 
                                      value={notasValorLocal}
                                      onChange={(e) => setEditingNotas({ ...editingNotas, [matchKey]: e.target.value })}
                                      style={{ 
                                        flexGrow: 1, 
                                        padding: '6px 10px', 
                                        fontSize: '0.85rem', 
                                        backgroundColor: 'rgba(255,255,255,0.02)',
                                        borderRadius: '4px'
                                      }}
                                    />
                                    <button 
                                      type="button" 
                                      className="btn btn-secondary"
                                      onClick={() => handleUpdateInteracao(match.comprador_id, match.imovel_id, match.estado_match, notasValorLocal)}
                                      style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                                    >
                                      Gravar
                                    </button>
                                  </div>
                                </div>

                                {imovelDetalhado && (
                                  <div className="match-features-chips" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem', marginTop: '4px' }}>
                                    {imovelDetalhado.tem_elevador && (
                                      <span className="feature-chip-active">✓ Elevador</span>
                                    )}
                                    {imovelDetalhado.tem_garagem && (
                                      <span className="feature-chip-active">✓ Garagem</span>
                                    )}
                                    {imovelDetalhado.tem_quintal && (
                                      <span className="feature-chip-active">✓ Quintal/Varanda</span>
                                    )}
                                    {imovelDetalhado.tem_arrecadacao && (
                                      <span className="feature-chip-active">✓ Arrecadação</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })
                        ) : (
                          <div className="empty-state">
                            <AlertTriangle className="empty-state-icon" style={{ color: 'var(--urgency-media)' }} />
                            <div className="empty-state-title">Sem Matches Elegíveis</div>
                            <div className="empty-state-desc">
                              Não foram encontrados imóveis elegíveis para as preferências de {selectedComprador.comprador_nome}.
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="empty-state" style={{ minHeight: '300px', display: 'flex', justifyContent: 'center' }}>
                      <Sparkles className="empty-state-icon" />
                      <div className="empty-state-title">Selecione um Comprador</div>
                      <div className="empty-state-desc">
                        Selecione uma lead de comprador da lista à esquerda para analisar os matches.
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* TAB 2: CALENDÁRIO DE ATIVIDADES (NOVO) */}
          {activeMainTab === 'calendario' && (
            <div className="calendar-wrapper">
              
              {/* Calendário Mensal */}
              <div className="calendar-main-card">
                <div className="calendar-header-nav">
                  <button onClick={prevMonth} className="btn-edit-icon" style={{ padding: '8px' }}>
                    <ChevronLeft size={20} />
                  </button>
                  <h2 className="calendar-month-title">
                    {monthNames[calendarDate.getMonth()]} {calendarDate.getFullYear()}
                  </h2>
                  <button onClick={nextMonth} className="btn-edit-icon" style={{ padding: '8px' }}>
                    <ChevronRight size={20} />
                  </button>
                </div>

                <div className="calendar-week-days">
                  <div>Seg</div>
                  <div>Ter</div>
                  <div>Qua</div>
                  <div>Qui</div>
                  <div>Sex</div>
                  <div>Sáb</div>
                  <div>Dom</div>
                </div>

                <div className="calendar-grid">
                  {renderCalendarDays()}
                </div>

                <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '1.5rem', fontSize: '0.75rem', color: 'var(--text-secondary)', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div className="calendar-event-dot dot-imovel" /> <span>Registo Imóvel</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div className="calendar-event-dot dot-imovel-update" /> <span>Alteração Imóvel</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div className="calendar-event-dot dot-comprador" /> <span>Registo Comprador</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div className="calendar-event-dot dot-comprador-update" /> <span>Alteração Comprador</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div className="calendar-event-dot dot-contacto" /> <span>Contacto Cliente</span>
                  </div>
                </div>
              </div>

              {/* Lista de Atividades do Dia Selecionado */}
              <div className="calendar-activities-card">
                <h3 className="card-title" style={{ fontSize: '1.1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                  Atividades em: {selectedDay.toLocaleDateString('pt-PT')}
                </h3>

                <div className="calendar-activities-list">
                  {selectedDayEvents.length > 0 ? (
                    selectedDayEvents.map((evt, idx) => (
                      <div key={idx} className="calendar-activity-item">
                        <div className={`activity-icon-box activity-icon-${evt.type.includes('imovel') ? 'imovel' : evt.type.includes('comprador') ? 'comprador' : evt.type}`}>
                          {evt.type.includes('imovel') ? <Home size={16} /> : <Users size={16} />}
                        </div>
                        <div className="activity-content">
                          <span className="activity-title">{evt.title}</span>
                          <span className="activity-meta">{evt.label}</span>
                          {evt.desc && <span className="activity-desc">{evt.desc}</span>}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="empty-state" style={{ padding: '2rem 1rem', borderStyle: 'solid' }}>
                      <Calendar className="empty-state-icon" />
                      <div className="empty-state-title" style={{ fontSize: '0.95rem' }}>Sem Atividades</div>
                      <div className="empty-state-desc" style={{ fontSize: '0.8rem' }}>
                        Nenhum evento registado para este dia.
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

        </section>
      </main>
    </div>
  );
}

export default App;
