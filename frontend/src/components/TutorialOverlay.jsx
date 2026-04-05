import React, { useEffect } from 'react'
import { useTutorial } from '../context/TutorialContext'
import { useGame } from '../context/GameContext'

export default function TutorialOverlay() {
  const { currentStep, targetRect, isActive, advance, skip, step, totalSteps } = useTutorial()
  const { activeDialog } = useGame()

  // Para steps 'nav': eleva o z-index do elemento alvo acima do spotlight
  useEffect(() => {
    if (!isActive || !currentStep || currentStep.tipo !== 'nav') return

    const el = document.querySelector(currentStep.target)
    if (!el) return

    el.style.position = 'relative'
    el.style.zIndex = '10000'

    return () => {
      el.style.position = ''
      el.style.zIndex = ''
    }
  }, [currentStep?.id, isActive, targetRect])

  if (!isActive || !currentStep || activeDialog) return null

  const hasTarget = targetRect && targetRect.width > 0
  if (!hasTarget) return null

  const isNav = currentStep.tipo === 'nav'
  const pad = 14

  let tooltipStyle = {
    top: targetRect.top + targetRect.height + pad,
    left: Math.max(10, Math.min(
      targetRect.left + targetRect.width / 2,
      window.innerWidth - 180
    )),
    transform: 'translateX(-50%)',
  }

  if (targetRect.top + targetRect.height + 200 > window.innerHeight) {
    tooltipStyle = {
      top: targetRect.top - pad,
      left: tooltipStyle.left,
      transform: 'translate(-50%, -100%)',
    }
  }

  return (
    <>
      {/* Spotlight: cria o fundo escuro com recorte via box-shadow */}
      <div
        className="tutorial-spotlight"
        style={{
          top: targetRect.top - 6,
          left: targetRect.left - 6,
          width: targetRect.width + 12,
          height: targetRect.height + 12,
        }}
      />

      {/* Seta */}
      <div
        className="tutorial-arrow"
        style={{
          top: targetRect.top + targetRect.height + 2,
          left: targetRect.left + targetRect.width / 2,
        }}
      />

      {/* Tooltip */}
      <div className="tutorial-tooltip" style={tooltipStyle}>
        <div className="tutorial-step-badge">{step}/{totalSteps}</div>
        <div className="tutorial-titulo">{currentStep.titulo}</div>
        <div className="tutorial-texto">{currentStep.texto}</div>

        {isNav ? (
          <div className="tutorial-actions">
            <span className="tutorial-skip" onClick={skip}>Pular tutorial</span>
            <span className="tutorial-hint">👆 Clique no elemento destacado</span>
          </div>
        ) : (
          <div className="tutorial-actions">
            <span className="tutorial-skip" onClick={skip}>Pular tutorial</span>
            <button className="btn-work btn-verde tutorial-btn" onClick={advance}>
              {step === totalSteps ? '🏆 Finalizar!' : 'Entendi! →'}
            </button>
          </div>
        )}
      </div>
    </>
  )
}
