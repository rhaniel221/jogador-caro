import React, { useState, useEffect } from 'react'
import { useGame } from '../context/GameContext'
import API from '../api'

const REWARDS = [
  { dia: 1, desc: '100 XP', icon: '📊' },
  { dia: 2, desc: '150 XP', icon: '📊' },
  { dia: 3, desc: '+20 ⚡', icon: '⚡' },
  { dia: 4, desc: '250 XP', icon: '📊' },
  { dia: 5, desc: '+300 🪙', icon: '🪙' },
  { dia: 6, desc: '+30 ⚡', icon: '⚡' },
  { dia: 7, desc: 'Item Especial!', icon: '🎁' },
]

export default function StreakModal() {
  const { jogador, setJogador, jogadorID, mostrarNotificacao, setLevelUp } = useGame()
  const [streak, setStreak] = useState(null)
  const [show, setShow] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!jogadorID || !jogador || jogador.nivel < 5) return
    API.get('/api/streak/' + jogadorID).then(res => {
      setStreak(res)
      if (!res.ja_coletou) setShow(true)
    }).catch(() => {})
  }, [jogadorID, jogador?.nivel])

  async function coletar() {
    setLoading(true)
    try {
      const res = await API.post('/api/streak/coletar', { jogador_id: jogadorID })
      if (res.sucesso) {
        if (res.jogador) setJogador(res.jogador)
        mostrarNotificacao(res.mensagem, 'sucesso')
        if (res.level_up) setLevelUp(res.novo_nivel)
        setStreak(res.streak)
        setTimeout(() => setShow(false), 1500)
      } else {
        mostrarNotificacao(res.mensagem, 'erro')
      }
    } catch { mostrarNotificacao('Erro', 'erro') }
    setLoading(false)
  }

  if (!show || !streak) return null

  const diaAtual = streak.ja_coletou ? streak.dias_seguidos : streak.dias_seguidos + 1
  const ciclo = ((diaAtual - 1) % 7) + 1

  return (
    <div className="streak-overlay">
      <div className="streak-modal">
        <button className="streak-close" onClick={() => setShow(false)}>✕</button>
        <div className="streak-header">
          <span className="streak-fire">🔥</span>
          <h2>Login Diário</h2>
          <p>{streak.dias_seguidos} dias seguidos!</p>
        </div>
        <div className="streak-timeline">
          {REWARDS.map((r, i) => {
            const dia = i + 1
            const coletado = dia < ciclo || (dia === ciclo && streak.ja_coletou)
            const atual = dia === ciclo && !streak.ja_coletou
            return (
              <div key={dia} className={`streak-day${coletado ? ' collected' : ''}${atual ? ' current' : ''}`}>
                <span className="streak-day-num">Dia {dia}</span>
                <span className="streak-day-icon">{coletado ? '✅' : r.icon}</span>
                <span className="streak-day-desc">{r.desc}</span>
              </div>
            )
          })}
        </div>
        {!streak.ja_coletou && (
          <button className="btn-work btn-verde streak-btn" onClick={coletar} disabled={loading}>
            {loading ? '...' : '🎁 Coletar Recompensa!'}
          </button>
        )}
      </div>
    </div>
  )
}
