import React, { useState } from 'react'
import { useGame } from '../context/GameContext'

export default function LoginModal() {
  const { jogador, fazerLogin, mostrarNotificacao } = useGame()
  const [nome, setNome] = useState('')
  const [loading, setLoading] = useState(false)

  if (jogador) return null

  async function handleLogin() {
    if (!nome.trim() || nome.trim().length < 2) {
      mostrarNotificacao('Digite um apelido com pelo menos 2 letras!', 'erro')
      return
    }
    setLoading(true)
    try {
      await fazerLogin(nome.trim())
    } catch (e) {
      mostrarNotificacao('Erro ao entrar. Tente outro apelido.', 'erro')
    }
    setLoading(false)
  }

  return (
    <div id="modal-login" style={{ display: 'flex' }}>
      <div className="modal-login-box">
        <img src="/logo.png" alt="Joga Craque" className="ml-logo-img" />
        <h2>JOGA CRAQUE</h2>
        <p>Bem-vindo ao campo! Digite seu apelido para entrar no jogo.</p>
        <input
          type="text"
          placeholder="Seu apelido..."
          maxLength={20}
          value={nome}
          onChange={e => setNome(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleLogin()}
          autoFocus
        />
        <button className="ml-btn" onClick={handleLogin} disabled={loading}>
          {loading ? 'Entrando...' : 'Entrar no Jogo!'}
        </button>
        <small>Novo por aqui? Seu perfil será criado automaticamente.</small>
      </div>
    </div>
  )
}
