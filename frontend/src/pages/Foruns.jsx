import React, { useState, useEffect } from 'react'
import { useGame } from '../context/GameContext'
import API from '../api'
import PageGuide from '../components/PageGuide'

export default function Foruns() {
  const { jogador, jogadorID, mostrarNotificacao } = useGame()
  const [posts, setPosts] = useState([])
  const [mensagem, setMensagem] = useState('')
  const [loading, setLoading] = useState(false)

  async function carregar() {
    try {
      const lista = await API.get('/api/foruns')
      setPosts(lista)
    } catch (e) { setPosts([]) }
  }

  useEffect(() => { carregar() }, [])

  async function postar() {
    if (!mensagem.trim()) { mostrarNotificacao('Digite uma mensagem!', 'erro'); return }
    if (!jogador) { mostrarNotificacao('Faça login primeiro!', 'erro'); return }
    setLoading(true)
    try {
      await API.post('/api/foruns', { jogador_id: jogadorID, mensagem: mensagem.trim() })
      setMensagem('')
      await carregar()
      mostrarNotificacao('Mensagem enviada!', 'sucesso')
    } catch (e) {
      mostrarNotificacao('Erro ao postar.', 'erro')
    }
    setLoading(false)
  }

  return (
    <>
      <h2 className="page-title">💬 FÓRUNS</h2>
      <PageGuide
        pageKey="foruns"
        icone="💬"
        titulo="Fóruns da Comunidade"
        texto="Converse com outros jogadores! Troque dicas, estratégias e faça amizades. Respeite os outros jogadores."
      />
      <p className="subtitle">Converse com outros jogadores. Troque dicas e estratégias!</p>

      {jogador && (
        <div className="section-box" style={{ marginBottom: '15px' }}>
          <h3>✏️ Nova Mensagem</h3>
          <textarea
            style={{
              width: '100%', background: '#080c06', border: '1px solid #2a3822',
              color: '#fff', padding: '10px', fontSize: '13px', resize: 'vertical',
              minHeight: '80px', marginBottom: '10px', fontFamily: 'Arial, sans-serif'
            }}
            placeholder="O que você quer dizer para a galera?"
            value={mensagem}
            onChange={e => setMensagem(e.target.value)}
          />
          <button className="btn-work btn-verde" onClick={postar} disabled={loading}>
            {loading ? 'Enviando...' : '📢 Postar'}
          </button>
        </div>
      )}

      <div className="section-box" style={{ padding: 0 }}>
        {posts.length === 0
          ? <div className="empty-state" style={{ padding: '30px' }}>Nenhuma mensagem ainda. Seja o primeiro a postar!</div>
          : posts.map((p, i) => (
            <div key={i} style={{
              padding: '14px 16px',
              borderBottom: '1px solid #0d1209',
              display: 'flex',
              flexDirection: 'column',
              gap: '5px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <strong style={{ color: '#ffd700', fontSize: '13px' }}>{p.nome}</strong>
                {p.titulo && <span style={{ fontSize: '9px', color: '#b8860b' }}>[{p.titulo}]</span>}
                <span style={{ fontSize: '9px', color: '#3a4a30' }}>Nv.{p.nivel}</span>
                <span style={{ fontSize: '9px', color: '#3a4a30', marginLeft: 'auto' }}>{p.data}</span>
              </div>
              <div style={{ color: '#a3b899', fontSize: '13px', lineHeight: 1.5 }}>{p.mensagem}</div>
            </div>
          ))
        }
      </div>

      <p className="footer-note">💡 Respeite todos os jogadores. Mensagens ofensivas serão removidas.</p>
    </>
  )
}
