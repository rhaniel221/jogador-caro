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

const SLOTS_ESQ = [
  { id: 'cabeca', nome: 'Cabeça', icone: '⛑️' },
  { id: 'camisa', nome: 'Camisa', icone: '👕' },
  { id: 'bracos', nome: 'Braços', icone: '💪' },
  { id: 'luva', nome: 'Luva', icone: '🧤' },
]
const SLOTS_DIR = [
  { id: 'shorts', nome: 'Shorts', icone: '🩳' },
  { id: 'meiao', nome: 'Meião', icone: '🧦' },
  { id: 'chuteira', nome: 'Chuteira', icone: '👟' },
  { id: 'bola', nome: 'Bola', icone: '⚽' },
]

function SlotBox({ slot, equipped, onEquipar, onDesequipar, inventario }) {
  const [aberto, setAberto] = useState(false)
  const inv = equipped
  const item = inv?.item
  const rar = item?.raridade || 'comum'

  // Itens disponíveis para esse slot (não equipados, tipo equipamento, mesmo slot)
  const disponiveis = inventario.filter(i =>
    !i.equipado && i.item?.tipo === 'equipamento' && i.item?.slot === slot.id
  )

  if (inv) {
    return (
      <div className="eq-slot eq-slot-filled" style={{ borderColor: RAR_BORDER[rar], background: RAR_BG[rar] }}
        onClick={() => setAberto(!aberto)}>
        <span className="eq-slot-item-icon">{item.icone}</span>
        <div className="eq-slot-info">
          <div className="eq-slot-item-name" style={{ color: RAR_COR[rar] }}>{item.nome}</div>
          <div className="eq-slot-item-stats">{gerarDescricaoItem(item)}</div>
        </div>
        {aberto && (
          <button className="btn-work btn-small eq-slot-btn" onClick={e => { e.stopPropagation(); onDesequipar(inv.item_id); setAberto(false) }}>
            Tirar
          </button>
        )}
      </div>
    )
  }

  return (
    <div className="eq-slot eq-slot-empty" onClick={() => disponiveis.length > 0 && setAberto(!aberto)}>
      <span className="eq-slot-icon-placeholder">{slot.icone}</span>
      <span className="eq-slot-label">{slot.nome}</span>
      {disponiveis.length > 0 && <span className="eq-slot-avail">{disponiveis.length}</span>}
      {aberto && disponiveis.length > 0 && (
        <div className="eq-slot-dropdown" onClick={e => e.stopPropagation()}>
          {disponiveis.map(di => {
            const r = di.item?.raridade || 'comum'
            return (
              <div key={di.item_id} className="eq-slot-option" style={{ borderColor: RAR_BORDER[r] }}
                onClick={() => { onEquipar(di.item_id); setAberto(false) }}>
                <span>{di.item.icone}</span>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: RAR_COR[r] }}>{di.item.nome}</div>
                  <div style={{ fontSize: 10, color: '#666' }}>{gerarDescricaoItem(di.item)}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

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

  async function equipar(itemID) {
    const res = await API.post('/api/equipar', { jogador_id: jogadorID, item_id: itemID, equipar: true })
    if (res.sucesso) { setJogador(res.jogador); carregar(); mostrarNotificacao(res.mensagem, 'sucesso') }
    else mostrarNotificacao(res.mensagem, 'erro')
  }

  async function desequipar(itemID) {
    const res = await API.post('/api/equipar', { jogador_id: jogadorID, item_id: itemID, equipar: false })
    if (res.sucesso) { setJogador(res.jogador); carregar(); mostrarNotificacao(res.mensagem, 'sucesso') }
    else mostrarNotificacao(res.mensagem, 'erro')
  }

  async function venderItem(itemID) {
    const res = await API.post('/api/vender-item', { jogador_id: jogadorID, item_id: itemID })
    if (res.sucesso) { setJogador(res.jogador); carregar(); mostrarNotificacao(res.mensagem, 'sucesso') }
    else mostrarNotificacao(res.mensagem, 'erro')
  }

  if (!jogador) return null

  // Mapa de slot → item equipado
  const equippedBySlot = {}
  inventario.filter(i => i.equipado && i.item?.slot).forEach(i => {
    if (!equippedBySlot[i.item.slot]) equippedBySlot[i.item.slot] = i
  })

  // Contratos equipados (slot "contrato") - seção separada
  const contratos = inventario.filter(i => i.equipado && i.item?.slot === 'contrato')

  // Consumíveis e itens não equipados
  const consumiveis = inventario.filter(i => !i.equipado && i.item?.tipo === 'consumivel')
  const equipaveis = inventario.filter(i => !i.equipado && i.item?.tipo === 'equipamento' && i.item?.slot !== 'contrato')
  const slotsUsados = inventario.filter(i => !i.equipado).length

  const renderCard = (inv, tipo) => {
    const rar = inv.item?.raridade || 'comum'
    return (
      <div key={inv.item_id} className="pf-inv-card" style={{ borderColor: RAR_BORDER[rar], background: RAR_BG[rar] }}>
        <div className="pf-inv-top">
          <span className="pf-inv-icon">{inv.item?.icone}</span>
          {inv.quantidade > 1 && <span className="pf-inv-qtd">x{inv.quantidade}</span>}
        </div>
        <div className="pf-inv-name" style={{ color: RAR_COR[rar] }}>{inv.item?.nome}</div>
        <div className="pf-inv-desc">{gerarDescricaoItem(inv.item)}</div>
        <div className="pf-inv-rar" style={{ color: RAR_COR[rar] }}>{rar.toUpperCase()}</div>
        <div className="pf-inv-actions">
          {tipo === 'consumivel' ? (
            <BotaoCooldown ts={inv.item?.recupera_energia > 0 ? inv.proximo_em : jogador.proximo_consumivel_em} onUsar={() => usarItem(inv.item_id)} />
          ) : (
            <button className="btn-work btn-small btn-verde" onClick={() => equipar(inv.item_id)}>Equipar</button>
          )}
          {!inv.equipado && inv.item?.preco > 0 && (
            <button className="btn-work btn-small inv-btn-vender" onClick={() => venderItem(inv.item_id)}>
              Vender R${fmt(Math.max(1, Math.floor((inv.item?.preco || 0) * 0.7)))}
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

      {/* Painel de equipamento estilo MU Online */}
      <div className="eq-panel">
        <div className="eq-col">
          {SLOTS_ESQ.map(s => (
            <SlotBox key={s.id} slot={s} equipped={equippedBySlot[s.id]}
              onEquipar={equipar} onDesequipar={desequipar} inventario={inventario} />
          ))}
        </div>
        <div className="eq-avatar">
          <img src="/personagem-inventario.png" alt="Personagem" className="eq-avatar-img" />
          <div className="eq-avatar-name">{jogador.nome}</div>
          <div className="eq-avatar-stats">
            <span style={{ color: '#e63946' }}>💪{jogador.forca}</span>
            <span style={{ color: '#1d72c2' }}>🏃{jogador.velocidade}</span>
            <span style={{ color: '#9c27b0' }}>⚽{jogador.habilidade}</span>
          </div>
        </div>
        <div className="eq-col">
          {SLOTS_DIR.map(s => (
            <SlotBox key={s.id} slot={s} equipped={equippedBySlot[s.id]}
              onEquipar={equipar} onDesequipar={desequipar} inventario={inventario} />
          ))}
        </div>
      </div>

      {/* Contratos equipados */}
      {contratos.length > 0 && (
        <div className="pf-section">
          <div className="pf-section-header"><h3>📋 CONTRATOS ({contratos.length})</h3></div>
          <div className="pf-inv-grid">
            {contratos.map(inv => {
              const rar = inv.item?.raridade || 'comum'
              return (
                <div key={inv.item_id} className="pf-inv-card" style={{ borderColor: RAR_BORDER[rar], background: RAR_BG[rar] }}>
                  <div className="pf-inv-top">
                    <span className="pf-inv-icon">{inv.item?.icone}</span>
                    <span className="pf-inv-badge-eq">E</span>
                  </div>
                  <div className="pf-inv-name" style={{ color: RAR_COR[rar] }}>{inv.item?.nome}</div>
                  <div className="pf-inv-desc">{gerarDescricaoItem(inv.item)}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Consumíveis */}
      {consumiveis.length > 0 && (
        <div className="pf-section">
          <div className="pf-section-header"><h3>🍎 CONSUMÍVEIS ({consumiveis.length})</h3></div>
          <div className="pf-inv-grid">{consumiveis.map(inv => renderCard(inv, 'consumivel'))}</div>
        </div>
      )}

      {/* Equipamentos na mochila */}
      {equipaveis.length > 0 && (
        <div className="pf-section">
          <div className="pf-section-header"><h3>📦 EQUIPAMENTOS ({equipaveis.length})</h3></div>
          <div className="pf-inv-grid">{equipaveis.map(inv => renderCard(inv, 'equipamento'))}</div>
        </div>
      )}

      {inventario.length === 0 && (
        <div className="pf-section">
          <p className="pf-empty">Bolsa vazia. Compre itens na Loja ou complete Missões!</p>
        </div>
      )}
    </>
  )
}
