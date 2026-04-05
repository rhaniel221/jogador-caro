import React, { useState, useEffect } from 'react'
import { useGame } from '../context/GameContext'

function Toast({ msg, tipo }) {
  const [saindo, setSaindo] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setSaindo(true), 2400)
    return () => clearTimeout(t)
  }, [])

  return (
    <div className={`notif-toast ${tipo} ${saindo ? 'notif-sai' : 'notif-entra'}`}>
      {msg}
    </div>
  )
}

export default function Notificacao() {
  const { notif } = useGame()
  if (!notif) return null
  return <Toast key={notif.id} msg={notif.msg} tipo={notif.tipo} />
}
