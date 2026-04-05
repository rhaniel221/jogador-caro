import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useGame } from './GameContext'
import API from '../api'

const TutorialContext = createContext(null)

// tipo: 'nav' = deve clicar no elemento, 'info' = lê e clica Entendi
const STEPS = [
  // Fase 1: Historia (nível < 4, página /)
  { id: 1, tipo: 'info', page: '/', target: '[data-tutorial="missoes-lista"]',
    titulo: 'Bem-vindo ao Joga Craque! ⚽',
    texto: 'Sua jornada começa aqui! Complete as missões da história para avançar. Cada missão dá XP e dinheiro!' },

  { id: 2, tipo: 'info', page: '/', target: '[data-tutorial="stat-energia"]',
    titulo: '⚡ Energia',
    texto: 'Algumas missões gastam Energia. Ela regenera sozinha com o tempo. Quando acabar, descanse ou use um consumível!' },

  { id: 3, tipo: 'info', page: '/', target: '[data-tutorial="stat-xp"]',
    titulo: '📊 XP e Nível',
    texto: 'Ganhe XP completando missões para subir de nível! Cada nível desbloqueia novas fases e aumenta seus atributos.' },

  { id: 4, tipo: 'info', page: '/', target: '[data-tutorial="stat-dinheiro"]',
    titulo: '💰 Dinheiro',
    texto: 'Use dinheiro pra comprar equipamentos e consumíveis na Loja. Guarde no Banco pra não perder em combates!' },

  // Fase 2: Estádio
  { id: 5, tipo: 'nav', page: null, target: '[data-tutorial="nav-estadio"]', destino: '/estadio',
    titulo: '🏟️ Conheça o Estádio!',
    texto: 'Clique em "Estádio" para conhecer a arena de combate!' },

  { id: 6, tipo: 'info', page: '/estadio', target: '[data-tutorial="combat-area"]',
    titulo: '⚔️ Arena de Combate',
    texto: 'Aqui você desafia outros jogadores. Vencer dá Fama e você rouba parte do dinheiro do adversário!' },

  { id: 7, tipo: 'info', page: '/estadio', target: '[data-tutorial="stat-vitalidade"]',
    titulo: '💚 Vitalidade',
    texto: 'Cada combate gasta Vitalidade. Sem vitalidade, não pode lutar. Ela regenera com o tempo.' },

  { id: 8, tipo: 'info', page: '/estadio', target: '[data-tutorial="stat-saude"]',
    titulo: '❤️ Saúde',
    texto: 'Ao perder, sua Saúde diminui. Se chegar a 0, fica vulnerável. Recupere com itens da Loja!' },

  // Fase 3: Loja
  { id: 9, tipo: 'nav', page: null, target: '[data-tutorial="nav-loja"]', destino: '/inventario',
    titulo: '🛒 Visite a Loja!',
    texto: 'Clique em "Loja" para se equipar com itens que te deixam mais forte!' },

  { id: 10, tipo: 'info', page: '/inventario', target: '[data-tutorial="shop-area"]',
    titulo: '🎒 Loja de Itens',
    texto: 'Consumíveis recuperam energia e saúde. Equipamentos aumentam atributos. Alguns trabalhos exigem equipamentos!' },

  // Fase 4: Perfil
  { id: 11, tipo: 'nav', page: null, target: '[data-tutorial="nav-perfil"]', destino: '/inicio',
    titulo: '👤 Veja seu Perfil!',
    texto: 'Clique em "Perfil" para ver seus atributos e inventário.' },

  { id: 12, tipo: 'info', page: '/inicio', target: '[data-tutorial="perfil-area"]',
    titulo: '📋 Painel do Jogador',
    texto: 'Aqui você vê tudo: atributos, itens equipados, tarefas diárias e conquistas!' },

  // Fase 5: Banco
  { id: 13, tipo: 'nav', page: null, target: '[data-tutorial="nav-banco"]', destino: '/banco',
    titulo: '🏦 Último passo!',
    texto: 'Clique em "Banco" para proteger seu dinheiro!' },

  { id: 14, tipo: 'info', page: '/banco', target: '[data-tutorial="banco-area"]',
    titulo: '💵 Banco Seguro',
    texto: 'Dinheiro no banco não pode ser roubado! Deposite sempre. Tutorial completo — boa sorte, craque! 🏆' },
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
    // Veteranos pulam
    if (jogador.tutorial_step === 0 && jogador.nivel > 3) {
      API.post('/api/tutorial-step', { jogador_id: jogador.id, step: -1 })
      setStep(-1)
      return
    }
    const s = jogador.tutorial_step === 0 ? 1 : jogador.tutorial_step
    setStep(s)
    stepRef.current = s
  }, [jogador?.id])

  useEffect(() => { stepRef.current = step }, [step])

  const currentStep = STEPS.find(s => s.id === step) || null
  const isActive = step > 0 && currentStep !== null

  // Auto-avança steps 'nav' quando chega na página certa
  useEffect(() => {
    if (!currentStep || currentStep.tipo !== 'nav') return
    if (currentStep.destino && location.pathname === currentStep.destino) {
      const nextId = stepRef.current + 1
      const nextExists = STEPS.find(s => s.id === nextId)
      const newStep = nextExists ? nextId : -1
      setStep(newStep)
      if (jogadorID) {
        API.post('/api/tutorial-step', { jogador_id: jogadorID, step: newStep })
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
      } else if (attempts < 20) {
        attempts++
        setTimeout(tryFind, 250)
      }
    }

    setTimeout(tryFind, 200)

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

  const advance = useCallback(() => {
    const nextId = stepRef.current + 1
    const nextExists = STEPS.find(s => s.id === nextId)
    const newStep = nextExists ? nextId : -1
    setStep(newStep)
    setTargetRect(null)
    if (jogadorID) {
      API.post('/api/tutorial-step', { jogador_id: jogadorID, step: newStep })
    }
  }, [jogadorID])

  const skip = useCallback(() => {
    setStep(-1)
    setTargetRect(null)
    if (jogadorID) {
      API.post('/api/tutorial-step', { jogador_id: jogadorID, step: -1 })
    }
  }, [jogadorID])

  return (
    <TutorialContext.Provider value={{ currentStep, targetRect, isActive, advance, skip, step, totalSteps: TOTAL_STEPS }}>
      {children}
    </TutorialContext.Provider>
  )
}

export function useTutorial() {
  return useContext(TutorialContext)
}
