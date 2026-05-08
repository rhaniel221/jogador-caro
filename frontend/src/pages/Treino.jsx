import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useGame } from '../context/GameContext'
import API from '../api'
import PageGuide from '../components/PageGuide'

function formatRestante(segs) {
  if (segs <= 0) return 'pronto'
  const h = Math.floor(segs / 3600)
  const m = Math.floor((segs % 3600) / 60)
  const s = segs % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s.toString().padStart(2, '0')}s`
  return `${s}s`
}

function flavorEsforco(cooldownMin) {
  if (cooldownMin <= 5) return 'Aquecimento — leve, rápido.'
  if (cooldownMin <= 15) return 'Treino moderado, sente o esforço.'
  if (cooldownMin <= 30) return 'Pesado — vai cansar bem.'
  if (cooldownMin <= 60) return 'Sessão dura, descanso obrigatório.'
  return 'Devastador — fica off por um tempão.'
}

function TreinoCard({ treino, agora, loading, onTreinar, animState }) {
  const proximoEm = treino.proximo_em || 0
  const restante = proximoEm > 0 ? proximoEm - agora : 0
  const onCooldown = restante > 0
  const nivelOK = treino.nivel_ok
  const disponivel = nivelOK && !onCooldown
  const isLoading = loading === treino.id
  const cor = treino.bonus_forca >= treino.bonus_velocidade && treino.bonus_forca >= treino.bonus_habilidade ? '#ef4444'
            : treino.bonus_velocidade >= treino.bonus_habilidade ? '#38a8f8' : '#a855f7'

  const cooldownTxt = Math.floor(treino.cooldown_minutos / 60) > 0
    ? `${Math.floor(treino.cooldown_minutos / 60)}h${treino.cooldown_minutos % 60 > 0 ? ` ${treino.cooldown_minutos % 60}m` : ''}`
    : `${treino.cooldown_minutos}m`

  const fase = animState?.fase
  const resultado = animState?.resultado

  return (
    <div
      className={`job-card${isLoading ? ' loading' : ''}${fase === 'work' ? ' job-working' : ''}${fase === 'reveal' ? ' job-revealing' : ''}${!disponivel && !fase ? ' job-bloqueado' : ''}`}
      style={{ '--tier-cor': cor }}
    >
      <div className="job-card-stripe" />

      <div className="job-card-icon-wrap">
        <div className="job-card-icon">{treino.icone}</div>
        {fase === 'work' && <div className="job-card-icon-glow" />}
      </div>

      <div className="job-card-body">
        <div className="job-card-titulo-row">
          <h3 className="job-card-titulo">{treino.nome}</h3>
          {treino.categoria && (
            <span className="job-card-tier-badge" style={{ background: cor }}>{treino.categoria}</span>
          )}
        </div>
        <p className="job-card-flavor">{treino.descricao || flavorEsforco(treino.cooldown_minutos)}</p>

        <div className="job-card-stats">
          {treino.bonus_forca > 0 && (
            <div className="job-stat" style={{ background: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.3)', color: '#fca5a5' }}>
              <img src="/icons/forca.png" alt="" className="js-icon-img" />
              <span className="js-val">+{treino.bonus_forca}</span>
            </div>
          )}
          {treino.bonus_velocidade > 0 && (
            <div className="job-stat" style={{ background: 'rgba(56,168,248,0.1)', borderColor: 'rgba(56,168,248,0.3)', color: '#93c5fd' }}>
              <img src="/icons/velocidade.png" alt="" className="js-icon-img" />
              <span className="js-val">+{treino.bonus_velocidade}</span>
            </div>
          )}
          {treino.bonus_habilidade > 0 && (
            <div className="job-stat" style={{ background: 'rgba(168,85,247,0.1)', borderColor: 'rgba(168,85,247,0.3)', color: '#d8b4fe' }}>
              <img src="/icons/habilidade.png" alt="" className="js-icon-img" />
              <span className="js-val">+{treino.bonus_habilidade}</span>
            </div>
          )}
          <div className="job-stat" style={{ background: 'rgba(214,168,79,0.1)', borderColor: 'rgba(214,168,79,0.3)', color: '#fcd34d' }}>
            <span className="js-icon">⏱️</span>
            <span className="js-val">{cooldownTxt}</span>
          </div>
        </div>

        <div className="job-card-mastery">
          <div className="jm-info">
            {!nivelOK && <span className="jm-text" style={{ color: '#ef4444' }}>🔒 Precisa nv.{treino.nivel_min}</span>}
            {nivelOK && onCooldown && <span className="jm-text" style={{ color: '#fbbf24' }}>⏳ {formatRestante(restante)}</span>}
            {treino.vezes_feito > 0 && <span className="jm-hoje">{treino.vezes_feito}x feitos</span>}
          </div>
        </div>
      </div>

      <div className="job-card-action">
        <button
          className="btn-trabalhar"
          onClick={() => disponivel && onTreinar(treino.id)}
          disabled={isLoading || fase || !disponivel}
        >
          {fase === 'work' ? (
            <span className="bt-working">
              <span className="bt-spinner">💪</span>
              <span>Treinando…</span>
            </span>
          ) : fase === 'reveal' ? (
            <span className="bt-reveal">✓ Top!</span>
          ) : !nivelOK ? (
            <span className="bt-bloqueado">🚫 Nv.{treino.nivel_min}</span>
          ) : onCooldown ? (
            <span className="bt-bloqueado">⏳ {formatRestante(restante)}</span>
          ) : (
            <>
              <span className="bt-verb">Treinar</span>
              <span className="bt-arrow">→</span>
            </>
          )}
        </button>
      </div>

      {fase === 'work' && (
        <div className="job-progress-overlay"><div className="job-progress-bar" /></div>
      )}

      {fase === 'reveal' && resultado && (
        <div className="job-reveal-rewards">
          {resultado.bonus_forca > 0 && <span className="reward-float reward-din">+{resultado.bonus_forca} Força</span>}
          {resultado.bonus_velocidade > 0 && <span className="reward-float reward-variedade">+{resultado.bonus_velocidade} Velocidade</span>}
          {resultado.bonus_habilidade > 0 && <span className="reward-float reward-maestria">+{resultado.bonus_habilidade} Habilidade</span>}
        </div>
      )}
    </div>
  )
}

export default function Treino() {
  const { jogador, setJogador, jogadorID, mostrarNotificacao } = useGame()
  const [treinos, setTreinos] = useState([])
  const [loading, setLoading] = useState(null)
  const [agora, setAgora] = useState(Math.floor(Date.now() / 1000))
  const [animMap, setAnimMap] = useState({})
  const animTimers = useRef({})

  useEffect(() => {
    const id = setInterval(() => setAgora(Math.floor(Date.now() / 1000)), 1000)
    return () => clearInterval(id)
  }, [])

  const carregar = useCallback(async () => {
    if (!jogadorID) return
    try {
      const dados = await API.get('/api/treinos/' + jogadorID)
      setTreinos(dados || [])
    } catch (e) {}
  }, [jogadorID])

  useEffect(() => { carregar() }, [carregar])

  useEffect(() => {
    return () => Object.values(animTimers.current).forEach(t => clearTimeout(t))
  }, [])

  function clearAnim(id) {
    setAnimMap(prev => { const n = { ...prev }; delete n[id]; return n })
  }

  async function handleTreinar(treinoID) {
    if (!jogador || loading) return
    const treino = treinos.find(t => t.id === treinoID)
    if (!treino) return

    setLoading(treinoID)
    setAnimMap(prev => ({ ...prev, [treinoID]: { fase: 'work' } }))
    const inicio = Date.now()

    try {
      const res = await API.post('/api/treinar', {
        jogador_id: jogadorID,
        treino_id: treinoID
      })

      const passou = Date.now() - inicio
      if (passou < 850) await new Promise(r => setTimeout(r, 850 - passou))

      if (res.sucesso) {
        setJogador(res.jogador)
        setAnimMap(prev => ({ ...prev, [treinoID]: { fase: 'reveal', resultado: {
          bonus_forca: treino.bonus_forca,
          bonus_velocidade: treino.bonus_velocidade,
          bonus_habilidade: treino.bonus_habilidade,
        }}}))
        animTimers.current[treinoID] = setTimeout(() => {
          clearAnim(treinoID)
          delete animTimers.current[treinoID]
        }, 1600)
        await carregar()
      } else {
        clearAnim(treinoID)
        mostrarNotificacao(res.mensagem || 'Não foi possível treinar', 'erro')
        if (res.proximo_em) await carregar()
      }
    } catch (e) {
      clearAnim(treinoID)
      mostrarNotificacao('Erro ao treinar', 'erro')
    } finally {
      setLoading(null)
    }
  }

  if (!jogador) {
    return <div style={{ padding: 20, textAlign: 'center' }}>Carregando…</div>
  }

  const globalCooldown = treinos.length > 0 ? treinos[0].proximo_em || 0 : 0
  const globalRestante = globalCooldown > 0 ? globalCooldown - agora : 0
  const categoriaAtual = treinos.length > 0 ? treinos[0].categoria : ''

  return (
    <>
      <h2 className="page-title">🏋️ TREINO {categoriaAtual && `— ${categoriaAtual}`}</h2>
      <PageGuide
        pageKey="treino"
        icone="🏋️"
        titulo="Centro de Treinamento"
        texto="Treine para aumentar Força, Velocidade e Habilidade! Cada treino tem cooldown. Treinos mais fortes dão mais stats mas demoram mais. Monte sua build!"
      />
      <p className="subtitle">Escolha um treino — quanto mais forte, maior o cooldown. Sua build, sua estratégia.</p>

      {/* Painel de stats com PNGs */}
      <div className="treino-stats-panel">
        <div className="ts-item">
          <img src="/icons/forca.png" alt="Força" />
          <div>
            <div className="ts-label">FORÇA</div>
            <div className="ts-val" style={{ color: '#fca5a5' }}>{jogador.forca}</div>
          </div>
        </div>
        <div className="ts-item">
          <img src="/icons/velocidade.png" alt="Velocidade" />
          <div>
            <div className="ts-label">VELOCIDADE</div>
            <div className="ts-val" style={{ color: '#93c5fd' }}>{jogador.velocidade}</div>
          </div>
        </div>
        <div className="ts-item">
          <img src="/icons/habilidade.png" alt="Habilidade" />
          <div>
            <div className="ts-label">HABILIDADE</div>
            <div className="ts-val" style={{ color: '#d8b4fe' }}>{jogador.habilidade}</div>
          </div>
        </div>
      </div>

      {globalRestante > 0 && (
        <div className="treino-cooldown-banner">
          <span className="tcb-icon">⏳</span>
          <span>Cooldown global: <strong>{formatRestante(globalRestante)}</strong></span>
        </div>
      )}

      <div className="jobs-grid">
        {treinos.map(t => (
          <TreinoCard
            key={t.id}
            treino={t}
            agora={agora}
            loading={loading}
            onTreinar={handleTreinar}
            animState={animMap[t.id]}
          />
        ))}
      </div>
    </>
  )
}
