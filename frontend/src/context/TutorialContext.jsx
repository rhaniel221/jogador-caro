import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useGame } from './GameContext'
import API from '../api'

const TutorialContext = createContext(null)

// tipo: 'nav' = deve clicar no elemento, 'info' = lê e clica Entendi
const STEPS = [
  // ============================================
  // ONBOARDING (level 1-3, página / = Historia)
  // ============================================
  { id: 1, tipo: 'info', page: '/', target: '[data-tutorial="missoes-lista"]',
    titulo: 'Bem-vindo ao Joga Craque! ⚽',
    texto: 'Sua jornada começa aqui! Complete as missões da história para ganhar XP, dinheiro e subir de nível!' },

  { id: 2, tipo: 'info', page: null, target: '[data-tutorial="stat-energia"]',
    titulo: '⚡ Energia',
    texto: 'Missões e trabalhos gastam Energia. Ela regenera sozinha com o tempo. Se acabar, compre consumíveis na Loja!' },

  { id: 3, tipo: 'info', page: null, target: '[data-tutorial="stat-xp"]',
    titulo: '📊 XP e Nível',
    texto: 'Ganhe XP para subir de nível! Cada nível desbloqueia trabalhos novos, equipamentos e áreas!' },

  { id: 4, tipo: 'info', page: null, target: '[data-tutorial="stat-dinheiro"]',
    titulo: '💰 Dinheiro',
    texto: 'Use dinheiro pra comprar itens na Loja. Agora complete as missões da história para avançar!' },

  // step 5 = estado dormindo (não aparece, espera nível 4)

  // ============================================
  // TUTORIAL DE ENERGIA (level 4+, Trabalhos)
  // ============================================
  { id: 20, tipo: 'info', page: null, target: '[data-tutorial="stat-energia"]',
    titulo: '⚡ Sua Energia Acabou!',
    texto: 'Você ficou sem energia e não consegue trabalhar! Mas calma, tem solução. Vamos à Loja comprar um item que recupera energia!' },

  { id: 21, tipo: 'nav', page: null, target: '[data-tutorial="nav-loja"]', destino: '/loja',
    titulo: '🛒 Vá à Loja!',
    texto: 'Clique em "Loja" para comprar um item de energia!' },

  { id: 22, tipo: 'info', page: '/loja', target: '[data-tutorial="loja-energia-section"]',
    titulo: '⚡ Compre Energia!',
    texto: 'A aba "Energia" já está selecionada. Compre uma Água Mineral — é barata e recupera energia pra você voltar a trabalhar!' },

  { id: 23, tipo: 'nav', page: null, target: '[data-tutorial="header-inventario"]', destino: '/inventario',
    titulo: '🎒 Abra o Inventário!',
    texto: 'Agora clique no Inventário para usar o item que você comprou!' },

  { id: 24, tipo: 'info', page: '/inventario', target: '[data-tutorial="inv-consumiveis"]',
    titulo: '🧪 Use o Item de Energia!',
    texto: 'Encontre o item de energia e clique em "Usar" para recuperar sua energia! Depois vamos voltar aos trabalhos.' },

  { id: 25, tipo: 'nav', page: null, target: '[data-tutorial="nav-trabalhos"]', destino: '/',
    titulo: '⚽ Volte aos Trabalhos!',
    texto: 'Energia recuperada! Agora volte aos Trabalhos para ganhar dinheiro e XP!' },

  { id: 26, tipo: 'info', page: '/', target: '[data-tutorial="variedade-panel"]',
    titulo: '⭐ Bônus de Variedade!',
    texto: 'Trabalhe em 3 trabalhos DIFERENTES no mesmo dia para ganhar +10% de XP bônus! Quanto mais variar, mais XP você ganha. Boa sorte, craque!' },
]

const TOTAL_STEPS = STEPS.length

export function TutorialProvider({ children }) {
  const { jogador, jogadorID } = useGame()
  const location = useLocation()
  const [step, setStep] = useState(-1)
  const [targetRect, setTargetRect] = useState(null)
  const stepRef = useRef(-1)

  // Inicializa
  useEffect(() => {
    if (!jogador) return
    if (jogador.tutorial_step === -1) { setStep(-1); return }
    // Veteranos pulam (nível > 5 e nunca iniciou)
    if (jogador.tutorial_step === 0 && jogador.nivel > 5) {
      API.post('/api/tutorial-step', { jogador_id: jogador.id, step: -1 })
      setStep(-1)
      return
    }
    const s = jogador.tutorial_step === 0 ? 1 : jogador.tutorial_step
    setStep(s)
    stepRef.current = s
  }, [jogador?.id])

  useEffect(() => { stepRef.current = step }, [step])

  // Ativa tutorial de energia quando dormindo (step 5), nível 4+ e energia baixa
  // O jogador está no nível 4, trabalhou até acabar a energia, não consegue mais trabalhar
  useEffect(() => {
    if (step !== 5 || !jogador) return
    if (jogador.nivel < 4 || location.pathname !== '/') return
    // Energia baixa = não consegue fazer nenhum trabalho (custo mínimo ~2-3)
    if (jogador.energia > 3) return
    // Delay pra dar tempo da página carregar e o jogador perceber que não pode trabalhar
    const timer = setTimeout(() => {
      setStep(20)
      stepRef.current = 20
      if (jogadorID) {
        API.post('/api/tutorial-step', { jogador_id: jogadorID, step: 20 })
      }
    }, 2000)
    return () => clearTimeout(timer)
  }, [step, jogador?.nivel, jogador?.energia, location.pathname, jogadorID])

  const currentStep = STEPS.find(s => s.id === step) || null
  const isActive = step > 0 && step !== 5 && currentStep !== null

  // Auto-avança steps 'nav' quando chega na página certa
  useEffect(() => {
    if (!currentStep || currentStep.tipo !== 'nav') return
    if (currentStep.destino && location.pathname === currentStep.destino) {
      const nextId = getNextStep(stepRef.current)
      setStep(nextId)
      stepRef.current = nextId
      if (jogadorID) {
        API.post('/api/tutorial-step', { jogador_id: jogadorID, step: nextId })
      }
    }
  }, [location.pathname, currentStep?.id])

  // Busca target com polling
  useEffect(() => {
    if (!currentStep) { setTargetRect(null); return }
    if (currentStep.page !== null && location.pathname !== currentStep.page) {
      setTargetRect(null)
      return
    }

    let cancelled = false
    let attempts = 0

    function tryFind() {
      if (cancelled) return
      const el = document.querySelector(currentStep.target)
      if (el) {
        const rect = el.getBoundingClientRect()
        setTargetRect({
          top: rect.top + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width,
          height: rect.height,
        })
      } else if (attempts < 30) {
        attempts++
        setTimeout(tryFind, 300)
      }
    }

    setTimeout(tryFind, 300)

    const handleLayout = () => {
      const el = document.querySelector(currentStep.target)
      if (el) {
        const rect = el.getBoundingClientRect()
        setTargetRect({
          top: rect.top + window.scrollY,
          left: rect.left + window.scrollX,
          width: rect.width,
          height: rect.height,
        })
      }
    }
    window.addEventListener('resize', handleLayout)
    window.addEventListener('scroll', handleLayout, true)

    return () => {
      cancelled = true
      window.removeEventListener('resize', handleLayout)
      window.removeEventListener('scroll', handleLayout, true)
    }
  }, [step, location.pathname])

  function getNextStep(current) {
    // Onboarding step 4 → dormindo (5) pra esperar energia tutorial
    if (current === 4) return 5
    // Último step da energia tutorial → fim
    if (current === 26) return -1
    // Normal: próximo step
    const nextId = current + 1
    const nextExists = STEPS.find(s => s.id === nextId)
    return nextExists ? nextId : -1
  }

  const advance = useCallback(() => {
    const nextId = getNextStep(stepRef.current)
    setStep(nextId)
    stepRef.current = nextId
    setTargetRect(null)
    if (jogadorID) {
      API.post('/api/tutorial-step', { jogador_id: jogadorID, step: nextId })
    }
  }, [jogadorID])

  const skip = useCallback(() => {
    setStep(-1)
    stepRef.current = -1
    setTargetRect(null)
    if (jogadorID) {
      API.post('/api/tutorial-step', { jogador_id: jogadorID, step: -1 })
    }
  }, [jogadorID])

  // Conta visual de steps por fase (onboarding = 4, energia = 7)
  const faseInfo = (() => {
    if (step >= 1 && step <= 4) return { num: step, total: 4, fase: 'Primeiros Passos' }
    if (step >= 20 && step <= 26) return { num: step - 19, total: 7, fase: 'Energia & Trabalhos' }
    return { num: 0, total: 0, fase: '' }
  })()

  return (
    <TutorialContext.Provider value={{
      currentStep, targetRect, isActive, advance, skip, step,
      totalSteps: TOTAL_STEPS,
      faseInfo,
    }}>
      {children}
    </TutorialContext.Provider>
  )
}

export function useTutorial() {
  return useContext(TutorialContext)
}
