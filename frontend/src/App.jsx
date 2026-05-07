import React, { useState } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { GameProvider } from './context/GameContext'
import { TutorialProvider } from './context/TutorialContext'
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
import Loja from './pages/Loja'
import Inventario from './pages/Inventario'
import Missoes from './pages/Missoes'
import TopCraques from './pages/TopCraques'
import Foruns from './pages/Foruns'
import Banco from './pages/Banco'
import Performance from './pages/Performance'
import Treino from './pages/Treino'

export default function App() {
  const [loaded, setLoaded] = useState(false)

  if (!loaded) return <LoadingScreen onDone={() => setLoaded(true)} />

  return (
    <GameProvider>
      <TutorialProvider>
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
            <Route path="/missoes" element={<Missoes />} />
            <Route path="/loja" element={<Loja />} />
            <Route path="/inventario" element={<Inventario />} />
            <Route path="/top-craques" element={<TopCraques />} />
            <Route path="/foruns" element={<Foruns />} />
            <Route path="/banco" element={<Banco />} />
            <Route path="/performance" element={<Performance />} />
            <Route path="/treino" element={<Treino />} />
            <Route path="/minigame" element={<Navigate to="/carreira?aba=minigame" replace />} />
            {/* Rotas legadas — redireciona para novos destinos */}
            <Route path="/inicio" element={<Navigate to="/jogador" replace />} />
            <Route path="/desafio" element={<Navigate to="/carreira?aba=desafio" replace />} />
            <Route path="/estadio" element={<Navigate to="/carreira?aba=estadio" replace />} />
            <Route path="/torneio" element={<Navigate to="/carreira?aba=torneio" replace />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </TutorialProvider>
    </GameProvider>
  )
}
