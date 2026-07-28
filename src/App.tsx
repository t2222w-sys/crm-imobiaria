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
  TrendingUp
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
  updated_at: string;
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

  // Navegação da Sidebar (SaaS Style)
  const [activeMenu, setActiveMenu] = useState<'dashboard' | 'kanban' | 'imoveis' | 'compradores' | 'calendario' | 'definicoes'>('kanban');

  // Estados dos Modais
  const [isImovelModalOpen, setIsImovelModalOpen] = useState(false);
  const [isCompradorModalOpen, setIsCompradorModalOpen] = useState(false);

  // Dados da Base de Dados
  const [vendedores, setVendedores] = useState<Imovel[]>([]);
  const [compradores, setCompradores] = useState<Comprador[]>([]);
  const [allMatches, setAllMatches] = useState<Match[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Estados de Edição de Registos
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
  const [cFoiContactado, setCFoiContactado] = useState(false);
  const [cDataContacto, setCDataContacto] = useState('');

  // Autocomplete Sugestões
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

  // Efeitos de Inicialização
  useEffect(() => {
    fetchData();
  }, []);

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

      // Buscar todos os matches possíveis de todos os compradores
      const { data: mData, error: mErr } = await supabase
        .from('view_matches_compradores_imoveis')
        .select('*')
        .order('match_score', { ascending: false });

      if (mErr) throw mErr;
      setAllMatches(mData || []);
    } catch (err: any) {
      showToast('Erro ao obter dados: ' + err.message, 'error');
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

  // Tratar submissão de Novo Imóvel (ou Edição)
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
      updated_at: new Date().toISOString()
    };

    try {
      if (editingImovelId) {
        const { error } = await supabase
          .from('vendedores_imoveis')
          .update(imovelPayload)
          .eq('id', editingImovelId);

        if (error) throw error;
        showToast('Imóvel atualizado com sucesso!');
        setEditingImovelId(null);
      } else {
        const { error } = await supabase
          .from('vendedores_imoveis')
          .insert([imovelPayload]);

        if (error) throw error;
        showToast('Imóvel adicionado com sucesso!');
      }
      
      // Limpar formulário e fechar modal
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
      setIsImovelModalOpen(false);
      
      fetchData();
    } catch (err: any) {
      showToast('Erro ao gravar imóvel: ' + err.message, 'error');
    }
  };

  // Tratar submissão de Novo Comprador (ou Edição)
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

      // Limpar formulário e fechar modal
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
      setIsCompradorModalOpen(false);

      fetchData();
    } catch (err: any) {
      showToast('Erro ao registar comprador: ' + err.message, 'error');
    }
  };

  // Ativar modo de edição para Imóvel
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

    setIsImovelModalOpen(true);
  };

  // Ativar modo de edição para Comprador
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
    
    if (comprador.data_contacto) {
      const d = new Date(comprador.data_contacto);
      const tzOffset = d.getTimezoneOffset() * 60000;
      const localISOTime = (new Date(d.getTime() - tzOffset)).toISOString().slice(0, 16);
      setCDataContacto(localISOTime);
    } else {
      setCDataContacto('');
    }

    setIsCompradorModalOpen(true);
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
            notes_match: notas, // Mapeado para notas_match
            notas: notas, // Mapeado para notas por segurança
            updated_at: new Date().toISOString()
          },
          { onConflict: 'comprador_id,imovel_id' }
        );

      if (error) throw error;
      showToast('Estado de venda atualizado!');
      fetchData();
    } catch (err: any) {
      showToast('Erro ao atualizar estado: ' + err.message, 'error');
    }
  };

  // Contacto rápido
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
      showToast('Erro ao atualizar contacto: ' + err.message, 'error');
    }
  };

  // Apagar registos
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

  // Auxiliares do form
  const handleAddZona = () => {
    const concelho = cZonaInput.trim();
    if (concelho && !cZonas.includes(concelho)) {
      setCZonas([...cZonas, concelho]);
      setCZonaInput('');
    }
  };

  const handleRemoveZona = (zonaToRemove: string) => {
    setCZonas(cZonas.filter(z => z !== zonaToRemove));
  };

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

  // --- CALENDÁRIO ---
  const getCalendarEvents = (): CalendarEvent[] => {
    const events: CalendarEvent[] = [];

    vendedores.forEach(v => {
      const d = v.created_at.split('T')[0];
      events.push({
        date: d,
        type: 'imovel',
        title: `Registo de Imóvel`,
        label: `${v.tipo_imovel} (${v.tipologia}) - ${v.proprietario_nome}`,
        desc: `Preço: ${formatCurrency(v.preco_objetivo)} em ${v.freguesia}, ${v.cidade}.`,
        originalId: v.id
      });

      const u = v.updated_at.split('T')[0];
      if (u !== d) {
        events.push({
          date: u,
          type: 'imovel_update',
          title: `Atualização de Imóvel`,
          label: `${v.tipo_imovel} (${v.tipologia}) - ${v.proprietario_nome}`,
          desc: `Alterado em ${v.freguesia}.`,
          originalId: v.id
        });
      }
    });

    compradores.forEach(c => {
      const d = c.created_at.split('T')[0];
      events.push({
        date: d,
        type: 'comprador',
        title: `Novo Comprador (Lead)`,
        label: `${c.comprador_nome} - Contacto: ${c.comprador_contacto}`,
        desc: `Orçamento Máx: ${formatCurrency(c.orcamento_maximo)}.`,
        originalId: c.id
      });

      const u = c.updated_at.split('T')[0];
      if (u !== d) {
        events.push({
          date: u,
          type: 'comprador_update',
          title: `Atualização de Comprador`,
          label: `${c.comprador_nome}`,
          desc: `Dados de requisitos reajustados.`,
          originalId: c.id
        });
      }

      if (c.foi_contactado && c.data_contacto) {
        const dc = c.data_contacto.split('T')[0];
        events.push({
          date: dc,
          type: 'contacto',
          title: `Contacto com Cliente`,
          label: `${c.comprador_nome}`,
          desc: `Contacto efetuado com sucesso.`,
          originalId: c.id
        });
      }
    });

    return events;
  };

  const calendarEvents = getCalendarEvents();

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
      const cellDateStr = cellDate.toISOString().split('T')[0];

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

  // Agrupamento do Kanban baseados nas interações ativas (Matches)
  // Colunas: Pendente, Visita Agendada, Proposta Apresentada, Negócio Fechado
  const getColMatches = (estado: string) => {
    return allMatches.filter(m => m.estado_match === estado);
  };

  // Estatísticas do Dashboard
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

      {/* BARRA LATERAL ESQUERDA (SaaS Style) */}
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
          
          {/* TAB 1: PAINEL GERAL (DASHBOARD) */}
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

              {/* Tabela de Atividades Recentes */}
              <div className="data-table-card" style={{ marginTop: 0 }}>
                <div className="table-header-bar">
                  <h3 className="table-header-title">Ultimos Matches Qualificados</h3>
                </div>
                <div style={{ overflowX: 'auto' }}>
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
                        <tr key={idx}>
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
              </div>
            </div>
          )}

          {/* TAB 2: GESTÃO DE NEGÓCIOS (KANBAN BOARD) */}
          {activeMenu === 'kanban' && (
            <div className="kanban-board">
              
              {/* COLUNA 1: NOVAS LEADS (Pendente) */}
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
                  />
                ))}
              </div>

              {/* COLUNA 2: EM CONTACTO (Visita Agendada) */}
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
                  />
                ))}
              </div>

              {/* COLUNA 3: PROPOSTA APRESENTADA */}
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
                  />
                ))}
              </div>

              {/* COLUNA 4: NEGÓCIO FECHADO */}
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
                  />
                ))}
              </div>

            </div>
          )}

          {/* TAB 3: IMÓVEIS (VENDEDORES) */}
          {activeMenu === 'imoveis' && (
            <div className="data-table-card">
              <div className="table-header-bar">
                <h3 className="table-header-title">Lista de Propriedades</h3>
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
                    setIsImovelModalOpen(true);
                  }}
                >
                  <Plus size={16} />
                  <span>Adicionar Imóvel</span>
                </button>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="app-table">
                  <thead>
                    <tr>
                      <th>Proprietário</th>
                      <th>Imóvel</th>
                      <th>Localização</th>
                      <th>Preço Anunciado</th>
                      <th>Área (m²)</th>
                      <th>Urgência</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vendedores.map(imovel => (
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
                          <span className={`badge badge-urgencia-${imovel.urgencia}`}>
                            {imovel.urgencia}
                          </span>
                        </td>
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
                    {vendedores.length === 0 && (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                          Nenhum imóvel registado. Clica em "Adicionar Imóvel" para começar.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: COMPRADORES */}
          {activeMenu === 'compradores' && (
            <div className="data-table-card">
              <div className="table-header-bar">
                <h3 className="table-header-title">Lista de Leads de Compradores</h3>
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
                    setIsCompradorModalOpen(true);
                  }}
                >
                  <Plus size={16} />
                  <span>Registar Comprador</span>
                </button>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table className="app-table">
                  <thead>
                    <tr>
                      <th>Comprador</th>
                      <th>Orçamento Máx.</th>
                      <th>Preferências</th>
                      <th>Zonas Pretendidas</th>
                      <th>Urgência</th>
                      <th>Último Contacto</th>
                      <th>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {compradores.map(comp => (
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
                          <span className={`badge badge-urgencia-${comp.urgencia}`}>
                            {comp.urgencia}
                          </span>
                        </td>
                        <td>
                          {comp.foi_contactado ? (
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ color: 'var(--urgency-baixa)', fontWeight: 600, fontSize: '0.8rem' }}>Contactado</span>
                              {comp.data_contacto && (
                                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                                  {new Date(comp.data_contacto).toLocaleDateString('pt-PT')}
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
                    {compradores.length === 0 && (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
                          Nenhum comprador registado. Clica em "Registar Comprador" para começar.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: CALENDÁRIO */}
          {activeMenu === 'calendario' && (
            <div className="calendar-wrapper">
              <div className="calendar-main-card">
                <div className="calendar-header-nav">
                  <button onClick={prevMonth} className="btn-quick-action" style={{ backgroundColor: 'var(--bg-input)' }}>
                    <ChevronLeft size={16} />
                  </button>
                  <h2 className="calendar-month-title">
                    {monthNames[calendarDate.getMonth()]} {calendarDate.getFullYear()}
                  </h2>
                  <button onClick={nextMonth} className="btn-quick-action" style={{ backgroundColor: 'var(--bg-input)' }}>
                    <ChevronRight size={16} />
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
              </div>

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
                        Nenhum evento agendado para este dia.
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

          {/* Banner Promocional Inferior (Design da Referência) */}
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

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <nav className="mobile-bottom-nav">
        <button 
          className={`mobile-nav-item ${activeMenu === 'dashboard' ? 'active' : ''}`}
          onClick={() => setActiveMenu('dashboard')}
        >
          <LayoutDashboard size={20} />
          <span>Painel</span>
        </button>
        <button 
          className={`mobile-nav-item ${activeMenu === 'kanban' ? 'active' : ''}`}
          onClick={() => setActiveMenu('kanban')}
        >
          <FolderKanban size={20} />
          <span>CRM</span>
        </button>
        <button 
          className={`mobile-nav-item ${activeMenu === 'imoveis' ? 'active' : ''}`}
          onClick={() => setActiveMenu('imoveis')}
        >
          <Home size={20} />
          <span>Imóveis</span>
        </button>
        <button 
          className={`mobile-nav-item ${activeMenu === 'compradores' ? 'active' : ''}`}
          onClick={() => setActiveMenu('compradores')}
        >
          <Users size={20} />
          <span>Clientes</span>
        </button>
        <button 
          className={`mobile-nav-item ${activeMenu === 'calendario' ? 'active' : ''}`}
          onClick={() => setActiveMenu('calendario')}
        >
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
                  onChange={(e) => setVNome(e.target.value)}
                  placeholder="Ex: Manuel Antunes"
                  required
                />
              </div>

              <div className="form-group">
                <label>Contacto*</label>
                <input 
                  type="text" 
                  value={vContacto}
                  onChange={(e) => setVContacto(e.target.value)}
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
                  onChange={(e) => setVPrecoObj(e.target.value)}
                  placeholder="Ex: 245000"
                  required
                />
              </div>

              <div className="form-group">
                <label>Preço Mínimo Oculto (€)*</label>
                <input 
                  type="number" 
                  value={vPrecoMin}
                  onChange={(e) => setVPrecoMin(e.target.value)}
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
                  onChange={(e) => setVArea(e.target.value)}
                  placeholder="Ex: 110"
                  required
                />
              </div>

              <div className="form-group">
                <label>Andar / Piso*</label>
                <input 
                  type="text" 
                  value={vAndar}
                  onChange={(e) => setVAndar(e.target.value)}
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

              <div className="form-group form-group-full">
                <label>Morada / Rua*</label>
                <input 
                  type="text" 
                  value={vRua}
                  onChange={(e) => setVRua(e.target.value)}
                  placeholder="Nome da rua e lote"
                  required
                />
              </div>

              <div className="form-group">
                <label>Cidade (Concelho)*</label>
                <input 
                  type="text" 
                  value={vCidade}
                  list="cidades-modal"
                  onChange={(e) => {
                    setVCidade(e.target.value);
                    fetchConcelhos(e.target.value);
                  }}
                  placeholder="Ex: Beja"
                  required
                />
                <datalist id="cidades-modal">
                  {concelhoSugestoes.map((c, idx) => <option key={idx} value={c} />)}
                </datalist>
              </div>

              <div className="form-group">
                <label>Freguesia*</label>
                <input 
                  type="text" 
                  value={vFreguesia}
                  list="freguesias-modal"
                  onChange={(e) => {
                    setVFreguesia(e.target.value);
                    fetchFreguesias(e.target.value, vCidade);
                  }}
                  placeholder="Ex: Salvador"
                  required
                />
                <datalist id="freguesias-modal">
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
                  onChange={(e) => setCNome(e.target.value)}
                  placeholder="Ex: Carolina Pais"
                  required
                />
              </div>

              <div className="form-group">
                <label>Contacto Telefónico*</label>
                <input 
                  type="text" 
                  value={cContacto}
                  onChange={(e) => setCContacto(e.target.value)}
                  placeholder="Ex: 934567890"
                  required
                />
              </div>

              <div className="form-group">
                <label>Orçamento Máximo (€)*</label>
                <input 
                  type="number" 
                  value={cOrcamento}
                  onChange={(e) => setCOrcamento(e.target.value)}
                  placeholder="Ex: 320000"
                  required
                />
              </div>

              <div className="form-group form-group-full">
                <label>Tipo de Propriedade Pretendida* (Múltiplo)</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
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
                <label>Tipologias Aceitáveis* (Múltiplo)</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '4px' }}>
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
                <label>Zonas Geográficas Pretendidas*</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input 
                    type="text" 
                    value={cZonaInput}
                    list="zonas-modal"
                    onChange={(e) => {
                      setCZonaInput(e.target.value);
                      fetchConcelhos(e.target.value);
                    }}
                    placeholder="Escreve e clica em (+)"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddZona();
                      }
                    }}
                  />
                  <datalist id="zonas-modal">
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
              </div>

              {/* Qualificação do contacto */}
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

    </div>
  );
}

// Sub-componente de Cartão de Kanban para simplificar o ficheiro
interface KanbanCardProps {
  match: Match;
  compradores: Comprador[];
  vendedores: Imovel[];
  onStatusChange: (compradorId: string, imovelId: string, estado: string, notas: string) => Promise<void>;
  onToggleContacto: (compradorId: string, foiContactado: boolean) => Promise<void>;
  onEditComprador: (comp: Comprador) => void;
}

function KanbanCard({ match, compradores, vendedores, onStatusChange, onToggleContacto, onEditComprador }: KanbanCardProps) {
  const compradorDetalhe = compradores.find(c => c.id === match.comprador_id);
  const imovelDetalhe = vendedores.find(v => v.id === match.imovel_id);
  
  const [localNotas, setLocalNotas] = useState(match.notas_match || '');

  // Atualizar o input se as notas mudarem no Supabase
  useEffect(() => {
    setLocalNotas(match.notas_match || '');
  }, [match.notas_match]);

  const iniciais = match.comprador_nome
    ? match.comprador_nome.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
    : 'C';

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-PT', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(val);
  };

  // Determinar o badge do perfil baseado na urgência e orçamento
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

      {/* Painel do Imóvel de Match (Interested In) */}
      <div className="card-interested-box">
        <div className="interested-thumbnail">
          <Building size={18} />
        </div>
        <div className="interested-details">
          <span className="interested-lbl">Interessado em</span>
          <span className="interested-name">{imovelDetalhe?.tipo_imovel || 'Propriedade'} ({match.tipologia})</span>
          <span className="interested-location">
            <MapPin size={10} style={{ display: 'inline', marginRight: '2px' }} />
            {match.freguesia}, {match.cidade}
          </span>
        </div>
      </div>

      {/* CRM Controlos Integrados no Cartão */}
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
