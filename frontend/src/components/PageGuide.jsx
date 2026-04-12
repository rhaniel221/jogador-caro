import React, { useState, useEffect } from 'react'

const STORAGE_KEY = 'pageGuides'

function getVistos() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') }
  catch { return {} }
}

export default function PageGuide({ pageKey, icone, titulo, texto }) {
  const [visivel, setVisivel] = useState(false)

  useEffect(() => {
    const vistas = getVistos()
    if (!vistas[pageKey]) {
      const timer = setTimeout(() => setVisivel(true), 600)
      return () => clearTimeout(timer)
    }
  }, [pageKey])

  function fechar() {
    setVisivel(false)
    const vistas = getVistos()
    vistas[pageKey] = true
    localStorage.setItem(STORAGE_KEY, JSON.stringify(vistas))
  }

  if (!visivel) return null

  return (
    <div className="page-guide">
      <div className="page-guide-icon">{icone}</div>
      <div className="page-guide-content">
        <div className="page-guide-titulo">{titulo}</div>
        <div className="page-guide-texto">{texto}</div>
      </div>
      <button className="btn-work btn-verde page-guide-btn" onClick={fechar}>Entendi!</button>
    </div>
  )
}
