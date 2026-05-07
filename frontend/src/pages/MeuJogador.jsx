import React, { useEffect, useState, useCallback } from 'react'
import { useGame } from '../context/GameContext'
import API from '../api'
import { fmt } from '../utils'

// ========================
// FAMA & PATROCINIO
// ========================

const RANK_CORES = {
  'Desconhecido': '#888',
  'Promessa': '#27ae60',
  'Famoso': '#2980b9',
  'Estrela': '#8e44ad',
  'Idolo': '#f39c12',
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

  const rangeRank = rank.max - rank.min + 1
  const progressoRank = Math.min(100, Math.round(((fama - rank.min) / rangeRank) * 100))

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
    } catch { mostrarNotificacao('Erro de conexao', 'erro') }
    setLoading(false)
  }

  return (
    <div className="pf-section">
      <div className="pf-section-header"><h3>FAMA & PATROCINIO</h3></div>

      <div className="fama-rank-card" style={{ borderColor: corRank }}>
        <div className="fama-rank-top">
          <span className="fama-rank-nome" style={{ color: corRank }}>{rank.rank}</span>
          <span className="fama-pontos">{fmt(fama)} Fama</span>
        </div>

        <div className="fama-bar-container">
          <div className="fama-bar">
            <div className="fama-bar-fill" style={{ width: progressoRank + '%', background: corRank }} />
          </div>
          {proximoRank && (
            <div className="fama-proximo">
              Faltam <strong>{fmt(faltaProximo)}</strong> para{' '}
              <span style={{ color: RANK_CORES[proximoRank.rank] || '#888' }}>{proximoRank.rank}</span>
            </div>
          )}
        </div>

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
              Alcance 500 fama para desbloquear bonus!
            </div>
          )}
        </div>

        {rank.patrocinio && (
          <div className="fama-patrocinio">
            <div className="fama-patrocinio-nome">Patrocinio: <strong>{rank.patrocinio}</strong></div>
            {famaData.patrocinio_acumulado > 0 && (
              <button className="btn-work btn-verde btn-small" onClick={coletarPatrocinio} disabled={loading}>
                {loading ? '...' : `Coletar R$ ${fmt(famaData.patrocinio_acumulado)}`}
              </button>
            )}
            {!famaData.patrocinio_acumulado && (
              <span style={{ fontSize: 11, color: '#888' }}>Acumulando renda...</span>
            )}
          </div>
        )}

        <div className="fama-protecao">
          {famaData.protegido
            ? <span style={{ color: 'var(--verde)' }}>Protegido! Fez PvP hoje — sem decaimento.</span>
            : <span style={{ color: '#c0392b' }}>Faca PvP hoje para evitar perda de fama!</span>
          }
        </div>
      </div>

      <div className="fama-ranks-lista">
        {ranks.map(r => {
          const ativo = r.rank === rank.rank
          const cor = RANK_CORES[r.rank] || '#888'
          const atingido = fama >= r.min
          return (
            <div key={r.rank}
              className={`fama-rank-pill${ativo ? ' fama-rank-ativo' : ''}${!atingido ? ' fama-rank-locked' : ''}`}
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

// ========================
// MORAL
// ========================

function getMoralInfo(moral) {
  if (moral >= 81) return { label: 'Em Chamas!', cor: '#f39c12', bg: '#fdf8e8', border: '#f0c040', emoji: '🔥' }
  if (moral >= 61) return { label: 'Motivado', cor: '#27ae60', bg: '#eafaf1', border: '#82e0aa', emoji: '😊' }
  if (moral >= 31) return { label: 'Normal', cor: '#2980b9', bg: '#eaf4fd', border: '#85c1e9', emoji: '😐' }
  return { label: 'Desmotivado', cor: '#e74c3c', bg: '#fdecea', border: '#f1948a', emoji: '😞' }
}

function MoralSection({ jogador }) {
  if (!jogador) return null
  const moral = jogador.moral ?? 70
  const info = getMoralInfo(moral)
  const mult = (0.80 + (moral / 100) * 0.40).toFixed(2)

  return (
    <div className="pf-section">
      <div className="pf-section-header">
        <h3>MORAL</h3>
        <span className="pf-section-badge" style={{ color: info.cor }}>{info.emoji} {info.label}</span>
      </div>
      <div style={{ background: info.bg, border: `2px solid ${info.border}`, borderRadius: 12, padding: '12px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 28, fontWeight: 900, color: info.cor }}>{moral}</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#556' }}>
            Multiplicador: <strong style={{ color: info.cor }}>{mult}x</strong>
          </span>
        </div>
        <div style={{ background: '#e0e0e0', borderRadius: 8, height: 12, overflow: 'hidden' }}>
          <div style={{ width: `${moral}%`, height: '100%', background: info.cor, borderRadius: 8, transition: 'width 0.4s' }} />
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
      <div className="pf-section-header"><h3>OBJETIVOS DO CLUBE</h3></div>
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
              borderRadius: 12, padding: '12px 14px', opacity: obj.coletado ? 0.6 : 1,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                <div>
                  <span style={{ fontSize: 18 }}>{obj.icone}</span>
                  <span style={{ fontWeight: 900, fontSize: 13, marginLeft: 6 }}>{obj.nome}</span>
                </div>
                <span style={{ fontSize: 11, color: '#888' }}>{obj.progresso}/{obj.objetivo}</span>
              </div>
              <div style={{ fontSize: 11, color: '#666', marginBottom: 8 }}>{obj.descricao}</div>
              <div style={{ background: '#e0e0e0', borderRadius: 6, height: 8, overflow: 'hidden', marginBottom: 8 }}>
                <div style={{
                  width: `${pct}%`, height: '100%',
                  background: completo ? '#27ae60' : '#2980b9', borderRadius: 6, transition: 'width 0.4s',
                }} />
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

// ========================
// COMPONENTE PRINCIPAL
// ========================

export default function MeuJogador() {
  const { jogador, setJogador, jogadorID, mostrarNotificacao, setLevelUp, avatares, getAvatar } = useGame()
  const [clube, setClube] = useState(null)

  useEffect(() => {
    if (jogadorID) API.get('/api/clube/atual/' + jogadorID).then(setClube).catch(() => {})
  }, [jogadorID])

  async function selecionarAvatar(id) {
    const res = await API.post('/api/jogador/' + jogadorID, { avatar: id })
    setJogador(res)
    mostrarNotificacao('Avatar atualizado!', 'sucesso')
  }

  async function distribuirPonto(atributo) {
    const res = await API.post('/api/distribuir-ponto', { jogador_id: jogadorID, atributo })
    if (res.sucesso) {
      setJogador(res.jogador)
      mostrarNotificacao(res.mensagem, 'sucesso')
    } else {
      mostrarNotificacao(res.mensagem, 'erro')
    }
  }

  if (!jogador) return null

  const xpPct = Math.min(100, Math.round((jogador.xp / jogador.xp_proximo) * 100))

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
    mestre: 'Mestre', 'grao-mestre': 'Grao-Mestre', desafiante: 'Desafiante',
  }

  const desbloqueados = (jogador.avatares_premium || '')
    .split(',').filter(Boolean).map(Number)

  const winRate = jogador.vitorias + jogador.derrotas > 0
    ? Math.round((jogador.vitorias / (jogador.vitorias + jogador.derrotas)) * 100) : 0
  const temPontos = jogador.pontos_atributo > 0

  return (
    <div className="pf" data-tutorial="perfil-area">
      <h2 className="page-title">MEU JOGADOR</h2>

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
                  { GK: 'Goleiro', DEF: 'Defensor', MED: 'Meia', ATA: 'Atacante' }[jogador.posicao] || jogador.posicao
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
              <div className="pf-code">Codigo: <strong>{jogador.codigo_amigo}</strong></div>
            </div>
          </div>
          {jogador.titulos && (
            <div className="pf-hero-titulos">
              <div className="pf-hero-titulos-label">Titulos</div>
              <div className="pf-hero-titulos-list">
                {jogador.titulos.split(',').filter(Boolean).map((t, i) => (
                  <span key={i} className={`pf-hero-titulo-badge${t === jogador.titulo ? ' pf-hero-titulo-ativo' : ''}`}>{t}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* === STATS GRID === */}
      <div className="pf-stats">
        <div className="pf-stat">
          <span className="pf-stat-icon">💪</span><span className="pf-stat-val">{jogador.forca}</span><span className="pf-stat-lbl">Forca</span>
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
        <div className="pf-section-header"><h3>PONTOS DE ATRIBUTO</h3></div>
        <div className="pf-pontos-info">
          <div className="pf-pontos-disponiveis">
            <span className="pf-pontos-num">{jogador.pontos_atributo || 0}</span>
            <span className="pf-pontos-lbl">
              ponto{(jogador.pontos_atributo || 0) !== 1 ? 's' : ''} disponive{(jogador.pontos_atributo || 0) !== 1 ? 'is' : 'l'}
            </span>
          </div>
          <div className="pf-pontos-progresso">
            <div className="pf-pontos-bar-bg">
              <div className="pf-pontos-bar-fill" style={{ width: `${((jogador.vitorias % 20) / 20) * 100}%` }} />
            </div>
            <span className="pf-pontos-bar-txt">{jogador.vitorias % 20}/20 vitorias para o proximo ponto</span>
          </div>
        </div>
      </div>

      {/* === MORAL === */}
      <MoralSection jogador={jogador} />

      {/* === FAMA & PATROCINIO === */}
      <FamaCard
        jogadorID={jogadorID}
        jogador={jogador}
        setJogador={setJogador}
        mostrarNotificacao={mostrarNotificacao}
      />

      {/* === OBJETIVOS DO CLUBE === */}
      {jogador.clube_id > 0 && (
        <ClubeObjetivosSection
          jogadorID={jogadorID}
          setJogador={setJogador}
          mostrarNotificacao={mostrarNotificacao}
          setLevelUp={setLevelUp}
        />
      )}
    </div>
  )
}
