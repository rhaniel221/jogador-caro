import React, { useState, useEffect } from 'react'
import { useGame } from '../context/GameContext'
import API from '../api'
import { fmt, gerarDescricaoItem } from '../utils'

function BotaoCooldown({ ts, onUsar }) {
  const calc = () => { const d = (ts || 0) - Math.floor(Date.now() / 1000); return d > 0 ? d : 0 }
  const [restante, setRestante] = useState(calc())
  useEffect(() => {
    setRestante(calc())
    if ((ts || 0) <= Math.floor(Date.now() / 1000)) return
    const id = setInterval(() => { const t = calc(); setRestante(t); if (t <= 0) clearInterval(id) }, 1000)
    return () => clearInterval(id)
  }, [ts])
  if (restante > 0) {
    const m = Math.floor(restante / 60), s = String(restante % 60).padStart(2, '0')
    return <button className="btn-work btn-small" disabled>⏳ {m}:{s}</button>
  }
  return <button className="btn-work btn-small btn-verde" onClick={onUsar}>Usar</button>
}

const RAR_COR = { comum: '#666', raro: '#2980b9', epico: '#8e44ad', lendario: '#f39c12' }
const RAR_BG = { comum: '#f5f5f5', raro: '#e8f4fd', epico: '#f3e8fd', lendario: '#fdf8e8' }
const RAR_BORDER = { comum: '#ccc', raro: '#85c1e9', epico: '#bb8fce', lendario: '#f0c040' }

export default function Inventario() {
  const { jogador, setJogador, jogadorID, mostrarNotificacao, recarregarJogador } = useGame()
  const [inventario, setInventario] = useState([])

  const carregar = () => {
    if (!jogadorID) return
    API.get('/api/inventario/' + jogadorID).then(setInventario).catch(() => {})
  }
  useEffect(() => { carregar() }, [jogadorID])

  async function usarItem(itemID) {
    const res = await API.post('/api/usar-item', { jogador_id: jogadorID, item_id: itemID })
    if (res.sucesso) { setJogador(res.jogador); carregar(); mostrarNotificacao(res.mensagem, 'sucesso') }
    else mostrarNotificacao(res.mensagem, 'erro')
  }

  async function equipar(itemID, eq) {
    const res = await API.post('/api/equipar', { jogador_id: jogadorID, item_id: itemID, equipar: eq })
    if (res.sucesso) { setJogador(res.jogador); carregar(); mostrarNotificacao(res.mensagem, 'sucesso') }
    else mostrarNotificacao(res.mensagem, 'erro')
  }

  async function venderItem(itemID) {
    const res = await API.post('/api/vender-item', { jogador_id: jogadorID, item_id: itemID })
    if (res.sucesso) { setJogador(res.jogador); carregar(); mostrarNotificacao(res.mensagem, 'sucesso') }
    else mostrarNotificacao(res.mensagem, 'erro')
  }

  if (!jogador) return null

  const equipados = inventario.filter(i => i.equipado)
  const consumiveis = inventario.filter(i => !i.equipado && i.item?.tipo === 'consumivel')
  const outrosItens = inventario.filter(i => !i.equipado && i.item?.tipo !== 'consumivel')
  const slotsUsados = inventario.filter(i => !i.equipado).length

  const renderCard = (inv, tipo) => {
    const rar = inv.item?.raridade || 'comum'
    return (
      <div key={inv.item_id} className="pf-inv-card" style={{ borderColor: RAR_BORDER[rar], background: RAR_BG[rar] }}>
        <div className="pf-inv-top">
          <span className="pf-inv-icon">{inv.item?.icone}</span>
          {inv.equipado && <span className="pf-inv-badge-eq">E</span>}
          {inv.quantidade > 1 && <span className="pf-inv-qtd">x{inv.quantidade}</span>}
        </div>
        <div className="pf-inv-name" style={{ color: RAR_COR[rar] }}>{inv.item?.nome}</div>
        <div className="pf-inv-desc">{gerarDescricaoItem(inv.item)}</div>
        <div className="pf-inv-rar" style={{ color: RAR_COR[rar] }}>{rar.toUpperCase()}</div>
        <div className="pf-inv-actions">
          {tipo === 'consumivel' ? (
            <BotaoCooldown ts={inv.item?.recupera_energia > 0 ? inv.proximo_em : jogador.proximo_consumivel_em} onUsar={() => usarItem(inv.item_id)} />
          ) : inv.equipado ? (
            <button className="btn-work btn-small" onClick={() => equipar(inv.item_id, false)}>Desequipar</button>
          ) : (
            <button className="btn-work btn-small btn-verde" onClick={() => equipar(inv.item_id, true)}>Equipar</button>
          )}
          {!inv.equipado && (
            <button className="btn-work btn-small inv-btn-vender" onClick={() => venderItem(inv.item_id)}>
              Vender R${Math.max(1, Math.floor((inv.item?.preco || 0) * 0.7))}
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      <h2 className="page-title">🎒 INVENTÁRIO</h2>
      <div className="inv-page-header">
        <span className="inv-page-slots">{slotsUsados}/{jogador.capacidade_mochila} slots</span>
        <label className="inv-toggle">
          <input type="checkbox" checked={jogador.inventario_publico || false}
            onChange={async e => {
              await API.post('/api/perfil/config', { jogador_id: jogadorID, inventario_publico: e.target.checked })
              recarregarJogador()
            }} />
          <span className="inv-toggle-label">{jogador.inventario_publico ? '🔓 Público' : '🔒 Privado'}</span>
        </label>
      </div>

      {inventario.length === 0 ? (
        <div className="pf-section">
          <p className="pf-empty">Bolsa vazia. Compre itens na Loja ou complete Missões!</p>
        </div>
      ) : (
        <>
          {equipados.length > 0 && (
            <div className="pf-section">
              <div className="pf-section-header"><h3>⚔️ EQUIPADOS ({equipados.length})</h3></div>
              <div className="pf-inv-grid">{equipados.map(inv => renderCard(inv, 'equipamento'))}</div>
            </div>
          )}
          {consumiveis.length > 0 && (
            <div className="pf-section">
              <div className="pf-section-header"><h3>🍎 CONSUMÍVEIS ({consumiveis.length})</h3></div>
              <div className="pf-inv-grid">{consumiveis.map(inv => renderCard(inv, 'consumivel'))}</div>
            </div>
          )}
          {outrosItens.length > 0 && (
            <div className="pf-section">
              <div className="pf-section-header"><h3>📦 ITENS ({outrosItens.length})</h3></div>
              <div className="pf-inv-grid">{outrosItens.map(inv => renderCard(inv, 'equipamento'))}</div>
            </div>
          )}
        </>
      )}
    </>
  )
}
