import React, { useState, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { GameProvider, useGame } from './context/GameContext'
import { TutorialProvider, useTutorial } from './context/TutorialContext'
import Layout from './components/Layout'
import LoadingScreen from './components/LoadingScreen'
import LoginModal from './components/LoginModal'
import Notificacao from './components/Notificacao'
import LevelUpOverlay from './components/LevelUpOverlay'
import DialogoOverlay from './components/DialogoOverlay'
import TutorialOverlay from './components/TutorialOverlay'
import PosicaoModal from './components/PosicaoModal'
import StreakModal from './components/StreakModal'
import EventBanner from './components/EventBanner'
import ClubeModal from './components/ClubeModal'
import Dashboard from './pages/Dashboard'
import Historia from './pages/Historia'
import MeuJogador from './pages/MeuJogador'
import MinhaVida from './pages/MinhaVida'
import Carreira from './pages/Carreira'
import Disputas from './pages/Disputas'
import Loja from './pages/Loja'
import Inventario from './pages/Inventario'
import Missoes from './pages/Missoes'
import TopCraques from './pages/TopCraques'
import Foruns from './pages/Foruns'
import Banco from './pages/Banco'
import Performance from './pages/Performance'
import Treino from './pages/Treino'

// Força novato (nivel 1, ainda no onboarding inicial) a entrar pela /historia.
// Lê o step LIVE do TutorialContext (não o defasado de jogador.tutorial_step).
// Depois do step 5+ libera navegação livre.
function NovatoGuard() {
  const { jogador } = useGame()
  const { step } = useTutorial()
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    if (!jogador) return
    if (jogador.nivel >= 2) return
    // Tutorial finalizado (-1) ou já passou dos 4 primeiros steps: liberou
    if (step === -1) return
    if (step >= 5) return
    // Step ainda inicial (1-4): força /historia
    if (location.pathname === '/historia') return
    navigate('/historia', { replace: true })
  }, [jogador?.id, jogador?.nivel, step, location.pathname])

  return null
}

function AppContent() {
  const { jogador } = useGame()
  const [loaded, setLoaded] = useState(false)

  // Loading screen: roda enquanto carrega dados do jogador
  // Se ja ta logado (localStorage), espera o jogador carregar antes de liberar
  if (!loaded) {
    const hasSession = !!localStorage.getItem('jogadorID')
    return (
      <LoadingScreen
        onDone={() => setLoaded(true)}
        waitFor={hasSession ? !!jogador : true}
      />
    )
  }

  return (
    <TutorialProvider>
      <NovatoGuard />
      <LoginModal />
      <Notificacao />
      <LevelUpOverlay />
      <DialogoOverlay />
      <TutorialOverlay />
      <PosicaoModal />
      <StreakModal />
      <EventBanner />
      <ClubeModal />
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/historia" element={<Historia />} />
          <Route path="/jogador" element={<MeuJogador />} />
          <Route path="/vida" element={<MinhaVida />} />
          <Route path="/carreira" element={<Carreira />} />
          <Route path="/disputas" element={<Disputas />} />
          <Route path="/missoes" element={<Missoes />} />
          <Route path="/loja" element={<Loja />} />
          <Route path="/inventario" element={<Inventario />} />
          <Route path="/top-craques" element={<TopCraques />} />
          <Route path="/foruns" element={<Foruns />} />
          <Route path="/banco" element={<Banco />} />
          <Route path="/performance" element={<Performance />} />
          <Route path="/treino" element={<Treino />} />
          <Route path="/minigame" element={<Navigate to="/disputas?aba=minigame" replace />} />
          <Route path="/inicio" element={<Navigate to="/jogador" replace />} />
          <Route path="/desafio" element={<Navigate to="/disputas?aba=desafio" replace />} />
          <Route path="/estadio" element={<Navigate to="/disputas?aba=estadio" replace />} />
          <Route path="/torneio" element={<Navigate to="/disputas" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </TutorialProvider>
  )
}

export default function App() {
  return (
    <GameProvider>
      <AppContent />
    </GameProvider>
  )
}
