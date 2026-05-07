import React, { useEffect, useState, useCallback } from 'react'
import { useGame } from '../context/GameContext'
import API from '../api'
import { fmt } from '../utils'
import './MeuJogador.css'

// IDs 101-111 para avatares de imagem (evita conflito com emojis do banco que usam IDs baixos)
const AVATAR_IMGS = [101,102,103,104,105,106,107,108,109,110,111]

function SectionHeader({ icon, title, right }) {
  return (
    <div className="jc-section-header">
      <div className="jc-section-title-wrap">
        {icon && <span className="jc-section-icon">{icon}</span>}
        <h3>{title}</h3>
      </div>
      {right && <div className="jc-section-right">{right}</div>}
    </div>
  )
}

function AvatarDisplay({ avatarId, size }) {
  // IDs 101-111 mapeiam para /avatar/1.png - /avatar/11.png
  if (typeof avatarId === 'number' && avatarId >= 101 && avatarId <= 111) {
    return <img src={`/avatar/${avatarId - 100}.png`} alt="Avatar" />
  }
  return <span style={{ fontSize: size || 70 }}>⚽</span>
}

// ========================
// FAMA
// ========================

const RANK_CORES = {
  'Desconhecido': '#64748b', 'Promessa': '#22c55e', 'Famoso': '#43a7ff',
  'Estrela': '#a855f7', 'Idolo': '#f1c76a', 'Lenda Viva': '#ef4444',
}

function FamaCard({ jogadorID, jogador, setJogador, mostrarNotificacao }) {
  const [famaData, setFamaData] = useState(null)
  const [loading, setLoading] = useState(false)
  const carregar = useCallback(() => { if (!jogadorID) return; API.get('/api/fama/' + jogadorID).then(setFamaData).catch(() => {}) }, [jogadorID])
  useEffect(() => { carregar() }, [carregar])
  if (!famaData || !jogador) return null

  const rank = famaData.rank, ranks = famaData.ranks || [], fama = famaData.fama || 0
  const corRank = RANK_CORES[rank.rank] || '#64748b'
  const rangeRank = rank.max - rank.min + 1
  const progressoRank = Math.min(100, Math.round(((fama - rank.min) / rangeRank) * 100))
  const idxAtual = ranks.findIndex(r => r.rank === rank.rank)
  const proximoRank = idxAtual < ranks.length - 1 ? ranks[idxAtual + 1] : null
  const faltaProximo = proximoRank ? proximoRank.min - fama : 0

  async function coletarPatrocinio() {
    setLoading(true)
    try {
      const res = await API.post('/api/fama/coletar-patrocinio', { jogador_id: jogadorID })
      if (res.sucesso) { if (res.jogador) setJogador(res.jogador); mostrarNotificacao(res.mensagem, 'sucesso'); carregar() }
      else mostrarNotificacao(res.mensagem, 'erro')
    } catch { mostrarNotificacao('Erro de conexao', 'erro') }
    setLoading(false)
  }

  return (
    <section className="jc-section">
      <SectionHeader icon="⭐" title="Fama & Patrocinio" />
      <div style={{ padding: '14px', borderRadius: 14, border: `1px solid ${corRank}33`, background: `${corRank}0a` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <span style={{ color: corRank, fontWeight: 900, fontSize: 18 }}>{rank.rank}</span>
          <span style={{ color: '#94a3b8', fontSize: 13, fontWeight: 800 }}>{fmt(fama)} Fama</span>
        </div>
        <div className="jc-progress" style={{ marginBottom: 8 }}><div style={{ width: progressoRank + '%', background: corRank }} /></div>
        {proximoRank && <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 10 }}>Faltam <strong style={{ color: '#fff' }}>{fmt(faltaProximo)}</strong> para <span style={{ color: RANK_CORES[proximoRank.rank] || '#94a3b8' }}>{proximoRank.rank}</span></div>}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {rank.bonus_xp > 0 && <span className="jc-badge-blue" style={{ padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 800, background: 'rgba(30,111,255,0.12)', color: '#43a7ff' }}>+{Math.round(rank.bonus_xp * 100)}% XP</span>}
          {rank.renda_hora > 0 && <span style={{ padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: 800, background: 'rgba(34,197,94,0.12)', color: '#22c55e' }}>R$ {fmt(rank.renda_hora)}/hora</span>}
        </div>
        {rank.patrocinio && (
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>Patrocinio: <strong style={{ color: '#fff' }}>{rank.patrocinio}</strong></span>
            {famaData.patrocinio_acumulado > 0 && (
              <button className="jc-btn jc-btn-primary" style={{ minHeight: 32, fontSize: 11 }} onClick={coletarPatrocinio} disabled={loading}>
                {loading ? '...' : `Coletar R$ ${fmt(famaData.patrocinio_acumulado)}`}
              </button>
            )}
          </div>
        )}
        <div style={{ marginTop: 10, fontSize: 11, fontWeight: 700, color: famaData.protegido ? '#22c55e' : '#ef4444' }}>
          {famaData.protegido ? 'Protegido! Fez PvP hoje.' : 'Faca PvP hoje para evitar perda de fama!'}
        </div>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
        {ranks.map(r => {
          const ativo = r.rank === rank.rank, cor = RANK_CORES[r.rank] || '#64748b', atingido = fama >= r.min
          return (
            <div key={r.rank} style={{
              padding: '4px 10px', borderRadius: 8, fontSize: 10, fontWeight: 800, textTransform: 'uppercase',
              background: ativo ? `${cor}22` : 'rgba(255,255,255,0.03)', border: `1px solid ${ativo ? cor + '44' : 'rgba(255,255,255,0.06)'}`,
              color: atingido ? cor : '#475569', letterSpacing: 0.5,
            }}>
              {r.rank} {r.bonus_xp > 0 && `+${Math.round(r.bonus_xp * 100)}%`}
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ========================
// MORAL
// ========================

function getMoralInfo(moral) {
  if (moral >= 81) return { label: 'Em Chamas!', cor: '#D6A84F', bg: 'rgba(214,168,79,0.08)', border: 'rgba(214,168,79,0.2)', emoji: '🔥' }
  if (moral >= 61) return { label: 'Motivado', cor: '#22c55e', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.2)', emoji: '😊' }
  if (moral >= 31) return { label: 'Normal', cor: '#43a7ff', bg: 'rgba(67,167,255,0.08)', border: 'rgba(67,167,255,0.2)', emoji: '😐' }
  return { label: 'Desmotivado', cor: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)', emoji: '😞' }
}

function MoralSection({ jogador }) {
  if (!jogador) return null
  const moral = jogador.moral ?? 70, info = getMoralInfo(moral)
  const mult = (0.80 + (moral / 100) * 0.40).toFixed(2)
  return (
    <section className="jc-section">
      <SectionHeader icon="🧠" title="Moral" right={<span style={{ color: info.cor }}>{info.emoji} {info.label}</span>} />
      <div style={{ background: info.bg, border: `1px solid ${info.border}`, borderRadius: 14, padding: '14px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 32, fontWeight: 900, color: info.cor, fontFamily: "'Teko', sans-serif" }}>{moral}</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8' }}>Multiplicador: <strong style={{ color: info.cor }}>{mult}x</strong></span>
        </div>
        <div className="jc-progress"><div style={{ width: `${moral}%`, background: info.cor }} /></div>
        <div style={{ marginTop: 8, fontSize: 11, color: '#64748b', lineHeight: 1.5 }}>
          Sobe ao trabalhar (+3) e vencer desafios. Cai em derrotas e notas baixas.
        </div>
      </div>
    </section>
  )
}

// ========================
// OBJETIVOS DO CLUBE
// ========================

function ClubeObjetivosSection({ jogadorID, setJogador, mostrarNotificacao, setLevelUp }) {
  const [objetivos, setObjetivos] = useState([])
  const [loading, setLoading] = useState(null)
  const carregar = useCallback(() => { if (!jogadorID) return; API.get('/api/clube/objetivos/' + jogadorID).then(res => setObjetivos(res.objetivos || [])).catch(() => {}) }, [jogadorID])
  useEffect(() => { carregar() }, [carregar])

  async function coletar(objetivoID) {
    setLoading(objetivoID)
    try {
      const res = await API.post('/api/clube/objetivos/coletar', { jogador_id: jogadorID, objetivo_id: objetivoID })
      if (res.sucesso) { if (res.jogador) setJogador(res.jogador); mostrarNotificacao(res.mensagem, 'sucesso'); if (res.level_up) setLevelUp(res.novo_nivel); carregar() }
      else mostrarNotificacao(res.mensagem, 'erro')
    } catch { mostrarNotificacao('Erro de conexao', 'erro') }
    setLoading(null)
  }

  if (!objetivos.length) return null
  return (
    <section className="jc-section">
      <SectionHeader icon="🏆" title="Objetivos do Clube" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {objetivos.map(obj => {
          const pct = Math.min(100, Math.round((obj.progresso / obj.objetivo) * 100)), completo = obj.progresso >= obj.objetivo
          const recompensas = []
          if (obj.recompensa_dinheiro > 0) recompensas.push(`R$ ${fmt(obj.recompensa_dinheiro)}`)
          if (obj.recompensa_xp > 0) recompensas.push(`+${obj.recompensa_xp} XP`)
          if (obj.recompensa_moedas > 0) recompensas.push(`+${obj.recompensa_moedas} moedas`)
          return (
            <div key={obj.id} style={{
              background: obj.coletado ? 'rgba(255,255,255,0.02)' : completo ? 'rgba(34,197,94,0.06)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${obj.coletado ? 'rgba(255,255,255,0.06)' : completo ? 'rgba(34,197,94,0.2)' : 'rgba(255,255,255,0.06)'}`,
              borderRadius: 14, padding: '12px 14px', opacity: obj.coletado ? 0.5 : 1,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <div><span style={{ fontSize: 18 }}>{obj.icone}</span> <span style={{ fontWeight: 900, fontSize: 13 }}>{obj.nome}</span></div>
                <span style={{ fontSize: 11, color: '#64748b' }}>{obj.progresso}/{obj.objetivo}</span>
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8', marginBottom: 8 }}>{obj.descricao}</div>
              <div className="jc-progress" style={{ marginBottom: 8 }}><div style={{ width: `${pct}%`, background: completo ? '#22c55e' : '#1e6fff' }} /></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#22c55e' }}>{recompensas.join(' . ')}</span>
                {completo && !obj.coletado && <button className="jc-btn jc-btn-primary" style={{ minHeight: 30, fontSize: 11 }} onClick={() => coletar(obj.id)} disabled={loading === obj.id}>{loading === obj.id ? '...' : 'Coletar'}</button>}
                {obj.coletado && <span style={{ fontSize: 11, color: '#22c55e', fontWeight: 700 }}>Coletado</span>}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ========================
// COMPONENTE PRINCIPAL
// ========================

export default function MeuJogador() {
  const { jogador, setJogador, jogadorID, mostrarNotificacao, setLevelUp, avatares, getAvatar } = useGame()
  const [clube, setClube] = useState(null)
  const [showAvatarPicker, setShowAvatarPicker] = useState(false)

  useEffect(() => { if (jogadorID) API.get('/api/clube/atual/' + jogadorID).then(setClube).catch(() => {}) }, [jogadorID])

  async function selecionarAvatar(id) {
    const res = await API.post('/api/jogador/' + jogadorID, { avatar: id })
    setJogador(res)
    mostrarNotificacao('Avatar atualizado!', 'sucesso')
    setShowAvatarPicker(false)
  }

  async function distribuirPonto(atributo) {
    const res = await API.post('/api/distribuir-ponto', { jogador_id: jogadorID, atributo })
    if (res.sucesso) { setJogador(res.jogador); mostrarNotificacao(res.mensagem, 'sucesso') }
    else mostrarNotificacao(res.mensagem, 'erro')
  }

  if (!jogador) return null

  const xpPct = Math.min(100, Math.round((jogador.xp / jogador.xp_proximo) * 100))
  const getBordaTier = (nivel) => {
    if (nivel >= 190) return 'Desafiante'; if (nivel >= 160) return 'Grao-Mestre'; if (nivel >= 135) return 'Mestre'
    if (nivel >= 100) return 'Diamante'; if (nivel >= 72) return 'Esmeralda'; if (nivel >= 50) return 'Platina'
    if (nivel >= 30) return 'Ouro'; if (nivel >= 20) return 'Prata'; if (nivel >= 10) return 'Bronze'; return 'Ferro'
  }
  const bordaTier = getBordaTier(jogador.nivel)
  const desbloqueados = (jogador.avatares_premium || '').split(',').filter(Boolean).map(Number)
  const winRate = jogador.vitorias + jogador.derrotas > 0 ? Math.round((jogador.vitorias / (jogador.vitorias + jogador.derrotas)) * 100) : 0
  const temPontos = jogador.pontos_atributo > 0

  return (
    <main className="jc-profile">
      {/* Avatar Picker */}
      {showAvatarPicker && (
        <div className="jc-avatar-picker-overlay" onClick={() => setShowAvatarPicker(false)}>
          <div className="jc-avatar-picker" onClick={e => e.stopPropagation()}>
            <button className="jc-avatar-picker-close" onClick={() => setShowAvatarPicker(false)}>x</button>
            <h3>Escolha seu Avatar</h3>
            <p>Selecione a imagem que representa seu jogador.</p>
            <div className="jc-avatar-grid">
              {AVATAR_IMGS.map(id => (
                <div key={id} className={`jc-avatar-option ${jogador.avatar === id ? 'selected' : ''}`} onClick={() => selecionarAvatar(id)}>
                  <img src={`/avatar/${id - 100}.png`} alt={`Avatar ${id - 100}`} />
                  {jogador.avatar === id && <div className="jc-avatar-selected-mark">✓</div>}
                </div>
              ))}
              {/* Apenas avatares de imagem - sem emojis genericos */}
            </div>
          </div>
        </div>
      )}

      {/* Hero Card */}
      <div className="jc-profile-hero">
        <div className="jc-profile-hero-overlay" />
        <div className="jc-profile-hero-gold" />
        <div className="jc-profile-hero-content">
          <div className="jc-profile-avatar-area">
            <div className="jc-profile-avatar">
              <AvatarDisplay avatarId={jogador.avatar} />
            </div>
            <div><span className="jc-profile-elo-tag">{bordaTier}</span></div>
            <button className="jc-profile-change-btn" onClick={() => setShowAvatarPicker(true)}>Trocar Avatar</button>
          </div>
          <div className="jc-profile-info">
            <div className="jc-profile-name">{jogador.nome}</div>
            {jogador.titulo && <div className="jc-profile-titulo">{jogador.titulo}</div>}
            <div className="jc-profile-tags">
              <span className="jc-ptag jc-ptag-rank">{jogador.rank || 'Peladeiro'}</span>
              {jogador.posicao && <span className="jc-ptag jc-ptag-pos">{{ GK: 'Goleiro', DEF: 'Defensor', MED: 'Meia', ATA: 'Atacante' }[jogador.posicao] || jogador.posicao}</span>}
              {clube && clube.tem_clube && <span className="jc-ptag jc-ptag-clube">{clube.icone} {clube.nome}{clube.camisa > 0 ? ` #${clube.camisa}` : ''}</span>}
            </div>
            {jogador.titulos && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
                {jogador.titulos.split(',').filter(Boolean).map((t, i) => (
                  <span key={i} style={{ padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 800, background: t === jogador.titulo ? 'rgba(214,168,79,0.15)' : 'rgba(255,255,255,0.04)', color: t === jogador.titulo ? '#f1c76a' : '#64748b', border: `1px solid ${t === jogador.titulo ? 'rgba(214,168,79,0.2)' : 'rgba(255,255,255,0.06)'}` }}>{t}</span>
                ))}
              </div>
            )}
            <div className="jc-profile-xp">
              <div className="jc-profile-xp-top">
                <div className="jc-profile-level">LVL <span>{jogador.nivel}</span></div>
                <div className="jc-profile-xp-text">{jogador.xp}/{jogador.xp_proximo} XP</div>
              </div>
              <div className="jc-profile-xp-bar"><div className="jc-profile-xp-fill" style={{ width: xpPct + '%' }} /></div>
            </div>
            <div className="jc-profile-code">Codigo: <strong>{jogador.codigo_amigo}</strong></div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="jc-stats-grid">
        {[
          { icon: '💪', val: jogador.forca, label: 'Forca', attr: 'forca' },
          { icon: '🏃', val: jogador.velocidade, label: 'Velocidade', attr: 'velocidade' },
          { icon: '⚽', val: jogador.habilidade, label: 'Habilidade', attr: 'habilidade' },
          { icon: '💰', val: `R$${fmt(jogador.dinheiro_mao)}`, label: 'Dinheiro' },
          { icon: '⭐', val: jogador.pontos_fama, label: 'Fama' },
          { icon: '⚔️', val: `${jogador.vitorias}V/${jogador.derrotas}D`, label: `${winRate}% Win` },
        ].map(({ icon, val, label, attr }) => (
          <div key={label} className="jc-stat-card">
            <div className="jc-stat-icon">{icon}</div>
            <div className="jc-stat-info">
              <div className="jc-stat-value">{val}</div>
              <div className="jc-stat-label">{label}</div>
            </div>
            {temPontos && attr && <button className="jc-stat-plus" onClick={() => distribuirPonto(attr)}>+</button>}
          </div>
        ))}
      </div>

      {/* Pontos */}
      <section className="jc-section" style={{ marginBottom: 18 }}>
        <SectionHeader icon="🎯" title="Pontos de Atributo" right={`${jogador.pontos_atributo || 0} disponivel(is)`} />
        <div className="jc-progress" style={{ marginBottom: 6 }}><div style={{ width: `${((jogador.vitorias % 20) / 20) * 100}%`, background: '#1e6fff' }} /></div>
        <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700 }}>{jogador.vitorias % 20}/20 vitorias para o proximo ponto</div>
      </section>

      <MoralSection jogador={jogador} />
      <FamaCard jogadorID={jogadorID} jogador={jogador} setJogador={setJogador} mostrarNotificacao={mostrarNotificacao} />
      {jogador.clube_id > 0 && <ClubeObjetivosSection jogadorID={jogadorID} setJogador={setJogador} mostrarNotificacao={mostrarNotificacao} setLevelUp={setLevelUp} />}
    </main>
  )
}
