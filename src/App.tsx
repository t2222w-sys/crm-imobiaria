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
  Edit2,
  Mail,
  FolderKanban,
  LayoutDashboard,
  Settings,
  MapPin,
  Building,
  Heart,
  TrendingUp,
  Clock,
  Smartphone
} from 'lucide-react';

// Interfaces baseadas no esquema SQL
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
  updated_at: string;
  estado_imovel: string;
  origem_contacto: string;
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
  foi_contactado: boolean;
  data_contacto?: string | null;
  created_at: string;
  updated_at: string;
  estado_comprador: string;
  origem_contacto: string;
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

interface Atividade {
  id: string;
  tipos_atividade: string[];
  data_hora: string;
  comprador_id: string | null;
  imovel_id: string | null;
  notas: string | null;
  created_at: string;
}

interface CalendarEvent {
  date: string;
  type: 'imovel' | 'imovel_update' | 'comprador' | 'comprador_update' | 'contacto' | 'crm' | 'agenda';
  title: string;
  label: string;
  desc?: string;
  originalId: string;
  compradorId?: string | null;
  imovelId?: string | null;
}

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error';
}

// --- UTILS DE FORMATAÇÃO E DATAS GLOBAIS (Nível de Ficheiro para escopo livre) ---
const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val);
};

const getLocalDateString = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseSafeDate = (dateStr: any): Date | null => {
  if (!dateStr) return null;
  if (dateStr instanceof Date) return dateStr;
  try {
    const formatted = String(dateStr).replace(' ', 'T');
    const d = new Date(formatted);
    return isNaN(d.getTime()) ? null : d;
  } catch {
    return null;
  }
};

const getLocalDateFromISO = (isoStr: string) => {
  const date = parseSafeDate(isoStr);
  return date ? getLocalDateString(date) : '';
};

function App() {
  if (!isSupabaseConfigured) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: '#f8fafc',
        color: '#0f172a',
        fontFamily: 'sans-serif',
        padding: '2rem',
        textAlign: 'center'
      }}>
        <div style={{
          backgroundColor: '#ffffff',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          padding: '2.5rem',
          borderRadius: '12px',
          maxWidth: '500px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          <AlertTriangle size={48} style={{ color: '#ef4444', marginBottom: '1rem' }} />
          <h2 style={{ marginBottom: '1rem', fontFamily: 'Outfit, sans-serif', fontWeight: 700 }}>Configuração em Falta</h2>
          <p style={{ color: '#475569', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '1.5rem' }}>
            A aplicação não conseguiu ligar ao Supabase porque as variáveis de ambiente necessárias não foram encontradas.
          </p>
          <div style={{ textAlign: 'left', backgroundColor: '#f1f5f9', padding: '1rem', borderRadius: '6px', fontSize: '0.85rem', color: '#0f172a', marginBottom: '1.5rem', width: '100%' }}>
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

  // Navegação
  const [activeMenu, setActiveMenu] = useState<'dashboard' | 'kanban' | 'imoveis' | 'compradores' | 'calendario' | 'definicoes'>('kanban');

  // Modais Gerais
  const [isImovelModalOpen, setIsImovelModalOpen] = useState(false);
  const [isCompradorModalOpen, setIsCompradorModalOpen] = useState(false);
  const [isAtividadeModalOpen, setIsAtividadeModalOpen] = useState(false);

  // Estados para Importação de Contactos
  const [isImportDecisionModalOpen, setIsImportDecisionModalOpen] = useState(false);
  const [isSimulatedContactsModalOpen, setIsSimulatedContactsModalOpen] = useState(false);
  const [importedContact, setImportedContact] = useState<{ nome: string; telefone: string; email?: string } | null>(null);
  const [associationMode, setAssociationMode] = useState<'decision' | 'associate-imovel' | 'associate-comprador'>('decision');

  // Dados do Supabase
  const [vendedores, setVendedores] = useState<Imovel[]>([]);
  const [compradores, setCompradores] = useState<Comprador[]>([]);
  const [allMatches, setAllMatches] = useState<Match[]>([]);
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [dbError, setDbError] = useState<string | null>(null);
  const [compradorFormErrors, setCompradorFormErrors] = useState<string[]>([]);
  const [imovelFormErrors, setImovelFormErrors] = useState<string[]>([]);

  const [selectedMatchDetail, setSelectedMatchDetail] = useState<Match | null>(null);

  // Estados de Edição
  const [editingImovelId, setEditingImovelId] = useState<string | null>(null);
  const [editingCompradorId, setEditingCompradorId] = useState<string | null>(null);
  const [editingAtividadeId, setEditingAtividadeId] = useState<string | null>(null);

  // Filtros Imóveis
  const [fImovelPesquisa, setFImovelPesquisa] = useState('');
  const [fImovelTipos, setFImovelTipos] = useState<string[]>([]);
  const [fImovelTipologias, setFImovelTipologias] = useState<string[]>([]);
  const [fImovelPrecoMax, setFImovelPrecoMax] = useState<number>(1000000);
  const [fImovelEstado, setFImovelEstado] = useState<string>('Todos');
  const [fImovelOrigem, setFImovelOrigem] = useState<string>('Todos');
  const [sortImoveisBy, setSortImoveisBy] = useState<string>('data-desc');

  // Filtros Compradores
  const [fCompradorPesquisa, setFCompradorPesquisa] = useState('');
  const [fCompradorTipos, setFCompradorTipos] = useState<string[]>([]);
  const [fCompradorTipologias, setFCompradorTipologias] = useState<string[]>([]);
  const [fCompradorOrcamentoMax, setFCompradorOrcamentoMax] = useState<number>(1000000);
  const [fCompradorEstado, setFCompradorEstado] = useState<string>('Todos');
  const [fCompradorOrigem, setFCompradorOrigem] = useState<string>('Todos');
  const [sortCompradoresBy, setSortCompradoresBy] = useState<string>('data-desc');

  // Controlos de Popovers de Filtros
  const [showImovelTiposDropdown, setShowImovelTiposDropdown] = useState(false);
  const [showImovelTipologiasDropdown, setShowImovelTipologiasDropdown] = useState(false);
  const [showCompradorTiposDropdown, setShowCompradorTiposDropdown] = useState(false);
  const [showCompradorTipologiasDropdown, setShowCompradorTipologiasDropdown] = useState(false);

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
  const [vEstadoImovel, setVEstadoImovel] = useState('Ativo');
  const [vOrigemContacto, setVOrigemContacto] = useState('Outro');

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
  const [cFoiContactado, setCFoiContactado] = useState(false);
  const [cDataContacto, setCDataContacto] = useState('');
  const [cEstadoComprador, setCEstadoComprador] = useState('Ativo');
  const [cOrigemContacto, setCOrigemContacto] = useState('Outro');

  // Atividade
  const [actTipos, setActTipos] = useState<string[]>([]);
  const [actDataHora, setActDataHora] = useState('');
  const [actCompradorId, setActCompradorId] = useState<string>('');
  const [actImovelId, setActImovelId] = useState<string>('');
  const [actNotas, setActNotas] = useState('');
  const [associarCliente, setAssociarCliente] = useState(false);
  const [associarImovel, setAssociarImovel] = useState(false);

  // Sugestões
  const [concelhoSugestoes, setConcelhoSugestoes] = useState<string[]>([]);
  const [freguesiaSugestoes, setFreguesiaSugestoes] = useState<string[]>([]);

  // Calendário
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());
  const [selectedDay, setSelectedDay] = useState<Date>(new Date());

  const tipologiasDisponiveis = ['T0', 'T1', 'T2', 'T3', 'T4', 'T5+'];
  const tiposImovelDisponiveis = [
    'Apartamento',
    'Moradia',
    'Terreno Agrícola',
    'Terreno para Construção'
  ];

  const origensDisponiveis = [
    'Idealista',
    'Imovirtual',
    'SuperCasa / Casa SAPO',
    'Website Imo',
    'Redes Sociais',
    'Google',
    'Placa no Imóvel',
    'Loja / Escritório',
    'Prospeção de Rua / Panfletos',
    'Recomendação / Passa-palavra',
    'Cliente Antigo',
    'Parceria / Outro Agente',
    'Outro'
  ];

  const tiposAtividadeDisponiveis = [
    'Visita a Imóvel',
    'Reunião com Cliente',
    'Angariação / Prospeção',
    'Avaliação Imobiliária',
    'Reportagem Fotográfica / Vídeo',
    'Assinatura de CPCV',
    'Escritura / Fecho',
    'Entrega de Chaves / Vistoria',
    'Outro'
  ];

  // Contactos simulados para o desktop (Mock List)
  const contactosSimulados = [
    { nome: 'Ana Rodrigues', telefone: '915678234', email: 'ana.rodrigues@email.pt' },
    { nome: 'Rui Mendes', telefone: '934890123', email: 'rui.mendes@email.pt' },
    { nome: 'Sofia Teixeira', telefone: '967123456', email: 'sofia.teixeira@email.pt' },
    { nome: 'Carlos Antunes', telefone: '921987654', email: 'carlos.antunes@email.pt' }
  ];

  // Fechar dropdowns de filtros ao clicar fora
  useEffect(() => {
    const handleOutsideClick = () => {
      setShowImovelTiposDropdown(false);
      setShowImovelTipologiasDropdown(false);
      setShowCompradorTiposDropdown(false);
      setShowCompradorTipologiasDropdown(false);
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, []);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4000);
  };

  // Fetch
  const fetchData = async () => {
    setDbError(null);
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

      const { data: mData, error: mErr } = await supabase
        .from('view_matches_compradores_imoveis')
        .select('*')
        .order('match_score', { ascending: false });

      if (mErr) throw mErr;
      setAllMatches(mData || []);

      const { data: actData, error: actErr } = await supabase
        .from('atividades_agenda')
        .select('*')
        .order('data_hora', { ascending: true });

      if (actErr) throw actErr;
      setAtividades(actData || []);

    } catch (err: any) {
      showToast('Erro ao obter dados: ' + err.message, 'error');
      setDbError(err.message || String(err));
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Autocomplete
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

  // Submissões
  const handleAddImovel = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors: string[] = [];
    if (!vNome.trim()) errors.push('nome');
    if (!vContacto.trim()) errors.push('contacto');
    if (!vPrecoObj) errors.push('precoObj');
    if (!vPrecoMin) errors.push('precoMin');
    if (!vArea) errors.push('area');
    if (!vRua.trim()) errors.push('rua');
    if (!vCidade.trim()) errors.push('cidade');
    if (!vFreguesia.trim()) errors.push('freguesia');

    if (errors.length > 0) {
      setImovelFormErrors(errors);
      showToast('Preenche os campos obrigatórios assinalados a vermelho.', 'error');
      return;
    }

    setImovelFormErrors([]);

    const pObj = parseFloat(vPrecoObj);
    const pMin = parseFloat(vPrecoMin);

    if (pMin > pObj) {
      showToast('O preço mínimo não pode exceder o preço objetivo.', 'error');
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
      estado_imovel: vEstadoImovel,
      origem_contacto: vOrigemContacto,
      updated_at: new Date().toISOString()
    };

    try {
      if (editingImovelId) {
        const { error } = await supabase
          .from('vendedores_imoveis')
          .update(imovelPayload)
          .eq('id', editingImovelId);

        if (error) throw error;
        showToast('Imóvel atualizado!');
        setEditingImovelId(null);
      } else {
        const { error } = await supabase
          .from('vendedores_imoveis')
          .insert([imovelPayload]);

        if (error) throw error;
        showToast('Imóvel adicionado!');
      }
      
      // Reset
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
      setVEstadoImovel('Ativo');
      setVOrigemContacto('Outro');
      setImovelFormErrors([]);
      setIsImovelModalOpen(false);
      
      fetchData();
    } catch (err: any) {
      showToast('Erro ao gravar imóvel: ' + err.message, 'error');
    }
  };

  const handleAddComprador = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors: string[] = [];
    if (!cNome.trim()) errors.push('nome');
    if (!cContacto.trim()) errors.push('contacto');
    if (!cOrcamento) errors.push('orcamento');
    if (cTipologias.length === 0) errors.push('tipologias');
    if (cTiposImovel.length === 0) errors.push('tiposImovel');
    if (cZonas.length === 0) errors.push('zonas');

    if (errors.length > 0) {
      setCompradorFormErrors(errors);
      showToast('Preenche os campos obrigatórios assinalados a vermelho.', 'error');
      return;
    }

    setCompradorFormErrors([]);

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
      estado_comprador: cEstadoComprador,
      origem_contacto: cOrigemContacto,
      updated_at: new Date().toISOString()
    };

    try {
      if (editingCompradorId) {
        const { error } = await supabase
          .from('compradores_leads')
          .update(leadPayload)
          .eq('id', editingCompradorId);

        if (error) throw error;
        showToast('Lead de comprador atualizada!');
        setEditingCompradorId(null);
      } else {
        const { error } = await supabase
          .from('compradores_leads')
          .insert([leadPayload]);

        if (error) throw error;
        showToast('Lead de comprador registada!');
      }

      // Reset
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
      setCEstadoComprador('Ativo');
      setCOrigemContacto('Outro');
      setCompradorFormErrors([]);
      setIsCompradorModalOpen(false);

      fetchData();
    } catch (err: any) {
      showToast('Erro ao registar comprador: ' + err.message, 'error');
    }
  };

  const handleAddAtividade = async (e: React.FormEvent) => {
    e.preventDefault();

    if (actTipos.length === 0 || !actDataHora) {
      showToast('Selecione pelo menos uma atividade e a hora.', 'error');
      return;
    }

    const payload = {
      tipos_atividade: actTipos,
      data_hora: new Date(actDataHora).toISOString(),
      comprador_id: associarCliente && actCompradorId ? actCompradorId : null,
      imovel_id: associarImovel && actImovelId ? actImovelId : null,
      notas: actNotas || null
    };

    try {
      if (editingAtividadeId) {
        const { error } = await supabase
          .from('atividades_agenda')
          .update(payload)
          .eq('id', editingAtividadeId);
        if (error) throw error;
        showToast('Atividade atualizada!');
        setEditingAtividadeId(null);
      } else {
        const { error } = await supabase.from('atividades_agenda').insert([payload]);
        if (error) throw error;
        showToast('Atividade agendada!');
      }
      
      setActTipos([]);
      setActDataHora('');
      setActCompradorId('');
      setActImovelId('');
      setActNotas('');
      setAssociarCliente(false);
      setAssociarImovel(false);
      setEditingAtividadeId(null);
      setIsAtividadeModalOpen(false);

      fetchData();
    } catch (err: any) {
      showToast('Erro ao agendar: ' + err.message, 'error');
    }
  };

  const handleDeleteAtividade = async (id: string) => {
    if (!window.confirm('Eliminar atividade da agenda?')) return;
    try {
      const { error } = await supabase.from('atividades_agenda').delete().eq('id', id);
      if (error) throw error;
      showToast('Atividade removida.');
      fetchData();
    } catch (err: any) {
      showToast('Erro ao remover: ' + err.message, 'error');
    }
  };

  // --- LÓGICA DE IMPORTAÇÃO DE CONTACTOS ---
  const handleImportContacto = async () => {
    const isApiSupported = 'contacts' in navigator && 'ContactsManager' in window;
    
    if (isApiSupported) {
      try {
        // Verificar as propriedades suportadas dinamicamente pelo dispositivo móvel
        // @ts-ignore
        const supportedProperties = await navigator.contacts.getProperties();
        const props = [];
        if (supportedProperties.includes('name')) props.push('name');
        if (supportedProperties.includes('tel')) props.push('tel');
        
        // Se as principais não estiverem explícitas nas suportadas, garantir pedido mínimo
        if (props.length === 0) {
          props.push('name');
        }

        const opts = { multiple: false };
        // @ts-ignore
        const contacts = await navigator.contacts.select(props, opts);
        
        if (contacts && contacts.length > 0) {
          const contact = contacts[0];
          const nome = contact.name && contact.name[0] ? contact.name[0] : '';
          const telefone = contact.tel && contact.tel[0] ? contact.tel[0] : '';
          // email opcional
          const email = contact.email && contact.email[0] ? contact.email[0] : '';
          
          setImportedContact({ nome, telefone, email });
          setAssociationMode('decision');
          setIsImportDecisionModalOpen(true);
        }
      } catch (err: any) {
        const errMsg = err.message || '';
        const isCancellation = 
          errMsg.toLowerCase().includes('cancel') || 
          err.name === 'AbortError' || 
          err.name === 'CancellationError';

        // Se o utilizador cancelou a seleção voluntariamente, ignoramos em silêncio
        if (isCancellation) {
          console.log('Operação cancelada pelo utilizador.');
          return;
        }

        // Em caso de erro de permissão ou incompatibilidade profunda no telemóvel,
        // reencaminhamos o utilizador para a lista simulada
        console.warn('Erro ao usar API de Contactos nativa, a abrir simulação: ', err);
        setIsSimulatedContactsModalOpen(true);
      }
    } else {
      setIsSimulatedContactsModalOpen(true);
    }
  };

  const handleSelectSimulatedContact = (contact: { nome: string; telefone: string; email: string }) => {
    setImportedContact(contact);
    setIsSimulatedContactsModalOpen(false);
    setAssociationMode('decision');
    setIsImportDecisionModalOpen(true);
  };

  const handleAssociateToImovel = async (imovelId: string) => {
    if (!importedContact) return;
    try {
      const { error } = await supabase
        .from('vendedores_imoveis')
        .update({
          proprietario_nome: importedContact.nome,
          proprietario_contacto: importedContact.telefone,
          updated_at: new Date().toISOString()
        })
        .eq('id', imovelId);

      if (error) throw error;
      showToast('Proprietário do imóvel atualizado!');
      setIsImportDecisionModalOpen(false);
      setImportedContact(null);
      fetchData();
    } catch (err: any) {
      showToast('Erro ao associar: ' + err.message, 'error');
    }
  };

  const handleAssociateToComprador = async (compradorId: string) => {
    if (!importedContact) return;
    try {
      const { error } = await supabase
        .from('compradores_leads')
        .update({
          comprador_nome: importedContact.nome,
          comprador_contacto: importedContact.telefone,
          updated_at: new Date().toISOString()
        })
        .eq('id', compradorId);

      if (error) throw error;
      showToast('Contacto do comprador atualizado!');
      setIsImportDecisionModalOpen(false);
      setImportedContact(null);
      fetchData();
    } catch (err: any) {
      showToast('Erro ao associar: ' + err.message, 'error');
    }
  };

  // Edição
  const startEditImovel = (imovel: Imovel) => {
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
    setVEstadoImovel(imovel.estado_imovel || 'Ativo');
    setVOrigemContacto(imovel.origem_contacto || 'Outro');

    setIsImovelModalOpen(true);
  };

  const startEditComprador = (comprador: Comprador) => {
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
    setCEstadoComprador(comprador.estado_comprador || 'Ativo');
    setCOrigemContacto(comprador.origem_contacto || 'Outro');
    
    if (comprador.data_contacto) {
      const d = parseSafeDate(comprador.data_contacto);
      if (d) {
        const tzOffset = d.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(d.getTime() - tzOffset)).toISOString().slice(0, 16);
        setCDataContacto(localISOTime);
      } else {
        setCDataContacto('');
      }
    } else {
      setCDataContacto('');
    }

    setIsCompradorModalOpen(true);
  };

  const startEditAtividade = (id: string) => {
    const act = atividades.find(a => a.id === id);
    if (!act) return;
    setEditingAtividadeId(act.id);
    setActTipos(act.tipos_atividade);
    const date = new Date(act.data_hora);
    const offset = date.getTimezoneOffset() * 60000;
    const dateLocal = new Date(date.getTime() - offset).toISOString().slice(0, 16);
    setActDataHora(dateLocal);
    setActCompradorId(act.comprador_id || '');
    setActImovelId(act.imovel_id || '');
    setActNotas(act.notas || '');
    setAssociarCliente(!!act.comprador_id);
    setAssociarImovel(!!act.imovel_id);
    setIsAtividadeModalOpen(true);
  };

  const handleUpdateInteracao = async (compradorId: string, imovelId: string, estado: string, notas: string) => {
    try {
      const { error } = await supabase
        .from('matches_interacoes')
        .upsert(
          {
            comprador_id: compradorId,
            imovel_id: imovelId,
            estado: estado,
            notes_match: notas,
            notas: notas,
            updated_at: new Date().toISOString()
          },
          { onConflict: 'comprador_id,imovel_id' }
        );

      if (error) throw error;
      showToast('CRM Estado de Venda Atualizado!');
      fetchData();
    } catch (err: any) {
      showToast('Erro ao atualizar estado: ' + err.message, 'error');
    }
  };

  const handleToggleContactoRapido = async (compradorId: string, foiContactado: boolean) => {
    try {
      const dataStr = foiContactado ? new Date().toISOString() : null;
      const { error } = await supabase
        .from('compradores_leads')
        .update({
          foi_contactado: foiContactado,
          data_contacto: dataStr,
          updated_at: new Date().toISOString()
        })
        .eq('id', compradorId);

      if (error) throw error;
      showToast(foiContactado ? 'Marcado como contactado!' : 'Contacto limpo.');
      fetchData();
    } catch (err: any) {
      showToast('Erro: ' + err.message, 'error');
    }
  };

  const handleDeleteImovel = async (id: string) => {
    if (!window.confirm('Eliminar este imóvel permanentemente?')) return;
    try {
      const { error } = await supabase.from('vendedores_imoveis').delete().eq('id', id);
      if (error) throw error;
      showToast('Imóvel eliminado.');
      fetchData();
    } catch (err: any) {
      showToast('Erro ao eliminar: ' + err.message, 'error');
    }
  };

  const handleDeleteComprador = async (id: string) => {
    if (!window.confirm('Eliminar esta lead de comprador permanentemente?')) return;
    try {
      const { error } = await supabase.from('compradores_leads').delete().eq('id', id);
      if (error) throw error;
      showToast('Comprador eliminado.');
      fetchData();
    } catch (err: any) {
      showToast('Erro ao eliminar: ' + err.message, 'error');
    }
  };

  const handleAddZona = () => {
    const concelho = cZonaInput.trim();
    if (concelho && !cZonas.includes(concelho)) {
      const novasZonas = [...cZonas, concelho];
      setCZonas(novasZonas);
      setCZonaInput('');
      if (compradorFormErrors.includes('zonas') && novasZonas.length > 0) {
        setCompradorFormErrors(compradorFormErrors.filter(err => err !== 'zonas'));
      }
    }
  };

  const handleRemoveZona = (zonaToRemove: string) => {
    setCZonas(cZonas.filter(z => z !== zonaToRemove));
  };

  const handleToggleTipologia = (tip: string) => {
    let novasTipologias = [];
    if (cTipologias.includes(tip)) {
      if (cTipologias.length > 1) {
        novasTipologias = cTipologias.filter(t => t !== tip);
        setCTipologias(novasTipologias);
      } else {
        showToast('Selecione pelo menos uma tipologia.', 'error');
        return;
      }
    } else {
      novasTipologias = [...cTipologias, tip];
      setCTipologias(novasTipologias);
    }
    if (compradorFormErrors.includes('tipologias') && novasTipologias.length > 0) {
      setCompradorFormErrors(compradorFormErrors.filter(err => err !== 'tipologias'));
    }
  };

  const handleToggleTipoImovel = (tipo: string) => {
    let novosTipos = [];
    if (cTiposImovel.includes(tipo)) {
      if (cTiposImovel.length > 1) {
        novosTipos = cTiposImovel.filter(t => t !== tipo);
        setCTiposImovel(novosTipos);
      } else {
        showToast('Selecione pelo menos um tipo de imóvel.', 'error');
        return;
      }
    } else {
      novosTipos = [...cTiposImovel, tipo];
      setCTiposImovel(novosTipos);
    }
    if (compradorFormErrors.includes('tiposImovel') && novosTipos.length > 0) {
      setCompradorFormErrors(compradorFormErrors.filter(err => err !== 'tiposImovel'));
    }
  };

  const handleToggleActTipo = (tipo: string) => {
    if (actTipos.includes(tipo)) {
      setActTipos(actTipos.filter(t => t !== tipo));
    } else {
      setActTipos([...actTipos, tipo]);
    }
  };

  // --- FILTROS DE IMÓVEIS (PROPRIETÁRIOS) ---
  const getFilteredImoveis = () => {
    let result = [...vendedores];

    if (fImovelPesquisa.trim()) {
      const q = fImovelPesquisa.toLowerCase();
      result = result.filter(v => 
        v.proprietario_nome.toLowerCase().includes(q) ||
        v.proprietario_contacto.includes(q) ||
        v.rua.toLowerCase().includes(q) ||
        v.cidade.toLowerCase().includes(q) ||
        v.freguesia.toLowerCase().includes(q)
      );
    }

    if (fImovelTipos.length > 0) {
      result = result.filter(v => fImovelTipos.includes(v.tipo_imovel));
    }

    if (fImovelTipologias.length > 0) {
      result = result.filter(v => fImovelTipologias.includes(v.tipologia));
    }

    if (fImovelPrecoMax < 1000000) {
      result = result.filter(v => v.preco_objetivo <= fImovelPrecoMax);
    }

    if (fImovelEstado !== 'Todos') {
      result = result.filter(v => v.estado_imovel === fImovelEstado);
    }

    if (fImovelOrigem !== 'Todos') {
      result = result.filter(v => v.origem_contacto === fImovelOrigem);
    }

    result.sort((a, b) => {
      if (sortImoveisBy === 'alfabetica-asc') {
        return a.proprietario_nome.localeCompare(b.proprietario_nome);
      }
      if (sortImoveisBy === 'alfabetica-desc') {
        return b.proprietario_nome.localeCompare(a.proprietario_nome);
      }
      if (sortImoveisBy === 'preco-asc') {
        return a.preco_objetivo - b.preco_objetivo;
      }
      if (sortImoveisBy === 'preco-desc') {
        return b.preco_objetivo - a.preco_objetivo;
      }
      if (sortImoveisBy === 'area-desc') {
        return b.area_m2 - a.area_m2;
      }
      if (sortImoveisBy === 'data-asc') {
        const da = parseSafeDate(a.created_at)?.getTime() || 0;
        const db = parseSafeDate(b.created_at)?.getTime() || 0;
        return da - db;
      }
      const da = parseSafeDate(a.created_at)?.getTime() || 0;
      const db = parseSafeDate(b.created_at)?.getTime() || 0;
      return db - da;
    });

    return result;
  };

  // --- FILTROS DE COMPRADORES ---
  const getFilteredCompradores = () => {
    let result = [...compradores];

    if (fCompradorPesquisa.trim()) {
      const q = fCompradorPesquisa.toLowerCase();
      result = result.filter(c => 
        c.comprador_nome.toLowerCase().includes(q) ||
        c.comprador_contacto.includes(q) ||
        c.observacoes?.toLowerCase().includes(q)
      );
    }

    if (fCompradorTipos.length > 0) {
      result = result.filter(c => 
        c.tipos_imovel_pretendidos.some(t => fCompradorTipos.includes(t))
      );
    }

    if (fCompradorTipologias.length > 0) {
      result = result.filter(c => 
        c.tipologias_pretendidas.some(t => fCompradorTipologias.includes(t))
      );
    }

    if (fCompradorOrcamentoMax < 1000000) {
      result = result.filter(c => c.orcamento_maximo <= fCompradorOrcamentoMax);
    }

    if (fCompradorEstado !== 'Todos') {
      result = result.filter(c => c.estado_comprador === fCompradorEstado);
    }

    if (fCompradorOrigem !== 'Todos') {
      result = result.filter(c => c.origem_contacto === fCompradorOrigem);
    }

    result.sort((a, b) => {
      if (sortCompradoresBy === 'alfabetica-asc') {
        return a.comprador_nome.localeCompare(b.comprador_nome);
      }
      if (sortCompradoresBy === 'alfabetica-desc') {
        return b.comprador_nome.localeCompare(a.comprador_nome);
      }
      if (sortCompradoresBy === 'orcamento-asc') {
        return a.orcamento_maximo - b.orcamento_maximo;
      }
      if (sortCompradoresBy === 'orcamento-desc') {
        return b.orcamento_maximo - a.orcamento_maximo;
      }
      if (sortCompradoresBy === 'data-asc') {
        const da = parseSafeDate(a.created_at)?.getTime() || 0;
        const db = parseSafeDate(b.created_at)?.getTime() || 0;
        return da - db;
      }
      const da = parseSafeDate(a.created_at)?.getTime() || 0;
      const db = parseSafeDate(b.created_at)?.getTime() || 0;
      return db - da;
    });

    return result;
  };

  // --- EVENTOS DO CALENDÁRIO ---
  const getCalendarEvents = (): CalendarEvent[] => {
    const events: CalendarEvent[] = [];

    vendedores.forEach(v => {
      const d = getLocalDateFromISO(v.created_at);
      events.push({
        date: d,
        type: 'imovel',
        title: `Registo de Imóvel`,
        label: `${v.tipo_imovel} (${v.tipologia}) - ${v.proprietario_nome}`,
        desc: `Preço: ${formatCurrency(v.preco_objetivo)} em ${v.freguesia}, ${v.cidade}.`,
        originalId: v.id,
        imovelId: v.id
      });

      const u = getLocalDateFromISO(v.updated_at);
      if (u !== d) {
        events.push({
          date: u,
          type: 'imovel_update',
          title: `Atualização de Imóvel`,
          label: `${v.tipo_imovel} (${v.tipologia}) - ${v.proprietario_nome}`,
          desc: `Alterado em ${v.freguesia}.`,
          originalId: v.id,
          imovelId: v.id
        });
      }
    });

    compradores.forEach(c => {
      const d = getLocalDateFromISO(c.created_at);
      events.push({
        date: d,
        type: 'comprador',
        title: `Novo Comprador (Lead)`,
        label: `${c.comprador_nome} - Contacto: ${c.comprador_contacto}`,
        desc: `Orçamento Máx: ${formatCurrency(c.orcamento_maximo)}.`,
        originalId: c.id,
        compradorId: c.id
      });

      const u = getLocalDateFromISO(c.updated_at);
      if (u !== d) {
        events.push({
          date: u,
          type: 'comprador_update',
          title: `Atualização de Comprador`,
          label: `${c.comprador_nome}`,
          desc: `Dados de requisitos reajustados.`,
          originalId: c.id,
          compradorId: c.id
        });
      }

      if (c.foi_contactado && c.data_contacto) {
        const dc = getLocalDateFromISO(c.data_contacto);
        events.push({
          date: dc,
          type: 'contacto',
          title: `Contacto com Cliente`,
          label: `${c.comprador_nome}`,
          desc: `Contacto efetuado com sucesso.`,
          originalId: c.id,
          compradorId: c.id
        });
      }
    });

    atividades.forEach(act => {
      const d = getLocalDateFromISO(act.data_hora);
      
      const comp = compradores.find(c => c.id === act.comprador_id);
      const imov = vendedores.find(v => v.id === act.imovel_id);
      
      const labels = [];
      if (comp) labels.push(`Cliente: ${comp.comprador_nome}`);
      if (imov) labels.push(`Imóvel: ${imov.tipo_imovel} (${imov.tipologia})`);

      events.push({
        date: d,
        type: 'agenda',
        title: act.tipos_atividade.join(' + '),
        label: labels.length > 0 ? labels.join(' | ') : 'Sem entidades associadas',
        desc: act.notas || undefined,
        originalId: act.id,
        compradorId: act.comprador_id,
        imovelId: act.imovel_id
      });
    });

    return events;
  };

  const calendarEvents = getCalendarEvents();
  const selectedDayStr = getLocalDateString(selectedDay);
  const selectedDayEvents = calendarEvents.filter(e => e.date === selectedDayStr);

  const prevMonth = () => {
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1));
  };

  const renderCalendarDays = () => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();

    const firstDayIndex = new Date(year, month, 1).getDay();
    const startDayOffset = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

    const totalDays = new Date(year, month + 1, 0).getDate();
    const totalDaysPrev = new Date(year, month, 0).getDate();

    const cells: React.ReactNode[] = [];

    for (let i = startDayOffset - 1; i >= 0; i--) {
      const dayNum = totalDaysPrev - i;
      cells.push(
        <div key={`prev-${dayNum}`} className="calendar-day-cell outside">
          <span className="calendar-day-num">{dayNum}</span>
        </div>
      );
    }

    for (let i = 1; i <= totalDays; i++) {
      const cellDate = new Date(year, month, i);
      const cellDateStr = getLocalDateString(cellDate);

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
              <div 
                key={idx} 
                className={`calendar-event-dot dot-${evt.type === 'agenda' ? 'crm' : evt.type}`} 
                title={evt.title} 
              />
            ))}
          </div>
        </div>
      );
    }

    return cells;
  };

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const getColMatches = (estado: string) => {
    return allMatches.filter(m => m.estado_match === estado);
  };

  const totalVolumeNegocios = allMatches
    .filter(m => m.estado_match === 'Negócio Fechado')
    .reduce((acc, m) => acc + Number(m.preco_objetivo), 0);

  return (
    <div className="app-container">
      {/* Toasts */}
      <div className="toast-container">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            {toast.type === 'success' ? <Check size={18} /> : <X size={18} />}
            <span>{toast.message}</span>
          </div>
        ))}
      </div>

      {/* BARRA LATERAL ESQUERDA */}
      <aside className="app-sidebar">
        <div className="sidebar-profile">
          <div className="profile-avatar">I</div>
          <span className="profile-welcome">Bem-vindo!</span>
          <span className="profile-name">Agente Imo</span>
        </div>

        <nav className="sidebar-menu">
          <button 
            className={`menu-item ${activeMenu === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveMenu('dashboard')}
          >
            <LayoutDashboard size={18} />
            <span>Painel Geral</span>
          </button>
          
          <button 
            className={`menu-item ${activeMenu === 'kanban' ? 'active' : ''}`}
            onClick={() => setActiveMenu('kanban')}
          >
            <FolderKanban size={18} />
            <span>Quadro Kanban</span>
          </button>

          <button 
            className={`menu-item ${activeMenu === 'imoveis' ? 'active' : ''}`}
            onClick={() => setActiveMenu('imoveis')}
          >
            <Home size={18} />
            <span>Imóveis</span>
          </button>

          <button 
            className={`menu-item ${activeMenu === 'compradores' ? 'active' : ''}`}
            onClick={() => setActiveMenu('compradores')}
          >
            <Users size={18} />
            <span>Compradores</span>
          </button>

          <button 
            className={`menu-item ${activeMenu === 'calendario' ? 'active' : ''}`}
            onClick={() => setActiveMenu('calendario')}
          >
            <Calendar size={18} />
            <span>Calendário</span>
          </button>

          <button 
            className={`menu-item ${activeMenu === 'definicoes' ? 'active' : ''}`}
            onClick={() => setActiveMenu('definicoes')}
          >
            <Settings size={18} />
            <span>Definições</span>
          </button>
        </nav>
      </aside>

      {/* ÁREA DE CONTEÚDO PRINCIPAL */}
      <main className="main-content">
        
        {/* Topbar */}
        <header className="app-topbar">
          <div className="topbar-title">
            {activeMenu === 'dashboard' && 'Painel Geral'}
            {activeMenu === 'kanban' && 'Gestão de Leads & Negócios'}
            {activeMenu === 'imoveis' && 'Base de Dados de Imóveis'}
            {activeMenu === 'compradores' && 'Base de Dados de Compradores'}
            {activeMenu === 'calendario' && 'Calendário de Atividades'}
            {activeMenu === 'definicoes' && 'Definições do Sistema'}
          </div>

          <div className="topbar-actions">
            <button 
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
                setVEstadoImovel('Ativo');
                setVOrigemContacto('Outro');
                setIsImovelModalOpen(true);
              }}
            >
              <Plus size={16} />
              <span>Novo Imóvel</span>
            </button>
            <button 
              className="btn btn-primary"
              onClick={() => {
                setEditingCompradorId(null);
                setCNome('');
                setCContacto('');
                setCOrcamento('');
                setCTipologias(['T2']);
                setCTiposImovel(['Apartamento']);
                setCZonas([]);
                setCObs('');
                setCFoiContactado(false);
                setCDataContacto('');
                setCEstadoComprador('Ativo');
                setCOrigemContacto('Outro');
                setIsCompradorModalOpen(true);
              }}
            >
              <PlusCircle size={16} />
              <span>Nova Lead</span>
            </button>
          </div>
        </header>

        {/* Painel Central com Scroll */}
        <section className="view-panel">
          {dbError && (
            <div style={{
              margin: '0 0 1.5rem 0',
              padding: '1rem',
              backgroundColor: 'rgba(225, 29, 72, 0.1)',
              border: '1px solid var(--urgency-alta)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--urgency-alta)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              fontSize: '0.9rem',
              fontWeight: 600
            }}>
              <AlertTriangle size={18} />
              <span>Erro de Ligação à Base de Dados: {dbError}</span>
            </div>
          )}
          
          {/* TAB 1: DASHBOARD */}
          {activeMenu === 'dashboard' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
                
                <div className="kanban-card" style={{ padding: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Imóveis Registados</span>
                    <Building size={20} style={{ color: 'var(--accent-gold)' }} />
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 700, marginTop: '0.5rem' }}>{vendedores.length}</div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Vendedores sob gestão</span>
                </div>

                <div className="kanban-card" style={{ padding: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Clientes Ativos</span>
                    <Users size={20} style={{ color: 'var(--accent-blue)' }} />
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 700, marginTop: '0.5rem' }}>{compradores.length}</div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Leads em prospeção</span>
                </div>

                <div className="kanban-card" style={{ padding: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Negócios Fechados</span>
                    <Heart size={20} style={{ color: 'var(--urgency-baixa)' }} />
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 700, marginTop: '0.5rem' }}>
                    {allMatches.filter(m => m.estado_match === 'Negócio Fechado').length}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No pipeline de vendas</span>
                </div>

                <div className="kanban-card" style={{ padding: '1.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Volume de Vendas</span>
                    <TrendingUp size={20} style={{ color: 'var(--accent-purple)' }} />
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '0.85rem', color: 'var(--urgency-baixa)' }}>
                    {formatCurrency(totalVolumeNegocios)}
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Faturação sob mediação</span>
                </div>

              </div>

              <div className="data-table-card" style={{ marginTop: 0 }}>
                <div className="table-header-bar">
                  <h3 className="table-header-title">Últimos Matches Qualificados</h3>
                </div>
                {/* Visualização em Desktop (Tabela) */}
                <div className="desktop-only-view" style={{ overflowX: 'auto' }}>
                  <table className="app-table">
                    <thead>
                      <tr>
                        <th>Comprador</th>
                        <th>Imóvel Compatível</th>
                        <th>Preço Anunciado</th>
                        <th>Score</th>
                        <th>Estado CRM</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allMatches.slice(0, 5).map((match, idx) => (
                        <tr key={idx} onClick={() => setSelectedMatchDetail(match)} style={{ cursor: 'pointer' }} title="Clique para ver detalhes do match">
                          <td style={{ fontWeight: 700 }}>{match.comprador_nome}</td>
                          <td>{match.tipologia} em {match.freguesia}</td>
                          <td style={{ color: 'var(--accent-gold)', fontWeight: 700 }}>{formatCurrency(match.preco_objetivo)}</td>
                          <td style={{ fontWeight: 700, color: 'var(--accent-blue)' }}>{match.match_score}%</td>
                          <td>
                            <span 
                              className="badge"
                              style={{
                                border: '1px solid',
                                backgroundColor: match.estado_match === 'Negócio Fechado' ? 'var(--urgency-baixa-bg)' : match.estado_match === 'Visita Agendada' ? 'var(--urgency-media-bg)' : 'var(--accent-blue-bg)',
                                color: match.estado_match === 'Negócio Fechado' ? 'var(--urgency-baixa)' : match.estado_match === 'Visita Agendada' ? 'var(--urgency-media)' : 'var(--accent-blue)',
                              }}
                            >
                              {match.estado_match}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {allMatches.length === 0 && (
                        <tr>
                          <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                            Sem interações de matches de momento.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Visualização em Mobile (Cartões Compactos) */}
                <div className="mobile-only-view">
                  <div className="mobile-cards-list" style={{ padding: '0' }}>
                    {allMatches.slice(0, 5).map((match, idx) => (
                      <div key={idx} className="mobile-item-card match-card" onClick={() => setSelectedMatchDetail(match)} style={{ cursor: 'pointer' }} title="Clique para ver detalhes do match">
                        <div className="mobile-card-row header">
                          <span className="mobile-card-name">{match.comprador_nome}</span>
                          <span 
                            className="badge"
                            style={{
                              border: '1px solid',
                              backgroundColor: match.estado_match === 'Negócio Fechado' ? 'var(--urgency-baixa-bg)' : match.estado_match === 'Visita Agendada' ? 'var(--urgency-media-bg)' : 'var(--accent-blue-bg)',
                              color: match.estado_match === 'Negócio Fechado' ? 'var(--urgency-baixa)' : match.estado_match === 'Visita Agendada' ? 'var(--urgency-media)' : 'var(--accent-blue)',
                            }}
                          >
                            {match.estado_match}
                          </span>
                        </div>
                        <div className="mobile-card-body">
                          <div className="mobile-card-detail">
                            <span className="detail-label">Imóvel:</span>
                            <span className="detail-value">{match.tipologia} em {match.freguesia}</span>
                          </div>
                          <div className="mobile-card-detail">
                            <span className="detail-label">Preço Anunciado:</span>
                            <span className="detail-value price">{formatCurrency(match.preco_objetivo)}</span>
                          </div>
                          <div className="mobile-card-detail">
                            <span className="detail-label">Compatibilidade:</span>
                            <span className="detail-value score-blue">{match.match_score}%</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {allMatches.length === 0 && (
                      <div className="mobile-empty-state">
                        Sem interações de matches de momento.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CRM KANBAN */}
          {activeMenu === 'kanban' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', width: '100%' }}>
              {allMatches.length === 0 && (
                <div style={{
                  padding: '1.25rem',
                  backgroundColor: 'rgba(59, 130, 246, 0.07)',
                  border: '1px dashed rgba(59, 130, 246, 0.3)',
                  borderRadius: 'var(--radius-lg)',
                  color: 'var(--text-primary)',
                  fontSize: '0.85rem',
                  lineHeight: '1.5',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  boxShadow: 'var(--shadow-premium)'
                }}>
                  <AlertTriangle size={20} style={{ color: 'var(--accent-blue)', flexShrink: 0, marginTop: '2px' }} />
                  <div>
                    <strong>💡 Info: Quadro Kanban sem cruzamentos (Matches) ativos.</strong><br />
                    O quadro CRM exibe apenas os **Matches** (combinações de compra e venda compatíveis em termos de preço, zona e tipologia). 
                    As suas leads de compradores e propriedades registadas **não foram eliminadas** e continuam totalmente seguras. 
                    Pode visualizá-las e geri-las clicando em <strong>Imóveis</strong> e <strong>Compradores</strong> no menu esquerdo. 
                    Se registar um imóvel com preço e tipologia correspondentes à procura de um comprador (ou vice-versa), a oportunidade de negócio aparecerá aqui automaticamente!
                  </div>
                </div>
              )}
              
              <div className="kanban-board">
                
                <div className="kanban-column">
                  <div className="column-header">
                    <div className="column-title-box">
                      <span className="column-dot azul"></span>
                      <span className="column-title">Novas Leads</span>
                    </div>
                    <span className="column-count">{getColMatches('Pendente').length}</span>
                  </div>
                  {getColMatches('Pendente').map((match, idx) => (
                    <KanbanCard 
                      key={idx} 
                      match={match} 
                      compradores={compradores}
                      vendedores={vendedores}
                      onStatusChange={handleUpdateInteracao}
                      onToggleContacto={handleToggleContactoRapido}
                      onEditComprador={startEditComprador}
                      onSelectMatchDetail={setSelectedMatchDetail}
                    />
                  ))}
                </div>

                <div className="kanban-column">
                  <div className="column-header">
                    <div className="column-title-box">
                      <span className="column-dot amarelo"></span>
                      <span className="column-title">Em Contacto</span>
                    </div>
                    <span className="column-count">{getColMatches('Visita Agendada').length}</span>
                  </div>
                  {getColMatches('Visita Agendada').map((match, idx) => (
                    <KanbanCard 
                      key={idx} 
                      match={match} 
                      compradores={compradores}
                      vendedores={vendedores}
                      onStatusChange={handleUpdateInteracao}
                      onToggleContacto={handleToggleContactoRapido}
                      onEditComprador={startEditComprador}
                      onSelectMatchDetail={setSelectedMatchDetail}
                    />
                  ))}
                </div>

                <div className="kanban-column">
                  <div className="column-header">
                    <div className="column-title-box">
                      <span className="column-dot roxo"></span>
                      <span className="column-title">Proposta</span>
                    </div>
                    <span className="column-count">{getColMatches('Proposta Apresentada').length}</span>
                  </div>
                  {getColMatches('Proposta Apresentada').map((match, idx) => (
                    <KanbanCard 
                      key={idx} 
                      match={match} 
                      compradores={compradores}
                      vendedores={vendedores}
                      onStatusChange={handleUpdateInteracao}
                      onToggleContacto={handleToggleContactoRapido}
                      onEditComprador={startEditComprador}
                      onSelectMatchDetail={setSelectedMatchDetail}
                    />
                  ))}
                </div>

                <div className="kanban-column">
                  <div className="column-header">
                    <div className="column-title-box">
                      <span className="column-dot verde"></span>
                      <span className="column-title">Negócio Fechado</span>
                    </div>
                    <span className="column-count">{getColMatches('Negócio Fechado').length}</span>
                  </div>
                  {getColMatches('Negócio Fechado').map((match, idx) => (
                    <KanbanCard 
                      key={idx} 
                      match={match} 
                      compradores={compradores}
                      vendedores={vendedores}
                      onStatusChange={handleUpdateInteracao}
                      onToggleContacto={handleToggleContactoRapido}
                      onEditComprador={startEditComprador}
                      onSelectMatchDetail={setSelectedMatchDetail}
                    />
                  ))}
                </div>

              </div>
            </div>
          )}

          {/* TAB 3: IMÓVEIS (PROPRIETÁRIOS) */}
          {activeMenu === 'imoveis' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              <div className="filters-panel-card" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                  
                  <div style={{ flex: '1 1 240px' }}>
                    <input 
                      type="text" 
                      placeholder="Pesquisar proprietário, contacto, morada ou freguesia..."
                      value={fImovelPesquisa}
                      onChange={e => setFImovelPesquisa(e.target.value)}
                      style={{ width: '100%', padding: '0.5rem 0.85rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', outline: 'none' }}
                    />
                  </div>

                  <div className="filter-dropdown-container" onClick={e => e.stopPropagation()} style={{ position: 'relative' }}>
                    <button 
                      type="button" 
                      className="btn-filter-dropdown"
                      onClick={() => {
                        setShowImovelTiposDropdown(!showImovelTiposDropdown);
                        setShowImovelTipologiasDropdown(false);
                      }}
                    >
                      Tipos ({fImovelTipos.length || 'Todos'})
                    </button>
                    {showImovelTiposDropdown && (
                      <div className="filter-dropdown-menu">
                        {tiposImovelDisponiveis.map(t => (
                          <label key={t} className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', cursor: 'pointer' }}>
                            <input 
                              type="checkbox" 
                              checked={fImovelTipos.includes(t)}
                              onChange={() => {
                                if (fImovelTipos.includes(t)) {
                                  setFImovelTipos(fImovelTipos.filter(x => x !== t));
                                } else {
                                  setFImovelTipos([...fImovelTipos, t]);
                                }
                              }}
                            />
                            {t}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="filter-dropdown-container" onClick={e => e.stopPropagation()} style={{ position: 'relative' }}>
                    <button 
                      type="button" 
                      className="btn-filter-dropdown"
                      onClick={() => {
                        setShowImovelTipologiasDropdown(!showImovelTipologiasDropdown);
                        setShowImovelTiposDropdown(false);
                      }}
                    >
                      Tipologia ({fImovelTipologias.length || 'Todas'})
                    </button>
                    {showImovelTipologiasDropdown && (
                      <div className="filter-dropdown-menu">
                        {tipologiasDisponiveis.map(t => (
                          <label key={t} className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', cursor: 'pointer' }}>
                            <input 
                              type="checkbox" 
                              checked={fImovelTipologias.includes(t)}
                              onChange={() => {
                                if (fImovelTipologias.includes(t)) {
                                  setFImovelTipologias(fImovelTipologias.filter(x => x !== t));
                                } else {
                                  setFImovelTipologias([...fImovelTipologias, t]);
                                }
                              }}
                            />
                            {t}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  <select value={fImovelEstado} onChange={e => setFImovelEstado(e.target.value)} className="filter-select">
                    <option value="Todos">Todos os Estados</option>
                    <option value="Ativo">🟢 Ativo</option>
                    <option value="Reservado">🟡 Reservado</option>
                    <option value="Vendido">🔴 Vendido</option>
                    <option value="Inativo">⚫ Inativo</option>
                  </select>

                  <select value={fImovelOrigem} onChange={e => setFImovelOrigem(e.target.value)} className="filter-select">
                    <option value="Todos">Todas as Origens</option>
                    {origensDisponiveis.map(o => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>

                  <select value={sortImoveisBy} onChange={e => setSortImoveisBy(e.target.value)} className="filter-select" style={{ marginLeft: 'auto' }}>
                    <option value="data-desc">Mais Recentes</option>
                    <option value="data-asc">Mais Antigos</option>
                    <option value="alfabetica-asc">Nome Proprietário (A-Z)</option>
                    <option value="alfabetica-desc">Nome Proprietário (Z-A)</option>
                    <option value="preco-asc">Preço: Baixo para Alto</option>
                    <option value="preco-desc">Preço: Alto para Baixo</option>
                    <option value="area-desc">Área Útil (Maior)</option>
                  </select>

                </div>

                <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    <span>Preço Máximo</span>
                    <span style={{ color: 'var(--accent-gold)' }}>
                      {fImovelPrecoMax === 1000000 ? 'Sem limite' : formatCurrency(fImovelPrecoMax)}
                    </span>
                  </div>
                  <input 
                    type="range" 
                    min="50000" 
                    max="1000000" 
                    step="25000"
                    value={fImovelPrecoMax}
                    onChange={e => setFImovelPrecoMax(parseInt(e.target.value))}
                    style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--text-primary)' }}
                  />
                </div>
              </div>

              <div className="data-table-card" style={{ marginTop: 0 }}>
                <div className="table-header-bar">
                  <h3 className="table-header-title">Lista de Propriedades ({getFilteredImoveis().length})</h3>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    
                    <button className="btn btn-secondary" onClick={handleImportContacto}>
                      <Smartphone size={16} />
                      <span>Importar Telemóvel</span>
                    </button>

                    <button 
                      className="btn btn-primary"
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
                        setVEstadoImovel('Ativo');
                        setVOrigemContacto('Outro');
                        setIsImovelModalOpen(true);
                      }}
                    >
                      <Plus size={16} />
                      <span>Adicionar Imóvel</span>
                    </button>
                  </div>
                </div>
                {/* Visualização em Desktop (Tabela) */}
                <div className="desktop-only-view" style={{ overflowX: 'auto' }}>
                  <table className="app-table">
                    <thead>
                      <tr>
                        <th>Proprietário</th>
                        <th>Imóvel</th>
                        <th>Localização</th>
                        <th>Preço Anunciado</th>
                        <th>Área (m²)</th>
                        <th>Estado Ficha</th>
                        <th>Origem</th>
                        <th>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getFilteredImoveis().map(imovel => (
                        <tr key={imovel.id}>
                          <td style={{ fontWeight: 700 }}>
                            <div>{imovel.proprietario_nome}</div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{imovel.proprietario_contacto}</span>
                          </td>
                          <td>
                            <span style={{ fontWeight: 600 }}>{imovel.tipo_imovel}</span>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}> ({imovel.tipologia})</span>
                          </td>
                          <td>{imovel.freguesia}, {imovel.cidade}</td>
                          <td style={{ color: 'var(--accent-gold)', fontWeight: 700 }}>{formatCurrency(imovel.preco_objetivo)}</td>
                          <td>{imovel.area_m2} m²</td>
                          <td>
                            <span 
                              className="badge"
                              style={{
                                border: '1px solid',
                                backgroundColor: imovel.estado_imovel === 'Ativo' ? 'var(--urgency-baixa-bg)' : imovel.estado_imovel === 'Reservado' ? 'var(--urgency-media-bg)' : imovel.estado_imovel === 'Vendido' ? 'var(--urgency-alta-bg)' : 'var(--bg-input)',
                                color: imovel.estado_imovel === 'Ativo' ? 'var(--urgency-baixa)' : imovel.estado_imovel === 'Reservado' ? 'var(--urgency-media)' : imovel.estado_imovel === 'Vendido' ? 'var(--urgency-alta)' : 'var(--text-secondary)',
                              }}
                            >
                              {imovel.estado_imovel || 'Ativo'}
                            </span>
                          </td>
                          <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{imovel.origem_contacto || 'Outro'}</td>
                          <td>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button 
                                onClick={() => startEditImovel(imovel)}
                                className="btn btn-secondary" 
                                style={{ padding: '4px 8px' }}
                                title="Editar"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button 
                                onClick={() => handleDeleteImovel(imovel.id)}
                                className="btn btn-secondary" 
                                style={{ padding: '4px 8px', color: 'var(--urgency-alta)' }}
                                title="Eliminar"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {getFilteredImoveis().length === 0 && (
                        <tr>
                          <td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                            Nenhum imóvel corresponde aos filtros selecionados.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Visualização em Mobile (Cartões Compactos) */}
                <div className="mobile-only-view">
                  <div className="mobile-cards-list">
                    {getFilteredImoveis().map(imovel => (
                      <div key={imovel.id} className="mobile-item-card">
                        <div className="mobile-card-row header">
                          <span className="mobile-card-name">{imovel.proprietario_nome}</span>
                          <span 
                            className="badge"
                            style={{
                              border: '1px solid',
                              backgroundColor: imovel.estado_imovel === 'Ativo' ? 'var(--urgency-baixa-bg)' : imovel.estado_imovel === 'Reservado' ? 'var(--urgency-media-bg)' : imovel.estado_imovel === 'Vendido' ? 'var(--urgency-alta-bg)' : 'var(--bg-input)',
                              color: imovel.estado_imovel === 'Ativo' ? 'var(--urgency-baixa)' : imovel.estado_imovel === 'Reservado' ? 'var(--urgency-media)' : imovel.estado_imovel === 'Vendido' ? 'var(--urgency-alta)' : 'var(--text-secondary)',
                            }}
                          >
                            {imovel.estado_imovel || 'Ativo'}
                          </span>
                        </div>
                        
                        <div className="mobile-card-body">
                          <div className="mobile-card-detail">
                            <span className="detail-label">Contacto:</span>
                            <span className="detail-value">{imovel.proprietario_contacto}</span>
                          </div>
                          <div className="mobile-card-detail">
                            <span className="detail-label">Tipo:</span>
                            <span className="detail-value">{imovel.tipo_imovel} ({imovel.tipologia})</span>
                          </div>
                          <div className="mobile-card-detail">
                            <span className="detail-label">Localização:</span>
                            <span className="detail-value">{imovel.freguesia}, {imovel.cidade}</span>
                          </div>
                          <div className="mobile-card-detail">
                            <span className="detail-label">Preço Anunciado:</span>
                            <span className="detail-value price">{formatCurrency(imovel.preco_objetivo)}</span>
                          </div>
                          <div className="mobile-card-detail">
                            <span className="detail-label">Área:</span>
                            <span className="detail-value">{imovel.area_m2} m²</span>
                          </div>
                          <div className="mobile-card-detail">
                            <span className="detail-label">Origem:</span>
                            <span className="detail-value">{imovel.origem_contacto || 'Outro'}</span>
                          </div>
                        </div>

                        <div className="mobile-card-actions">
                          <button onClick={() => startEditImovel(imovel)} className="btn btn-secondary btn-sm">
                            <Edit2 size={12} />
                            <span>Editar</span>
                          </button>
                          <button onClick={() => handleDeleteImovel(imovel.id)} className="btn btn-secondary btn-sm delete-btn">
                            <Trash2 size={12} />
                            <span>Eliminar</span>
                          </button>
                        </div>
                      </div>
                    ))}
                    {getFilteredImoveis().length === 0 && (
                      <div className="mobile-empty-state">
                        Nenhum imóvel corresponde aos filtros selecionados.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: COMPRADORES */}
          {activeMenu === 'compradores' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              <div className="filters-panel-card" style={{ padding: '1.25rem' }}>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
                  
                  <div style={{ flex: '1 1 240px' }}>
                    <input 
                      type="text" 
                      placeholder="Pesquisar comprador, contacto ou observações..."
                      value={fCompradorPesquisa}
                      onChange={e => setFCompradorPesquisa(e.target.value)}
                      style={{ width: '100%', padding: '0.5rem 0.85rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', outline: 'none' }}
                    />
                  </div>

                  <div className="filter-dropdown-container" onClick={e => e.stopPropagation()} style={{ position: 'relative' }}>
                    <button 
                      type="button" 
                      className="btn-filter-dropdown"
                      onClick={() => {
                        setShowCompradorTiposDropdown(!showCompradorTiposDropdown);
                        setShowCompradorTipologiasDropdown(false);
                      }}
                    >
                      Pretende Tipos ({fCompradorTipos.length || 'Todos'})
                    </button>
                    {showCompradorTiposDropdown && (
                      <div className="filter-dropdown-menu">
                        {tiposImovelDisponiveis.map(t => (
                          <label key={t} className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', cursor: 'pointer' }}>
                            <input 
                              type="checkbox" 
                              checked={fCompradorTipos.includes(t)}
                              onChange={() => {
                                if (fCompradorTipos.includes(t)) {
                                  setFCompradorTipos(fCompradorTipos.filter(x => x !== t));
                                } else {
                                  setFCompradorTipos([...fCompradorTipos, t]);
                                }
                              }}
                            />
                            {t}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="filter-dropdown-container" onClick={e => e.stopPropagation()} style={{ position: 'relative' }}>
                    <button 
                      type="button" 
                      className="btn-filter-dropdown"
                      onClick={() => {
                        setShowCompradorTipologiasDropdown(!showCompradorTipologiasDropdown);
                        setShowCompradorTiposDropdown(false);
                      }}
                    >
                      Pretende Tipologias ({fCompradorTipologias.length || 'Todas'})
                    </button>
                    {showCompradorTipologiasDropdown && (
                      <div className="filter-dropdown-menu">
                        {tipologiasDisponiveis.map(t => (
                          <label key={t} className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', cursor: 'pointer' }}>
                            <input 
                              type="checkbox" 
                              checked={fCompradorTipologias.includes(t)}
                              onChange={() => {
                                if (fCompradorTipologias.includes(t)) {
                                  setFCompradorTipologias(fCompradorTipologias.filter(x => x !== t));
                                } else {
                                  setFCompradorTipologias([...fCompradorTipologias, t]);
                                }
                              }}
                            />
                            {t}
                          </label>
                        ))}
                      </div>
                    )}
                  </div>

                  <select value={fCompradorEstado} onChange={e => setFCompradorEstado(e.target.value)} className="filter-select">
                    <option value="Todos">Todos os Estados</option>
                    <option value="Ativo">🟢 Ativo (Em Procura)</option>
                    <option value="Negócio Fechado">🎉 Negócio Fechado</option>
                    <option value="Inativo">⚫ Inativo</option>
                  </select>

                  <select value={fCompradorOrigem} onChange={e => setFCompradorOrigem(e.target.value)} className="filter-select">
                    <option value="Todos">Todas as Origens</option>
                    {origensDisponiveis.map(o => (
                      <option key={o} value={o}>{o}</option>
                    ))}
                  </select>

                  <select value={sortCompradoresBy} onChange={e => setSortCompradoresBy(e.target.value)} className="filter-select" style={{ marginLeft: 'auto' }}>
                    <option value="data-desc">Mais Recentes</option>
                    <option value="data-asc">Mais Antigos</option>
                    <option value="alfabetica-asc">Nome Comprador (A-Z)</option>
                    <option value="alfabetica-desc">Nome Comprador (Z-A)</option>
                    <option value="orcamento-asc">Orçamento: Baixo para Alto</option>
                    <option value="orcamento-desc">Orçamento: Alto para Baixo</option>
                  </select>

                </div>

                <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    <span>Orçamento Máximo</span>
                    <span style={{ color: 'var(--accent-blue)' }}>
                      {fCompradorOrcamentoMax === 1000000 ? 'Sem limite' : formatCurrency(fCompradorOrcamentoMax)}
                    </span>
                  </div>
                  <input 
                    type="range" 
                    min="50000" 
                    max="1000000" 
                    step="25000"
                    value={fCompradorOrcamentoMax}
                    onChange={e => setFCompradorOrcamentoMax(parseInt(e.target.value))}
                    style={{ width: '100%', cursor: 'pointer', accentColor: 'var(--text-primary)' }}
                  />
                </div>
              </div>

              <div className="data-table-card" style={{ marginTop: 0 }}>
                <div className="table-header-bar">
                  <h3 className="table-header-title">Lista de Leads de Compradores ({getFilteredCompradores().length})</h3>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    
                    <button className="btn btn-secondary" onClick={handleImportContacto}>
                      <Smartphone size={16} />
                      <span>Importar Telemóvel</span>
                    </button>

                    <button 
                      className="btn btn-primary"
                      onClick={() => {
                        setEditingCompradorId(null);
                        setCNome('');
                        setCContacto('');
                        setCOrcamento('');
                        setCTipologias(['T2']);
                        setCTiposImovel(['Apartamento']);
                        setCZonas([]);
                        setCObs('');
                        setCFoiContactado(false);
                        setCDataContacto('');
                        setCEstadoComprador('Ativo');
                        setCOrigemContacto('Outro');
                        setIsCompradorModalOpen(true);
                      }}
                    >
                      <PlusCircle size={16} />
                      <span>Registar Comprador</span>
                    </button>
                  </div>
                </div>
                {/* Visualização em Desktop (Tabela) */}
                <div className="desktop-only-view" style={{ overflowX: 'auto' }}>
                  <table className="app-table">
                    <thead>
                      <tr>
                        <th>Comprador</th>
                        <th>Orçamento Máx.</th>
                        <th>Preferências</th>
                        <th>Zonas Pretendidas</th>
                        <th>Estado Ficha</th>
                        <th>Origem</th>
                        <th>Último Contacto</th>
                        <th>Ações</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getFilteredCompradores().map(comp => (
                        <tr key={comp.id}>
                          <td style={{ fontWeight: 700 }}>
                            <div>{comp.comprador_nome}</div>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{comp.comprador_contacto}</span>
                          </td>
                          <td style={{ color: 'var(--accent-blue)', fontWeight: 700 }}>{formatCurrency(comp.orcamento_maximo)}</td>
                          <td>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.8rem' }}>
                              <span>{comp.tipos_imovel_pretendidos.join(', ')}</span>
                              <span style={{ color: 'var(--text-muted)' }}>{comp.tipologias_pretendidas.join(', ')}</span>
                            </div>
                          </td>
                          <td>{comp.zonas_pretendidas.join(', ')}</td>
                          <td>
                            <span 
                              className="badge"
                              style={{
                                border: '1px solid',
                                backgroundColor: comp.estado_comprador === 'Ativo' ? 'var(--urgency-baixa-bg)' : comp.estado_comprador === 'Negócio Fechado' ? 'var(--accent-purple-bg)' : 'var(--bg-input)',
                                color: comp.estado_comprador === 'Ativo' ? 'var(--urgency-baixa)' : comp.estado_comprador === 'Negócio Fechado' ? 'var(--accent-purple)' : 'var(--text-secondary)',
                              }}
                            >
                              {comp.estado_comprador || 'Ativo'}
                            </span>
                          </td>
                          <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{comp.origem_contacto || 'Outro'}</td>
                          <td>
                            {comp.foi_contactado ? (
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ color: 'var(--urgency-baixa)', fontWeight: 600, fontSize: '0.8rem' }}>Contactado</span>
                                {comp.data_contacto && (
                                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                    {(() => {
                                      const d = parseSafeDate(comp.data_contacto);
                                      return d ? d.toLocaleDateString('pt-PT') : '';
                                    })()}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span style={{ color: 'var(--urgency-alta)', fontWeight: 600, fontSize: '0.8rem' }}>Pendente</span>
                            )}
                          </td>
                          <td>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button 
                                onClick={() => startEditComprador(comp)}
                                className="btn btn-secondary" 
                                style={{ padding: '4px 8px' }}
                                title="Editar"
                              >
                                <Edit2 size={14} />
                              </button>
                              <button 
                                onClick={() => handleDeleteComprador(comp.id)}
                                className="btn btn-secondary" 
                                style={{ padding: '4px 8px', color: 'var(--urgency-alta)' }}
                                title="Eliminar"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {getFilteredCompradores().length === 0 && (
                        <tr>
                          <td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                            Nenhum comprador corresponde aos filtros aplicados.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Visualização em Mobile (Cartões Compactos) */}
                <div className="mobile-only-view">
                  <div className="mobile-cards-list">
                    {getFilteredCompradores().map(comp => (
                      <div key={comp.id} className="mobile-item-card">
                        <div className="mobile-card-row header">
                          <span className="mobile-card-name">{comp.comprador_nome}</span>
                          <span 
                            className="badge"
                            style={{
                              border: '1px solid',
                              backgroundColor: comp.estado_comprador === 'Ativo' ? 'var(--urgency-baixa-bg)' : comp.estado_comprador === 'Negócio Fechado' ? 'var(--accent-purple-bg)' : 'var(--bg-input)',
                              color: comp.estado_comprador === 'Ativo' ? 'var(--urgency-baixa)' : comp.estado_comprador === 'Negócio Fechado' ? 'var(--accent-purple)' : 'var(--text-secondary)',
                            }}
                          >
                            {comp.estado_comprador || 'Ativo'}
                          </span>
                        </div>
                        
                        <div className="mobile-card-body">
                          <div className="mobile-card-detail">
                            <span className="detail-label">Contacto:</span>
                            <span className="detail-value">{comp.comprador_contacto}</span>
                          </div>
                          <div className="mobile-card-detail">
                            <span className="detail-label">Orçamento Máx:</span>
                            <span className="detail-value price-blue">{formatCurrency(comp.orcamento_maximo)}</span>
                          </div>
                          <div className="mobile-card-detail">
                            <span className="detail-label">Tipos:</span>
                            <span className="detail-value">{comp.tipos_imovel_pretendidos.join(', ')}</span>
                          </div>
                          <div className="mobile-card-detail">
                            <span className="detail-label">Tipologias:</span>
                            <span className="detail-value">{comp.tipologias_pretendidas.join(', ')}</span>
                          </div>
                          <div className="mobile-card-detail">
                            <span className="detail-label">Zonas:</span>
                            <span className="detail-value">{comp.zonas_pretendidas.join(', ')}</span>
                          </div>
                          <div className="mobile-card-detail">
                            <span className="detail-label">Origem:</span>
                            <span className="detail-value">{comp.origem_contacto || 'Outro'}</span>
                          </div>
                          <div className="mobile-card-detail">
                            <span className="detail-label">Contacto Efetuado:</span>
                            <span className="detail-value">
                              {comp.foi_contactado ? (
                                <span style={{ color: 'var(--urgency-baixa)', fontWeight: 600 }}>
                                  Sim {comp.data_contacto && `(${(() => {
                                    const d = parseSafeDate(comp.data_contacto);
                                    return d ? d.toLocaleDateString('pt-PT') : '';
                                  })()})`}
                                </span>
                              ) : (
                                <span style={{ color: 'var(--urgency-alta)', fontWeight: 600 }}>Pendente</span>
                              )}
                            </span>
                          </div>
                        </div>

                        <div className="mobile-card-actions">
                          <button onClick={() => startEditComprador(comp)} className="btn btn-secondary btn-sm">
                            <Edit2 size={12} />
                            <span>Editar</span>
                          </button>
                          <button onClick={() => handleDeleteComprador(comp.id)} className="btn btn-secondary btn-sm delete-btn">
                            <Trash2 size={12} />
                            <span>Eliminar</span>
                          </button>
                        </div>
                      </div>
                    ))}
                    {getFilteredCompradores().length === 0 && (
                      <div className="mobile-empty-state">
                        Nenhum comprador corresponde aos filtros aplicados.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: CALENDÁRIO */}
          {activeMenu === 'calendario' && (
            <div className="calendar-wrapper">
              
              <div className="calendar-main-card" style={{ maxWidth: '340px' }}>
                <div className="calendar-header-nav">
                  <button onClick={prevMonth} className="btn-quick-action" style={{ backgroundColor: 'var(--bg-input)' }}>
                    <ChevronLeft size={16} />
                  </button>
                  <h2 className="calendar-month-title" style={{ fontSize: '1.1rem' }}>
                    {monthNames[calendarDate.getMonth()]} {calendarDate.getFullYear()}
                  </h2>
                  <button onClick={nextMonth} className="btn-quick-action" style={{ backgroundColor: 'var(--bg-input)' }}>
                    <ChevronRight size={16} />
                  </button>
                </div>

                <div className="calendar-week-days" style={{ fontSize: '0.65rem', marginBottom: '0.5rem', paddingBottom: '0.5rem' }}>
                  <div>Seg</div>
                  <div>Ter</div>
                  <div>Qua</div>
                  <div>Qui</div>
                  <div>Sex</div>
                  <div>Sáb</div>
                  <div>Dom</div>
                </div>

                <div className="calendar-grid" style={{ gap: '4px' }}>
                  {renderCalendarDays()}
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '1.25rem', fontSize: '0.65rem', color: 'var(--text-secondary)', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <div className="calendar-event-dot dot-imovel" /> <span>Registo</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <div className="calendar-event-dot dot-comprador" /> <span>Comprador</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <div className="calendar-event-dot dot-contacto" /> <span>Contacto</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <div className="calendar-event-dot dot-crm" /> <span>Atividade</span>
                  </div>
                </div>
              </div>

              <div className="calendar-activities-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                  <h3 className="card-title" style={{ fontSize: '1.1rem' }}>
                    Agenda: {selectedDay.toLocaleDateString('pt-PT')}
                  </h3>
                  <button 
                    className="btn btn-primary"
                    style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}
                    onClick={() => {
                      setActTipos([]);
                      setActNotas('');
                      setAssociarCliente(false);
                      setAssociarImovel(false);
                      
                      const offset = selectedDay.getTimezoneOffset() * 60000;
                      const dateLocal = new Date(selectedDay.getTime() - offset).toISOString().slice(0, 16);
                      setActDataHora(dateLocal);
                      
                      setIsAtividadeModalOpen(true);
                    }}
                  >
                    <Plus size={14} />
                    <span>Agendar Tarefa</span>
                  </button>
                </div>

                <div className="calendar-activities-list">
                  {selectedDayEvents.length > 0 ? (
                    selectedDayEvents.map((evt, idx) => (
                      <div key={idx} className="calendar-activity-item" style={{ position: 'relative' }}>
                        <div className={`activity-icon-box activity-icon-${evt.type === 'agenda' ? 'crm' : evt.type.includes('imovel') ? 'imovel' : evt.type.includes('comprador') ? 'comprador' : evt.type}`}>
                          {evt.type === 'agenda' && <Clock size={16} />}
                          {evt.type.includes('imovel') && <Home size={16} />}
                          {evt.type.includes('comprador') && <Users size={16} />}
                          {evt.type === 'contacto' && <Phone size={16} />}
                        </div>
                        <div className="activity-content" style={{ paddingRight: '2.5rem' }}>
                          <span className="activity-title" style={{ color: 'var(--text-primary)', fontWeight: 700 }}>
                            {evt.title}
                          </span>
                          <span className="activity-meta" style={{ fontSize: '0.75rem', marginTop: '2px' }}>
                            {evt.label}
                          </span>
                          {evt.desc && (
                            <span className="activity-desc" style={{ fontStyle: 'italic', color: 'var(--text-secondary)', marginTop: '4px' }}>
                              {evt.desc}
                            </span>
                          )}
                        </div>

                        <div style={{ 
                          position: 'absolute', 
                          right: '12px', 
                          top: '12px', 
                          display: 'flex', 
                          gap: '8px',
                          alignItems: 'center' 
                        }}>
                          {/* Editar Cliente Associado */}
                          {(evt.compradorId || evt.type === 'comprador' || evt.type === 'contacto') && (
                            <button
                              onClick={() => {
                                const compId = evt.compradorId || evt.originalId;
                                const comp = compradores.find(c => c.id === compId);
                                if (comp) startEditComprador(comp);
                              }}
                              style={{ 
                                border: 'none', 
                                background: 'none', 
                                color: 'var(--accent-blue)', 
                                cursor: 'pointer',
                                padding: '4px'
                              }}
                              title="Editar Perfil do Cliente"
                            >
                              <Users size={15} />
                            </button>
                          )}

                          {/* Editar Atividade em si */}
                          {evt.type === 'agenda' && (
                            <button
                              onClick={() => startEditAtividade(evt.originalId)}
                              style={{ 
                                border: 'none', 
                                background: 'none', 
                                color: 'var(--text-primary)', 
                                cursor: 'pointer',
                                padding: '4px'
                              }}
                              title="Editar Atividade"
                            >
                              <Edit2 size={15} />
                            </button>
                          )}

                          {/* Eliminar Atividade */}
                          {evt.type === 'agenda' && (
                            <button 
                              onClick={() => handleDeleteAtividade(evt.originalId)}
                              style={{ 
                                border: 'none', 
                                background: 'none', 
                                color: 'var(--text-muted)', 
                                cursor: 'pointer',
                                padding: '4px'
                              }}
                              title="Eliminar Atividade"
                            >
                              <Trash2 size={15} style={{ color: 'var(--urgency-alta)' }} />
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="empty-state" style={{ padding: '3rem 1rem', borderStyle: 'solid' }}>
                      <Calendar className="empty-state-icon" />
                      <div className="empty-state-title" style={{ fontSize: '0.95rem' }}>Agenda Livre</div>
                      <div className="empty-state-desc" style={{ fontSize: '0.8rem' }}>
                        Nenhuma tarefa ou registo agendado para este dia. Clica em "Agendar Tarefa".
                      </div>
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* TAB 6: DEFINIÇÕES */}
          {activeMenu === 'definicoes' && (
            <div className="kanban-card" style={{ maxWidth: '600px', margin: '0 auto', padding: '2rem' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, marginBottom: '1rem' }}>Sincronização da Base de Dados</h2>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '1rem', backgroundColor: 'var(--urgency-baixa-bg)', color: 'var(--urgency-baixa)', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.2)', marginBottom: '1.5rem' }}>
                <Check size={20} />
                <span style={{ fontWeight: 600 }}>Ligado com Sucesso ao Supabase</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem' }}>
                <div>
                  <strong>URL da Base de Dados:</strong>
                  <code style={{ display: 'block', backgroundColor: 'var(--bg-app)', padding: '6px 10px', borderRadius: '4px', marginTop: '4px', fontSize: '0.8rem' }}>
                    https://akfykaystwyqzrsxdfjh.supabase.co
                  </code>
                </div>
                <div>
                  <strong>Estado RLS:</strong>
                  <span style={{ color: 'var(--urgency-baixa)', fontWeight: 700, marginLeft: '8px' }}>Ativo (Acesso Público Total)</span>
                </div>
                <div>
                  <strong>Nome de Exibição do Projeto na Cloud:</strong>
                  <span style={{ fontWeight: 600, marginLeft: '8px' }}>imo</span>
                </div>
              </div>
            </div>
          )}

          {/* Banner */}
          <div className="bottom-banner">
            <div className="banner-content">
              <Sparkles size={20} style={{ color: 'var(--accent-pink)' }} />
              <span className="banner-text">
                <strong>Motor de Correspondência Reativo:</strong> O Imo calcula automaticamente a compatibilidade entre compradores e imóveis em tempo real na base de dados.
              </span>
            </div>
          </div>

        </section>
      </main>

      {/* MOBILE BOTTOM NAV */}
      <nav className="mobile-bottom-nav">
        <button className={`mobile-nav-item ${activeMenu === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveMenu('dashboard')}>
          <LayoutDashboard size={20} />
          <span>Painel</span>
        </button>
        <button className={`mobile-nav-item ${activeMenu === 'kanban' ? 'active' : ''}`} onClick={() => setActiveMenu('kanban')}>
          <FolderKanban size={20} />
          <span>CRM</span>
        </button>
        <button className={`mobile-nav-item ${activeMenu === 'imoveis' ? 'active' : ''}`} onClick={() => setActiveMenu('imoveis')}>
          <Home size={20} />
          <span>Imóveis</span>
        </button>
        <button className={`mobile-nav-item ${activeMenu === 'compradores' ? 'active' : ''}`} onClick={() => setActiveMenu('compradores')}>
          <Users size={20} />
          <span>Clientes</span>
        </button>
        <button className={`mobile-nav-item ${activeMenu === 'calendario' ? 'active' : ''}`} onClick={() => setActiveMenu('calendario')}>
          <Calendar size={20} />
          <span>Agenda</span>
        </button>
      </nav>

      {/* MODAL 1: ADICIONAR / EDITAR IMÓVEL */}
      {isImovelModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content-card">
            <div className="modal-header">
              <h3 className="modal-title">{editingImovelId ? 'Editar Imóvel' : 'Registar Novo Imóvel'}</h3>
              <button className="modal-close-btn" onClick={() => setIsImovelModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddImovel} className="modal-body form-grid">
              
              <div className="form-group form-group-full">
                <label>Proprietário (Nome)*</label>
                <input 
                  type="text" 
                  value={vNome}
                  onChange={(e) => {
                    setVNome(e.target.value);
                    if (imovelFormErrors.includes('nome')) {
                      setImovelFormErrors(imovelFormErrors.filter(err => err !== 'nome'));
                    }
                  }}
                  className={imovelFormErrors.includes('nome') ? 'input-error' : ''}
                  placeholder="Ex: Manuel Antunes"
                  required
                />
              </div>

              <div className="form-group">
                <label>Contacto*</label>
                <input 
                  type="text" 
                  value={vContacto}
                  onChange={(e) => {
                    setVContacto(e.target.value);
                    if (imovelFormErrors.includes('contacto')) {
                      setImovelFormErrors(imovelFormErrors.filter(err => err !== 'contacto'));
                    }
                  }}
                  className={imovelFormErrors.includes('contacto') ? 'input-error' : ''}
                  placeholder="Ex: 912345678"
                  required
                />
              </div>

              <div className="form-group">
                <label>Tipo de Imóvel*</label>
                <select value={vTipoImovel} onChange={(e) => setVTipoImovel(e.target.value)}>
                  {tiposImovelDisponiveis.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Preço Anunciado (€)*</label>
                <input 
                  type="number" 
                  value={vPrecoObj}
                  onChange={(e) => {
                    setVPrecoObj(e.target.value);
                    if (imovelFormErrors.includes('precoObj')) {
                      setImovelFormErrors(imovelFormErrors.filter(err => err !== 'precoObj'));
                    }
                  }}
                  className={imovelFormErrors.includes('precoObj') ? 'input-error' : ''}
                  placeholder="Ex: 245000"
                  required
                />
              </div>

              <div className="form-group">
                <label>Preço Mínimo Oculto (€)*</label>
                <input 
                  type="number" 
                  value={vPrecoMin}
                  onChange={(e) => {
                    setVPrecoMin(e.target.value);
                    if (imovelFormErrors.includes('precoMin')) {
                      setImovelFormErrors(imovelFormErrors.filter(err => err !== 'precoMin'));
                    }
                  }}
                  className={imovelFormErrors.includes('precoMin') ? 'input-error' : ''}
                  placeholder="Preço confidencial"
                  required
                />
              </div>

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
                  value={vArea}
                  onChange={(e) => {
                    setVArea(e.target.value);
                    if (imovelFormErrors.includes('area')) {
                      setImovelFormErrors(imovelFormErrors.filter(err => err !== 'area'));
                    }
                  }}
                  className={imovelFormErrors.includes('area') ? 'input-error' : ''}
                  placeholder="Ex: 110"
                  required
                />
              </div>

              <div className="form-group">
                <label>Andar / Piso*</label>
                <input 
                  type="text" 
                  value={vAndar}
                  onChange={(e) => {
                    setVAndar(e.target.value);
                    if (imovelFormErrors.includes('andar')) {
                      setImovelFormErrors(imovelFormErrors.filter(err => err !== 'andar'));
                    }
                  }}
                  className={imovelFormErrors.includes('andar') ? 'input-error' : ''}
                  placeholder="Ex: R/C ou 3º"
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

              <div className="form-group">
                <label>Origem do Contacto*</label>
                <select value={vOrigemContacto} onChange={(e) => setVOrigemContacto(e.target.value)}>
                  {origensDisponiveis.map(o => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>

              <div className="form-group form-group-full">
                <label>Estado de Acompanhamento (Etapa)*</label>
                <select value={vEstadoImovel} onChange={(e) => setVEstadoImovel(e.target.value)}>
                  <option value="Ativo">🟢 Ativo (Para Venda)</option>
                  <option value="Reservado">🟡 Reservado (Sinalizado)</option>
                  <option value="Vendido">🔴 Vendido (Escritura Realizada)</option>
                  <option value="Inativo">⚫ Inativo / Suspenso</option>
                </select>
              </div>

              <div className="form-group form-group-full">
                <label>Morada / Rua*</label>
                <input 
                  type="text" 
                  value={vRua}
                  onChange={(e) => {
                    setVRua(e.target.value);
                    if (imovelFormErrors.includes('rua')) {
                      setImovelFormErrors(imovelFormErrors.filter(err => err !== 'rua'));
                    }
                  }}
                  className={imovelFormErrors.includes('rua') ? 'input-error' : ''}
                  placeholder="Nome da rua e lote"
                  required
                />
              </div>

              <div className="form-group">
                <label>Cidade (Concelho)*</label>
                <input 
                  type="text" 
                  value={vCidade}
                  list="v-cidades-list"
                  onChange={(e) => {
                    setVCidade(e.target.value);
                    fetchConcelhos(e.target.value);
                    if (imovelFormErrors.includes('cidade')) {
                      setImovelFormErrors(imovelFormErrors.filter(err => err !== 'cidade'));
                    }
                  }}
                  className={imovelFormErrors.includes('cidade') ? 'input-error' : ''}
                  placeholder="Ex: Beja"
                  required
                />
                <datalist id="v-cidades-list">
                  {concelhoSugestoes.map((c, idx) => <option key={idx} value={c} />)}
                </datalist>
              </div>

              <div className="form-group">
                <label>Freguesia*</label>
                <input 
                  type="text" 
                  value={vFreguesia}
                  list="v-freguesias-list"
                  onChange={(e) => {
                    setVFreguesia(e.target.value);
                    fetchFreguesias(e.target.value, vCidade);
                    if (imovelFormErrors.includes('freguesia')) {
                      setImovelFormErrors(imovelFormErrors.filter(err => err !== 'freguesia'));
                    }
                  }}
                  className={imovelFormErrors.includes('freguesia') ? 'input-error' : ''}
                  placeholder="Ex: Salvador"
                  required
                />
                <datalist id="v-freguesias-list">
                  {freguesiaSugestoes.map((f, idx) => <option key={idx} value={f} />)}
                </datalist>
              </div>

              <div className="form-group form-group-full">
                <label>Características do Imóvel</label>
                <div className="checkbox-group">
                  <label className="checkbox-label">
                    <input type="checkbox" checked={vElevador} onChange={e => setVElevador(e.target.checked)} />
                    Elevador
                  </label>
                  <label className="checkbox-label">
                    <input type="checkbox" checked={vGaragem} onChange={e => setVGaragem(e.target.checked)} />
                    Garagem
                  </label>
                  <label className="checkbox-label">
                    <input type="checkbox" checked={vQuintal} onChange={e => setVQuintal(e.target.checked)} />
                    Espaço Exterior
                  </label>
                  <label className="checkbox-label">
                    <input type="checkbox" checked={vArrecadacao} onChange={e => setVArrecadacao(e.target.checked)} />
                    Arrecadação
                  </label>
                </div>
              </div>

              <div className="form-group form-group-full">
                <label>Flexibilidade do Vendedor</label>
                <select value={vFlex} onChange={(e) => setVFlex(e.target.value as any)}>
                  <option value="Baixa">Baixa flexibilidade de preço</option>
                  <option value="Media">Média (Aberto a propostas razoáveis)</option>
                  <option value="Alta">Alta (Negociável / Muito flexível)</option>
                </select>
              </div>

              <div className="form-group form-group-full">
                <label>Observações</label>
                <textarea 
                  rows={2} 
                  value={vObs}
                  onChange={(e) => setVObs(e.target.value)}
                  placeholder="Notas adicionais sobre o negócio..."
                />
              </div>

              <div className="form-group-full" style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsImovelModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Gravar Imóvel</button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: ADICIONAR / EDITAR COMPRADOR */}
      {isCompradorModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content-card">
            <div className="modal-header">
              <h3 className="modal-title">{editingCompradorId ? 'Editar Perfil de Comprador' : 'Registar Lead de Comprador'}</h3>
              <button className="modal-close-btn" onClick={() => setIsCompradorModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddComprador} className="modal-body form-grid">
              
              <div className="form-group form-group-full">
                <label>Comprador (Nome)*</label>
                <input 
                  type="text" 
                  value={cNome}
                  onChange={(e) => {
                    setCNome(e.target.value);
                    if (compradorFormErrors.includes('nome')) {
                      setCompradorFormErrors(compradorFormErrors.filter(err => err !== 'nome'));
                    }
                  }}
                  className={compradorFormErrors.includes('nome') ? 'input-error' : ''}
                  placeholder="Ex: Carolina Pais"
                  required
                />
              </div>

              <div className="form-group">
                <label>Contacto Telefónico*</label>
                <input 
                  type="text" 
                  value={cContacto}
                  onChange={(e) => {
                    setCContacto(e.target.value);
                    if (compradorFormErrors.includes('contacto')) {
                      setCompradorFormErrors(compradorFormErrors.filter(err => err !== 'contacto'));
                    }
                  }}
                  className={compradorFormErrors.includes('contacto') ? 'input-error' : ''}
                  placeholder="Ex: 934567890"
                  required
                />
              </div>

              <div className="form-group">
                <label>Orçamento Máximo (€)*</label>
                <input 
                  type="number" 
                  value={cOrcamento}
                  onChange={(e) => {
                    setCOrcamento(e.target.value);
                    if (compradorFormErrors.includes('orcamento')) {
                      setCompradorFormErrors(compradorFormErrors.filter(err => err !== 'orcamento'));
                    }
                  }}
                  className={compradorFormErrors.includes('orcamento') ? 'input-error' : ''}
                  placeholder="Ex: 320000"
                  required
                />
              </div>

              <div className="form-group">
                <label>Origem do Contacto*</label>
                <select value={cOrigemContacto} onChange={(e) => setCOrigemContacto(e.target.value)}>
                  {origensDisponiveis.map(o => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Estado de Acompanhamento*</label>
                <select value={cEstadoComprador} onChange={(e) => setCEstadoComprador(e.target.value)}>
                  <option value="Ativo">🟢 Ativo (À Procura)</option>
                  <option value="Negócio Fechado">🎉 Negócio Fechado</option>
                  <option value="Inativo">⚫ Inativo / Arquivado</option>
                </select>
              </div>

              <div className="form-group form-group-full">
                <label style={{ color: compradorFormErrors.includes('tiposImovel') ? 'var(--urgency-alta)' : '' }}>Tipo de Propriedade Pretendida* (Múltiplo)</label>
                <div style={{ 
                  display: 'flex', 
                  flexWrap: 'wrap', 
                  gap: '8px', 
                  marginTop: '4px',
                  padding: '6px',
                  borderRadius: 'var(--radius-sm)',
                  border: compradorFormErrors.includes('tiposImovel') ? '1px solid var(--urgency-alta)' : '1px solid transparent',
                  backgroundColor: compradorFormErrors.includes('tiposImovel') ? 'rgba(225, 29, 72, 0.02)' : 'transparent'
                }}>
                  {tiposImovelDisponiveis.map(tipo => (
                    <div 
                      key={tipo}
                      className={`badge`}
                      style={{
                        padding: '6px 12px',
                        cursor: 'pointer',
                        border: '1px solid',
                        borderColor: cTiposImovel.includes(tipo) ? 'var(--text-primary)' : 'var(--border-color)',
                        backgroundColor: cTiposImovel.includes(tipo) ? 'var(--text-primary)' : 'var(--bg-app)',
                        color: cTiposImovel.includes(tipo) ? 'white' : 'var(--text-secondary)'
                      }}
                      onClick={() => handleToggleTipoImovel(tipo)}
                    >
                      {tipo}
                    </div>
                  ))}
                </div>
              </div>

              <div className="form-group form-group-full">
                <label style={{ color: compradorFormErrors.includes('tipologias') ? 'var(--urgency-alta)' : '' }}>Tipologias Aceitáveis* (Múltiplo)</label>
                <div style={{ 
                  display: 'flex', 
                  flexWrap: 'wrap', 
                  gap: '8px', 
                  marginTop: '4px',
                  padding: '6px',
                  borderRadius: 'var(--radius-sm)',
                  border: compradorFormErrors.includes('tipologias') ? '1px solid var(--urgency-alta)' : '1px solid transparent',
                  backgroundColor: compradorFormErrors.includes('tipologias') ? 'rgba(225, 29, 72, 0.02)' : 'transparent'
                }}>
                  {tipologiasDisponiveis.map(tip => (
                    <div 
                      key={tip}
                      className={`badge`}
                      style={{
                        padding: '6px 12px',
                        cursor: 'pointer',
                        border: '1px solid',
                        borderColor: cTipologias.includes(tip) ? 'var(--text-primary)' : 'var(--border-color)',
                        backgroundColor: cTipologias.includes(tip) ? 'var(--text-primary)' : 'var(--bg-app)',
                        color: cTipologias.includes(tip) ? 'white' : 'var(--text-secondary)'
                      }}
                      onClick={() => handleToggleTipologia(tip)}
                    >
                      {tip}
                    </div>
                  ))}
                </div>
              </div>

              <div className="form-group form-group-full">
                <label style={{ color: compradorFormErrors.includes('zonas') ? 'var(--urgency-alta)' : '' }}>Zonas Geográficas Pretendidas*</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input 
                    type="text" 
                    value={cZonaInput}
                    list="c-zonas-list"
                    onChange={(e) => {
                      setCZonaInput(e.target.value);
                      fetchConcelhos(e.target.value);
                    }}
                    className={compradorFormErrors.includes('zonas') ? 'input-error' : ''}
                    placeholder="Escreve e clica em (+)"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddZona();
                      }
                    }}
                  />
                  <datalist id="c-zonas-list">
                    {concelhoSugestoes.map((c, idx) => <option key={idx} value={c} />)}
                  </datalist>
                  <button type="button" className="btn btn-secondary" onClick={handleAddZona}>
                    <Plus size={16} />
                  </button>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                  {cZonas.map(z => (
                    <span 
                      key={z} 
                      className="badge" 
                      style={{ backgroundColor: 'var(--bg-input)', display: 'inline-flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
                      onClick={() => handleRemoveZona(z)}
                    >
                      {z} <X size={10} />
                    </span>
                  ))}
                </div>
                {compradorFormErrors.includes('zonas') && (
                  <span style={{ fontSize: '0.725rem', color: 'var(--urgency-alta)', marginTop: '4px', display: 'block' }}>
                    Deves introduzir um local e clicar no botão (+) para o associar.
                  </span>
                )}
              </div>

              <div className="form-group form-group-full" style={{ borderTop: '1px solid var(--border-color)', padding: '0.85rem 0' }}>
                <label className="checkbox-label">
                  <input type="checkbox" checked={cFoiContactado} onChange={e => setCFoiContactado(e.target.checked)} />
                  Já foi efetuado o contacto inicial?
                </label>
                {cFoiContactado && (
                  <div style={{ marginTop: '0.5rem' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>Data e Hora de Contacto</label>
                    <input 
                      type="datetime-local" 
                      value={cDataContacto}
                      onChange={e => setCDataContacto(e.target.value)}
                      required={cFoiContactado}
                    />
                  </div>
                )}
              </div>

              <div className="form-group form-group-full">
                <label>Requisitos Adicionais</label>
                <div className="checkbox-group">
                  <label className="checkbox-label">
                    <input type="checkbox" checked={cGaragem} onChange={e => setCGaragem(e.target.checked)} />
                    Exige Garagem
                  </label>
                  <label className="checkbox-label">
                    <input type="checkbox" checked={cElevadorRc} onChange={e => setCElevadorRc(e.target.checked)} />
                    Exige Elevador ou R/C
                  </label>
                  <label className="checkbox-label">
                    <input type="checkbox" checked={cEspacoExt} onChange={e => setCEspacoExt(e.target.checked)} />
                    Prefere Varanda/Quintal
                  </label>
                </div>
              </div>

              <div className="form-group form-group-full">
                <label>Urgência de Aquisição*</label>
                <select value={cUrgencia} onChange={(e) => setCUrgencia(e.target.value as any)}>
                  <option value="Baixa">🟢 Baixa (Procura mas sem pressa)</option>
                  <option value="Media">🟡 Média (Acompanhamento regular)</option>
                  <option value="Alta">🔴 Alta (Urgente - Pretende comprar já)</option>
                </select>
              </div>

              <div className="form-group form-group-full">
                <label>Notas de Perfil</label>
                <textarea 
                  rows={2} 
                  value={cObs}
                  onChange={(e) => setCObs(e.target.value)}
                  placeholder="Notas adicionais sobre o perfil..."
                />
              </div>

              <div className="form-group-full" style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsCompradorModalOpen(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary">Gravar Lead</button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: AGENDAR NOVA ATIVIDADE / EDITAR */}
      {isAtividadeModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content-card">
            <div className="modal-header">
              <h3 className="modal-title">{editingAtividadeId ? 'Editar Atividade Agendada' : 'Agendar Nova Atividade'}</h3>
              <button className="modal-close-btn" onClick={() => {
                setEditingAtividadeId(null);
                setIsAtividadeModalOpen(false);
              }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleAddAtividade} className="modal-body form-grid">
              
              <div className="form-group form-group-full">
                <label>Tipos de Atividade* (Podes conjugar várias)</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                  {tiposAtividadeDisponiveis.map(tipo => (
                    <div 
                      key={tipo}
                      className="badge"
                      style={{
                        padding: '6px 12px',
                        cursor: 'pointer',
                        border: '1px solid',
                        borderColor: actTipos.includes(tipo) ? 'var(--text-primary)' : 'var(--border-color)',
                        backgroundColor: actTipos.includes(tipo) ? 'var(--text-primary)' : 'var(--bg-app)',
                        color: actTipos.includes(tipo) ? 'white' : 'var(--text-secondary)'
                      }}
                      onClick={() => handleToggleActTipo(tipo)}
                    >
                      {tipo}
                    </div>
                  ))}
                </div>
              </div>

              <div className="form-group form-group-full">
                <label>Data e Hora Agendada*</label>
                <input 
                  type="datetime-local" 
                  value={actDataHora}
                  onChange={(e) => setActDataHora(e.target.value)}
                  required
                />
              </div>

              <div className="form-group form-group-full" style={{ display: 'flex', gap: '12px', borderTop: '1px solid var(--border-color)', borderBottom: '1px solid var(--border-color)', padding: '0.85rem 0', margin: '4px 0' }}>
                <label className="checkbox-label">
                  <input type="checkbox" checked={associarCliente} onChange={e => setAssociarCliente(e.target.checked)} />
                  Associar Comprador
                </label>
                <label className="checkbox-label">
                  <input type="checkbox" checked={associarImovel} onChange={e => setAssociarImovel(e.target.checked)} />
                  Associar Imóvel
                </label>
              </div>

              {associarCliente && (
                <div className="form-group form-group-full" style={{ animation: 'slideUp 0.15s ease' }}>
                  <label>Comprador / Lead</label>
                  <select value={actCompradorId} onChange={e => setActCompradorId(e.target.value)} required={associarCliente}>
                    <option value="">-- Selecione Comprador --</option>
                    {compradores.map(c => (
                      <option key={c.id} value={c.id}>{c.comprador_nome} ({c.comprador_contacto})</option>
                    ))}
                  </select>
                </div>
              )}

              {associarImovel && (
                <div className="form-group form-group-full" style={{ animation: 'slideUp 0.15s ease' }}>
                  <label>Imóvel / Vendedor</label>
                  <select value={actImovelId} onChange={e => setActImovelId(e.target.value)} required={associarImovel}>
                    <option value="">-- Selecione Imóvel --</option>
                    {vendedores.map(v => (
                      <option key={v.id} value={v.id}>{v.tipo_imovel} ({v.tipologia}) - Prop: {v.proprietario_nome}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-group form-group-full">
                <label>Notas / Instruções da Tarefa</label>
                <textarea 
                  rows={2} 
                  value={actNotas}
                  onChange={(e) => setActNotas(e.target.value)}
                  placeholder="Escreve detalhes da reunião, CPCV, etc..."
                />
              </div>

              <div className="form-group-full" style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '1rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => {
                  setEditingAtividadeId(null);
                  setIsAtividadeModalOpen(false);
                }}>Cancelar</button>
                <button type="submit" className="btn btn-primary">{editingAtividadeId ? 'Gravar Alterações' : 'Agendar'}</button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* --- MODAL 4: SIMULAÇÃO DE SELEÇÃO DE CONTACTOS --- */}
      {isSimulatedContactsModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content-card" style={{ maxWidth: '420px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Simulação: Contactos do Telemóvel</h3>
              <button className="modal-close-btn" onClick={() => setIsSimulatedContactsModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              
              <div style={{
                padding: '0.85rem',
                backgroundColor: 'rgba(217, 119, 6, 0.08)',
                border: '1px solid rgba(217, 119, 6, 0.2)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-secondary)',
                fontSize: '0.8rem',
                lineHeight: '1.4'
              }}>
                <strong>⚠️ Informação de Permissão do Dispositivo:</strong><br />
                O navegador do seu telemóvel não forneceu acesso direto aos seus contactos reais (ou a permissão foi rejeitada). 
                Exibimos este <strong>seletor simulado modelo</strong> com contactos de demonstração para poder testar o fluxo de CRM.
              </div>

              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', margin: '4px 0' }}>
                Selecione um dos contactos modelo de teste para continuar:
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {contactosSimulados.map((c, idx) => (
                  <div 
                    key={idx} 
                    onClick={() => handleSelectSimulatedContact(c)}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between', 
                      padding: '0.85rem', 
                      border: '1px solid var(--border-color)', 
                      borderRadius: 'var(--radius-md)', 
                      backgroundColor: 'var(--bg-app)', 
                      cursor: 'pointer',
                      transition: 'var(--transition-smooth)'
                    }}
                    className="simulated-contact-item"
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem' }}>{c.nome}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.telefone}</div>
                    </div>
                    <Smartphone size={16} style={{ color: 'var(--text-muted)' }} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 5: DECISÃO DE IMPORTAÇÃO DE CONTACTO --- */}
      {isImportDecisionModalOpen && importedContact && (
        <div className="modal-overlay">
          <div className="modal-content-card" style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Importar Contacto</h3>
              <button className="modal-close-btn" onClick={() => setIsImportDecisionModalOpen(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              <div style={{ backgroundColor: 'var(--bg-app)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', textAlign: 'center' }}>
                <Smartphone size={24} style={{ color: 'var(--accent-pink)', marginBottom: '4px' }} />
                <h4 style={{ fontWeight: 700, fontSize: '1.05rem', margin: '4px 0' }}>{importedContact.nome}</h4>
                <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Tlf: {importedContact.telefone} {importedContact.email && `| Em: ${importedContact.email}`}</p>
              </div>

              {associationMode === 'decision' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '8px' }}>
                    O que pretendes fazer com este contacto importado?
                  </p>
                  
                  <button 
                    className="btn btn-primary" 
                    onClick={() => {
                      setIsImportDecisionModalOpen(false);
                      setCNome(importedContact.nome);
                      setCContacto(importedContact.telefone);
                      setCOrcamento('');
                      setCTipologias(['T2']);
                      setCTiposImovel(['Apartamento']);
                      setCZonas([]);
                      setCObs('');
                      setCFoiContactado(false);
                      setCEstadoComprador('Ativo');
                      setCOrigemContacto('Outro');
                      setIsCompradorModalOpen(true);
                    }}
                    style={{ justifyContent: 'center' }}
                  >
                    <PlusCircle size={16} />
                    Criar Novo Comprador (Lead)
                  </button>

                  <button 
                    className="btn btn-secondary" 
                    onClick={() => {
                      setIsImportDecisionModalOpen(false);
                      setVNome(importedContact.nome);
                      setVContacto(importedContact.telefone);
                      setVPrecoObj('');
                      setVPrecoMin('');
                      setVArea('');
                      setVRua('');
                      setVCidade('');
                      setVFreguesia('');
                      setVObs('');
                      setVEstadoImovel('Ativo');
                      setVOrigemContacto('Outro');
                      setIsImovelModalOpen(true);
                    }}
                    style={{ justifyContent: 'center' }}
                  >
                    <Building size={16} />
                    Criar Novo Imóvel (Vendedor)
                  </button>

                  <button 
                    className="btn btn-secondary" 
                    onClick={() => setAssociationMode('associate-imovel')}
                    style={{ justifyContent: 'center' }}
                  >
                    <Edit2 size={16} />
                    Atualizar Proprietário de Imóvel Existente
                  </button>

                  <button 
                    className="btn btn-secondary" 
                    onClick={() => setAssociationMode('associate-comprador')}
                    style={{ justifyContent: 'center' }}
                  >
                    <Users size={16} />
                    Atualizar Dados de Comprador Existente
                  </button>
                </div>
              )}

              {associationMode === 'associate-imovel' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ fontWeight: 700, fontSize: '0.9rem' }}>Escolha o imóvel para atualizar:</h4>
                    <button className="btn btn-secondary" style={{ padding: '3px 8px', fontSize: '0.75rem' }} onClick={() => setAssociationMode('decision')}>Voltar</button>
                  </div>
                  <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                    {vendedores.map(imovel => (
                      <div 
                        key={imovel.id} 
                        onClick={() => handleAssociateToImovel(imovel.id)}
                        style={{ padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', backgroundColor: 'var(--bg-app)' }}
                        className="association-list-item"
                      >
                        <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>Prop: {imovel.proprietario_nome} ({imovel.proprietario_contacto})</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{imovel.tipo_imovel} em {imovel.freguesia}, {imovel.cidade}</div>
                      </div>
                    ))}
                    {vendedores.length === 0 && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>Sem imóveis disponíveis.</p>}
                  </div>
                </div>
              )}

              {associationMode === 'associate-comprador' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ fontWeight: 700, fontSize: '0.9rem' }}>Escolha o comprador para atualizar:</h4>
                    <button className="btn btn-secondary" style={{ padding: '3px 8px', fontSize: '0.75rem' }} onClick={() => setAssociationMode('decision')}>Voltar</button>
                  </div>
                  <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                    {compradores.map(comp => (
                      <div 
                        key={comp.id} 
                        onClick={() => handleAssociateToComprador(comp.id)}
                        style={{ padding: '0.75rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', cursor: 'pointer', backgroundColor: 'var(--bg-app)' }}
                        className="association-list-item"
                      >
                        <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>{comp.comprador_nome} ({comp.comprador_contacto})</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Orc: {formatCurrency(comp.orcamento_maximo)}</div>
                      </div>
                    ))}
                    {compradores.length === 0 && <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center' }}>Sem compradores disponíveis.</p>}
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: DETALHES COMPLETOS DA CORRESPONDÊNCIA (MATCH) */}
      {selectedMatchDetail && (
        <div className="modal-overlay">
          <div className="modal-content-card" style={{ maxWidth: '650px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Detalhe da Correspondência ({selectedMatchDetail.match_score}%)</h3>
              <button className="modal-close-btn" onClick={() => setSelectedMatchDetail(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', paddingBottom: window.innerWidth <= 900 ? '80px' : '1.5rem' }}>
              
              {/* Dados do Comprador */}
              <div style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-app)' }}>
                <h4 style={{ fontWeight: 700, color: 'var(--accent-blue)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <Users size={18} />
                  <span>Comprador (Quem procura)</span>
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth <= 600 ? '1fr' : '1fr 1fr', gap: '8px', fontSize: '0.85rem' }}>
                  <div><strong>Nome:</strong> {selectedMatchDetail.comprador_nome}</div>
                  <div><strong>Contacto:</strong> {compradores.find(c => c.id === selectedMatchDetail.comprador_id)?.comprador_contacto || 'Não disponível'}</div>
                  <div><strong>Orçamento Máx:</strong> {formatCurrency(compradores.find(c => c.id === selectedMatchDetail.comprador_id)?.orcamento_maximo || 0)}</div>
                  <div><strong>Urgência:</strong> {selectedMatchDetail.comprador_urgencia}</div>
                  <div style={{ gridColumn: window.innerWidth <= 600 ? 'span 1' : 'span 2' }}>
                    <strong>Zonas Pretendidas:</strong> {compradores.find(c => c.id === selectedMatchDetail.comprador_id)?.zonas_pretendidas.join(', ') || 'Nenhuma'}
                  </div>
                  <div style={{ gridColumn: window.innerWidth <= 600 ? 'span 1' : 'span 2' }}>
                    <strong>Observações do Cliente:</strong> {compradores.find(c => c.id === selectedMatchDetail.comprador_id)?.observacoes || 'Sem notas de perfil.'}
                  </div>
                </div>
              </div>

              {/* Dados do Imóvel & Proprietário */}
              <div style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-app)' }}>
                <h4 style={{ fontWeight: 700, color: 'var(--accent-gold)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <Home size={18} />
                  <span>Imóvel Disponível (Vendedor)</span>
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth <= 600 ? '1fr' : '1fr 1fr', gap: '8px', fontSize: '0.85rem' }}>
                  <div><strong>Proprietário (Dono):</strong> {selectedMatchDetail.proprietario_nome}</div>
                  <div><strong>Contacto do Dono:</strong> {vendedores.find(v => v.id === selectedMatchDetail.imovel_id)?.proprietario_contacto || 'Não disponível'}</div>
                  <div><strong>Tipo de Imóvel:</strong> {vendedores.find(v => v.id === selectedMatchDetail.imovel_id)?.tipo_imovel} ({selectedMatchDetail.tipologia})</div>
                  <div><strong>Preço Anunciado:</strong> {formatCurrency(selectedMatchDetail.preco_objetivo)}</div>
                  <div><strong>Preço Mín. Aceitável:</strong> {formatCurrency(selectedMatchDetail.preco_minimo)}</div>
                  <div><strong>Área Útil:</strong> {vendedores.find(v => v.id === selectedMatchDetail.imovel_id)?.area_m2 || 0} m²</div>
                  <div style={{ gridColumn: window.innerWidth <= 600 ? 'span 1' : 'span 2' }}><strong>Morada / Localização:</strong> {selectedMatchDetail.freguesia}, {selectedMatchDetail.cidade}</div>
                  <div style={{ gridColumn: window.innerWidth <= 600 ? 'span 1' : 'span 2' }}>
                    <strong>Características:</strong> {
                      [
                        vendedores.find(v => v.id === selectedMatchDetail.imovel_id)?.tem_garagem && 'Garagem',
                        vendedores.find(v => v.id === selectedMatchDetail.imovel_id)?.tem_elevador && 'Elevador',
                        vendedores.find(v => v.id === selectedMatchDetail.imovel_id)?.tem_quintal && 'Espaço Exterior (Quintal)',
                        vendedores.find(v => v.id === selectedMatchDetail.imovel_id)?.tem_arrecadacao && 'Arrecadação'
                      ].filter(Boolean).join(', ') || 'Nenhuma'
                    }
                  </div>
                </div>
              </div>

              {/* Notas de Acompanhamento */}
              <div style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)' }}>
                <h4 style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <Clock size={18} />
                  <span>Estado do Negócio</span>
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <strong>Estado CRM:</strong> 
                    <span className="badge" style={{
                      border: '1px solid',
                      backgroundColor: selectedMatchDetail.estado_match === 'Negócio Fechado' ? 'var(--urgency-baixa-bg)' : selectedMatchDetail.estado_match === 'Visita Agendada' ? 'var(--urgency-media-bg)' : 'var(--accent-blue-bg)',
                      color: selectedMatchDetail.estado_match === 'Negócio Fechado' ? 'var(--urgency-baixa)' : selectedMatchDetail.estado_match === 'Visita Agendada' ? 'var(--urgency-media)' : 'var(--accent-blue)',
                    }}>
                      {selectedMatchDetail.estado_match}
                    </span>
                  </div>
                  <div>
                    <strong>Notas da Negociação:</strong>
                    <p style={{ marginTop: '4px', padding: '8px', backgroundColor: 'var(--bg-app)', borderRadius: 'var(--radius-sm)', fontStyle: 'italic', borderLeft: '3px solid var(--border-color)', margin: 0 }}>
                      {selectedMatchDetail.notas_match || 'Sem observações de acompanhamento registadas.'}
                    </p>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
                <button className="btn btn-secondary" onClick={() => setSelectedMatchDetail(null)}>Fechar</button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// Sub-componente de Cartão de Kanban
interface KanbanCardProps {
  match: Match;
  compradores: Comprador[];
  vendedores: Imovel[];
  onStatusChange: (compradorId: string, imovelId: string, estado: string, notas: string) => Promise<void>;
  onToggleContacto: (compradorId: string, foiContactado: boolean) => Promise<void>;
  onEditComprador: (comp: Comprador) => void;
  onSelectMatchDetail: (match: Match) => void;
}

function KanbanCard({ match, compradores, vendedores, onStatusChange, onToggleContacto, onEditComprador, onSelectMatchDetail }: KanbanCardProps) {
  const compradorDetalhe = compradores.find(c => c.id === match.comprador_id);
  const imovelDetalhe = vendedores.find(v => v.id === match.imovel_id);
  
  const [localNotas, setLocalNotas] = useState(match.notas_match || '');

  useEffect(() => {
    setLocalNotas(match.notas_match || '');
  }, [match.notas_match]);

  const iniciais = match.comprador_nome
    ? match.comprador_nome.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'C';

  const getProfileClassAndLabel = () => {
    if (match.preco_objetivo > 450000) {
      return { class: 'luxury', label: 'LUXO' };
    }
    if (compradorDetalhe?.urgencia === 'Alta') {
      return { class: 'investor', label: 'INVESTIDOR' };
    }
    return { class: 'buyer', label: 'COMPRADOR' };
  };

  const badgeProps = getProfileClassAndLabel();

  return (
    <div className="kanban-card">
      <div className="card-top">
        <div className="card-user-info">
          <div className="user-avatar-circle" onClick={() => compradorDetalhe && onEditComprador(compradorDetalhe)} style={{ cursor: 'pointer' }} title="Editar Perfil">
            {iniciais}
          </div>
          <div className="user-meta">
            <span className="user-name">{match.comprador_nome}</span>
            <span className="user-date">Urgência: {match.comprador_urgencia}</span>
          </div>
        </div>

        <div className="card-actions-quick">
          <button 
            className="btn-quick-action phone" 
            title={compradorDetalhe?.foi_contactado ? 'Já contactado' : 'Marcar como Contactado'}
            onClick={() => onToggleContacto(match.comprador_id, !compradorDetalhe?.foi_contactado)}
            style={{ backgroundColor: compradorDetalhe?.foi_contactado ? 'var(--urgency-baixa-bg)' : 'var(--accent-blue-bg)', color: compradorDetalhe?.foi_contactado ? 'var(--urgency-baixa)' : 'var(--accent-blue)' }}
          >
            <Phone size={14} />
          </button>
          <a href={`mailto:${match.comprador_nome.toLowerCase().replace(' ', '')}@email.com`} className="btn-quick-action email" title="Enviar E-mail">
            <Mail size={14} />
          </a>
        </div>
      </div>

      <div className="card-badges-row">
        <span className={`badge-profile ${badgeProps.class}`}>{badgeProps.label}</span>
        <span className="card-budget">{formatCurrency(match.preco_objetivo)}</span>
      </div>

      <div className="card-interested-box" onClick={() => onSelectMatchDetail(match)} style={{ cursor: 'pointer' }} title="Clique para ver detalhes do imóvel e proprietário">
        <div className="interested-thumbnail">
          <Building size={18} />
        </div>
        <div className="interested-details">
          <span className="interested-lbl">Interessado em (Ver Detalhes)</span>
          <span className="interested-name">{imovelDetalhe?.tipo_imovel || 'Propriedade'} ({match.tipologia})</span>
          <span className="interested-location">
            <MapPin size={10} style={{ display: 'inline', marginRight: '2px' }} />
            {match.freguesia}, {match.cidade}
          </span>
        </div>
      </div>

      <div className="card-crm-controls">
        <div className="crm-status-row">
          <span className="crm-status-lbl">CRM Estado</span>
          <select 
            value={match.estado_match}
            onChange={(e) => onStatusChange(match.comprador_id, match.imovel_id, e.target.value, localNotas)}
            className="select-crm-status"
          >
            <option value="Pendente">Novas Leads</option>
            <option value="Visita Agendada">📆 Visita Agendada</option>
            <option value="Proposta Apresentada">✉️ Proposta</option>
            <option value="Negócio Fechado">🎉 Fechado</option>
            <option value="Arquivado">📁 Arquivado</option>
          </select>
        </div>

        <div className="crm-notes-input-row">
          <input 
            type="text" 
            placeholder="Escrever notas..."
            value={localNotas}
            onChange={(e) => setLocalNotas(e.target.value)}
            className="crm-notes-input"
          />
          <button 
            type="button" 
            onClick={() => onStatusChange(match.comprador_id, match.imovel_id, match.estado_match, localNotas)}
            className="btn-crm-save"
          >
            Gravar
          </button>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '2px' }}>
          <span>Score: <strong style={{ color: 'var(--accent-blue)' }}>{match.match_score}%</strong></span>
          {match.preco_objetivo > (compradorDetalhe?.orcamento_maximo || 0) && (
            <span style={{ color: 'var(--urgency-media)', fontWeight: 700 }}>★ Requer Negociação</span>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
