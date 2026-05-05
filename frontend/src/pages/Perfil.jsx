import React, { useEffect, useState, useCallback } from 'react'
import { useGame } from '../context/GameContext'
import { Link } from 'react-router-dom'
import API from '../api'
import { fmt, gerarDescricaoItem } from '../utils'
import PageGuide from '../components/PageGuide'

// Componente do botão com timer (motorzinho local para o tempo do Go)
function BotaoCooldown({ ts, onUsar }) {
  const calcularRestante = () => {
    if (!ts) return 0
    const dif = ts - Math.floor(Date.now() / 1000)
    return dif > 0 ? dif : 0
  }

  const [restante, setRestante] = useState(calcularRestante())

  useEffect(() => {
    setRestante(calcularRestante())
    if (ts <= Math.floor(Date.now() / 1000)) return

    const intervalo = setInterval(() => {
      const tempoAgora = calcularRestante()
      setRestante(tempoAgora)
      if (tempoAgora <= 0) clearInterval(intervalo)
    }, 1000)

    return () => clearInterval(intervalo)
  }, [ts])

  if (restante > 0) {
    const min = Math.floor(restante / 60)
    const seg = String(restante % 60).padStart(2, '0')
    return (
      <button className="btn-work btn-small perfil-btn perfil-btn-disabled" disabled>
        ⏳ {min}:{seg}
      </button>
    )
  }

  return (
    <button className="btn-work btn-small perfil-btn perfil-btn-success" onClick={onUsar}>
      Usar
    </button>
  )
}

export default function Perfil() {
  const { jogador, setJogador, jogadorID, mostrarNotificacao, setLevelUp, recarregarJogador, avatares, getAvatar } = useGame()
  const [inventario, setInventario] = useState([])
  const [itensFama, setItensFama] = useState([])
  const [tasks, setTasks] = useState([])
  const [clube, setClube] = useState(null)

  const carregarDados = async () => {
    if (!jogadorID) return
    try {
      const [inv, fama, tsk] = await Promise.all([
        API.get('/api/inventario/' + jogadorID),
        API.get('/api/itens-fama'),
        API.get('/api/tasks/' + jogadorID)
      ])
      setInventario(inv)
      setItensFama(fama)
      setTasks(tsk)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    carregarDados()
    if (jogadorID) API.get('/api/clube/atual/' + jogadorID).then(setClube).catch(() => {})
  }, [jogadorID])

  async function selecionarAvatar(id) {
    const res = await API.post('/api/jogador/' + jogadorID, { avatar: id })
    setJogador(res)
    mostrarNotificacao('Avatar atualizado!', 'sucesso')
  }

  async function usarItem(itemID) {
    const res = await API.post('/api/usar-item', { jogador_id: jogadorID, item_id: itemID })
    if (res.sucesso) {
      setJogador(res.jogador)
      carregarDados()
      mostrarNotificacao(res.mensagem, 'sucesso')
    } else {
      mostrarNotificacao(res.mensagem, 'erro')
    }
  }

  async function equipar(itemID, eq) {
    const res = await API.post('/api/equipar', { jogador_id: jogadorID, item_id: itemID, equipar: eq })
    if (res.sucesso) {
      setJogador(res.jogador)
      carregarDados()
      mostrarNotificacao(res.mensagem, 'sucesso')
    } else {
      mostrarNotificacao(res.mensagem, 'erro')
    }
  }

  async function venderItem(itemID) {
    const res = await API.post('/api/vender-item', { jogador_id: jogadorID, item_id: itemID })
    if (res.sucesso) {
      setJogador(res.jogador)
      carregarDados()
      mostrarNotificacao(res.mensagem, 'sucesso')
    } else {
      mostrarNotificacao(res.mensagem, 'erro')
    }
  }

  async function coletarTask(taskID) {
    const res = await API.post('/api/completar-task', { jogador_id: jogadorID, task_id: taskID })
    if (res.sucesso) {
      setJogador(res.jogador)
      carregarDados()
      mostrarNotificacao(res.mensagem, 'sucesso')
      if (res.level_up) setLevelUp(res.novo_nivel)
    } else {
      mostrarNotificacao(res.mensagem, 'erro')
    }
  }

  if (!jogador) return null

  const xpPct = Math.min(100, Math.round((jogador.xp / jogador.xp_proximo) * 100))

  // Borda de status por nível
  const getBordaTier = (nivel) => {
    if (nivel >= 190) return 'desafiante'
    if (nivel >= 160) return 'grao-mestre'
    if (nivel >= 135) return 'mestre'
    if (nivel >= 100) return 'diamante'
    if (nivel >= 72) return 'esmeralda'
    if (nivel >= 50) return 'platina'
    if (nivel >= 30) return 'ouro'
    if (nivel >= 20) return 'prata'
    if (nivel >= 10) return 'bronze'
    return 'ferro'
  }
  const bordaTier = getBordaTier(jogador.nivel)
  const TIER_NOMES = {
    ferro: 'Ferro', bronze: 'Bronze', prata: 'Prata', ouro: 'Ouro',
    platina: 'Platina', esmeralda: 'Esmeralda', diamante: 'Diamante',
    mestre: 'Mestre', 'grao-mestre': 'Grão-Mestre', desafiante: 'Desafiante'
  }
  const desbloqueados = (jogador.avatares_premium || '')
    .split(',')
    .filter(Boolean)
    .map(Number)

  const RAR_COR = { comum: '#666', raro: '#2980b9', epico: '#8e44ad', lendario: '#f39c12' }
  const RAR_BG = { comum: '#f5f5f5', raro: '#e8f4fd', epico: '#f3e8fd', lendario: '#fdf8e8' }
  const RAR_BORDER = { comum: '#ccc', raro: '#85c1e9', epico: '#bb8fce', lendario: '#f0c040' }
  const equipados = inventario.filter(i => i.equipado)
  const consumiveis = inventario.filter(i => !i.equipado && i.item?.tipo === 'consumivel')
  const outrosItens = inventario.filter(i => !i.equipado && i.item?.tipo !== 'consumivel')
  const winRate = jogador.vitorias + jogador.derrotas > 0 ? Math.round((jogador.vitorias / (jogador.vitorias + jogador.derrotas)) * 100) : 0
  const temPontos = jogador.pontos_atributo > 0

  async function distribuirPonto(atributo) {
    const res = await API.post('/api/distribuir-ponto', { jogador_id: jogadorID, atributo })
    if (res.sucesso) {
      setJogador(res.jogador)
      mostrarNotificacao(res.mensagem, 'sucesso')
    } else {
      mostrarNotificacao(res.mensagem, 'erro')
    }
  }

  return (
    <div className="pf" data-tutorial="perfil-area">
      <PageGuide
        pageKey="perfil"
        icone="👤"
        titulo="Painel do Jogador"
        texto="Aqui você vê tudo: atributos, equipamentos, tarefas diárias e conquistas. Equipe itens para ficar mais forte e complete tarefas para ganhar recompensas!"
      />

      {/* === CARD DO JOGADOR === */}
      <div className={`pf-hero pf-elo-${bordaTier}`}>
        <div className="pf-hero-inner">
        <div className="pf-hero-bg" />
        <div className="pf-hero-content">
          <div className="pf-avatar-frame">
            <img
              src={`/elos/${bordaTier}.png`}
              alt={TIER_NOMES[bordaTier]}
              className="pf-elo-img"
              onError={e => { e.target.style.display = 'none' }}
            />
            <div className="pf-avatar">{getAvatar(jogador.avatar)}</div>
            <div className={`pf-elo-tag pf-elo-tag-${bordaTier}`}>{TIER_NOMES[bordaTier]}</div>
          </div>
          <div className="pf-avatar-selector">
            {avatares.filter(a => a.tipo === 'comum').map(a => (
              <span key={a.id} className={`pf-av-opt${jogador.avatar === a.id ? ' sel' : ''}`}
                onClick={() => selecionarAvatar(a.id)}>{a.icone}</span>
            ))}
            {desbloqueados.map(id => {
              const av = avatares.find(a => a.id === id)
              return av ? <span key={id} className={`pf-av-opt prem${jogador.avatar === id ? ' sel' : ''}`}
                onClick={() => selecionarAvatar(id)}>{av.icone}</span> : null
            })}
          </div>
          <div className="pf-hero-info">
            <div className="pf-nome">{jogador.nome}</div>
            {jogador.titulo && <div className="pf-titulo">{jogador.titulo}</div>}
            <div className="pf-rank-row">
              <span className="pf-rank">{jogador.rank || 'Peladeiro'}</span>
              {jogador.posicao && <span className="pf-pos-badge">{
                {GK:'🧤 Goleiro', DEF:'🛡️ Defensor', MED:'🎯 Meia', ATA:'⚽ Atacante'}[jogador.posicao] || jogador.posicao
              }</span>}
            </div>
            {clube && clube.tem_clube && (
              <div className="pf-clube-row">
                <span className="pf-clube-badge" style={{ background: `linear-gradient(135deg, ${clube.cor1}, ${clube.cor2})` }}>
                  {clube.icone} {clube.nome}
                </span>
                {clube.camisa > 0 && <span className="pf-camisa-badge">#{clube.camisa}</span>}
              </div>
            )}
            <div className="pf-level-row">
              <span className="pf-level-chip">LVL {jogador.nivel}</span>
              <span className="pf-xp-text">{jogador.xp}/{jogador.xp_proximo} XP</span>
            </div>
            <div className="pf-xp-bar"><div className="pf-xp-fill" style={{ width: xpPct + '%' }} /></div>
            <div className="pf-code">Código: <strong>{jogador.codigo_amigo}</strong></div>
          </div>
        </div>
        {jogador.titulos && (
          <div className="pf-hero-titulos">
            <div className="pf-hero-titulos-label">🏅 Títulos</div>
            <div className="pf-hero-titulos-list">
              {jogador.titulos.split(',').filter(Boolean).map((t, i) => (
                <span key={i} className={`pf-hero-titulo-badge${t === jogador.titulo ? ' pf-hero-titulo-ativo' : ''}`}>{t}</span>
              ))}
            </div>
          </div>
        )}
        </div>{/* fecha pf-hero-inner */}
      </div>

      {/* === STATS GRID === */}
      <div className="pf-stats">
        <div className="pf-stat">
          <span className="pf-stat-icon">💪</span><span className="pf-stat-val">{jogador.forca}</span><span className="pf-stat-lbl">Força</span>
          {temPontos && <button className="pf-stat-plus" onClick={() => distribuirPonto('forca')}>+</button>}
        </div>
        <div className="pf-stat">
          <span className="pf-stat-icon">🏃</span><span className="pf-stat-val">{jogador.velocidade}</span><span className="pf-stat-lbl">Velocidade</span>
          {temPontos && <button className="pf-stat-plus" onClick={() => distribuirPonto('velocidade')}>+</button>}
        </div>
        <div className="pf-stat">
          <span className="pf-stat-icon">⚽</span><span className="pf-stat-val">{jogador.habilidade}</span><span className="pf-stat-lbl">Habilidade</span>
          {temPontos && <button className="pf-stat-plus" onClick={() => distribuirPonto('habilidade')}>+</button>}
        </div>
        <div className="pf-stat"><span className="pf-stat-icon">💰</span><span className="pf-stat-val">R${fmt(jogador.dinheiro_mao)}</span><span className="pf-stat-lbl">Dinheiro</span></div>
        <div className="pf-stat"><span className="pf-stat-icon">⭐</span><span className="pf-stat-val">{jogador.pontos_fama}</span><span className="pf-stat-lbl">Fama</span></div>
        <div className="pf-stat"><span className="pf-stat-icon">⚔️</span><span className="pf-stat-val">{jogador.vitorias}V/{jogador.derrotas}D</span><span className="pf-stat-lbl">{winRate}% Win</span></div>
      </div>

      {/* === PONTOS DE ATRIBUTO === */}
      <div className="pf-section">
        <div className="pf-section-header"><h3>🎯 PONTOS DE ATRIBUTO</h3></div>
        <div className="pf-pontos-info">
          <div className="pf-pontos-disponiveis">
            <span className="pf-pontos-num">{jogador.pontos_atributo || 0}</span>
            <span className="pf-pontos-lbl">ponto{(jogador.pontos_atributo || 0) !== 1 ? 's' : ''} disponíve{(jogador.pontos_atributo || 0) !== 1 ? 'is' : 'l'}</span>
          </div>
          <div className="pf-pontos-progresso">
            <div className="pf-pontos-bar-bg">
              <div className="pf-pontos-bar-fill" style={{ width: `${((jogador.vitorias % 20) / 20) * 100}%` }} />
            </div>
            <span className="pf-pontos-bar-txt">{jogador.vitorias % 20}/20 vitórias para o próximo ponto</span>
          </div>
        </div>
      </div>

      {/* === PATRIMÔNIO === */}
      <PatrimonioSection jogadorID={jogadorID} />

      {/* === CASA === */}
      <CasaCard jogadorID={jogadorID} jogador={jogador} setJogador={setJogador} mostrarNotificacao={mostrarNotificacao} setLevelUp={setLevelUp} />

      {/* === CAMPINHO === */}
      <CampinhoSection jogadorID={jogadorID} jogador={jogador} setJogador={setJogador} mostrarNotificacao={mostrarNotificacao} setLevelUp={setLevelUp} />

      {/* === MORAL === */}
      <MoralSection jogador={jogador} jogadorID={jogadorID} setJogador={setJogador} mostrarNotificacao={mostrarNotificacao} />

      {/* === OBJETIVOS DO CLUBE === */}
      {jogador.clube_id > 0 && (
        <ClubeObjetivosSection jogadorID={jogadorID} setJogador={setJogador} mostrarNotificacao={mostrarNotificacao} setLevelUp={setLevelUp} />
      )}

      {/* === FAMA & PATROCÍNIO === */}
      <FamaCard jogadorID={jogadorID} jogador={jogador} setJogador={setJogador} mostrarNotificacao={mostrarNotificacao} />

      {/* === CENTRAL DE RECUPERAÇÃO === */}
      <TratamentoSection jogadorID={jogadorID} jogador={jogador} setJogador={setJogador} mostrarNotificacao={mostrarNotificacao} />

    </div>
  )
}

const TRATAMENTOS = [
  {
    id: 'meditacao', nome: 'Meditação', icone: '🧘',
    desc: 'Foco mental e vitalidade renovada.',
    custoBase: 8000, custoNivel: 400,
    ganhos: (n) => `+${5 + Math.floor(n/5)} Saúde · +${20 + Math.floor(n/4)} Vitalidade`,
  },
  {
    id: 'nutricao', nome: 'Nutricionista', icone: '🥗',
    desc: 'Dieta equilibrada para o corpo.',
    custoBase: 12000, custoNivel: 640,
    ganhos: (n) => `+${8 + Math.floor(n/4)} Saúde · +${12 + Math.floor(n/5)} Vitalidade · +${3 + Math.floor(n/15)} Energia`,
  },
  {
    id: 'psicologo', nome: 'Psicólogo', icone: '🧠',
    desc: 'Sessão de terapia para renovar a mente.',
    custoBase: 16000, custoNivel: 800,
    ganhos: (n) => `+${20 + Math.floor(n/2)} Saúde · +${10 + Math.floor(n/5)} Vitalidade`,
  },
  {
    id: 'academia', nome: 'Academia', icone: '🏋️',
    desc: 'Treino pesado: recupera saúde, força e vitalidade.',
    custoBase: 20000, custoNivel: 960,
    ganhos: (n) => `+${10 + Math.floor(n/3)} Saúde · +1 Força · +${15 + Math.floor(n/5)} Vitalidade`,
  },
  {
    id: 'fisioterapia', nome: 'Fisioterapia', icone: '💆',
    desc: 'Recuperação corporal completa.',
    custoBase: 28000, custoNivel: 1200,
    ganhos: (n) => `+${15 + Math.floor(n/3)} Saúde · +${20 + Math.floor(n/4)} Vitalidade · +${5 + Math.floor(n/10)} Energia`,
  },
  {
    id: 'spa', nome: 'Day Spa', icone: '🧖',
    desc: 'Relaxamento total: corpo e mente.',
    custoBase: 40000, custoNivel: 1600,
    ganhos: (n) => `+${25 + Math.floor(n/2)} Saúde · +${25 + Math.floor(n/3)} Vitalidade · +${8 + Math.floor(n/8)} Energia`,
  },
]

function TratamentoSection({ jogadorID, jogador, setJogador, mostrarNotificacao }) {
  const [loading, setLoading] = useState(null)

  async function fazerTratamento(tratamentoID) {
    const t = TRATAMENTOS.find(x => x.id === tratamentoID)
    if (!t) return
    const custo = t.custoBase + t.custoNivel * jogador.nivel
    if (!confirm(`Fazer ${t.nome} por R$ ${fmt(custo)}?`)) return
    setLoading(tratamentoID)
    try {
      const res = await API.post('/api/tratamento', { jogador_id: jogadorID, tratamento_id: tratamentoID })
      if (res.sucesso) {
        setJogador(res.jogador)
        const g = res.ganhos || {}
        const parts = []
        if (g.saude > 0) parts.push(`+${g.saude} Saúde`)
        if (g.vitalidade > 0) parts.push(`+${g.vitalidade} Vitalidade`)
        if (g.forca > 0) parts.push(`+${g.forca} Força`)
        if (g.energia > 0) parts.push(`+${g.energia} Energia`)
        mostrarNotificacao(`${t.icone} ${parts.join(' · ')}`, 'sucesso')
      } else {
        mostrarNotificacao(res.mensagem, 'erro')
      }
    } catch { mostrarNotificacao('Erro de conexão', 'erro') }
    setLoading(null)
  }

  if (!jogador) return null

  const saudeBaixa = jogador.saude < 30

  return (
    <div className="pf-section">
      <div className="pf-section-header">
        <h3>🏥 CENTRAL DE TRATAMENTO</h3>
        <span className="pf-section-badge">❤️ {jogador.saude}/100 · 💚 {jogador.vitalidade}/{jogador.vitalidade_max}</span>
      </div>

      {saudeBaixa && (
        <div style={{
          background: '#ffeaea', border: '2px solid var(--vermelho)', borderRadius: 10,
          padding: '10px 14px', marginBottom: 12, fontSize: 12, color: '#b00', fontWeight: 900
        }}>
          ⚠️ Saúde abaixo de 30! Você não pode trabalhar. Faça um tratamento!
        </div>
      )}

      <div className="pf-inv-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
        {TRATAMENTOS.map(t => {
          const custo = t.custoBase + t.custoNivel * jogador.nivel
          const semDinheiro = jogador.dinheiro_mao < custo
          const isLoading = loading === t.id
          return (
            <div key={t.id} className="pf-inv-card" style={{ borderColor: semDinheiro ? '#ccc' : 'var(--azul-claro)' }}>
              <div className="pf-inv-top">
                <span className="pf-inv-icon">{t.icone}</span>
              </div>
              <div className="pf-inv-name">{t.nome}</div>
              <div className="pf-inv-desc">{t.desc}</div>
              <div className="pf-inv-desc" style={{ color: 'var(--azul)', fontWeight: 900 }}>
                {t.ganhos(jogador.nivel)}
              </div>
              <div className="pf-inv-actions">
                <button
                  className={`btn-work btn-small${semDinheiro ? '' : ' btn-verde'}`}
                  onClick={() => fazerTratamento(t.id)}
                  disabled={isLoading || semDinheiro}
                >
                  {isLoading ? '...' : `R$ ${fmt(custo)}`}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

const RANK_CORES = {
  'Desconhecido': '#888',
  'Promessa': '#27ae60',
  'Famoso': '#2980b9',
  'Estrela': '#8e44ad',
  'Ídolo': '#f39c12',
  'Lenda Viva': '#e74c3c',
}

function FamaCard({ jogadorID, jogador, setJogador, mostrarNotificacao }) {
  const [famaData, setFamaData] = useState(null)
  const [loading, setLoading] = useState(false)

  const carregar = useCallback(() => {
    if (!jogadorID) return
    API.get('/api/fama/' + jogadorID).then(setFamaData).catch(() => {})
  }, [jogadorID])

  useEffect(() => { carregar() }, [carregar])

  if (!famaData || !jogador) return null

  const rank = famaData.rank
  const ranks = famaData.ranks || []
  const fama = famaData.fama || 0
  const corRank = RANK_CORES[rank.rank] || '#888'

  // Progresso dentro do rank atual
  const rangeRank = rank.max - rank.min + 1
  const progressoRank = Math.min(100, Math.round(((fama - rank.min) / rangeRank) * 100))

  // Próximo rank
  const idxAtual = ranks.findIndex(r => r.rank === rank.rank)
  const proximoRank = idxAtual < ranks.length - 1 ? ranks[idxAtual + 1] : null
  const faltaProximo = proximoRank ? proximoRank.min - fama : 0

  async function coletarPatrocinio() {
    setLoading(true)
    try {
      const res = await API.post('/api/fama/coletar-patrocinio', { jogador_id: jogadorID })
      if (res.sucesso) {
        if (res.jogador) setJogador(res.jogador)
        mostrarNotificacao(res.mensagem, 'sucesso')
        carregar()
      } else {
        mostrarNotificacao(res.mensagem, 'erro')
      }
    } catch { mostrarNotificacao('Erro de conexão', 'erro') }
    setLoading(false)
  }

  return (
    <div className="pf-section">
      <div className="pf-section-header"><h3>⭐ FAMA & PATROCÍNIO</h3></div>

      {/* Rank atual */}
      <div className="fama-rank-card" style={{ borderColor: corRank }}>
        <div className="fama-rank-top">
          <span className="fama-rank-nome" style={{ color: corRank }}>{rank.rank}</span>
          <span className="fama-pontos">{fmt(fama)} Fama</span>
        </div>

        {/* Barra de progresso */}
        <div className="fama-bar-container">
          <div className="fama-bar">
            <div className="fama-bar-fill" style={{ width: progressoRank + '%', background: corRank }} />
          </div>
          {proximoRank && (
            <div className="fama-proximo">
              Faltam <strong>{fmt(faltaProximo)}</strong> para <span style={{ color: RANK_CORES[proximoRank.rank] || '#888' }}>{proximoRank.rank}</span>
            </div>
          )}
        </div>

        {/* Bônus do rank */}
        <div className="fama-bonus-grid">
          {rank.bonus_xp > 0 && (
            <div className="fama-bonus-item">
              <span className="fama-bonus-icon">📊</span>
              <span>+{Math.round(rank.bonus_xp * 100)}% XP</span>
            </div>
          )}
          {rank.renda_hora > 0 && (
            <div className="fama-bonus-item">
              <span className="fama-bonus-icon">💰</span>
              <span>R$ {fmt(rank.renda_hora)}/hora</span>
            </div>
          )}
          {rank.moedas_dia > 0 && (
            <div className="fama-bonus-item">
              <span className="fama-bonus-icon">🪙</span>
              <span>+{rank.moedas_dia} moeda/dia</span>
            </div>
          )}
          {rank.bonus_xp === 0 && rank.renda_hora === 0 && (
            <div className="fama-bonus-item" style={{ color: '#999' }}>
              Alcance 500 fama para desbloquear bônus!
            </div>
          )}
        </div>

        {/* Patrocínio */}
        {rank.patrocinio && (
          <div className="fama-patrocinio">
            <div className="fama-patrocinio-nome">🤝 Patrocínio: <strong>{rank.patrocinio}</strong></div>
            {famaData.patrocinio_acumulado > 0 && (
              <button className="btn-work btn-verde btn-small" onClick={coletarPatrocinio} disabled={loading}>
                {loading ? '...' : `💰 Coletar R$ ${fmt(famaData.patrocinio_acumulado)}`}
              </button>
            )}
            {!famaData.patrocinio_acumulado && (
              <span style={{ fontSize: 11, color: '#888' }}>Acumulando renda...</span>
            )}
          </div>
        )}

        {/* Status de proteção */}
        <div className="fama-protecao">
          {famaData.protegido
            ? <span style={{ color: 'var(--verde)' }}>🛡️ Protegido! Fez PvP hoje — sem decaimento.</span>
            : <span style={{ color: '#c0392b' }}>⚠️ Faça PvP hoje para evitar perda de fama!</span>
          }
        </div>
      </div>

      {/* Ranks disponíveis */}
      <div className="fama-ranks-lista">
        {ranks.map(r => {
          const ativo = r.rank === rank.rank
          const cor = RANK_CORES[r.rank] || '#888'
          const atingido = fama >= r.min
          return (
            <div key={r.rank} className={`fama-rank-pill${ativo ? ' fama-rank-ativo' : ''}${!atingido ? ' fama-rank-locked' : ''}`}
              style={ativo ? { borderColor: cor, background: cor + '18' } : {}}>
              <span className="fama-pill-nome" style={{ color: atingido ? cor : '#aaa' }}>{r.rank}</span>
              <span className="fama-pill-min">{fmt(r.min)}+</span>
              {r.bonus_xp > 0 && <span className="fama-pill-bonus">+{Math.round(r.bonus_xp * 100)}% XP</span>}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function CampinhoSection({ jogadorID, jogador, setJogador, mostrarNotificacao, setLevelUp }) {
  const [campinho, setCampinho] = useState(null)
  const [materiais, setMateriais] = useState({})
  const [requisitos, setRequisitos] = useState([])
  const [reqCompletos, setReqCompletos] = useState(false)
  const [loading, setLoading] = useState(false)

  const carregar = useCallback(() => {
    if (!jogadorID) return
    API.get('/api/campinho/' + jogadorID).then(res => {
      setCampinho(res.campinho)
      if (res.materiais) setMateriais(res.materiais)
      if (res.requisitos) setRequisitos(res.requisitos)
      setReqCompletos(res.requisitos_completos || false)
    }).catch(() => {})
  }, [jogadorID])

  useEffect(() => { carregar() }, [carregar])

  if (!campinho) return null

  const MATERIAL_ICONES = {
    Madeira: '🪵', Prego: '🔩', Gesso: '⬜', Cal: '🧱', Semente: '🌱', Adubo: '💩',
    Metal: '🔧', Solda: '🔥', Fio: '🔌', Lampada: '💡', Poste: '🏗️',
    Concreto: '🧱', Tinta: '🎨', Rede: '🥅',
  }

  const info = campinho.nivel_info
  const prox = campinho.proximo_nivel
  const podeColetar = !campinho.bonus_hoje && campinho.nivel >= 0
  const totalNiveis = 7 // 0-6
  const progressoPct = Math.round((campinho.nivel / (totalNiveis - 1)) * 100)

  async function coletarBonus() {
    setLoading(true)
    try {
      const res = await API.post('/api/campinho/bonus', { jogador_id: jogadorID })
      if (res.sucesso) {
        if (res.jogador) setJogador(res.jogador)
        mostrarNotificacao(res.mensagem, 'sucesso')
        if (res.level_up) setLevelUp(res.novo_nivel)
        carregar()
      } else {
        mostrarNotificacao(res.mensagem || 'Erro', 'erro')
      }
    } catch { mostrarNotificacao('Erro de conexão', 'erro') }
    setLoading(false)
  }

  async function upgrade() {
    setLoading(true)
    try {
      const res = await API.post('/api/campinho/upgrade', { jogador_id: jogadorID })
      if (res.sucesso) {
        mostrarNotificacao(res.mensagem, 'sucesso')
        carregar()
      } else {
        mostrarNotificacao(res.mensagem || 'Materiais insuficientes', 'erro')
      }
    } catch { mostrarNotificacao('Erro de conexão', 'erro') }
    setLoading(false)
  }

  const podeUpgrade = prox && prox.materiais && Object.entries(prox.materiais).every(
    ([mat, qtd]) => (materiais[mat] || 0) >= qtd
  )

  // Conta materiais completos / total pro progresso detalhado
  let matCompletos = 0
  let matTotal = 0
  if (prox?.materiais) {
    const entries = Object.entries(prox.materiais)
    matTotal = entries.length
    matCompletos = entries.filter(([mat, qtd]) => (materiais[mat] || 0) >= qtd).length
  }

  return (
    <div className="campinho-section">
      <h3 className="campinho-titulo">🏟️ MEU CAMPINHO</h3>

      {/* Card principal com arte */}
      <div className="campinho-card">
        <img
          src={info?.arte || '/estadios/campo-simples.png'}
          alt={info?.nome || 'Campo'}
          className="campinho-arte"
          onError={e => { e.target.src = '/estadios/campo-simples.png' }}
        />

        <div className="campinho-info">
          <div className="campinho-nivel-badge">Nível {campinho.nivel}</div>
          <div className="campinho-nome">{info?.nome || 'Campo de Terra'}</div>
          <div className="campinho-desc">{info?.descricao}</div>

          {/* Barra de progresso geral */}
          <div className="campinho-progress">
            <div className="campinho-progress-label">Evolução do campinho</div>
            <div className="campinho-progress-bar">
              <div className="campinho-progress-fill" style={{ width: progressoPct + '%' }} />
            </div>
            <div className="campinho-progress-text">{campinho.nivel}/{totalNiveis - 1}</div>
          </div>

          {/* Bônus diário */}
          <div className="campinho-bonus-label">
            🎁 Bônus diário: +{campinho.bonus_xp} XP ({info?.bonus_xp_pct || 10}% do XP necessário)
          </div>

          {podeColetar ? (
            <button className="btn-work btn-verde" onClick={coletarBonus} disabled={loading}>
              {loading ? '...' : `🎁 Coletar +${campinho.bonus_xp} XP`}
            </button>
          ) : (
            <div className="campinho-coletado">✅ Bônus de hoje já coletado!</div>
          )}
        </div>
      </div>

      {/* Desafios do nível atual */}
      {requisitos.length > 0 && (
        <div className="campinho-upgrade">
          <h4>🎯 Desafios do Campo Atual</h4>
          <p className="campinho-upgrade-desc">Complete todos os desafios para desbloquear a próxima evolução.</p>

          <div className="campinho-materiais">
            {requisitos.map(rq => {
              const pct = Math.min(100, Math.round((rq.progresso / rq.objetivo) * 100))
              const ok = rq.progresso >= rq.objetivo
              return (
                <div key={rq.tipo} className={`campinho-mat${ok ? ' mat-ok' : ' mat-falta'}`}>
                  <div className="cm-top">
                    <span>{rq.descricao}</span>
                    <span className="cm-qtd">{Math.min(rq.progresso, rq.objetivo)}/{rq.objetivo}</span>
                  </div>
                  <div className="cm-bar">
                    <div className="cm-bar-fill" style={{ width: pct + '%' }} />
                  </div>
                </div>
              )
            })}
          </div>

          {reqCompletos && <div style={{ color: 'var(--verde)', fontWeight: 900, fontSize: 13, marginTop: 8 }}>✅ Desafios completos!</div>}
        </div>
      )}

      {/* Materiais (só mostra depois dos requisitos completos) */}
      {prox && reqCompletos && (
        <div className="campinho-upgrade" style={{ marginTop: 12 }}>
          <div className="campinho-upgrade-header">
            <h4>🏗️ Próxima evolução: {prox.nome}</h4>
            <span className="campinho-mat-count">{matCompletos}/{matTotal} materiais</span>
          </div>
          <p className="campinho-upgrade-desc">{prox.descricao}</p>

          <div className="campinho-materiais">
            {Object.entries(prox.materiais).map(([mat, qtd]) => {
              const tem = materiais[mat] || 0
              const ok = tem >= qtd
              const pct = Math.min(100, Math.round((tem / qtd) * 100))
              return (
                <div key={mat} className={`campinho-mat${ok ? ' mat-ok' : ' mat-falta'}`}>
                  <div className="cm-top">
                    <span>{MATERIAL_ICONES[mat] || '📦'} {mat}</span>
                    <span className="cm-qtd">{tem}/{qtd}</span>
                  </div>
                  <div className="cm-bar">
                    <div className="cm-bar-fill" style={{ width: pct + '%' }} />
                  </div>
                </div>
              )
            })}
          </div>

          {podeUpgrade ? (
            <button className="btn-work btn-verde campinho-build-btn" onClick={upgrade} disabled={loading}>
              {loading ? '...' : '🏗️ Construir Agora!'}
            </button>
          ) : (
            <p className="campinho-hint">
              Complete <Link to="/missoes">Missões</Link> para ganhar os materiais!
            </p>
          )}
        </div>
      )}

      {/* Requisitos pendentes — mostra dica */}
      {prox && !reqCompletos && (
        <div style={{ marginTop: 10, fontSize: 12, fontWeight: 700, color: '#556' }}>
          🔒 Complete os desafios acima para desbloquear a construção do próximo campo.
        </div>
      )}

      {!prox && (
        <div className="campinho-completo">
          🏆 Campinho completo! Seu estádio é lendário!
        </div>
      )}
    </div>
  )
}

const CAT_ICONE = { moto: '🏍️', carro: '🚗', apartamento: '🏢' }
const CAT_NOME = { moto: 'MOTOS', carro: 'CARROS', apartamento: 'IMÓVEIS' }

function PatrimonioSection({ jogadorID }) {
  const [dados, setDados] = useState(null)

  useEffect(() => {
    if (!jogadorID) return
    API.get('/api/patrimonio/' + jogadorID).then(setDados).catch(() => {})
  }, [jogadorID])

  if (!dados || !dados.itens || dados.itens.length === 0) return null

  // Agrupar por categoria
  const grupos = {}
  dados.itens.forEach(item => {
    const cat = item.categoria || 'outro'
    if (!grupos[cat]) grupos[cat] = []
    grupos[cat].push(item)
  })

  return (
    <div className="pf-section">
      <div className="pf-section-header">
        <h3>🏆 MEU PATRIMÔNIO</h3>
        <span className="pf-section-badge">R$ {fmt(dados.valor_total)}</span>
      </div>

      {['moto', 'carro', 'apartamento'].map(cat => {
        const itens = grupos[cat]
        if (!itens || itens.length === 0) return null
        return (
          <div key={cat} className="pat-grupo">
            <div className="pat-grupo-titulo">{CAT_ICONE[cat]} {CAT_NOME[cat]}</div>
            <div className="pat-grid">
              {itens.map(item => (
                <div key={item.id} className="pat-card">
                  <div className="pat-icone">{item.icone}</div>
                  <div className="pat-info">
                    <div className="pat-nome">{item.nome}{item.quantidade > 1 ? ` x${item.quantidade}` : ''}</div>
                    <div className="pat-desc">{item.descricao}</div>
                    <div className="pat-valor">R$ {fmt(item.preco)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ========================
// MORAL SECTION
// ========================

function getMoralInfo(moral) {
  if (moral >= 81) return { label: 'Em Chamas!', cor: '#f39c12', bg: '#fdf8e8', border: '#f0c040', emoji: '🔥' }
  if (moral >= 61) return { label: 'Motivado', cor: '#27ae60', bg: '#eafaf1', border: '#82e0aa', emoji: '😊' }
  if (moral >= 31) return { label: 'Normal', cor: '#2980b9', bg: '#eaf4fd', border: '#85c1e9', emoji: '😐' }
  return { label: 'Desmotivado', cor: '#e74c3c', bg: '#fdecea', border: '#f1948a', emoji: '😞' }
}

function MoralSection({ jogador, jogadorID, mostrarNotificacao }) {
  if (!jogador) return null
  const moral = jogador.moral ?? 70
  const info = getMoralInfo(moral)
  const mult = (0.80 + (moral / 100) * 0.40).toFixed(2)
  const pct = moral

  return (
    <div className="pf-section">
      <div className="pf-section-header">
        <h3>🧠 MORAL</h3>
        <span className="pf-section-badge" style={{ color: info.cor }}>{info.emoji} {info.label}</span>
      </div>
      <div style={{
        background: info.bg, border: `2px solid ${info.border}`, borderRadius: 12, padding: '12px 16px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 28, fontWeight: 900, color: info.cor }}>{moral}</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#556' }}>
            Multiplicador de ganhos: <strong style={{ color: info.cor }}>{mult}x</strong>
          </span>
        </div>
        <div style={{ background: '#e0e0e0', borderRadius: 8, height: 12, overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: info.cor, borderRadius: 8, transition: 'width 0.4s' }} />
        </div>
        <div style={{ marginTop: 8, fontSize: 11, color: '#777', lineHeight: 1.5 }}>
          Sobe ao trabalhar (+3) e vencer desafios. Cai em derrotas e notas baixas.
          {moral < 31 && <span style={{ color: '#e74c3c', fontWeight: 900 }}> Moral baixo! Seus ganhos estao reduzidos.</span>}
          {moral >= 81 && <span style={{ color: '#f39c12', fontWeight: 900 }}> Moral maximo! Ganhos aumentados em 20%!</span>}
        </div>
      </div>
    </div>
  )
}

// ========================
// OBJETIVOS DO CLUBE
// ========================

function ClubeObjetivosSection({ jogadorID, setJogador, mostrarNotificacao, setLevelUp }) {
  const [objetivos, setObjetivos] = useState([])
  const [loading, setLoading] = useState(null)

  const carregar = useCallback(() => {
    if (!jogadorID) return
    API.get('/api/clube/objetivos/' + jogadorID).then(res => {
      setObjetivos(res.objetivos || [])
    }).catch(() => {})
  }, [jogadorID])

  useEffect(() => { carregar() }, [carregar])

  async function coletar(objetivoID) {
    setLoading(objetivoID)
    try {
      const res = await API.post('/api/clube/objetivos/coletar', { jogador_id: jogadorID, objetivo_id: objetivoID })
      if (res.sucesso) {
        if (res.jogador) setJogador(res.jogador)
        mostrarNotificacao(res.mensagem, 'sucesso')
        if (res.level_up) setLevelUp(res.novo_nivel)
        carregar()
      } else {
        mostrarNotificacao(res.mensagem, 'erro')
      }
    } catch { mostrarNotificacao('Erro de conexao', 'erro') }
    setLoading(null)
  }

  if (!objetivos.length) return null

  return (
    <div className="pf-section">
      <div className="pf-section-header"><h3>🏆 OBJETIVOS DO CLUBE</h3></div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {objetivos.map(obj => {
          const pct = Math.min(100, Math.round((obj.progresso / obj.objetivo) * 100))
          const completo = obj.progresso >= obj.objetivo
          const recompensas = []
          if (obj.recompensa_dinheiro > 0) recompensas.push(`R$ ${fmt(obj.recompensa_dinheiro)}`)
          if (obj.recompensa_xp > 0) recompensas.push(`+${obj.recompensa_xp} XP`)
          if (obj.recompensa_moedas > 0) recompensas.push(`+${obj.recompensa_moedas} moedas`)

          return (
            <div key={obj.id} style={{
              background: obj.coletado ? '#f5f5f5' : completo ? '#eafaf1' : '#f9f9f9',
              border: `2px solid ${obj.coletado ? '#ccc' : completo ? '#82e0aa' : '#ddd'}`,
              borderRadius: 12, padding: '12px 14px', opacity: obj.coletado ? 0.6 : 1
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                <div>
                  <span style={{ fontSize: 18 }}>{obj.icone}</span>
                  <span style={{ fontWeight: 900, fontSize: 13, marginLeft: 6 }}>{obj.nome}</span>
                </div>
                <span style={{ fontSize: 11, color: '#888', whiteSpace: 'nowrap' }}>
                  {obj.progresso}/{obj.objetivo}
                </span>
              </div>
              <div style={{ fontSize: 11, color: '#666', marginBottom: 8 }}>{obj.descricao}</div>
              <div style={{ background: '#e0e0e0', borderRadius: 6, height: 8, overflow: 'hidden', marginBottom: 8 }}>
                <div style={{ width: `${pct}%`, height: '100%', background: completo ? '#27ae60' : '#2980b9', borderRadius: 6, transition: 'width 0.4s' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#27ae60' }}>{recompensas.join(' · ')}</span>
                {completo && !obj.coletado && (
                  <button className="btn-work btn-verde btn-small" onClick={() => coletar(obj.id)} disabled={loading === obj.id}>
                    {loading === obj.id ? '...' : 'Coletar'}
                  </button>
                )}
                {obj.coletado && <span style={{ fontSize: 11, color: '#27ae60', fontWeight: 700 }}>Coletado</span>}
              </div>
            </div>
          )
        })}
      </div>
      <div style={{ fontSize: 11, color: '#888', marginTop: 8, textAlign: 'center' }}>Objetivos renovam todo mes</div>
    </div>
  )
}

const CASA_IMGS = {
  basica: '/casas/init-casa-simples.png',
  media: '/casas/init-casa-media.png',
  top: '/casas/initcasa-top.png',
}
const CASA_NOMES = { basica: 'Casa Alugada', media: 'Casa Própria', top: 'Mansão do Craque' }

function CasaCard({ jogadorID, jogador, setJogador, mostrarNotificacao, setLevelUp }) {
  const [casa, setCasa] = useState({ tipo: '' })
  const [casas, setCasas] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const carregar = useCallback(() => {
    if (!jogadorID) return
    API.get('/api/casa/' + jogadorID).then(res => {
      setCasa(res.casa || { tipo: '' })
      if (res.casas_disponiveis) setCasas(res.casas_disponiveis)
      setLoaded(true)
    }).catch(() => { setCasa({ tipo: '' }); setLoaded(true) })
  }, [jogadorID])

  useEffect(() => { carregar() }, [carregar])

  // Auto-abrir modal quando chega na Série C sem casa ou Série B com casa alugada
  const temCasaAtual = casa?.tipo && casa.tipo !== ''
  const precisaUpgrade = jogador?.nivel >= 30 && casa?.tipo === 'basica'
  const obrigatorio = (jogador?.nivel >= 20 && !temCasaAtual) || precisaUpgrade
  const podeComprar = jogador?.nivel >= 30 // só na Série B em diante

  useEffect(() => {
    if (!loaded || !casa || !jogador) return
    const temCasa = casa.tipo && casa.tipo !== ''
    if (jogador.nivel >= 30 && casa.tipo === 'basica') {
      setShowModal(true)
    } else if (jogador.nivel >= 20 && !temCasa) {
      setShowModal(true)
    }
  }, [loaded, casa, jogador?.nivel])

  // Só mostra a partir da Série C (nível 20+)
  if (!jogador || jogador.nivel < 20) return null

  async function comprar(tipo, pagarCom) {
    setLoading(true)
    const res = await API.post('/api/casa/comprar', { jogador_id: jogadorID, tipo, pagar_com: pagarCom })
    if (res.sucesso) { if (res.jogador) setJogador(res.jogador); mostrarNotificacao(res.mensagem, 'sucesso'); carregar(); setShowModal(false) }
    else mostrarNotificacao(res.mensagem, 'erro')
    setLoading(false)
  }

  async function coletar() {
    setLoading(true)
    const res = await API.post('/api/casa/coletar', { jogador_id: jogadorID })
    if (res.sucesso) {
      if (res.jogador) setJogador(res.jogador)
      mostrarNotificacao(res.mensagem, 'sucesso')
      if (res.level_up) setLevelUp(res.novo_nivel)
      carregar()
    } else mostrarNotificacao(res.mensagem, 'erro')
    setLoading(false)
  }

  const temCasa = casa.tipo && casa.tipo !== ''
  const temRecompensa = casa.xp_disponivel > 0 || casa.energia_disponivel > 0

  const CASAS_ORDEM = { '': 0, basica: 1, media: 2, top: 3 }
  const tipoAtual = casa?.tipo || ''

  // Filtra casas: só mostra as que são upgrade em relação à atual
  const casasDisponiveis = casas.filter(c => CASAS_ORDEM[c.tipo] > CASAS_ORDEM[tipoAtual])

  const CASA_DETALHES = {
    basica: { bonus: '+1 Força 💪', desc: 'Casa alugada para morar enquanto sobe na carreira. Aluguel acessível.' },
    media: { bonus: '+2 Velocidade 🏃 · +1 Força 💪', desc: 'Sua primeira casa própria. Liberada na Série B.' },
    top: { bonus: '+2 Habilidade ⚽ · +2 Velocidade 🏃 · +1 Força 💪', desc: 'A mansão dos craques. Máxima performance passiva.' },
  }

  return (
    <>
      {/* Modal de aluguel */}
      {showModal && casasDisponiveis.length > 0 && (
        <div className="modal-overlay">
          <div className="casa-modal" onClick={e => e.stopPropagation()}>
            {!obrigatorio && <button className="pm-close" onClick={() => setShowModal(false)}>✕</button>}
            <div className="casa-modal-header">
              <span className="casa-modal-icon">🏠</span>
              <h2 className="casa-modal-title">{precisaUpgrade ? 'Hora de comprar sua casa!' : obrigatorio ? 'Hora de alugar sua casa!' : 'Sua moradia'}</h2>
              <p className="casa-modal-sub">
                {precisaUpgrade
                  ? 'Você chegou à Série B! Agora pode comprar uma casa própria — escolha abaixo.'
                  : obrigatorio
                  ? 'Para continuar trabalhando na Série C, você precisa alugar uma casa. O aluguel é barato e cresce conforme você sobe de nível.'
                  : 'Aqui você pode alugar uma casa ou, na Série B, comprar a sua. Ela gera XP e energia passivamente.'}
              </p>
            </div>
            <div className="casa-modal-grid">
              {casasDisponiveis.map(c => {
                const det = CASA_DETALHES[c.tipo] || {}
                const isAluguel = c.tipo === 'basica'
                const bloqueada = !isAluguel && !podeComprar
                return (
                  <div key={c.tipo} className="casa-modal-card" style={bloqueada ? { opacity: 0.55 } : null}>
                    <img src={CASA_IMGS[c.tipo]} alt={c.nome} className="casa-modal-img" onError={e => { e.target.style.display = 'none' }} />
                    <div className="casa-modal-card-body">
                      <strong className="casa-modal-nome">{c.nome}</strong>
                      <div className="casa-modal-desc">{det.desc}</div>
                      <div className="casa-modal-stats">
                        <span>📊 {c.xp_hora} XP/h · ⚡ +{c.energia_quant} a cada {c.energia_intervalo_min}min</span>
                        <span className="casa-modal-bonus">{det.bonus}</span>
                      </div>
                      <div className="casa-modal-preco">
                        {isAluguel
                          ? <>💰 R$ {fmt(c.preco)}</>
                          : <>💰 R$ {fmt(c.preco)} ou 🪙 {c.preco_moedas}</>}
                      </div>
                      {bloqueada ? (
                        <div className="btn-work" style={{ background: '#444', color: '#bbb', textAlign: 'center', fontSize: 11, marginTop: 4 }}>
                          🔒 Liberada na Série B (nv 30)
                        </div>
                      ) : isAluguel ? (
                        <button className="btn-work btn-verde" onClick={() => comprar(c.tipo, 'dinheiro')} disabled={loading} style={{ width: '100%', fontSize: 11, marginTop: 4 }}>
                          🏠 Alugar por R$ {fmt(c.preco)}
                        </button>
                      ) : (
                        <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                          <button className="btn-work btn-verde" onClick={() => comprar(c.tipo, 'dinheiro')} disabled={loading} style={{ flex: 1, fontSize: 11 }}>
                            💰 R$ {fmt(c.preco)}
                          </button>
                          <button className="btn-work btn-azul" onClick={() => comprar(c.tipo, 'moedas')} disabled={loading} style={{ flex: 1, fontSize: 11 }}>
                            🪙 {c.preco_moedas}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            {precisaUpgrade
              ? <p className="casa-modal-nota" style={{ color: '#e74c3c', fontWeight: 900 }}>⚠️ Obrigatório para trabalhar na Série B!</p>
              : obrigatorio
              ? <p className="casa-modal-nota" style={{ color: '#e74c3c', fontWeight: 900 }}>⚠️ Obrigatório para trabalhar na Série C!</p>
              : <p className="casa-modal-nota">💡 Você pode fechar e alugar depois no Perfil.</p>
            }
          </div>
        </div>
      )}

      {/* Card no perfil */}
      <div className="pf-section">
        <div className="pf-section-header"><h3>🏠 MINHA CASA</h3></div>

        {temCasa ? (
          <div className="casa-card-perfil">
            <img src={CASA_IMGS[casa.tipo]} alt={CASA_NOMES[casa.tipo]} className="casa-img-perfil"
              onError={e => { e.target.style.display = 'none' }} />
            <div className="casa-card-info">
              <div className="casa-card-nome">
                {CASA_NOMES[casa.tipo]}
                {casa.tipo === 'basica'
                  ? <span style={{ fontSize: 10, color: '#c0392b', marginLeft: 6, fontWeight: 700 }}>ALUGADA</span>
                  : <span style={{ fontSize: 10, color: '#27ae60', marginLeft: 6, fontWeight: 700 }}>PRÓPRIA</span>}
              </div>
              <div className="casa-card-acumulado">
                {casa.xp_disponivel > 0 && <span className="casa-reward">📊 +{casa.xp_disponivel} XP</span>}
                {casa.energia_disponivel > 0 && <span className="casa-reward">⚡ +{casa.energia_disponivel}</span>}
                {!temRecompensa && <span style={{ color: '#888', fontSize: 11 }}>Acumulando ganhos...</span>}
              </div>
              {casa.tipo === 'basica' && temRecompensa && (
                <div style={{ fontSize: 10, color: '#c0392b', fontWeight: 700 }}>💸 Aluguel será cobrado ao coletar</div>
              )}
              {temRecompensa && (
                <button className="btn-work btn-verde btn-small" onClick={coletar} disabled={loading}>
                  {loading ? '...' : '🎁 Coletar'}
                </button>
              )}
              {podeComprar && casa.tipo === 'basica' && (
                <button className="btn-work btn-azul btn-small" onClick={() => setShowModal(true)} style={{ marginTop: 4, fontSize: 10 }}>
                  🏠 Comprar Casa Própria
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="casa-sem" onClick={() => setShowModal(true)}>
            <span className="casa-sem-icon">🏠</span>
            <span className="casa-sem-text">Você ainda não tem casa. Toque para alugar!</span>
          </div>
        )}
      </div>
    </>
  )
}