import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import API from '../api'

const GameContext = createContext(null)

export function GameProvider({ children }) {
  const [jogadorID, setJogadorID] = useState(() => {
    const v = localStorage.getItem('jogadorID')
    return v ? parseInt(v) : null
  })
  const [jogador, setJogador] = useState(null)
  const [avatares, setAvatares] = useState([])

  // ===== TOAST (alerta simples, sem fila, último ganha) =====
  const [notif, setNotif] = useState(null)
  const mostrarNotificacao = useCallback((msg, tipo = 'sucesso') => {
    setNotif({ msg, tipo, id: Date.now() + Math.random() })
  }, [])

  // ===== DIALOG QUEUE (com botão OK, fila sequencial) =====
  const [dialogQueue, setDialogQueue] = useState([])
  const activeDialog = dialogQueue[0] || null

  const pushDialogo = useCallback((item) => {
    setDialogQueue(prev => [...prev, item])
  }, [])

  const fecharDialogo = useCallback(() => {
    setDialogQueue(prev => prev.slice(1))
  }, [])

  // Level up → entra na fila de diálogos
  const setLevelUp = useCallback((nivel) => {
    if (nivel) pushDialogo({ tipo: 'level_up', nivel })
  }, [pushDialogo])

  // Carrega avatares
  useEffect(() => {
    API.get('/api/avatares').then(setAvatares).catch(() => {})
  }, [])

  function getAvatar(id) {
    const av = avatares.find(a => a.id === id)
    return av ? av.icone : '⚽'
  }

  const recarregarJogador = useCallback(async () => {
    if (!jogadorID) return
    try {
      const dados = await API.get('/api/jogador/' + jogadorID)
      setJogador(dados)
    } catch (e) { }
  }, [jogadorID])

  const fazerLogin = useCallback(async (nome) => {
    const res = await API.post('/api/login', { nome })
    const id = res.jogador_id
    localStorage.setItem('jogadorID', id)
    setJogadorID(id)
    setJogador(res.jogador)
    mostrarNotificacao('Bem-vindo, ' + res.jogador.nome + '!', 'sucesso')
  }, [mostrarNotificacao])

  const sair = useCallback(() => {
    if (!confirm('Tem certeza? Seu progresso fica salvo no servidor.')) return
    localStorage.removeItem('jogadorID')
    setJogadorID(null)
    setJogador(null)
  }, [])

  useEffect(() => {
    if (jogadorID) recarregarJogador()
  }, [jogadorID, recarregarJogador])

  return (
    <GameContext.Provider value={{
      jogadorID, jogador, setJogador,
      fazerLogin, sair, recarregarJogador,
      mostrarNotificacao, notif,
      pushDialogo, fecharDialogo, activeDialog, setLevelUp,
      avatares, getAvatar
    }}>
      {children}
    </GameContext.Provider>
  )
}

export function useGame() {
  return useContext(GameContext)
}
