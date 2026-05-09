import React, { useState, useEffect, useRef } from 'react'

// Partículas estáticas geradas uma vez (faíscas douradas voando)
const PARTICLES = Array.from({ length: 28 }, (_, i) => ({
  id: i,
  left: Math.random() * 100,
  top: Math.random() * 100,
  size: 2 + Math.random() * 5,
  delay: Math.random() * 3,
  duration: 2 + Math.random() * 2.5,
  drift: -30 + Math.random() * 60,
}))

// Streaks horizontais (linhas de velocidade)
const STREAKS = Array.from({ length: 8 }, (_, i) => ({
  id: i,
  top: 15 + Math.random() * 70,
  delay: Math.random() * 1.5,
  duration: 0.5 + Math.random() * 0.4,
  width: 80 + Math.random() * 180,
}))

export default function LoadingScreen({ onDone, waitFor }) {
  const [progress, setProgress] = useState(0)
  const [fading, setFading] = useState(false)
  const doneRef = useRef(false)

  useEffect(() => {
    const duration = 4200
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

  useEffect(() => {
    if (doneRef.current) return
    if (progress >= 100 && waitFor) {
      doneRef.current = true
      setFading(true)
      setTimeout(() => onDone && onDone(), 600)
    }
  }, [progress, waitFor, onDone])

  return (
    <div className={`jc-loading-screen${fading ? ' is-fading' : ''}`}>
      {/* Fundo: estádio noturno + vignette */}
      <div className="jc-load-bg" />
      <div className="jc-load-vignette" />
      <div className="jc-load-grid" />

      {/* Halo dourado pulsante atrás do jogador */}
      <div className="jc-load-halo" />

      {/* Streaks horizontais (linhas de velocidade) */}
      <div className="jc-load-streaks">
        {STREAKS.map(s => (
          <span
            key={s.id}
            className="jc-load-streak"
            style={{
              top: s.top + '%',
              width: s.width + 'px',
              animationDelay: s.delay + 's',
              animationDuration: s.duration + 's',
            }}
          />
        ))}
      </div>

      {/* Camera flash burst */}
      <div className="jc-load-flash" />

      {/* Hero: player corre da esquerda pra direita */}
      <div className="jc-load-hero-wrap">
        <img
          src="/hero-running.png"
          alt=""
          className="jc-load-hero"
          onError={e => { e.target.style.display = 'none' }}
        />
        {/* Shadow chão pulsante */}
        <div className="jc-load-shadow" />
      </div>

      {/* Faíscas douradas flutuando */}
      <div className="jc-load-particles">
        {PARTICLES.map(p => (
          <span
            key={p.id}
            className="jc-load-particle"
            style={{
              left: p.left + '%',
              top: p.top + '%',
              width: p.size + 'px',
              height: p.size + 'px',
              animationDelay: p.delay + 's',
              animationDuration: p.duration + 's',
              '--drift': p.drift + 'px',
            }}
          />
        ))}
      </div>

      {/* Conteúdo: título, barra, dicas */}
      <div className="jc-load-content">
        <div className="jc-load-title-wrap">
          <div className="jc-load-title">JOGADOR CARO</div>
          <div className="jc-load-title-glow">JOGADOR CARO</div>
        </div>
        <div className="jc-load-sub">Vista a camisa, craque</div>

        <div className="jc-load-bar-wrap">
          <div className="jc-load-bar">
            <div className="jc-load-fill" style={{ width: progress + '%' }} />
            <div className="jc-load-bar-shine" style={{ left: `calc(${progress}% - 30px)` }} />
          </div>
          <div className="jc-load-meta">
            <span className="jc-load-pct">{Math.round(progress)}%</span>
            <span className="jc-load-tip">
              {progress < 25 && 'Aquecendo o estadio...'}
              {progress >= 25 && progress < 50 && 'Amarrando as chuteiras...'}
              {progress >= 50 && progress < 75 && 'Ajustando o cronometro...'}
              {progress >= 75 && progress < 100 && 'Hora do show...'}
              {progress >= 100 && !waitFor && 'Conectando ao servidor...'}
              {progress >= 100 && waitFor && 'Bola rolando!'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
