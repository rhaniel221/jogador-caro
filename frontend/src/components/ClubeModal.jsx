import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom'
import { useGame } from '../context/GameContext'
import API from '../api'

export default function ClubeModal() {
  const { jogador, jogadorID, setJogador, mostrarNotificacao } = useGame()
  const [dados, setDados] = useState(null)
  const [loading, setLoading] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!jogadorID || !jogador || jogador.nivel < 20) return
    if (dismissed) return

    // Se já tem clube, não precisa mostrar
    if (jogador.clube_id && jogador.clube_id > 0) return

    // Checa sessionStorage só pra quem dispensou nesta sessão
    const key = 'clube_dismissed_' + jogadorID
    if (sessionStorage.getItem(key)) return

    API.get('/api/clubes/disponiveis/' + jogadorID)
      .then(res => {
        if (res && res.disponivel && res.clubes && res.clubes.length > 0) {
          setDados(res)
        }
      })
      .catch(() => {})
  }, [jogadorID, jogador?.nivel, jogador?.clube_id, dismissed])

  async function escolher(clubeID) {
    setLoading(true)
    try {
      const res = await API.post('/api/clube/escolher', { jogador_id: jogadorID, clube_id: clubeID })
      if (res.sucesso) {
        setJogador(res.jogador)
        mostrarNotificacao(res.mensagem, 'sucesso')
        setDados(null)
        setDismissed(true)
      } else {
        mostrarNotificacao(res.mensagem, 'erro')
      }
    } catch { mostrarNotificacao('Erro ao escolher clube.', 'erro') }
    setLoading(false)
  }

  function fechar() {
    const key = 'clube_dismissed_' + jogadorID
    sessionStorage.setItem(key, '1')
    setDados(null)
    setDismissed(true)
  }

  if (!dados || dismissed) return null

  return ReactDOM.createPortal(
    <div className="modal-overlay">
      <div className="clube-modal">
        <div className="clube-modal-header">
          <div className="clube-modal-titulo">Escolha seu Clube!</div>
          <div className="clube-modal-sub">{dados.tier} — Escolha o time que vai defender!</div>
        </div>

        <div className="clube-modal-grid">
          {dados.clubes.map(c => (
            <div key={c.id} className="clube-card" onClick={() => !loading && escolher(c.id)}
              style={{ borderColor: c.cor1 }}>
              <div className="clube-card-icon" style={{ background: `linear-gradient(135deg, ${c.cor1}, ${c.cor2})` }}>
                <span>{c.icone}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="clube-card-nome">{c.nome}</div>
                <div className="clube-card-mascote">{c.mascote}</div>
                <div className="clube-card-cores">
                  <span className="clube-cor" style={{ background: c.cor1 }} />
                  <span className="clube-cor" style={{ background: c.cor2 }} />
                </div>
              </div>
              <button className="btn-work btn-verde btn-small" disabled={loading}>
                {loading ? '...' : 'Escolher'}
              </button>
            </div>
          ))}
        </div>

        <button className="clube-modal-ficar" onClick={fechar}>
          Ficar sem clube por enquanto
        </button>
      </div>
    </div>,
    document.body
  )
}
