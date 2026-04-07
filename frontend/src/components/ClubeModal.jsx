import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom'
import { useGame } from '../context/GameContext'
import API from '../api'

export default function ClubeModal() {
  const { jogador, jogadorID, setJogador, mostrarNotificacao } = useGame()
  const [dados, setDados] = useState(null)
  const [loading, setLoading] = useState(false)
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (!jogadorID || !jogador) return
    if (jogador.nivel < 20) return

    const cid = jogador.clube_id || 0
    if (cid > 0) { setShow(false); return }

    const key = 'clube_dismissed_' + jogadorID
    if (sessionStorage.getItem(key)) return

    API.get('/api/clubes/disponiveis/' + jogadorID)
      .then(res => {
        if (res && res.disponivel && res.clubes && res.clubes.length > 0) {
          setDados(res)
          setShow(true)
        }
      })
      .catch(() => {})
  }, [jogadorID, jogador?.nivel])

  async function escolher(clubeID) {
    setLoading(true)
    try {
      const res = await API.post('/api/clube/escolher', { jogador_id: jogadorID, clube_id: clubeID })
      if (res.sucesso) {
        setJogador(res.jogador)
        mostrarNotificacao(res.mensagem, 'sucesso')
        setShow(false)
        setDados(null)
      } else {
        mostrarNotificacao(res.mensagem, 'erro')
      }
    } catch { mostrarNotificacao('Erro ao escolher clube.', 'erro') }
    setLoading(false)
  }

  function fechar() {
    sessionStorage.setItem('clube_dismissed_' + jogadorID, '1')
    setShow(false)
    setDados(null)
  }

  if (!show || !dados) return null

  const el = (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,15,40,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      backdropFilter: 'blur(4px)'
    }} onClick={e => e.target === e.currentTarget && fechar()}>
      <div style={{
        background: '#fff', borderRadius: 16, maxWidth: 420, width: '92%',
        boxShadow: '0 16px 60px rgba(0,0,0,0.5)', overflow: 'hidden'
      }}>
        <div style={{
          background: 'linear-gradient(135deg, #0047a3, #003d99)',
          padding: '20px', textAlign: 'center'
        }}>
          <div style={{ fontFamily: 'var(--font-titulo)', fontSize: 26, color: '#fff' }}>
            Escolha seu Clube!
          </div>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>
            {dados.tier} — Escolha o time que vai defender!
          </div>
        </div>

        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {dados.clubes.map(c => (
            <div key={c.id} onClick={() => !loading && escolher(c.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px', border: `3px solid ${c.cor1}`,
                borderRadius: 14, background: '#fff', cursor: 'pointer',
                transition: 'transform 0.1s'
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'none'}>
              <div style={{
                width: 50, height: 50, borderRadius: 12,
                background: `linear-gradient(135deg, ${c.cor1}, ${c.cor2})`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 28, flexShrink: 0, boxShadow: '2px 2px 0 rgba(0,0,0,0.2)'
              }}>
                {c.icone}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 900, fontSize: 14, color: '#0e2442' }}>{c.nome}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#556' }}>{c.mascote}</div>
              </div>
              <button className="btn-work btn-verde btn-small" disabled={loading}
                style={{ flexShrink: 0 }}>
                {loading ? '...' : 'Escolher'}
              </button>
            </div>
          ))}
        </div>

        <button onClick={fechar} style={{
          display: 'block', width: '100%', padding: 14,
          background: 'none', border: 'none', borderTop: '1px solid #ddd',
          fontSize: 13, fontWeight: 700, color: '#888', cursor: 'pointer',
          textAlign: 'center'
        }}>
          Ficar sem clube por enquanto
        </button>
      </div>
    </div>
  )

  try {
    return ReactDOM.createPortal(el, document.body)
  } catch {
    return el
  }
}
