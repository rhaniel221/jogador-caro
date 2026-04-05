import React, { useState, useEffect } from 'react'
import { useGame } from '../context/GameContext'
import API from '../api'
import { fmt, itemStats } from '../utils'

export default function Loja() {
  const { jogador, setJogador, jogadorID, mostrarNotificacao } = useGame()
  const [itensLoja, setItensLoja] = useState([])
  const [lojaPremium, setLojaPremium] = useState([])
  const [itensFama, setItensFama] = useState([])
  const [tab, setTab] = useState('energia')

  useEffect(() => {
    Promise.all([
      API.get('/api/itens'),
      API.get('/api/loja-premium'),
      API.get('/api/itens-fama')
    ]).then(([c, p, f]) => { setItensLoja(c); setLojaPremium(p); setItensFama(f) }).catch(() => {})
  }, [])

  async function comprar(id) {
    const res = await API.post('/api/comprar', { jogador_id: jogadorID, item_id: id })
    if (res.sucesso) { setJogador(res.jogador); mostrarNotificacao(res.mensagem, 'sucesso') }
    else mostrarNotificacao(res.mensagem, 'erro')
  }
  async function comprarPremium(id) {
    const res = await API.post('/api/comprar-premium', { jogador_id: jogadorID, item_id: id })
    if (res.sucesso) { setJogador(res.jogador); mostrarNotificacao(res.mensagem, 'sucesso') }
    else mostrarNotificacao(res.mensagem, 'erro')
  }
  async function comprarFama(id) {
    const res = await API.post('/api/gastar-fama', { jogador_id: jogadorID, item_id: id })
    if (res.sucesso) { setJogador(res.jogador); mostrarNotificacao(res.mensagem, 'sucesso') }
    else mostrarNotificacao(res.mensagem, 'erro')
  }

  const nivel = jogador?.nivel || 1

  const visivel = (item) => {
    if (item.preco <= 0) return false
    if (item.nivel_max > 0 && nivel > item.nivel_max) return false
    return true
  }

  const consumiveis = itensLoja.filter(i => i.tipo === 'consumivel' && visivel(i))
  const energiaItems = consumiveis.filter(i => i.recupera_energia > 0 && !i.recupera_saude)
  const saudeItems = consumiveis.filter(i => i.recupera_saude > 0 && !i.recupera_energia)
  const comboItems = consumiveis.filter(i => i.recupera_energia > 0 && i.recupera_saude > 0)
  const equipamentos = itensLoja.filter(i => i.tipo === 'equipamento' && visivel(i))
  const mochilas = itensLoja.filter(i => i.tipo === 'mochila' && visivel(i))

  const rarCor = { comum: '#666', raro: '#2980b9', epico: '#8e44ad', lendario: '#f39c12' }

  function renderItem(item) {
    const bloqueado = item.nivel_min > nivel
    const rar = item.raridade || 'comum'
    const stats = itemStats(item)
    return (
      <div key={item.id} className={`shop-item${bloqueado ? ' shop-item-bloqueado' : ''}`}
        style={rar !== 'comum' ? { borderColor: rarCor[rar] } : {}}>
        <div className="s-icone">{item.icone}</div>
        <div className="s-nome">{item.nome}</div>
        {rar !== 'comum' && <div className="s-raridade" style={{ color: rarCor[rar] }}>{rar.toUpperCase()}</div>}

        {bloqueado ? (
          <div className="s-desc s-desc-lock">🔒 Nível {item.nivel_min}</div>
        ) : (
          <div className="s-stats-box">
            {stats.efeitos.map((e, i) => (
              <div key={i} className="s-stat-line">
                <span className="s-stat-icon">{e.icon}</span>
                <span className="s-stat-label">{e.label}</span>
                <span className="s-stat-val" style={{ color: e.cor }}>{e.val}</span>
              </div>
            ))}
            {stats.cooldown > 0 && (
              <div className="s-cooldown">⏱️ {stats.cooldown} min</div>
            )}
            {stats.nivel && <div className="s-nivel-range">{stats.nivel}</div>}
          </div>
        )}

        <div className="s-preco">R$ {fmt(item.preco)}</div>
        {bloqueado
          ? <button className="btn-work btn-small" disabled>🔒 Nível {item.nivel_min}</button>
          : <button className="btn-work btn-small btn-verde" onClick={() => comprar(item.id)}>Comprar</button>
        }
      </div>
    )
  }

  function renderGrid(itens) {
    if (!itens.length) return <p className="pf-empty">Nenhum item disponível pro seu nível.</p>
    return <div className="shop-grid">{itens.map(renderItem)}</div>
  }

  const TABS = [
    { id: 'energia', label: '⚡ Energia', count: energiaItems.length },
    { id: 'saude', label: '❤️ Saúde', count: saudeItems.length },
    { id: 'combo', label: '💪 Combo', count: comboItems.length },
    { id: 'equip', label: '⚙️ Equipamentos', count: equipamentos.length },
    { id: 'mochila', label: '🎒 Mochilas', count: mochilas.length },
    { id: 'fama', label: '⭐ Fama', count: itensFama.length },
    { id: 'premium', label: '🪙 Premium', count: lojaPremium.length },
  ]

  return (
    <>
      <h2 className="page-title" data-tutorial="shop-area">🛒 LOJA</h2>
      <p className="subtitle">Nível {nivel} — Itens da sua faixa</p>

      <div className="tabs" style={{ marginBottom: 16 }}>
        {TABS.filter(t => t.count > 0 || t.id === 'premium' || t.id === 'fama').map(t => (
          <div key={t.id} className={`tab${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>
            {t.label}
          </div>
        ))}
      </div>

      {tab === 'energia' && renderGrid(energiaItems)}
      {tab === 'saude' && renderGrid(saudeItems)}
      {tab === 'combo' && renderGrid(comboItems)}
      {tab === 'equip' && renderGrid(equipamentos)}
      {tab === 'mochila' && renderGrid(mochilas)}

      {tab === 'fama' && (
        <div className="shop-grid">
          {itensFama.map(item => (
            <div key={item.id} className="shop-item">
              <div className="s-icone">{item.icone}</div>
              <div className="s-nome">{item.nome}</div>
              <div className="s-desc">+{item.fama_ganha} Fama</div>
              <div className="s-preco">R$ {fmt(item.preco)}</div>
              <button className="btn-work btn-small btn-verde" onClick={() => comprarFama(item.id)}>Comprar</button>
            </div>
          ))}
        </div>
      )}

      {tab === 'premium' && (
        <div className="shop-grid">
          {lojaPremium.map(item => (
            <div key={item.id} className="shop-item shop-item-premium">
              <div className="s-icone">{item.icone}</div>
              <div className="s-nome">{item.nome}</div>
              <div className="s-preco">🪙 {item.preco} moedas</div>
              <button className="btn-work btn-small shop-btn-premium" onClick={() => comprarPremium(item.id)}>Comprar</button>
            </div>
          ))}
        </div>
      )}
    </>
  )
}
