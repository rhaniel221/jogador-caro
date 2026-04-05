import React, { useState } from 'react'
import { useGame } from '../context/GameContext'
import API from '../api'

const POSICOES = [
  { id: 'GK', nome: 'Goleiro', icone: '🧤', desc: 'O último homem. Reflexos sobre-humanos e defesas impossíveis.', cor: '#f39c12' },
  { id: 'DEF', nome: 'Defensor', icone: '🛡️', desc: 'A muralha. Ninguém passa por você. Força e posicionamento.', cor: '#e74c3c' },
  { id: 'MED', nome: 'Meia', icone: '🎯', desc: 'O cérebro do time. Visão de jogo, passes e controle total.', cor: '#2ecc71' },
  { id: 'ATA', nome: 'Atacante', icone: '⚽', desc: 'O matador. Gols, velocidade e instinto assassino.', cor: '#3498db' },
]

export default function PosicaoModal() {
  const { jogador, setJogador, jogadorID } = useGame()
  const [selecionada, setSelecionada] = useState(null)
  const [loading, setLoading] = useState(false)

  // Só mostra se jogador existe, completou tutorial e não tem posição
  if (!jogador || jogador.tutorial_step > 0 || jogador.tutorial_step === 0 || jogador.posicao) return null
  // Mostra quando tutorial terminou (step = -1) e posicao vazia
  if (jogador.tutorial_step !== -1) return null

  async function confirmar() {
    if (!selecionada || loading) return
    setLoading(true)
    const res = await API.post('/api/escolher-posicao', { jogador_id: jogadorID, posicao: selecionada })
    if (res.sucesso && res.jogador) setJogador(res.jogador)
    setLoading(false)
  }

  return (
    <div className="pos-overlay">
      <div className="pos-modal">
        <div className="pos-header">
          <div className="pos-header-icon">⚽</div>
          <h2 className="pos-title">ESCOLHA SUA POSIÇÃO</h2>
          <p className="pos-sub">Essa escolha é permanente e define suas missões especiais!</p>
        </div>

        <div className="pos-grid">
          {POSICOES.map(p => (
            <div
              key={p.id}
              className={`pos-card${selecionada === p.id ? ' pos-selected' : ''}`}
              style={{ borderColor: selecionada === p.id ? p.cor : 'transparent' }}
              onClick={() => setSelecionada(p.id)}
            >
              <div className="pos-card-icon" style={{ background: p.cor }}>{p.icone}</div>
              <div className="pos-card-sigla">{p.id}</div>
              <div className="pos-card-nome">{p.nome}</div>
              <div className="pos-card-desc">{p.desc}</div>
            </div>
          ))}
        </div>

        {selecionada && (
          <button className="btn-work btn-verde pos-confirm" onClick={confirmar} disabled={loading}>
            {loading ? '...' : `Confirmar: ${POSICOES.find(p => p.id === selecionada)?.nome}`}
          </button>
        )}
      </div>
    </div>
  )
}
