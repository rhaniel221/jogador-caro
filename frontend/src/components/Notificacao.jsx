import React, { useState, useEffect } from 'react'
import { useGame } from '../context/GameContext'

const TIPO_CONFIG = {
  sucesso: {
    fallbackIcon: '✓',
    bg: 'linear-gradient(135deg, rgba(34,197,94,0.18) 0%, rgba(13,27,47,0.92) 80%)',
    border: 'rgba(34,197,94,0.55)',
    color: '#86efac',
    glow: 'rgba(34,197,94,0.45)',
    accent: '#22c55e',
  },
  erro: {
    fallbackIcon: '✕',
    bg: 'linear-gradient(135deg, rgba(239,68,68,0.18) 0%, rgba(13,27,47,0.92) 80%)',
    border: 'rgba(239,68,68,0.55)',
    color: '#fca5a5',
    glow: 'rgba(239,68,68,0.45)',
    accent: '#ef4444',
  },
  info: {
    fallbackIcon: 'ℹ',
    bg: 'linear-gradient(135deg, rgba(56,168,248,0.18) 0%, rgba(13,27,47,0.92) 80%)',
    border: 'rgba(56,168,248,0.55)',
    color: '#93c5fd',
    glow: 'rgba(56,168,248,0.45)',
    accent: '#38a8f8',
  },
  aviso: {
    fallbackIcon: '⚠',
    bg: 'linear-gradient(135deg, rgba(214,168,79,0.18) 0%, rgba(13,27,47,0.92) 80%)',
    border: 'rgba(214,168,79,0.55)',
    color: '#fcd34d',
    glow: 'rgba(214,168,79,0.45)',
    accent: '#d6a84f',
  },
}

// Heuristica: escolhe o melhor PNG do /icons/ pra ilustrar a notif
function pickIcon(msg) {
  if (!msg) return null
  const m = msg.toLowerCase()
  if (m.includes('energia')) return '/icons/energia.png'
  if (m.includes('xp')) return '/icons/xp.png'
  if (m.includes('moedas') || m.includes('moeda ')) return '/icons/moeda.png'
  if (m.includes('r$') || m.includes('dinheiro') || m.includes('grana') || m.includes('salário')) return '/icons/dinheiro.png'
  if (m.includes('fama')) return '/icons/fama.png'
  if (m.includes('moral')) return '/icons/moral.png'
  if (m.includes('saúde') || m.includes('saude')) return '/icons/saude.png'
  if (m.includes('vitalidade')) return '/icons/vitalidade.png'
  if (m.includes('força') || m.includes('forca')) return '/icons/forca.png'
  if (m.includes('velocidade')) return '/icons/velocidade.png'
  if (m.includes('habilidade')) return '/icons/habilidade.png'
  return null
}

function Toast({ msg, tipo }) {
  const [saindo, setSaindo] = useState(false)
  const config = TIPO_CONFIG[tipo] || TIPO_CONFIG.info
  const pngIcon = pickIcon(msg)

  useEffect(() => {
    const t = setTimeout(() => setSaindo(true), 2800)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className={`jc-toast ${saindo ? 'jc-toast-out' : 'jc-toast-in'}`}
      style={{
        background: config.bg,
        borderColor: config.border,
        boxShadow: `0 12px 40px ${config.glow}, 0 4px 16px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)`,
      }}>
      <div className="jc-toast-icon-wrap" style={{ '--accent': config.accent }}>
        {pngIcon ? (
          <img src={pngIcon} alt="" className="jc-toast-png" />
        ) : (
          <div className="jc-toast-icon" style={{ background: config.accent, color: '#fff' }}>
            {config.fallbackIcon}
          </div>
        )}
      </div>
      <div className="jc-toast-msg" style={{ color: config.color }}>{msg}</div>
      <div className="jc-toast-shine" />
    </div>
  )
}

export default function Notificacao() {
  const { notif } = useGame()
  if (!notif) return null
  return <Toast key={notif.id} msg={notif.msg} tipo={notif.tipo} />
}
