import React, { useState, useEffect } from 'react'
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

const TIERS = [
  'Garoto', 'Base', 'Amador', 'Série C', 'Série B', 'Série A',
  'Copinha Nacional', 'Continentão', 'Europa', 'Liga dos Craques',
  'Seleçoca', 'Mundialito', 'Bola de Ouro', 'Ídolo', 'Lenda'
]
const TIER_NIVEL_MIN = {
  Garoto: 1, Base: 5, Amador: 10, 'Série C': 18, 'Série B': 24, 'Série A': 30,
  'Copinha Nacional': 36, Continentão: 42, Europa: 50, 'Liga dos Craques': 60,
  'Seleçoca': 72, Mundialito: 85, 'Bola de Ouro': 100, 'Ídolo': 120, Lenda: 150
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

function JobItem({ trabalho, maestria, nivel, onTrabalhar, loading, vezesHoje }) {
  const custo = custoEnergiaEscalado(trabalho.energia, nivel, trabalho.tier)
  const recompensa = calcularRecompensaTrabalho(trabalho, nivel)

  const { nivel: nivelM, prev, next } = calcNivelMaestria(maestria)
  const pct = prev === next ? 100 : Math.round(((maestria - prev) / (next - prev)) * 100)
  const isLoading = loading === trabalho.id
  const fator = calcFatorMaestria(maestria)

  return (
    <div className="job-item">
      <div className="col-desc" data-trabalho-id={trabalho.id}>
        <h3>{trabalho.icone} {trabalho.nome}</h3>

        <div className="mastery-bar">
          <div className="mastery-fill" style={{ width: Math.min(100, Math.max(0, pct)) + '%' }} />
        </div>

        <span className="mastery-text">
          Maestria nível {nivelM} ({maestria}x)
        </span>

        {vezesHoje > 0 && (
          <span className="hoje-badge">hoje: {vezesHoje}x</span>
        )}
      </div>

      <div className="col-pay">
        <span className="reward-money">
          R$ {fmt(Math.round(recompensa.ganho_min * fator))} – R$ {fmt(Math.round(recompensa.ganho_max * fator))}
        </span>
        <span className="reward-xp">+{Math.round(recompensa.ganho_xp * fator)} XP</span>
      </div>

      <div className="col-req">
        <span className="req-energy">⚡ {custo}</span>
        {trabalho.nivel_min > 1 && (
          <small className="req-item" style={{ color: '#3a4a30' }}>Nível mín: {trabalho.nivel_min}</small>
        )}
      </div>

      <div className="col-action">
        <button
          className="btn-work"
          onClick={() => onTrabalhar(trabalho.id)}
          disabled={isLoading}
        >
          {isLoading ? '...' : 'Trabalhar'}
        </button>
      </div>
    </div>
  )
}

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
    <div className={`variedade-panel${bonusPct > 0 ? ' variedade-bonus-on' : ''}`}>
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
    // Seleciona o tier mais alto disponível que não está superado
    const disponivel = TIERS.slice().reverse().find(tier => {
      if (!podeFazerTier(tier, tierJogador)) return false
      return trabalhos.filter(t => t.tier === tier).some(t => t.nivel_min <= jogador.nivel)
    })
    if (disponivel) setTierAtivo(disponivel)
  }, [jogador, trabalhos, tierJogador])

  async function handleTrabalhar(trabalhoID) {
    if (!jogador) return
    setLoading(trabalhoID)

    try {
      const trabalho = trabalhos.find(t => t.id === trabalhoID)

      const res = await API.post('/api/trabalhar', {
        jogador_id: jogadorID,
        trabalho_id: trabalhoID,
      })

      if (res.falta_item) {
        pushDialogo({ tipo: 'falta_item', item: res.falta_item, mensagem: res.mensagem })
      } else if (res.sucesso) {
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

        mostrarNotificacao(`+R$ ${fmt(res.ganhou)} | +${res.ganhou_xp} XP`, 'sucesso')

        if (res.bonus_variedade_xp > 0) {
          mostrarNotificacao(`Bônus variedade! +${res.bonus_variedade_xp} XP extra`, 'sucesso')
        }
        if (res.bonus_maestria > 0) {
          mostrarNotificacao(`Maestria ${res.bonus_tier}! +${res.bonus_maestria} XP bônus!`, 'sucesso')
        }
        if (res.level_up) {
          setLevelUp(res.novo_nivel)
        }
        // Evento aleatório?
        if (res.evento) {
          setEventoPendente({ ...res.evento, ganho_din: res.ganhou, ganho_xp: res.ganhou_xp })
        }
      } else if (res.mensagem && (res.mensagem.includes('alugar uma casa') || res.mensagem.includes('casa melhor') || res.mensagem.includes('Série B exige'))) {
        pushDialogo({
          tipo: 'dialogo',
          icone: '🏠',
          texto: res.mensagem,
        })
        setTimeout(() => navigate('/inicio'), 300)
      } else {
        mostrarNotificacao(res.mensagem || 'Não foi possível trabalhar.', 'erro')
      }
    } catch {
      mostrarNotificacao('Erro de conexão.', 'erro')
    }

    setLoading(null)
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
      <p className="subtitle">
        Faça trabalhos para ganhar dinheiro e XP. Maestria alta reduz o rendimento — varie seus trabalhos!
      </p>

      {jogador && jogador.saude < 30 && (
        <div style={{
          background: '#3a1515', border: '2px solid #e74c3c', borderRadius: 10,
          padding: '14px 18px', marginBottom: 14, textAlign: 'center'
        }}>
          <div style={{ fontSize: 28 }}>⚠️</div>
          <div style={{ color: '#ff6b6b', fontWeight: 900, fontSize: 14, marginTop: 4 }}>
            Saúde muito baixa! ({jogador.saude}/30)
          </div>
          <div style={{ color: '#cc9999', fontSize: 12, marginTop: 4 }}>
            Vá ao <strong style={{ color: '#ffd700' }}>Perfil → Central de Tratamento</strong> para se recuperar antes de trabalhar.
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

      <div className="jobs-list" data-tutorial="first-job">
        <div className="job-header">
          <span className="col-desc">Descrição</span>
          <span className="col-pay">Pagamento</span>
          <span className="col-req">Exige</span>
          <span className="col-action"></span>
        </div>

        {tierTrabalhos.map(t => (
          <JobItem
            key={t.id}
            trabalho={t}
            maestria={maestria[t.id] || 0}
            nivel={nivel}
            onTrabalhar={handleTrabalhar}
            loading={loading}
            vezesHoje={hoje.trabalhos_hoje?.[t.id] || 0}
          />
        ))}
      </div>

      <p className="footer-note">
        💡 Suba de nível para desbloquear tiers melhores! Tier Amador fica sempre disponível.
      </p>

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
