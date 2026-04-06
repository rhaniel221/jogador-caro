import React, { useState, useEffect } from 'react'
import { useGame } from '../context/GameContext'
import API from '../api'
import { fmt } from '../utils'

export default function Estadio() {
  const { jogador, setJogador, jogadorID, mostrarNotificacao } = useGame()

  if (!jogador || jogador.nivel < 10) return (
    <div style={{ textAlign: 'center', padding: 40 }}>
      <div style={{ fontSize: 60 }}>🔒</div>
      <h2 style={{ fontFamily: 'var(--font-titulo)', marginTop: 10 }}>Estádio bloqueado</h2>
      <p style={{ fontWeight: 700, color: '#555' }}>Alcance o nível 10 para desbloquear o PvP!</p>
    </div>
  )
  const [oponentes, setOponentes] = useState([])
  const [historico, setHistorico] = useState([])
  const [combateModal, setCombateModal] = useState(null)
  const [loadingAtaque, setLoadingAtaque] = useState(null)

  useEffect(() => {
    carregarOponentes()
    carregarHistorico()
  }, [jogadorID])

  async function carregarOponentes() {
    if (!jogadorID) return
    try {
      const lista = await API.get('/api/jogadores?excluir=' + jogadorID)
      setOponentes(lista)
    } catch (e) { }
  }

  async function carregarHistorico() {
    if (!jogadorID) return
    try {
      const lista = await API.get('/api/combates/historico?jogador_id=' + jogadorID)
      setHistorico(lista)
    } catch (e) { }
  }

  async function atacar(defensorID, defensorNome) {
    if (!jogador) return
    if (jogador.vitalidade <= 0) { mostrarNotificacao('Sem vitalidade! Recupere-se no estádio.', 'erro'); return }
    if (!confirm(`Atacar ${defensorNome}? Custará 1 de vitalidade.`)) return
    setLoadingAtaque(defensorID)
    try {
      const res = await API.post('/api/combate', { atacante_id: jogadorID, defensor_id: defensorID })
      if (res.sucesso === false) { mostrarNotificacao(res.mensagem, 'erro'); return }
      setJogador(res.jogador)
      setCombateModal({ res, defensorNome })
      await carregarHistorico()
    } catch (e) { mostrarNotificacao('Erro no combate.', 'erro') }
    setLoadingAtaque(null)
  }

  async function recuperarVitalidade() {
    if (!jogador) return
    const custo = 100 * jogador.nivel
    if (!confirm(`Recuperar totalmente por R$ ${fmt(custo)}?`)) return
    try {
      const res = await API.post('/api/recuperar-vitalidade', { jogador_id: jogadorID })
      if (res.sucesso) { setJogador(res.jogador); mostrarNotificacao(res.mensagem, 'sucesso') }
      else mostrarNotificacao(res.mensagem, 'erro')
    } catch (e) { mostrarNotificacao('Erro ao recuperar.', 'erro') }
  }

  if (!jogador) return null

  const saudeBaixa = jogador.saude < 10

  return (
    <>
      <h2 className="page-title">⚔️ ESTÁDIO</h2>
      <p className="subtitle">Desafie outros jogadores em batalhas épicas. Vença para ganhar fama e dinheiro!</p>

      {saudeBaixa && (
        <div style={{
          background: '#3a1515', border: '2px solid #e74c3c', borderRadius: 10,
          padding: '12px 16px', marginBottom: 14, textAlign: 'center'
        }}>
          <div style={{ color: '#ff6b6b', fontWeight: 900, fontSize: 13 }}>
            ⚠️ Saúde muito baixa! ({jogador.saude}) - Vá ao <strong style={{ color: '#ffd700' }}>Perfil → Central de Tratamento</strong> para se recuperar.
          </div>
        </div>
      )}

      {combateModal && (
        <div id="modal-combate" style={{ display: 'flex' }}>
          <div className="modal-combate-box">
            <h2 id="combate-resultado-titulo" style={{ color: combateModal.res.vencedor_id === jogadorID ? '#ffd700' : '#ff4444' }}>
              {combateModal.res.vencedor_id === jogadorID ? '🏆 VITÓRIA!' : '💀 DERROTA!'}
            </h2>
            <div style={{ margin: '15px 0', fontSize: '13px', color: '#a3b899' }}>
              vs <strong style={{ color: '#ffd700' }}>{combateModal.defensorNome}</strong>
            </div>
            <div style={{ display: 'flex', gap: '30px', justifyContent: 'center', margin: '15px 0' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: '#5a7a4a' }}>Seu poder</div>
                <div style={{ fontSize: '24px', color: '#ffd700', fontWeight: 'bold' }}>{combateModal.res.poder_atacante}</div>
              </div>
              <div style={{ fontSize: '20px', alignSelf: 'center' }}>⚔️</div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '10px', color: '#5a7a4a' }}>Poder rival</div>
                <div style={{ fontSize: '24px', color: '#ff4444', fontWeight: 'bold' }}>{combateModal.res.poder_defensor}</div>
              </div>
            </div>
            <p style={{ color: '#a3b899', fontSize: '13px', marginBottom: '20px' }}>{combateModal.res.mensagem}</p>
            <button className="btn-work btn-verde" onClick={() => setCombateModal(null)}>Fechar</button>
          </div>
        </div>
      )}

      <div className="stadium-layout" data-tutorial="combat-area">
        <div>
          <div className="oponente-lista-header">Oponentes do seu nível <button className="btn-work btn-small btn-azul" onClick={carregarOponentes} style={{ marginLeft: '10px' }}>🔄</button></div>
          {(() => {
            const nivel = jogador?.nivel || 1
            const meuPoder = (jogador?.forca || 0) + (jogador?.velocidade || 0) + (jogador?.habilidade || 0)
            const filtrados = oponentes.filter(j => {
              const difNivel = Math.abs(nivel - j.nivel)
              if (difNivel > 5) return false
              const poderAdv = j.forca + j.velocidade + j.habilidade
              if (meuPoder > 0 && poderAdv > meuPoder * 2) return false
              if (poderAdv > 0 && meuPoder > poderAdv * 2) return false
              return true
            })
            return filtrados.length === 0
              ? <div style={{ padding: '20px', textAlign: 'center', color: '#888' }}>Nenhum oponente do seu nível disponível.</div>
              : filtrados.map(j => {
              const nivelClass = j.nivel >= 20 ? 'ouro' : j.nivel >= 10 ? 'prata' : j.nivel >= 5 ? 'bronze' : ''
              return (
                <div key={j.id} className="oponente-item">
                  <div className="oponente-info">
                    <strong>⚽ {j.nome}</strong>
                    <div className="oponente-stats">
                      <span>💪 {j.forca}</span>
                      <span>⚡ {j.velocidade}</span>
                      <span>🎯 {j.habilidade}</span>
                    </div>
                  </div>
                  <span className={`badge-nivel ${nivelClass}`}>Nv.{j.nivel}</span>
                  <div className="oponente-record">
                    <span className="text-verde">{j.vitorias}V</span>/<span className="text-vermelho">{j.derrotas}D</span>
                  </div>
                  <button
                    className="btn-work btn-atacar btn-small"
                    onClick={() => atacar(j.id, j.nome)}
                    disabled={loadingAtaque === j.id}
                  >
                    {loadingAtaque === j.id ? '...' : '⚔️ Atacar'}
                  </button>
                </div>
              )
            })
          })()}

          <div className="historico-combates" style={{ marginTop: '20px' }}>
            <h3>📋 Histórico de Combates</h3>
            {historico.length === 0
              ? <div className="empty-state">Nenhum combate ainda.</div>
              : historico.map((c, i) => {
                const isVenc = c.vencedor_id === jogadorID
                const isAtac = c.atacante_id === jogadorID
                const oponente = isAtac ? c.defensor_nome : c.atacante_nome
                const acao = isAtac ? 'Atacou' : 'Defendeu de'
                return (
                  <div key={i} className={`historico-item ${isVenc ? 'vitoria' : 'derrota'}`}>
                    <span>{isVenc ? '✅' : '❌'}</span>
                    <span style={{ flex: 1 }}>{acao} <strong>{oponente}</strong></span>
                    <span>{isVenc ? '+' : '-'}R$ {fmt(c.dinheiro_roubado)}</span>
                    <span style={{ color: '#3a4a30', fontSize: '10px' }}>{c.data}</span>
                  </div>
                )
              })}
          </div>
        </div>

        <div>
          <div className="meu-status-box">
            <h3>⚔️ Meu Status</h3>
            {[
              ['💪 Força', jogador.forca],
              ['⚡ Velocidade', jogador.velocidade],
              ['🎯 Habilidade', jogador.habilidade],
              ['💚 Vitalidade', `${jogador.vitalidade}/${jogador.vitalidade_max}`],
              ['❤️ Saúde', `${jogador.saude}/100`],
              ['🏆 Vitórias', jogador.vitorias],
              ['💀 Derrotas', jogador.derrotas],
              ['⭐ Fama', jogador.pontos_fama],
            ].map(([l, v]) => (
              <div key={l} className="stat-row">
                <span className="sl">{l}</span>
                <span className="sv">{v}</span>
              </div>
            ))}
            <div style={{ marginTop: '15px', paddingTop: '12px', borderTop: '1px solid #1a2214' }}>
              <div style={{ fontSize: '11px', color: '#5a7a4a' }}>
                💡 Vá ao <strong style={{ color: '#ffd700' }}>Perfil</strong> para tratamentos de saúde e vitalidade.
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
