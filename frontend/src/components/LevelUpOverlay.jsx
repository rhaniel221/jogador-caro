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

const DESBLOQUEIOS = {
  10: [
    { icon: '⚔️', text: 'Estádio desbloqueado! Desafie outros jogadores no PvP!' },
    { icon: '🎲', text: 'Eventos aleatórios nos trabalhos!' },
  ],
  12: [
    { icon: '🥅', text: 'Desafio 1v1 desbloqueado! Cobranças de pênalti!' },
  ],
  15: [
    { icon: '🧩', text: 'MiniGame desbloqueado! Jogue Match-3 e ganhe moedas!' },
  ],
}

export default function LevelUpOverlay() {
  const { activeDialog, fecharDialogo } = useGame()

  if (!activeDialog || activeDialog.tipo !== 'level_up') return null

  const nivel = activeDialog.nivel
  const novidades = DESBLOQUEIOS[nivel] || []

  return (
    <div id="level-up-overlay" style={{ display: 'flex' }}>
      <Confetti />
      <div className="level-up-box">
        <span className="lu-emoji">🏆</span>
        <h2>LEVEL UP!</h2>
        <div className="lu-nivel">{nivel}</div>
        <p>Seus atributos aumentaram!<br />Energia recuperada totalmente!</p>
        {novidades.length > 0 && (
          <div className="lu-desbloqueios">
            <div className="lu-desb-titulo">NOVO DESBLOQUEIO!</div>
            {novidades.map((d, i) => (
              <div key={i} className="lu-desb-item">
                <span>{d.icon}</span> {d.text}
              </div>
            ))}
          </div>
        )}
        <button className="btn-work btn-verde" onClick={fecharDialogo}>
          Continuar jogando
        </button>
      </div>
    </div>
  )
}
