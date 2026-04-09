import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { GameProvider, useGame } from './context/GameContext'
import { TutorialProvider } from './context/TutorialContext'
import Layout from './components/Layout'
import LoginModal from './components/LoginModal'
import Notificacao from './components/Notificacao'
import LevelUpOverlay from './components/LevelUpOverlay'
import DialogoOverlay from './components/DialogoOverlay'
import TutorialOverlay from './components/TutorialOverlay'
import PosicaoModal from './components/PosicaoModal'
import StreakModal from './components/StreakModal'
import EventBanner from './components/EventBanner'
import ClubeModal from './components/ClubeModal'
import Historia from './pages/Historia'
import Trabalhos from './pages/Trabalhos'
import Perfil from './pages/Perfil'
import Loja from './pages/Loja'
import Inventario from './pages/Inventario'
import Estadio from './pages/Estadio'
import Missoes from './pages/Missoes'
import Desafio1v1 from './pages/Desafio1v1'
import TopCraques from './pages/TopCraques'
import Torneio from './pages/Torneio'
import Foruns from './pages/Foruns'
import Banco from './pages/Banco'
import Performance from './pages/Performance'
import Treino from './pages/Treino'
const MiniGame = React.lazy(() => import('./pages/MiniGame'))

function HomeRouter() {
  const { jogador } = useGame()
  if (jogador && jogador.nivel < 4) return <Historia />
  return <Trabalhos />
}

export default function App() {
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
            <Route path="/" element={<HomeRouter />} />
            <Route path="/historia" element={<Historia />} />
            <Route path="/inicio" element={<Perfil />} />
            <Route path="/inventario" element={<Inventario />} />
            <Route path="/loja" element={<Loja />} />
            <Route path="/estadio" element={<Estadio />} />
            <Route path="/missoes" element={<Missoes />} />
            <Route path="/desafio" element={<Desafio1v1 />} />
            <Route path="/top-craques" element={<TopCraques />} />
            <Route path="/torneio" element={<Torneio />} />
            <Route path="/foruns" element={<Foruns />} />
            <Route path="/banco" element={<Banco />} />
            <Route path="/performance" element={<Performance />} />
            <Route path="/treino" element={<Treino />} />
            <Route path="/minigame" element={<React.Suspense fallback={<div style={{textAlign:'center',padding:40,fontWeight:900}}>Carregando MiniGame...</div>}><MiniGame /></React.Suspense>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </TutorialProvider>
    </GameProvider>
  )
}
