import React, { useState, useEffect } from 'react'
import API from '../api'

export default function EventBanner() {
  const [eventos, setEventos] = useState([])

  useEffect(() => {
    API.get('/api/eventos').then(res => setEventos(res.eventos || [])).catch(() => {})
    const t = setInterval(() => {
      API.get('/api/eventos').then(res => setEventos(res.eventos || [])).catch(() => {})
    }, 60000)
    return () => clearInterval(t)
  }, [])

  if (!eventos.length) return null

  return (
    <div className="event-banner">
      {eventos.map(e => (
        <div key={e.id} className="event-item">
          <span className="event-icon">🎉</span>
          <span className="event-text"><strong>{e.nome}</strong> — {e.descricao}</span>
        </div>
      ))}
    </div>
  )
}
