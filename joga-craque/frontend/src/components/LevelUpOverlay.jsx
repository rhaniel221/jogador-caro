import React, { useMemo } from 'react'
import { useGame } from '../context/GameContext'

const CONFETTI = ['🎉','🎊','⭐','🌟','✨','🏆','⚽','💛','💚','💙']

function Confetti() {
  const pieces = useMemo(() =>
    Array.from({ length: 35 }, (_, i) => ({
      emoji: CONFETTI[i % CONFETTI.length],
      left: Math.random() * 100,
      delay: Math.random() * 2,
      size: 16 + Math.random() * 18,
      dur: 2.5 + Math.random() * 2,
    })), [])

  return (
    <>
      {pieces.map((p, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={{
            left: p.left + '%',
            fontSize: p.size + 'px',
            animationDelay: p.delay + 's',
            animationDuration: p.dur + 's',
          }}
        >
          {p.emoji}
        </span>
      ))}
    </>
  )
}

export default function LevelUpOverlay() {
  const { activeDialog, fecharDialogo } = useGame()

  if (!activeDialog || activeDialog.tipo !== 'level_up') return null

  return (
    <div id="level-up-overlay" style={{ display: 'flex' }}>
      <Confetti />
      <div className="level-up-box">
        <span className="lu-emoji">🏆</span>
        <h2>LEVEL UP!</h2>
        <div className="lu-nivel">{activeDialog.nivel}</div>
        <p>Seus atributos aumentaram!<br />Energia recuperada totalmente!</p>
        <button className="btn-work btn-verde" onClick={fecharDialogo}>
          Continuar jogando
        </button>
      </div>
    </div>
  )
}
