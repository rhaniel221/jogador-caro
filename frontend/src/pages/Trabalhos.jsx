import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGame } from '../context/GameContext'
import API from '../api'
import {
  fmt,
  custoEnergiaEscalado,
  calcNivelMaestria,
  calcularRecompensaTrabalho,
  energiaBonusPorTier,
  calcularBonusVariedade,
  calcFatorMaestria
} from '../utils'
import PageGuide from '../components/PageGuide'

const TIERS = [
  'Garoto', 'Base', 'Amador', 'Série C', 'Série B', 'Série A',
  'Copinha Nacional', 'Continentão', 'Europa', 'Liga dos Craques',
  'Seleçoca', 'Mundialito', 'Bola de Ouro', 'Ídolo', 'Lenda'
]
const TIER_NIVEL_MIN = {
  Garoto: 1, Base: 5, Amador: 10, 'Série C': 20, 'Série B': 30, 'Série A': 40,
  'Copinha Nacional': 50, Continentão: 60, Europa: 72, 'Liga dos Craques': 85,
  'Seleçoca': 100, Mundialito: 115, 'Bola de Ouro': 135, 'Ídolo': 160, Lenda: 190
}

// Modal cinemático desabilitado — todos os tiers usam o mesmo visual inline.
// Para reativar pra tiers altos, troque pro índice desejado (ex: 4 = Série B+).
const TIER_CINEMATICO_MIN_INDEX = 999

const TIER_CORES = {
  Garoto: '#94a3b8', Base: '#84cc16', Amador: '#22d3ee',
  'Série C': '#38bdf8', 'Série B': '#3b82f6', 'Série A': '#8b5cf6',
  'Copinha Nacional': '#a855f7', Continentão: '#d946ef', Europa: '#f43f5e',
  'Liga dos Craques': '#f97316', 'Seleçoca': '#fbbf24', Mundialito: '#fde047',
  'Bola de Ouro': '#facc15', 'Ídolo': '#fb7185', Lenda: '#fff'
}

// Frase de esforço com base na energia gasta
function flavorEsforco(custoEnergia) {
  if (custoEnergia <= 4) return 'Esforço leve, dá pra repetir.'
  if (custoEnergia <= 10) return 'Esforço moderado — você sente.'
  if (custoEnergia <= 25) return 'Trabalho pesado, prepara o corpo.'
  if (custoEnergia <= 50) return 'Disputa intensa, gasta muito.'
  return 'Desgaste extremo — só os monstros aguentam.'
}

// Verbos por tier
function verboTrabalho(tier) {
  if (tier === 'Garoto' || tier === 'Base') return 'Bora correr atrás'
  if (tier === 'Amador' || tier === 'Série C') return 'Vai pra cima'
  if (tier === 'Série B' || tier === 'Série A') return 'Mostra serviço'
  return 'Brilha em campo'
}

function getTierDoJogador(nivel) {
  const tiers = [...TIERS].reverse()
  for (const t of tiers) {
    if (nivel >= TIER_NIVEL_MIN[t]) return t
  }
  return 'Garoto'
}

function podeFazerTier(tierTrabalho, tierJogador) {
  if (tierTrabalho === 'Amador') return true
  return TIERS.indexOf(tierTrabalho) >= TIERS.indexOf(tierJogador)
}

function tierCinematico(tier) {
  return TIERS.indexOf(tier) >= TIER_CINEMATICO_MIN_INDEX
}

// ================================================================
// JOB CARD — apresentação rica
// ================================================================
function JobCard({ trabalho, maestria, nivel, onTrabalhar, loading, vezesHoje, animState, energia, saude }) {
  const custo = custoEnergiaEscalado(trabalho.energia, nivel, trabalho.tier)
  const recompensa = calcularRecompensaTrabalho(trabalho, nivel)
  const { nivel: nivelM, prev, next } = calcNivelMaestria(maestria)
  const pct = prev === next ? 100 : Math.round(((maestria - prev) / (next - prev)) * 100)
  const isLoading = loading === trabalho.id
  const fator = calcFatorMaestria(maestria)
  const cor = TIER_CORES[trabalho.tier] || '#94a3b8'
  const minGanho = Math.round(recompensa.ganho_min * fator)
  const maxGanho = Math.round(recompensa.ganho_max * fator)
  const xpFinal = Math.round(recompensa.ganho_xp * fator)

  const fase = animState?.fase
  const resultado = animState?.resultado

  const semEnergia = energia < custo
  const semNivel = nivel < trabalho.nivel_min
  const semSaude = saude < 30
  const bloqueado = semEnergia || semNivel || semSaude
  const motivoBloqueio = semNivel ? `Nv.${trabalho.nivel_min}` : semSaude ? 'Saúde baixa' : semEnergia ? `Falta ⚡${custo - energia}` : ''

  return (
    <div
      className={`job-card${isLoading ? ' loading' : ''}${fase === 'work' ? ' job-working' : ''}${fase === 'reveal' ? ' job-revealing' : ''}${bloqueado && !fase ? ' job-bloqueado' : ''}`}
      data-trabalho-id={trabalho.id}
      style={{ '--tier-cor': cor }}
    >
      {/* Borda lateral colorida por tier */}
      <div className="job-card-stripe" />

      {/* Icone grande */}
      <div className="job-card-icon-wrap">
        <div className="job-card-icon">
          <img
            src={`/trabalhos/${trabalho.id}.png`}
            alt={trabalho.nome}
            className="job-card-icon-img"
            onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex' }}
          />
          <span className="job-card-icon-emoji" style={{ display: 'none' }}>{trabalho.icone}</span>
        </div>
        {fase === 'work' && <div className="job-card-icon-glow" />}
      </div>

      {/* Conteudo */}
      <div className="job-card-body">
        <div className="job-card-titulo-row">
          <h3 className="job-card-titulo">{trabalho.nome}</h3>
          <span className="job-card-tier-badge" style={{ background: cor }}>{trabalho.tier}</span>
        </div>

        <p className="job-card-flavor">{flavorEsforco(custo)}</p>

        <div className="job-card-stats">
          <div className="job-stat job-stat-energia" title="Custo de energia">
            <span className="js-icon">⚡</span>
            <span className="js-val">{custo}</span>
          </div>
          <div className="job-stat job-stat-din" title="Pagamento">
            <span className="js-icon">💰</span>
            <span className="js-val">R$ {fmt(minGanho)}<small>–{fmt(maxGanho)}</small></span>
          </div>
          <div className="job-stat job-stat-xp" title="XP ganho">
            <span className="js-icon">⭐</span>
            <span className="js-val">+{xpFinal}</span>
          </div>
          {trabalho.nivel_min > 1 && (
            <div className="job-stat job-stat-nv" title="Nível mínimo">
              <span className="js-icon">🔓</span>
              <span className="js-val">Nv.{trabalho.nivel_min}</span>
            </div>
          )}
        </div>

        <div className="job-card-mastery">
          <div className="jm-track">
            <div className="jm-fill" style={{ width: Math.min(100, Math.max(0, pct)) + '%' }} />
          </div>
          <div className="jm-info">
            <span className="jm-text">Maestria nv. {nivelM} <small>({maestria}x)</small></span>
            {vezesHoje > 0 && <span className="jm-hoje">hoje: {vezesHoje}x</span>}
          </div>
        </div>
      </div>

      {/* Acao */}
      <div className="job-card-action">
        <button
          className="btn-trabalhar"
          onClick={() => onTrabalhar(trabalho.id)}
          disabled={isLoading || fase || bloqueado}
        >
          {fase === 'work' ? (
            <span className="bt-working">
              <span className="bt-spinner">⚽</span>
              <span>Trabalhando…</span>
            </span>
          ) : fase === 'reveal' ? (
            <span className="bt-reveal">✓ Feito!</span>
          ) : bloqueado ? (
            <span className="bt-bloqueado">🚫 {motivoBloqueio}</span>
          ) : (
            <>
              <span className="bt-verb">{verboTrabalho(trabalho.tier)}</span>
              <span className="bt-arrow">→</span>
            </>
          )}
        </button>
      </div>

      {/* Anim trabalhando: barra de progresso atravessando o card */}
      {fase === 'work' && (
        <div className="job-progress-overlay">
          <div className="job-progress-bar" />
        </div>
      )}

      {/* Anim revelacao: numeros flutuando */}
      {fase === 'reveal' && resultado && (
        <div className="job-reveal-rewards">
          {resultado.ganhou > 0 && (
            <span className="reward-float reward-din">+R$ {fmt(resultado.ganhou)}</span>
          )}
          {resultado.ganhou_xp > 0 && (
            <span className="reward-float reward-xp">+{resultado.ganhou_xp} XP</span>
          )}
          {resultado.bonus_variedade_xp > 0 && (
            <span className="reward-float reward-variedade">✨ +{resultado.bonus_variedade_xp} bônus</span>
          )}
          {resultado.bonus_maestria > 0 && (
            <span className="reward-float reward-maestria">⭐ +{resultado.bonus_maestria} maestria</span>
          )}
        </div>
      )}
    </div>
  )
}

// ================================================================
// MODAL CINEMATICO — pra trabalhos de tier alto
// ================================================================
function CinematicWork({ data, onClose }) {
  if (!data) return null
  const { trabalho, fase, resultado } = data
  const cor = TIER_CORES[trabalho.tier] || '#fbbf24'

  return (
    <div className="cine-overlay" onClick={fase === 'reveal' ? onClose : undefined}>
      <div className={`cine-card cine-${fase}`} onClick={e => e.stopPropagation()} style={{ '--tier-cor': cor }}>
        {fase === 'work' ? (
          <>
            <div className="cine-tier" style={{ color: cor }}>{trabalho.tier.toUpperCase()}</div>
            <div className="cine-icone">
              <span className="cine-icone-glow" />
              <span className="cine-icone-emoji">{trabalho.icone}</span>
            </div>
            <h2 className="cine-nome">{trabalho.nome}</h2>
            <p className="cine-status">⚡ Em ação…</p>
            <div className="cine-bar">
              <div className="cine-bar-fill" />
            </div>
            <div className="cine-sparkles">
              <span>✨</span><span>⚡</span><span>💥</span><span>⭐</span><span>🔥</span>
            </div>
          </>
        ) : (
          <>
            <div className="cine-confetti">
              {[...Array(20)].map((_, i) => (
                <span key={i} className={`cc cc-${i % 5}`} style={{ left: (i * 5.2) + '%' }} />
              ))}
            </div>
            <div className="cine-tier" style={{ color: cor }}>SUCESSO</div>
            <div className="cine-icone cine-icone-vitoria">
              <span className="cine-icone-emoji">{trabalho.icone}</span>
            </div>
            <h2 className="cine-nome">{trabalho.nome}</h2>
            <div className="cine-rewards">
              {resultado?.ganhou > 0 && (
                <div className="cine-reward cine-reward-din">
                  <span className="cr-icon">💰</span>
                  <span className="cr-valor">+R$ {fmt(resultado.ganhou)}</span>
                </div>
              )}
              {resultado?.ganhou_xp > 0 && (
                <div className="cine-reward cine-reward-xp">
                  <span className="cr-icon">⭐</span>
                  <span className="cr-valor">+{resultado.ganhou_xp} XP</span>
                </div>
              )}
              {resultado?.bonus_variedade_xp > 0 && (
                <div className="cine-reward cine-reward-bonus">
                  <span className="cr-icon">✨</span>
                  <span className="cr-valor">+{resultado.bonus_variedade_xp} XP variedade</span>
                </div>
              )}
              {resultado?.bonus_maestria > 0 && (
                <div className="cine-reward cine-reward-bonus">
                  <span className="cr-icon">🏅</span>
                  <span className="cr-valor">+{resultado.bonus_maestria} XP maestria</span>
                </div>
              )}
            </div>
            <button className="btn-trabalhar btn-cine-fechar" onClick={onClose}>
              Continuar →
            </button>
          </>
        )}
      </div>
    </div>
  )
}

// ================================================================
// PAINEL DE VARIEDADE
// ================================================================
const MILESTONES = [
  { n: 3, bonus: 10, icon: '⭐' },
]

function VariedadePanel({ diferentesHoje, config, tier }) {
  const fatorAtual = calcularBonusVariedade(diferentesHoje, config)
  const bonusPct = Math.round(fatorAtual * 100)
  const maxMilestone = MILESTONES[MILESTONES.length - 1].n
  const barPct = Math.min(100, (diferentesHoje / maxMilestone) * 100)

  const proximoMilestone = MILESTONES.find(m => m.n > diferentesHoje)
  const faltam = proximoMilestone ? proximoMilestone.n - diferentesHoje : 0

  return (
    <div className={`variedade-panel${bonusPct > 0 ? ' variedade-bonus-on' : ''}`} data-tutorial="variedade-panel">
      {bonusPct > 0 && (
        <div className="vp-bonus-banner">
          <span className="vp-bonus-icon">✨</span>
          <span className="vp-bonus-text">BÔNUS DE VARIEDADE ATIVO!</span>
          <span className="vp-bonus-pct">+{bonusPct}% XP</span>
        </div>
      )}

      <div className="vp-body">
        <div className="vp-left">
          <div className="vp-count-label">trabalhos {tier} hoje</div>
          <div className="vp-count-num">{diferentesHoje}</div>
          {proximoMilestone && (
            <div className="vp-proximo">
              Faltam <strong>{faltam}</strong> para {proximoMilestone.icon} +{proximoMilestone.bonus}% XP
            </div>
          )}
          {!proximoMilestone && (
            <div className="vp-maximo">🏆 Bônus máximo!</div>
          )}
        </div>

        <div className="vp-right">
          <div className="vp-milestones-row">
            {MILESTONES.map(m => (
              <div key={m.n} className={`vp-milestone${diferentesHoje >= m.n ? ' reached' : ''}`}>
                <span className="vp-milestone-icon">{m.icon}</span>
                <span className="vp-milestone-label">+{m.bonus}%</span>
              </div>
            ))}
          </div>
          <div className="vp-progress-track">
            <div className="vp-progress-fill" style={{ width: barPct + '%' }} />
            {MILESTONES.map(m => (
              <div key={m.n} className="vp-progress-tick" style={{ left: ((m.n / maxMilestone) * 100) + '%' }} />
            ))}
          </div>
          <div className="vp-progress-nums">
            <span>0</span>
            {MILESTONES.map(m => <span key={m.n}>{m.n}</span>)}
          </div>
        </div>
      </div>

      <div className="vp-dica">
        💡 Alterne entre trabalhos diferentes! Maestria alta reduz rendimento, variedade dá bônus de XP.
      </div>
    </div>
  )
}

// ================================================================
// PAGINA PRINCIPAL
// ================================================================
export default function Trabalhos() {
  const { jogador, setJogador, mostrarNotificacao, jogadorID, setLevelUp, pushDialogo } = useGame()
  const navigate = useNavigate()

  const [trabalhos, setTrabalhos] = useState([])
  const [maestria, setMaestria] = useState({})
  const [tierAtivo, setTierAtivo] = useState('Garoto')
  const [loading, setLoading] = useState(null)
  const showAllTiers = false
  const [hoje, setHoje] = useState({ trabalhos_hoje: {}, diferentes_hoje: 0, config: {} })
  const [eventoPendente, setEventoPendente] = useState(null)
  const [eventoLoading, setEventoLoading] = useState(false)
  const [eventoResultado, setEventoResultado] = useState(null)

  // Estado de animacao por trabalho (inline)
  const [animMap, setAnimMap] = useState({})
  // Estado do modal cinematico
  const [cinematic, setCinematic] = useState(null)
  const animTimers = useRef({})

  useEffect(() => {
    API.get('/api/trabalhos').then(setTrabalhos).catch(() => {})
  }, [])

  useEffect(() => {
    if (!jogadorID) return
    API.get('/api/maestria/' + jogadorID).then(setMaestria).catch(() => {})
    API.get('/api/progressao/hoje/' + jogadorID).then(setHoje).catch(() => {})
  }, [jogadorID])

  const nivel = jogador?.nivel || 1
  const tierJogador = getTierDoJogador(nivel)

  useEffect(() => {
    if (!jogador || !trabalhos.length) return
    const disponivel = TIERS.slice().reverse().find(tier => {
      if (!podeFazerTier(tier, tierJogador)) return false
      return trabalhos.filter(t => t.tier === tier).some(t => t.nivel_min <= jogador.nivel)
    })
    if (disponivel) setTierAtivo(disponivel)
  }, [jogador, trabalhos, tierJogador])

  // Cleanup de timers ao desmontar
  useEffect(() => {
    return () => {
      Object.values(animTimers.current).forEach(t => clearTimeout(t))
    }
  }, [])

  function clearInlineAnim(trabalhoID) {
    setAnimMap(prev => {
      const n = { ...prev }
      delete n[trabalhoID]
      return n
    })
  }

  async function handleTrabalhar(trabalhoID) {
    if (!jogador) return
    if (loading || cinematic) return
    const trabalho = trabalhos.find(t => t.id === trabalhoID)
    if (!trabalho) return

    // Bloqueia ANTES de animar se não tem energia ou nível
    const custo = custoEnergiaEscalado(trabalho.energia, jogador.nivel, trabalho.tier)
    if (jogador.energia < custo) {
      mostrarNotificacao(`Energia insuficiente! Precisa ⚡${custo} (você tem ⚡${jogador.energia})`, 'erro')
      return
    }
    if (jogador.nivel < trabalho.nivel_min) {
      mostrarNotificacao(`Nível insuficiente! Precisa nv.${trabalho.nivel_min}`, 'erro')
      return
    }
    if (jogador.saude < 30) {
      mostrarNotificacao('Saúde muito baixa pra trabalhar (<30). Vá ao Perfil → Tratamento.', 'erro')
      return
    }

    const cinema = tierCinematico(trabalho.tier)
    setLoading(trabalhoID)

    if (cinema) {
      setCinematic({ trabalho, fase: 'work', resultado: null })
    } else {
      setAnimMap(prev => ({ ...prev, [trabalhoID]: { fase: 'work' } }))
    }

    const minDuracao = cinema ? 1700 : 850
    const inicio = Date.now()

    try {
      const res = await API.post('/api/trabalhar', {
        jogador_id: jogadorID,
        trabalho_id: trabalhoID,
      })

      // Garante duracao minima de animacao
      const passou = Date.now() - inicio
      if (passou < minDuracao) {
        await new Promise(r => setTimeout(r, minDuracao - passou))
      }

      if (res.falta_item) {
        if (cinema) setCinematic(null)
        else clearInlineAnim(trabalhoID)
        pushDialogo({ tipo: 'falta_item', item: res.falta_item, mensagem: res.mensagem })
      } else if (res.sucesso) {
        // Aplica estado do jogador IMEDIATAMENTE (anima sobreposta)
        setJogador(res.jogador)
        setMaestria(prev => ({ ...prev, [trabalhoID]: (prev[trabalhoID] || 0) + 1 }))
        setHoje(prev => ({
          ...prev,
          trabalhos_hoje: { ...prev.trabalhos_hoje, [trabalhoID]: res.vezes_hoje },
          diferentes_por_tier: {
            ...(prev.diferentes_por_tier || {}),
            [trabalho.tier]: res.diferentes_hoje,
          },
        }))

        // Transiciona pra revelacao
        if (cinema) {
          setCinematic({ trabalho, fase: 'reveal', resultado: res })
        } else {
          setAnimMap(prev => ({ ...prev, [trabalhoID]: { fase: 'reveal', resultado: res } }))
          // Auto-clear inline
          animTimers.current[trabalhoID] = setTimeout(() => {
            clearInlineAnim(trabalhoID)
            delete animTimers.current[trabalhoID]
          }, 1600)
        }

        if (res.level_up) {
          setLevelUp(res.novo_nivel)
        }
        if (res.evento) {
          // Aguarda anim antes de abrir evento
          setTimeout(() => {
            setEventoPendente({ ...res.evento, ganho_din: res.ganhou, ganho_xp: res.ganhou_xp })
          }, cinema ? 2400 : 1600)
        }
      } else if (res.mensagem && (res.mensagem.includes('alugar uma casa') || res.mensagem.includes('casa melhor') || res.mensagem.includes('Série B exige'))) {
        if (cinema) setCinematic(null)
        else clearInlineAnim(trabalhoID)
        pushDialogo({
          tipo: 'dialogo',
          icone: '🏠',
          texto: res.mensagem,
        })
        setTimeout(() => navigate('/vida'), 300)
      } else {
        if (cinema) setCinematic(null)
        else clearInlineAnim(trabalhoID)
        mostrarNotificacao(res.mensagem || 'Não foi possível trabalhar.', 'erro')
      }
    } catch {
      if (cinema) setCinematic(null)
      else clearInlineAnim(trabalhoID)
      mostrarNotificacao('Erro de conexão.', 'erro')
    }

    setLoading(null)
  }

  function fecharCinematic() {
    setCinematic(null)
  }

  async function handleEscolhaEvento(opcaoID) {
    if (!eventoPendente || eventoLoading) return
    setEventoLoading(true)
    try {
      const res = await API.post('/api/evento-trabalho/escolha', {
        jogador_id: jogadorID,
        evento_id: eventoPendente.id,
        opcao_id: opcaoID,
        ganho_din: eventoPendente.ganho_din,
        ganho_xp: eventoPendente.ganho_xp,
      })
      if (res.sucesso) {
        setJogador(res.jogador)
        setEventoResultado(res.resultado)
        if (res.level_up) setLevelUp(res.novo_nivel)
      }
    } catch {
      mostrarNotificacao('Erro de conexão', 'erro')
      setEventoPendente(null)
    }
    setEventoLoading(false)
  }

  function fecharEvento() {
    setEventoPendente(null)
    setEventoResultado(null)
  }

  const tierTrabalhos = trabalhos.filter(t => t.tier === tierAtivo)
  const bonusEnergiaClasse = energiaBonusPorTier(tierAtivo)

  return (
    <>
      <h2 className="page-title">⚽ TRABALHOS</h2>
      <PageGuide
        pageKey="trabalhos"
        icone="⚽"
        titulo="Bem-vindo aos Trabalhos!"
        texto="Faça trabalhos para ganhar dinheiro e XP. Varie entre trabalhos diferentes para ganhar bônus! Maestria alta reduz rendimento, então alterne sempre."
      />
      <p className="subtitle">
        Faça trabalhos para ganhar dinheiro e XP. Maestria alta reduz o rendimento — varie seus trabalhos!
      </p>

      {jogador && jogador.saude < 30 && (
        <div style={{
          background: '#ffeaea', border: '2px solid var(--vermelho)', borderRadius: 10,
          padding: '14px 18px', marginBottom: 14, textAlign: 'center'
        }}>
          <div style={{ fontSize: 28 }}>⚠️</div>
          <div style={{ color: '#b00', fontWeight: 900, fontSize: 14, marginTop: 4 }}>
            Saúde muito baixa! ({jogador.saude}/30)
          </div>
          <div style={{ color: '#666', fontSize: 12, marginTop: 4 }}>
            Vá ao <strong style={{ color: 'var(--azul)' }}>Perfil → Central de Tratamento</strong> para se recuperar antes de trabalhar.
          </div>
        </div>
      )}

      <VariedadePanel
        diferentesHoje={hoje.diferentes_por_tier?.[tierAtivo] || 0}
        config={hoje.config}
        tier={tierAtivo}
      />

      <div style={{ marginBottom: 14 }}>
        <strong>Sua classe:</strong> {tierJogador}
        <span style={{ marginLeft: 12 }}>
          <strong>Bônus de energia:</strong> +{bonusEnergiaClasse}
        </span>
      </div>

      {(() => {
        const MAX_VISIBLE = 8
        const allTabs = TIERS.map(tier => {
          const disponiveis = trabalhos.filter(t => t.tier === tier)
          if (!disponiveis.length) return null
          const nivelMin = Math.min(...disponiveis.map(t => t.nivel_min))
          const naoDesbloqueou = nivel < nivelMin
          if (!podeFazerTier(tier, tierJogador) && !naoDesbloqueou) return null
          return { tier, nivelMin, naoDesbloqueou }
        }).filter(Boolean)

        const visibleTabs = showAllTiers ? allTabs : allTabs.slice(0, MAX_VISIBLE)
        const hasMore = allTabs.length > MAX_VISIBLE && !showAllTiers

        return (
          <div className="tabs">
            {visibleTabs.map(({ tier, nivelMin, naoDesbloqueou }) => (
              <div
                key={tier}
                className={`tab${tierAtivo === tier ? ' active' : ''}${naoDesbloqueou ? ' locked' : ''}`}
                onClick={() => !naoDesbloqueou && setTierAtivo(tier)}
                style={tierAtivo === tier ? { background: `linear-gradient(135deg, ${TIER_CORES[tier]} 0%, #0a3d91 100%)` } : undefined}
              >
                {tier} {naoDesbloqueou ? `🔒${nivelMin}` : ''}
              </div>
            ))}
            {hasMore && (
              <div className="tab tab-more">... E muito mais</div>
            )}
          </div>
        )
      })()}

      <div className="jobs-grid" data-tutorial="first-job">
        {tierTrabalhos.map(t => (
          <JobCard
            key={t.id}
            trabalho={t}
            maestria={maestria[t.id] || 0}
            nivel={nivel}
            energia={jogador?.energia || 0}
            saude={jogador?.saude || 0}
            onTrabalhar={handleTrabalhar}
            loading={loading}
            vezesHoje={hoje.trabalhos_hoje?.[t.id] || 0}
            animState={animMap[t.id]}
          />
        ))}
      </div>

      <p className="footer-note">
        💡 Suba de nível para desbloquear tiers melhores! Tier Amador fica sempre disponível.
      </p>

      {/* Modal cinematico */}
      <CinematicWork data={cinematic} onClose={fecharCinematic} />

      {/* Modal de Evento Aleatório */}
      {eventoPendente && (
        <div className="modal-overlay">
          <div className="evento-modal">
            {!eventoResultado ? (
              <>
                <div className="evento-icone">{eventoPendente.icone}</div>
                <h3 className="evento-titulo">{eventoPendente.titulo}</h3>
                <p className="evento-desc">{eventoPendente.descricao}</p>
                <div className="evento-opcoes">
                  {eventoPendente.opcoes.map(op => (
                    <button
                      key={op.id}
                      className="evento-opcao-btn"
                      onClick={() => handleEscolhaEvento(op.id)}
                      disabled={eventoLoading}
                    >
                      <span className="evento-op-icone">{op.icone}</span>
                      <span className="evento-op-texto">{op.texto}</span>
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <>
                <div className="evento-icone">{eventoResultado.sucesso ? '✅' : '❌'}</div>
                <h3 className="evento-titulo">{eventoResultado.sucesso ? 'Deu bom!' : 'Deu ruim...'}</h3>
                <p className="evento-desc">{eventoResultado.texto}</p>
                <div className="evento-resultados">
                  {eventoResultado.bonus_xp > 0 && <span className="evento-res-item evento-res-bom">+{eventoResultado.bonus_xp} XP</span>}
                  {eventoResultado.bonus_din > 0 && <span className="evento-res-item evento-res-bom">+R$ {fmt(eventoResultado.bonus_din)}</span>}
                  {eventoResultado.bonus_din < 0 && <span className="evento-res-item evento-res-ruim">R$ {fmt(eventoResultado.bonus_din)}</span>}
                  {eventoResultado.bonus_fama > 0 && <span className="evento-res-item evento-res-bom">+{eventoResultado.bonus_fama} Fama</span>}
                  {eventoResultado.perda_fama > 0 && <span className="evento-res-item evento-res-ruim">-{eventoResultado.perda_fama} Fama</span>}
                  {eventoResultado.bonus_energia > 0 && <span className="evento-res-item evento-res-bom">+{eventoResultado.bonus_energia} Energia</span>}
                  {eventoResultado.bonus_energia < 0 && <span className="evento-res-item evento-res-ruim">{eventoResultado.bonus_energia} Energia</span>}
                  {eventoResultado.perda_saude > 0 && <span className="evento-res-item evento-res-ruim">-{eventoResultado.perda_saude} Saúde</span>}
                </div>
                <button className="btn-work btn-verde" onClick={fecharEvento} style={{ marginTop: 14, width: '100%' }}>
                  Continuar
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  )
}
