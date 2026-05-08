import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useGame } from './GameContext'
import API from '../api'

const TutorialContext = createContext(null)

/*
  Cada step:
    tipo: 'info' = mostra tooltip + botão Entendi
    tipo: 'nav'  = highlight no elemento, user deve clicar nele
    page: se não-null, só mostra quando location.pathname === page
          se null, mostra em qualquer página (pra targets do Header/Nav)
    delay: ms de espera ANTES de mostrar esse step (pra transições)
*/
const STEPS = [
  // ============================================
  // ONBOARDING (level 1-3, / = Dashboard)
  // ============================================
  { id: 1, tipo: 'info', page: '/historia', target: '[data-tutorial="missoes-lista"]',
    delay: 1200,
    titulo: 'Bem-vindo ao Jogador Caro!',
    texto: 'Sua jornada comeca aqui! Complete as missoes da historia para ganhar XP, dinheiro e subir de nivel!' },

  { id: 2, tipo: 'info', page: null, target: '[data-tutorial="stat-energia"]',
    delay: 600,
    titulo: 'Energia',
    texto: 'Missoes e trabalhos gastam Energia. Ela regenera sozinha com o tempo. Se acabar, compre consumiveis na Loja!' },

  { id: 3, tipo: 'info', page: null, target: '[data-tutorial="stat-xp"]',
    delay: 500,
    titulo: 'XP e Nivel',
    texto: 'Ganhe XP para subir de nivel! Cada nivel desbloqueia trabalhos novos, equipamentos e areas!' },

  { id: 4, tipo: 'info', page: null, target: '[data-tutorial="stat-dinheiro"]',
    delay: 500,
    titulo: 'Dinheiro',
    texto: 'Use dinheiro pra comprar itens na Loja. Agora vamos conhecer o seu Inventário!' },

  // ============================================
  // INVENTARIO + EQUIPAR (logo após onboarding)
  // ============================================
  { id: 10, tipo: 'nav', page: null, target: '[data-tutorial="header-inventario"]', destino: '/inventario',
    delay: 500,
    titulo: 'Abra o Inventário',
    texto: 'No Inventário você vê seu jogador e equipa itens. Clique no ícone da mochila no header!' },

  { id: 11, tipo: 'info', page: '/inventario', target: '[data-tutorial="inv-equipamento"]',
    delay: 800,
    titulo: 'Esse é o seu Jogador!',
    texto: 'Esse é o craque que você vai forjar. Ao redor dele tem 8 slots de equipamento — cabeça, camisa, luvas, shorts, meião, chuteiras, etc. Cada peça aumenta seus atributos.' },

  { id: 12, tipo: 'info', page: '/inventario', target: '[data-tutorial="inv-equipamento"]',
    delay: 500,
    titulo: 'Como Equipar',
    texto: 'Quando você ganhar um item (em missões, abrindo na Loja ou completando torneios), o slot correspondente vai pulsar azul. Clique nele e escolha o item — pronto, equipado! Os bônus aparecem ao lado.' },

  { id: 13, tipo: 'nav', page: null, target: '[data-tutorial="nav-inicio"]', destino: '/',
    delay: 500,
    titulo: 'Volta ao Início',
    texto: 'Beleza, agora você sabe equipar. Volte ao Início e continue as missões da história pra ganhar seus primeiros itens!' },

  // step 5 = dormindo (espera nivel 4 + energia baixa)

  // ============================================
  // TUTORIAL DE ENERGIA (level 4+, Carreira)
  // ============================================
  { id: 20, tipo: 'info', page: null, target: '[data-tutorial="stat-energia"]',
    delay: 800,
    titulo: 'Sua Energia Acabou!',
    texto: 'Voce ficou sem energia e nao consegue trabalhar! Mas calma, tem solucao. Vamos a Loja comprar um item que recupera energia!' },

  { id: 21, tipo: 'nav', page: null, target: '[data-tutorial="nav-loja"]', destino: '/loja',
    delay: 500,
    titulo: 'Va a Loja!',
    texto: 'Clique em "Loja" para comprar um item de energia!' },

  { id: 22, tipo: 'info', page: '/loja', target: '[data-tutorial="loja-energia-section"]',
    delay: 800,
    titulo: 'Compre Energia!',
    texto: 'A aba "Energia" ja esta selecionada. Compre uma Agua Mineral — e barata e recupera energia pra voce voltar a trabalhar!' },

  { id: 23, tipo: 'nav', page: null, target: '[data-tutorial="header-inventario"]', destino: '/inventario',
    delay: 600,
    titulo: 'Abra o Inventario!',
    texto: 'Agora clique no Inventario para usar o item que voce comprou!' },

  { id: 24, tipo: 'info', page: '/inventario', target: '[data-tutorial="inv-consumiveis"]',
    delay: 800,
    titulo: 'Use o Item de Energia!',
    texto: 'Encontre o item de energia e clique em "Usar" para recuperar sua energia!' },

  { id: 25, tipo: 'nav', page: null, target: '[data-tutorial="nav-trabalhos"]', destino: '/carreira',
    delay: 600,
    titulo: 'Va para a Carreira!',
    texto: 'Energia recuperada! Agora va para a Carreira e comece a trabalhar!' },

  { id: 26, tipo: 'info', page: '/carreira', target: '[data-tutorial="variedade-panel"]',
    delay: 800,
    titulo: 'Bonus de Variedade!',
    texto: 'Trabalhe em 3 trabalhos DIFERENTES no mesmo dia para ganhar +10% de XP bonus! Quanto mais variar, mais XP. Boa sorte, craque!' },
]

export function TutorialProvider({ children }) {
  const { jogador, jogadorID } = useGame()
  const location = useLocation()
  const [step, setStep] = useState(-1)
  const [visible, setVisible] = useState(false) // controla fade in/out
  const stepRef = useRef(-1)
  const transitionTimer = useRef(null)

  // Limpa timers ao desmontar
  useEffect(() => () => clearTimeout(transitionTimer.current), [])

  // Inicializa
  useEffect(() => {
    if (!jogador) return
    if (jogador.tutorial_step === -1) { setStep(-1); return }
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

  // Ativa tutorial de energia: dormindo (5), nível 4+, energia baixa
  useEffect(() => {
    if (step !== 5 || !jogador) return
    if (jogador.nivel < 4 || (location.pathname !== '/' && location.pathname !== '/carreira')) return
    if (jogador.energia > 3) return
    const timer = setTimeout(() => {
      goToStep(20)
    }, 2500)
    return () => clearTimeout(timer)
  }, [step, jogador?.nivel, jogador?.energia, location.pathname, jogadorID])

  const currentStep = STEPS.find(s => s.id === step) || null
  const isActive = step > 0 && step !== 5 && currentStep !== null

  // Controla visibilidade: esconde durante transição de step e transição de página
  useEffect(() => {
    if (!isActive) { setVisible(false); return }
    // Verifica se step exige página específica
    if (currentStep.page !== null && location.pathname !== currentStep.page) {
      setVisible(false)
      return
    }
    // Espera o delay do step antes de mostrar
    setVisible(false)
    const delay = currentStep.delay || 500
    const timer = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(timer)
  }, [step, location.pathname, isActive])

  // Auto-avança steps 'nav' quando chega na página certa
  useEffect(() => {
    if (!currentStep || currentStep.tipo !== 'nav') return
    if (currentStep.destino && location.pathname === currentStep.destino) {
      // Espera a página renderizar antes de avançar
      const timer = setTimeout(() => {
        const nextId = getNextStep(stepRef.current)
        goToStep(nextId)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [location.pathname, currentStep?.id])

  function getNextStep(current) {
    if (current === 4) return 10
    if (current === 13) return 5
    if (current === 26) return -1
    const nextId = current + 1
    return STEPS.find(s => s.id === nextId) ? nextId : -1
  }

  function goToStep(nextId) {
    setVisible(false) // fade out
    clearTimeout(transitionTimer.current)
    transitionTimer.current = setTimeout(() => {
      setStep(nextId)
      stepRef.current = nextId
      if (jogadorID) {
        API.post('/api/tutorial-step', { jogador_id: jogadorID, step: nextId })
      }
    }, 250) // espera fade out completar
  }

  const advance = useCallback(() => {
    const nextId = getNextStep(stepRef.current)
    goToStep(nextId)
  }, [jogadorID])

  const skip = useCallback(() => {
    setVisible(false)
    clearTimeout(transitionTimer.current)
    transitionTimer.current = setTimeout(() => {
      setStep(-1)
      stepRef.current = -1
      if (jogadorID) {
        API.post('/api/tutorial-step', { jogador_id: jogadorID, step: -1 })
      }
    }, 250)
  }, [jogadorID])

  const faseInfo = (() => {
    if (step >= 1 && step <= 4) return { num: step, total: 4, fase: 'Primeiros Passos' }
    if (step >= 10 && step <= 13) return { num: step - 9, total: 4, fase: 'Inventário' }
    if (step >= 20 && step <= 26) return { num: step - 19, total: 7, fase: 'Energia & Trabalhos' }
    return { num: 0, total: 0, fase: '' }
  })()

  return (
    <TutorialContext.Provider value={{
      currentStep, isActive, visible, advance, skip, step, faseInfo,
    }}>
      {children}
    </TutorialContext.Provider>
  )
}

export function useTutorial() {
  return useContext(TutorialContext)
}
