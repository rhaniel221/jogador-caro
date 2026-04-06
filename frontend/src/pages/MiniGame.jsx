import React, { useState, useEffect, useRef } from 'react'
import Phaser from 'phaser'
import Match3Scene from '../game/Match3Scene'
import { useGame } from '../context/GameContext'
import { useNavigate } from 'react-router-dom'
import API from '../api'

const PIECES = ['⚽', '👟', '🏆', '🟨', '🧤']

export default function MiniGame() {
  const { jogador, setJogador, mostrarNotificacao, jogadorID, setLevelUp } = useGame()
  const navigate = useNavigate()

  if (!jogador || jogador.nivel < 15) return (
    <div style={{ textAlign: 'center', padding: 40 }}>
      <div style={{ fontSize: 60 }}>🔒</div>
      <h2 style={{ fontFamily: 'var(--font-titulo)', marginTop: 10 }}>MiniGame bloqueado</h2>
      <p style={{ fontWeight: 700, color: '#555' }}>Alcance o nível 15 para desbloquear o Match-3!</p>
    </div>
  )
  const gameRef = useRef(null)
  const containerRef = useRef(null)

  const [estado, setEstado] = useState('menu')
  const [score, setScore] = useState(0)
  const [moves, setMoves] = useState(25)
  const [combo, setCombo] = useState(0)
  const [resultado, setResultado] = useState(null)
  const [podeJogar, setPodeJogar] = useState(null)
  const [cooldownSeg, setCooldownSeg] = useState(0)
  const [showRewards, setShowRewards] = useState(false)
  const [ranking, setRanking] = useState([])

  useEffect(() => {
    if (!jogadorID) return
    API.get('/api/minigame/status/' + jogadorID)
      .then(res => {
        setPodeJogar(res.pode_jogar)
        if (!res.pode_jogar && res.restante_seg > 0) setCooldownSeg(res.restante_seg)
      })
      .catch(() => setPodeJogar(false))
    API.get('/api/minigame/ranking').then(setRanking).catch(() => {})
  }, [jogadorID])

  // Timer de countdown
  useEffect(() => {
    if (cooldownSeg <= 0) return
    const t = setInterval(() => {
      setCooldownSeg(prev => {
        if (prev <= 1) { setPodeJogar(true); clearInterval(t); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [cooldownSeg > 0])

  function iniciar() {
    setEstado('jogando')
    setScore(0)
    setMoves(25)
    setCombo(0)
    setShowRewards(false)

    setTimeout(() => {
      if (gameRef.current) { gameRef.current.destroy(true); gameRef.current = null }

      const w = Math.min(containerRef.current?.clientWidth || 500, 520)
      const h = Math.min(w + 40, w * 1.1, 560)

      gameRef.current = new Phaser.Game({
        type: Phaser.AUTO,
        parent: containerRef.current,
        width: w, height: h,
        backgroundColor: '#0a0e20',
        scene: Match3Scene,
        scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
        input: { touch: { target: containerRef.current } },
      })

      gameRef.current.events.on('ready', () => {
        const scene = gameRef.current.scene.getScene('Match3Scene')
        scene.onUpdate = ({ score: s, moves: m, combo: c }) => {
          setScore(s); setMoves(m); setCombo(c)
        }
        scene.onGameOver = async (fs) => {
          if (gameRef.current) { gameRef.current.destroy(true); gameRef.current = null }
          await finalizarJogo(fs)
        }
      })
    }, 100)
  }

  async function finalizarJogo(finalScore) {
    try {
      const res = await API.post('/api/minigame/resultado', { jogador_id: jogadorID, score: finalScore })
      if (res.sucesso) {
        if (res.jogador) setJogador(res.jogador)
        setResultado(res)
        setEstado('resultado')
        setPodeJogar(false)
        if (res.level_up) setTimeout(() => setLevelUp(res.novo_nivel), 1500)
        // Delay pra mostrar rewards com animação
        setTimeout(() => setShowRewards(true), 800)
      } else {
        mostrarNotificacao(res.mensagem, 'erro')
        setEstado('menu')
      }
    } catch {
      mostrarNotificacao('Erro de conexão', 'erro')
      setEstado('menu')
    }
  }

  useEffect(() => () => { if (gameRef.current) { gameRef.current.destroy(true); gameRef.current = null } }, [])

  const rankingSection = ranking.length > 0 && (
    <div className="pf-section" style={{ marginTop: 14 }}>
      <div className="pf-section-header"><h3>🏆 RANKING MINIGAME</h3></div>
      <div className="ranking-lista">
        {ranking.map(r => {
          const isMe = r.jogador_id === jogadorID
          return (
            <div key={r.jogador_id} className={`ranking-row${isMe ? ' ranking-row-me' : ''}`}
              style={isMe ? { background: 'var(--card-bg2)', borderColor: 'var(--amarelo)' } : {}}>
              <span style={{ fontFamily: 'var(--font-titulo)', fontSize: 18, width: 30, textAlign: 'center', color: r.posicao <= 3 ? 'var(--amarelo)' : '#888' }}>
                {r.posicao <= 3 ? ['🥇','🥈','🥉'][r.posicao-1] : `${r.posicao}°`}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 900, fontSize: 13, color: 'var(--preto)' }}>{r.nome}</div>
                <div style={{ fontSize: 10, color: '#888', fontWeight: 700 }}>Nv.{r.nivel} · {r.jogadas} jogadas · Combo x{r.max_combo}</div>
              </div>
              <span style={{ fontFamily: 'var(--font-titulo)', fontSize: 20, color: 'var(--azul)' }}>{r.score}</span>
            </div>
          )
        })}
      </div>
    </div>
  )

  // BLOQUEADO
  if (podeJogar === false && estado === 'menu') {
    const h = Math.floor(cooldownSeg / 3600)
    const m = Math.floor((cooldownSeg % 3600) / 60)
    const s = cooldownSeg % 60
    return (
      <>
        <h2 className="page-title">🎮 MINIGAME</h2>
        <div className="mg-bloqueado">
          <div style={{ fontSize: 64 }}>⏰</div>
          <h3>Cooldown ativo!</h3>
          <div className="mg-cooldown-timer">
            {h > 0 && `${h}h `}{String(m).padStart(2, '0')}m {String(s).padStart(2, '0')}s
          </div>
          <p>Próxima partida disponível em breve.</p>
        </div>
        {rankingSection}
      </>
    )
  }

  // RESULTADO
  if (estado === 'resultado' && resultado) {
    const tier = score >= 2000 ? 'ouro' : score >= 1000 ? 'prata' : score >= 500 ? 'bronze' : 'nada'
    return (
      <>
        <h2 className="page-title">🎮 RESULTADO</h2>
        <div className={`mg-resultado mg-tier-${tier}`}>
          <div className="mg-resultado-glow" />

          {/* Confetti */}
          {tier !== 'nada' && (
            <div className="mg-confetti-container">
              {Array.from({ length: 20 }, (_, i) => (
                <span key={i} className="mg-confetti-piece" style={{
                  left: Math.random() * 100 + '%',
                  animationDelay: Math.random() * 2 + 's',
                  animationDuration: (2 + Math.random() * 2) + 's',
                  fontSize: (12 + Math.random() * 14) + 'px',
                }}>
                  {['🎉', '⭐', '✨', '🏆', '⚽', '💎'][Math.floor(Math.random() * 6)]}
                </span>
              ))}
            </div>
          )}

          <div className="mg-resultado-medal">
            {tier === 'ouro' ? '🥇' : tier === 'prata' ? '🥈' : tier === 'bronze' ? '🥉' : '⚽'}
          </div>
          <div className="mg-resultado-score">{score}</div>
          <div className="mg-resultado-label">PONTOS</div>

          {/* Rewards com animação sequencial */}
          {showRewards && (
            <div className="mg-resultado-rewards">
              {resultado.moedas > 0 && (
                <div className="mgr-card mgr-moeda mg-reward-enter" style={{ animationDelay: '0s' }}>
                  <span className="mgr-icon">💎</span>
                  <span className="mgr-value">+{resultado.moedas}</span>
                  <span className="mgr-label">Moedas</span>
                </div>
              )}
              {resultado.xp > 0 && (
                <div className="mgr-card mgr-xp mg-reward-enter" style={{ animationDelay: '0.2s' }}>
                  <span className="mgr-icon">📊</span>
                  <span className="mgr-value">+{resultado.xp}</span>
                  <span className="mgr-label">XP</span>
                </div>
              )}
              {resultado.energia > 0 && (
                <div className="mgr-card mgr-en mg-reward-enter" style={{ animationDelay: '0.4s' }}>
                  <span className="mgr-icon">⚡</span>
                  <span className="mgr-value">+{resultado.energia}</span>
                  <span className="mgr-label">Energia</span>
                </div>
              )}
            </div>
          )}

          {showRewards && (
            <div className="mg-resultado-botoes mg-reward-enter" style={{ animationDelay: '0.7s' }}>
              <button className="btn-work btn-verde" onClick={() => navigate('/inicio')}>
                🎒 Ver Inventário
              </button>
              <button className="btn-work" onClick={() => setEstado('menu')}>
                Continuar
              </button>
            </div>
          )}
        </div>
      </>
    )
  }

  // JOGANDO
  if (estado === 'jogando') {
    return (
      <>
        <div className="mg-hud">
          <div className="mg-hud-item">
            <span className="mg-hud-label">SCORE</span>
            <span className="mg-hud-value mg-score-glow">{score}</span>
          </div>
          <div className="mg-hud-item">
            <span className="mg-hud-label">MOVES</span>
            <span className={`mg-hud-value${moves <= 5 ? ' mg-moves-danger' : ''}`}>{moves}</span>
          </div>
          {combo > 1 && <div className="mg-combo-badge">🔥 x{combo}</div>}
        </div>
        <div className="mg-phaser-container" ref={containerRef} />
      </>
    )
  }

  // MENU
  return (
    <>
      <h2 className="page-title">🎮 MINIGAME</h2>
      <div className="mg-intro">
        <div className="mg-intro-orb">
          <div className="mg-intro-pieces">
            {PIECES.map((p, i) => (
              <span key={i} className="mg-piece-float" style={{ animationDelay: (i * 0.15) + 's' }}>{p}</span>
            ))}
          </div>
        </div>
        <h3>Match-3 Futebol!</h3>
        <p>Arraste para combinar 3+. Combos = mais pontos. 25 movimentos!</p>
        <div className="mg-tier-rewards">
          <div className="mg-tier mg-tier-bronze">🥉 500+ → 💎1 +20XP +Item</div>
          <div className="mg-tier mg-tier-prata">🥈 1000+ → 💎2 +30XP +Item</div>
          <div className="mg-tier mg-tier-ouro">🥇 2000+ → 💎3 +50XP +Item</div>
        </div>
        <button className="btn-work btn-verde mg-start-btn" onClick={iniciar}>⚽ JOGAR!</button>
      </div>
      {rankingSection}
    </>
  )
}
