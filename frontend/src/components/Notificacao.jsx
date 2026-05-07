import React, { useState, useEffect } from 'react'
import { useGame } from '../context/GameContext'

const TIPO_CONFIG = {
  sucesso: { icon: '✓', bg: 'rgba(34,197,94,0.12)', border: 'rgba(34,197,94,0.3)', color: '#4ade80', glow: 'rgba(34,197,94,0.15)' },
  erro:    { icon: '✕', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)', color: '#f87171', glow: 'rgba(239,68,68,0.15)' },
  info:    { icon: 'i', bg: 'rgba(30,111,255,0.12)', border: 'rgba(30,111,255,0.3)', color: '#60a5fa', glow: 'rgba(30,111,255,0.15)' },
  aviso:   { icon: '!', bg: 'rgba(214,168,79,0.12)', border: 'rgba(214,168,79,0.3)', color: '#f1c76a', glow: 'rgba(214,168,79,0.15)' },
}

function Toast({ msg, tipo }) {
  const [saindo, setSaindo] = useState(false)
  const config = TIPO_CONFIG[tipo] || TIPO_CONFIG.info

  useEffect(() => {
    const t = setTimeout(() => setSaindo(true), 2800)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className={`jc-toast ${saindo ? 'jc-toast-out' : 'jc-toast-in'}`}
      style={{
        background: config.bg,
        borderColor: config.border,
        boxShadow: `0 8px 32px ${config.glow}, 0 4px 12px rgba(0,0,0,0.3)`,
      }}>
      <div className="jc-toast-icon" style={{ background: config.border, color: '#fff' }}>
        {config.icon}
      </div>
      <div className="jc-toast-msg" style={{ color: config.color }}>{msg}</div>
    </div>
  )
}

export default function Notificacao() {
  const { notif } = useGame()
  if (!notif) return null
  return <Toast key={notif.id} msg={notif.msg} tipo={notif.tipo} />
}
