import React, { useMemo } from 'react'
import { useGame } from '../context/GameContext'

const CONFETTI_COLORS = ['#1e6fff', '#D6A84F', '#22c55e', '#43a7ff', '#f1c76a', '#ef4444', '#fff']

function Confetti() {
  const pieces = useMemo(() =>
    Array.from({ length: 40 }, (_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 2,
      size: 4 + Math.random() * 6,
      dur: 2.5 + Math.random() * 2,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      rotation: Math.random() * 360,
    })), [])

  return (
    <>
      {pieces.map((p, i) => (
        <span
          key={i}
          className="jc-confetti"
          style={{
            left: p.left + '%',
            width: p.size + 'px',
            height: p.size * 1.5 + 'px',
            background: p.color,
            animationDelay: p.delay + 's',
            animationDuration: p.dur + 's',
            transform: `rotate(${p.rotation}deg)`,
          }}
        />
      ))}
    </>
  )
}

const DESBLOQUEIOS = {
  10: [
    { icon: '⚔️', text: 'Estadio desbloqueado! Desafie outros jogadores no PvP!' },
    { icon: '🎲', text: 'Eventos aleatorios nos trabalhos!' },
  ],
  12: [
    { icon: '🥅', text: 'Desafio 1v1 desbloqueado! Cobrancas de penalti!' },
  ],
  15: [
    { icon: '🧩', text: 'MiniGame desbloqueado! Jogue Match-3 e ganhe moedas!' },
  ],
  20: [
    { icon: '🏠', text: 'Minha Vida desbloqueado! Casa, campinho e patrimonio!' },
    { icon: '💰', text: 'Banco desbloqueado! Depositos e investimentos!' },
  ],
}

export default function LevelUpOverlay() {
  const { activeDialog, fecharDialogo } = useGame()

  if (!activeDialog || activeDialog.tipo !== 'level_up') return null

  const nivel = activeDialog.nivel
  const novidades = DESBLOQUEIOS[nivel] || []

  return (
    <div className="jc-overlay">
      <Confetti />
      <div className="jc-levelup-card">
        <div className="jc-levelup-glow" />
        <div className="jc-levelup-badge">LEVEL UP</div>
        <div className="jc-levelup-nivel">{nivel}</div>
        <p className="jc-levelup-desc">
          Atributos aumentaram!<br />Energia totalmente recuperada.
        </p>
        {novidades.length > 0 && (
          <div className="jc-levelup-unlocks">
            <div className="jc-levelup-unlocks-title">NOVO DESBLOQUEIO</div>
            {novidades.map((d, i) => (
              <div key={i} className="jc-levelup-unlock-item">
                <span>{d.icon}</span> {d.text}
              </div>
            ))}
          </div>
        )}
        <button className="jc-btn jc-btn-primary" style={{ width: '100%', marginTop: 14, minHeight: 44 }} onClick={fecharDialogo}>
          Continuar jogando
        </button>
      </div>
    </div>
  )
}
