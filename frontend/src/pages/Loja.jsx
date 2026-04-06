import React, { useState, useEffect, useRef } from 'react'
import { useGame } from '../context/GameContext'
import { useSearchParams } from 'react-router-dom'
import API from '../api'
import { fmt, itemStats } from '../utils'

export default function Loja() {
  const { jogador, setJogador, jogadorID, mostrarNotificacao } = useGame()
  const [searchParams, setSearchParams] = useSearchParams()
  const [itensLoja, setItensLoja] = useState([])
  const [lojaPremium, setLojaPremium] = useState([])
  const [itensFama, setItensFama] = useState([])
  const [tab, setTab] = useState('energia')
  const highlightItemId = searchParams.get('item') ? parseInt(searchParams.get('item')) : null
  const highlightRef = useRef(null)

  const carregarFama = () => {
    if (!jogadorID) return
    API.get('/api/itens-fama?jogador_id=' + jogadorID).then(setItensFama).catch(() => {})
  }

  useEffect(() => {
    Promise.all([
      API.get('/api/itens'),
      API.get('/api/loja-premium'),
    ]).then(([c, p]) => { setItensLoja(c); setLojaPremium(p) }).catch(() => {})
  }, [])

  useEffect(() => { carregarFama() }, [jogadorID])

  // Auto-seleciona a tab certa quando vem com ?item=
  useEffect(() => {
    if (!highlightItemId || !itensLoja.length) return
    const item = itensLoja.find(i => i.id === highlightItemId)
    if (item) {
      if (item.tipo === 'equipamento') setTab('equip')
      else if (item.tipo === 'mochila') setTab('mochila')
      else if (item.tipo === 'consumivel') {
        if (item.recupera_energia > 0 && (item.preco_moedas || 0) > 0) setTab('combo')
        else if ((item.preco_moedas || 0) > 0) setTab('saude')
        else setTab('energia')
      }
    }
  }, [highlightItemId, itensLoja])

  // Scroll até o item destacado
  useEffect(() => {
    if (highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  })

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
    if (res.sucesso) { setJogador(res.jogador); mostrarNotificacao(res.mensagem, 'sucesso'); carregarFama() }
    else mostrarNotificacao(res.mensagem, 'erro')
  }

  const nivel = jogador?.nivel || 1

  const visivel = (item) => {
    if (item.preco <= 0 && (item.preco_moedas || 0) <= 0) return false
    if (item.nivel_max > 0 && nivel > item.nivel_max) return false
    return true
  }

  const consumiveis = itensLoja.filter(i => i.tipo === 'consumivel' && visivel(i))
  const isDinheiro = (i) => !i.preco_moedas || i.preco_moedas <= 0
  const isMoedas = (i) => i.preco_moedas > 0
  const energiaItems = consumiveis.filter(i => i.recupera_energia > 0 && !i.recupera_saude && isDinheiro(i))
  const saudeItemsMoedas = consumiveis.filter(i => i.recupera_saude > 0 && !i.recupera_energia && isMoedas(i))
  const comboItemsMoedas = consumiveis.filter(i => i.recupera_energia > 0 && i.recupera_saude > 0 && isMoedas(i))
  const equipamentos = itensLoja.filter(i => i.tipo === 'equipamento' && visivel(i))
  const mochilas = itensLoja.filter(i => i.tipo === 'mochila' && visivel(i))

  const rarCor = { comum: '#666', raro: '#2980b9', epico: '#8e44ad', lendario: '#f39c12' }

  function renderItem(item) {
    const bloqueado = item.nivel_min > nivel
    const rar = item.raridade || 'comum'
    const stats = itemStats(item)
    const isHighlight = highlightItemId === item.id
    return (
      <div key={item.id} ref={isHighlight ? highlightRef : null}
        className={`shop-item${bloqueado ? ' shop-item-bloqueado' : ''}${isHighlight ? ' shop-item-highlight' : ''}`}
        style={rar !== 'comum' ? { borderColor: isHighlight ? '#f1c40f' : rarCor[rar] } : isHighlight ? { borderColor: '#f1c40f' } : {}}>
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

        <div className="s-preco">{item.preco_moedas > 0 ? `🪙 ${item.preco_moedas} moedas` : `R$ ${fmt(item.preco)}`}</div>
        {bloqueado
          ? <button className="btn-work btn-small" disabled>🔒 Nível {item.nivel_min}</button>
          : <button className={`btn-work btn-small ${item.preco_moedas > 0 ? 'shop-btn-premium' : 'btn-verde'}`} onClick={() => comprar(item.id)}>Comprar</button>
        }
      </div>
    )
  }

  function renderGrid(itens) {
    if (!itens.length) return <p className="pf-empty">Nenhum item disponível pro seu nível.</p>
    return <div className="shop-grid">{itens.map(renderItem)}</div>
  }

  const TABS_DINHEIRO = [
    { id: 'energia', label: '⚡ Energia', count: energiaItems.length },
    { id: 'equip', label: '⚙️ Equipamentos', count: equipamentos.length },
    { id: 'mochila', label: '🎒 Mochilas', count: mochilas.length },
    { id: 'fama', label: '⭐ Fama', count: itensFama.length },
  ]

  const TABS_MOEDAS = [
    { id: 'saude', label: '❤️ Saúde', count: saudeItemsMoedas.length },
    { id: 'combo', label: '💪 Combo', count: comboItemsMoedas.length },
    { id: 'premium', label: '🪙 Premium', count: lojaPremium.length },
  ]

  const isDinheiroTab = ['energia', 'equip', 'mochila', 'fama'].includes(tab)
  const isMoedasTab = ['saude', 'combo', 'premium'].includes(tab)

  return (
    <>
      <h2 className="page-title" data-tutorial="shop-area">🛒 LOJA</h2>
      <p className="subtitle">Nível {nivel} — R$ {fmt(jogador?.dinheiro_mao || 0)} · 🪙 {jogador?.moedas || 0} moedas</p>

      {/* === SEÇÃO DINHEIRO === */}
      <div style={{
        background: 'var(--card-bg)', border: 'var(--borda)', borderRadius: 'var(--radius)',
        padding: '10px 14px 4px', marginBottom: 6, boxShadow: 'var(--sombra)'
      }}>
        <div style={{ fontFamily: 'var(--font-titulo)', fontSize: 15, color: 'var(--preto)', marginBottom: 8 }}>
          💰 COMPRAR COM DINHEIRO
        </div>
        <div className="tabs" style={{ marginBottom: 10 }}>
          {TABS_DINHEIRO.filter(t => t.count > 0 || t.id === 'fama').map(t => (
            <div key={t.id} className={`tab${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>
              {t.label}
            </div>
          ))}
        </div>
      </div>

      {isDinheiroTab && <>
        {tab === 'energia' && renderGrid(energiaItems)}
        {tab === 'equip' && renderGrid(equipamentos)}
        {tab === 'mochila' && renderGrid(mochilas)}

        {tab === 'fama' && (() => {
          const categorias = [
            { id: 'moto', nome: '🏍️ MOTOS', limite: 2 },
            { id: 'carro', nome: '🚗 CARROS', limite: 2 },
            { id: 'apartamento', nome: '🏢 APARTAMENTOS', limite: 1 },
          ]
          return categorias.map(cat => {
            const itens = itensFama.filter(i => i.categoria === cat.id)
            if (!itens.length) return null
            return (
              <div key={cat.id} style={{ marginBottom: 16 }}>
                <div style={{
                  fontFamily: 'var(--font-titulo)', fontSize: 15, color: 'var(--preto)',
                  marginBottom: 8, paddingBottom: 4, borderBottom: 'var(--borda)'
                }}>
                  {cat.nome} <span style={{ fontSize: 11, color: '#888', fontWeight: 700 }}>(máx {cat.limite} cada)</span>
                </div>
                <div className="shop-grid">
                  {itens.map(item => {
                    const esgotado = item.comprado >= item.limite_compra
                    return (
                      <div key={item.id} className={`shop-item${esgotado ? ' shop-item-bloqueado' : ''}`}>
                        <div className="s-icone">{item.icone}</div>
                        <div className="s-nome">{item.nome}</div>
                        <div className="s-desc">+{item.fama_ganha} Fama</div>
                        <div className="s-preco">R$ {fmt(item.preco)}</div>
                        {item.comprado > 0 && (
                          <div style={{ fontSize: 10, fontWeight: 900, color: esgotado ? '#e74c3c' : 'var(--verde)' }}>
                            {item.comprado}/{item.limite_compra} comprado{item.comprado > 1 ? 's' : ''}
                          </div>
                        )}
                        {esgotado
                          ? <button className="btn-work btn-small" disabled>Limite atingido</button>
                          : <button className="btn-work btn-small btn-verde" onClick={() => comprarFama(item.id)}>Comprar</button>
                        }
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })
        })()}
      </>}

      {/* === SEÇÃO MOEDAS === */}
      <div style={{
        background: 'linear-gradient(135deg, #fff8e1, #fff3cd)', border: '3px solid #d4a017', borderRadius: 'var(--radius)',
        padding: '10px 14px 4px', marginTop: 16, marginBottom: 6, boxShadow: 'var(--sombra)'
      }}>
        <div style={{ fontFamily: 'var(--font-titulo)', fontSize: 15, color: '#8b6914', marginBottom: 8 }}>
          🪙 COMPRAR COM MOEDAS
        </div>
        <div className="tabs" style={{ marginBottom: 10 }}>
          {TABS_MOEDAS.filter(t => t.count > 0 || t.id === 'premium').map(t => (
            <div key={t.id} className={`tab${tab === t.id ? ' active' : ''}`} onClick={() => setTab(t.id)}>
              {t.label}
            </div>
          ))}
        </div>
      </div>

      {isMoedasTab && <>
        {tab === 'saude' && renderGrid(saudeItemsMoedas)}
        {tab === 'combo' && renderGrid(comboItemsMoedas)}

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
      </>}
    </>
  )
}
