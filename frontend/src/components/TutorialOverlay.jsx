import React, { useEffect, useState, useRef, useCallback } from 'react'
import { useTutorial } from '../context/TutorialContext'
import { useGame } from '../context/GameContext'

export default function TutorialOverlay() {
  const { currentStep, isActive, visible, advance, faseInfo } = useTutorial()
  const { activeDialog } = useGame()
  const [rect, setRect] = useState(null)
  const rafRef = useRef(null)
  const prevStepId = useRef(null)

  // Tracking contínuo do target via rAF (suave, sem jank)
  const trackTarget = useCallback(() => {
    if (!currentStep) { setRect(null); return }
    const el = document.querySelector(currentStep.target)
    if (!el) { setRect(null); rafRef.current = requestAnimationFrame(trackTarget); return }

    const r = el.getBoundingClientRect()
    if (r.width === 0 && r.height === 0) {
      rafRef.current = requestAnimationFrame(trackTarget)
      return
    }

    setRect(prev => {
      // Só atualiza se mudou (evita re-renders desnecessários)
      if (prev && Math.abs(prev.top - r.top) < 1 && Math.abs(prev.left - r.left) < 1 &&
          Math.abs(prev.width - r.width) < 1 && Math.abs(prev.height - r.height) < 1) return prev
      return { top: r.top, left: r.left, width: r.width, height: r.height }
    })

    rafRef.current = requestAnimationFrame(trackTarget)
  }, [currentStep?.id])

  // Inicia/para tracking quando step muda
  useEffect(() => {
    if (!currentStep || !visible) {
      setRect(null)
      cancelAnimationFrame(rafRef.current)
      return
    }

    // Scroll into view se necessário (quando step muda)
    if (prevStepId.current !== currentStep.id) {
      prevStepId.current = currentStep.id
      setTimeout(() => {
        const el = document.querySelector(currentStep.target)
        if (el) {
          const r = el.getBoundingClientRect()
          if (r.top < 60 || r.bottom > window.innerHeight - 60) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        }
      }, 100)
    }

    rafRef.current = requestAnimationFrame(trackTarget)
    return () => cancelAnimationFrame(rafRef.current)
  }, [currentStep?.id, visible, trackTarget])

  // Para steps 'nav': eleva z-index do target
  useEffect(() => {
    if (!isActive || !visible || !currentStep || currentStep.tipo !== 'nav') return
    const el = document.querySelector(currentStep.target)
    if (!el) return
    const prev = { pos: el.style.position, z: el.style.zIndex }
    el.style.position = 'relative'
    el.style.zIndex = '10000'
    return () => { el.style.position = prev.pos; el.style.zIndex = prev.z }
  }, [currentStep?.id, isActive, visible])

  // Não renderiza se: inativo, dialog aberto, ou invisível (em transição)
  if (!isActive || !currentStep || activeDialog) return null
  if (!visible || !rect || rect.width <= 0) return null

  const isNav = currentStep.tipo === 'nav'
  const { num, total, fase } = faseInfo

  // === Posicionamento do tooltip ===
  const TOOLTIP_W = 300
  const PAD = 14
  const vw = window.innerWidth
  const vh = window.innerHeight

  const targetCX = rect.left + rect.width / 2
  const spaceBelow = vh - (rect.top + rect.height)
  const above = spaceBelow < 230 && rect.top > spaceBelow

  // Clamp horizontal
  let tooltipLeft = targetCX - TOOLTIP_W / 2
  tooltipLeft = Math.max(PAD, Math.min(tooltipLeft, vw - TOOLTIP_W - PAD))

  let tooltipTop = above
    ? rect.top - PAD - 8
    : rect.top + rect.height + PAD + 8

  // Seta: posição relativa ao tooltip
  const arrowLeft = Math.max(18, Math.min(targetCX - tooltipLeft, TOOLTIP_W - 18))

  // 4 painéis ao redor do target — nunca bloqueia cliques no target
  const cutTop = Math.max(0, rect.top - 8)
  const cutLeft = Math.max(0, rect.left - 8)
  const cutRight = Math.min(vw, rect.left + rect.width + 8)
  const cutBottom = Math.min(vh, rect.top + rect.height + 8)

  return (
    <div className={`tutorial-overlay tutorial-fade-in`}>
      {/* 4 painéis escuros ao redor do target (todos pointer-events: none) */}
      <div className="tutorial-backdrop-panel" style={{ top: 0, left: 0, width: vw, height: cutTop }} />
      <div className="tutorial-backdrop-panel" style={{ top: cutBottom, left: 0, width: vw, height: vh - cutBottom }} />
      <div className="tutorial-backdrop-panel" style={{ top: cutTop, left: 0, width: cutLeft, height: cutBottom - cutTop }} />
      <div className="tutorial-backdrop-panel" style={{ top: cutTop, left: cutRight, width: vw - cutRight, height: cutBottom - cutTop }} />

      {/* Borda brilhante ao redor do target */}
      <div className="tutorial-highlight" style={{
        top: rect.top - 6, left: rect.left - 6,
        width: rect.width + 12, height: rect.height + 12,
      }} />

      {/* Tooltip */}
      <div className="tutorial-tooltip" style={{
        top: tooltipTop,
        left: tooltipLeft,
        width: TOOLTIP_W,
        transform: above ? 'translateY(-100%)' : 'none',
      }}>
        {/* Seta */}
        <div className={`tutorial-arrow ${above ? 'arrow-bottom' : 'arrow-top'}`}
          style={{ left: arrowLeft }} />

        {total > 0 && (
          <div className="tutorial-badge">{fase} — {num}/{total}</div>
        )}
        <div className="tutorial-titulo">{currentStep.titulo}</div>
        <div className="tutorial-texto">{currentStep.texto}</div>

        <div className="tutorial-actions">
          {isNav ? (
            <span className="tutorial-hint">👆 Clique no elemento destacado</span>
          ) : (
            <button className="btn-work btn-verde tutorial-btn" onClick={advance}>
              {num === total ? '🏆 Finalizar!' : 'Entendi! →'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
