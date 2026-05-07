import React, { useState, useEffect, useRef } from 'react'

export default function LoadingScreen({ onDone, waitFor }) {
  const [progress, setProgress] = useState(0)
  const [fading, setFading] = useState(false)
  const doneRef = useRef(false)

  useEffect(() => {
    const duration = 4000
    const interval = 50
    const step = 100 / (duration / interval)
    let current = 0

    const id = setInterval(() => {
      current += step + Math.random() * step * 0.3
      if (current >= 100) {
        current = 100
        clearInterval(id)
      }
      setProgress(Math.min(100, current))
    }, interval)

    return () => clearInterval(id)
  }, [])

  // So libera quando: barra chegou em 100% E waitFor e true (dados carregados)
  useEffect(() => {
    if (doneRef.current) return
    if (progress >= 100 && waitFor) {
      doneRef.current = true
      setFading(true)
      setTimeout(() => onDone && onDone(), 500)
    }
  }, [progress, waitFor, onDone])

  return (
    <div className="jc-loading-screen" style={{ opacity: fading ? 0 : 1 }}>
      <div className="jc-loading-content">
        <img src="/logo-novo.png" alt="Jogador Caro" className="jc-loading-logo" onError={e => { e.target.style.display = 'none' }} />
        <div className="jc-loading-title">JOGADOR CARO</div>
        <div className="jc-loading-sub">Preparando sua carreira...</div>
        <div className="jc-loading-bar-wrap">
          <div className="jc-loading-bar">
            <div className="jc-loading-fill" style={{ width: progress + '%' }} />
          </div>
          <div className="jc-loading-pct">{Math.round(progress)}%</div>
        </div>
        <div className="jc-loading-tips">
          {progress < 30 && 'Carregando estadio...'}
          {progress >= 30 && progress < 60 && 'Preparando jogadores...'}
          {progress >= 60 && progress < 85 && 'Configurando partida...'}
          {progress >= 85 && progress < 100 && 'Quase la!'}
          {progress >= 100 && !waitFor && 'Conectando ao servidor...'}
          {progress >= 100 && waitFor && 'Pronto!'}
        </div>
      </div>
    </div>
  )
}
