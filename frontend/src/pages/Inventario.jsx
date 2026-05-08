import React, { useState, useEffect } from 'react'
import { useGame } from '../context/GameContext'
import API from '../api'
import { fmt, gerarDescricaoItem, itemStats } from '../utils'
import PageGuide from '../components/PageGuide'

// ============================================================
// COOLDOWN
// ============================================================
function BotaoCooldown({ ts, onUsar, label = 'Usar' }) {
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
    return <button className="inv-btn inv-btn-cd" disabled>⏳ {m}:{s}</button>
  }
  return <button className="inv-btn inv-btn-verde" onClick={onUsar}>{label}</button>
}

// ============================================================
// CORES DE RARIDADE (tema escuro)
// ============================================================
const RAR_COR = {
  comum:    { texto: '#cbd5e1', borda: 'rgba(148,163,184,0.45)', glow: 'rgba(148,163,184,0.18)', bg: 'rgba(148,163,184,0.08)' },
  raro:     { texto: '#60a5fa', borda: 'rgba(96,165,250,0.55)',  glow: 'rgba(96,165,250,0.3)',   bg: 'rgba(96,165,250,0.1)' },
  epico:    { texto: '#c084fc', borda: 'rgba(192,132,252,0.55)', glow: 'rgba(192,132,252,0.3)',  bg: 'rgba(192,132,252,0.1)' },
  lendario: { texto: '#fbbf24', borda: 'rgba(251,191,36,0.6)',   glow: 'rgba(251,191,36,0.4)',   bg: 'rgba(251,191,36,0.12)' },
}

function corRar(rar) { return RAR_COR[rar] || RAR_COR.comum }

// ============================================================
// SLOTS — posição relativa ao personagem (% do container)
// ============================================================
const SLOTS = [
  { id: 'cabeca',   nome: 'Cabeça',   icone: '⛑️', x: 50,  y: 8 },
  { id: 'camisa',   nome: 'Camisa',   icone: '👕', x: 14,  y: 28 },
  { id: 'bracos',   nome: 'Braços',   icone: '💪', x: 86,  y: 28 },
  { id: 'luva',     nome: 'Luva',     icone: '🧤', x: 14,  y: 50 },
  { id: 'shorts',   nome: 'Shorts',   icone: '🩳', x: 86,  y: 50 },
  { id: 'meiao',    nome: 'Meião',    icone: '🧦', x: 14,  y: 72 },
  { id: 'chuteira', nome: 'Chuteira', icone: '👟', x: 86,  y: 72 },
  { id: 'bola',     nome: 'Bola',     icone: '⚽', x: 50,  y: 92 },
]

// ============================================================
// SLOT VISUAL — equipado ou vazio, posicionado sobre o personagem
// ============================================================
function SlotPos({ slot, equipped, onClick, contagemDisponivel, slotSelecionado }) {
  const item = equipped?.item
  const rar = item ? corRar(item.raridade || 'comum') : null
  const ativo = slotSelecionado === slot.id
  const temItensDisponiveis = contagemDisponivel > 0

  return (
    <button
      type="button"
      className={`eq-slot-pos${item ? ' filled' : ' empty'}${ativo ? ' ativo' : ''}${temItensDisponiveis && !item ? ' tem-disponivel' : ''}`}
      style={{
        left: slot.x + '%',
        top: slot.y + '%',
        '--rar-borda': rar?.borda || 'rgba(255,255,255,0.18)',
        '--rar-glow': rar?.glow || 'transparent',
        '--rar-bg': rar?.bg || 'rgba(13,27,47,0.85)',
      }}
      onClick={() => onClick(slot.id)}
      title={slot.nome}
    >
      <span className="eq-slot-pos-icone">{item?.icone || slot.icone}</span>
      {item && <span className="eq-slot-pos-marker">✓</span>}
      {!item && temItensDisponiveis && <span className="eq-slot-pos-badge">{contagemDisponivel}</span>}
    </button>
  )
}

// ============================================================
// PAGINA
// ============================================================
export default function Inventario() {
  const { jogador, setJogador, jogadorID, mostrarNotificacao, recarregarJogador } = useGame()
  const [inventario, setInventario] = useState([])
  const [aba, setAba] = useState('equipamento')
  const [slotSelecionado, setSlotSelecionado] = useState(null)

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
    if (res.sucesso) {
      setJogador(res.jogador); carregar(); setSlotSelecionado(null)
      mostrarNotificacao(res.mensagem, 'sucesso')
    } else mostrarNotificacao(res.mensagem, 'erro')
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

  // === Mapas ===
  const equippedBySlot = {}
  inventario.filter(i => i.equipado && i.item?.slot).forEach(i => {
    if (!equippedBySlot[i.item.slot]) equippedBySlot[i.item.slot] = i
  })
  const contratos = inventario.filter(i => i.equipado && i.item?.slot === 'contrato')
  const consumiveis = inventario.filter(i => !i.equipado && i.item?.tipo === 'consumivel')
  const equipaveis = inventario.filter(i => !i.equipado && i.item?.tipo === 'equipamento' && i.item?.slot !== 'contrato')
  const slotsUsados = inventario.filter(i => !i.equipado).length

  // === Stats agregados dos itens equipados ===
  const totalBonus = { forca: 0, velocidade: 0, habilidade: 0 }
  inventario.filter(i => i.equipado && i.item).forEach(i => {
    const s = itemStats(i.item) || {}
    totalBonus.forca += s.forca || 0
    totalBonus.velocidade += s.velocidade || 0
    totalBonus.habilidade += s.habilidade || 0
  })

  // === Itens disponíveis pro slot selecionado ===
  const disponiveisDoSlot = slotSelecionado
    ? equipaveis.filter(i => i.item?.slot === slotSelecionado)
    : []

  function clicarSlot(slotId) {
    const eq = equippedBySlot[slotId]
    if (eq) {
      desequipar(eq.item_id)
    } else {
      // alterna seleção pra mostrar lista de disponíveis
      setSlotSelecionado(s => s === slotId ? null : slotId)
    }
  }

  function contagemDisponivel(slotId) {
    return equipaveis.filter(i => i.item?.slot === slotId).length
  }

  return (
    <>
      <h2 className="page-title">🎒 INVENTÁRIO</h2>
      <PageGuide
        pageKey="inventario"
        icone="🎒"
        titulo="Seu Inventário"
        texto="Equipe armaduras nos slots ao redor do personagem, use consumíveis pra recuperar energia, e venda o que não precisa."
      />

      {/* Header com slots usados + privacidade */}
      <div className="inv2-header">
        <div className="inv2-slots-info">
          <span className="inv2-slots-num">{slotsUsados}</span>
          <span className="inv2-slots-label">de {jogador.capacidade_mochila} slots usados</span>
        </div>
        <label className="inv2-toggle">
          <input type="checkbox" checked={jogador.inventario_publico || false}
            onChange={async e => {
              await API.post('/api/perfil/config', { jogador_id: jogadorID, inventario_publico: e.target.checked })
              recarregarJogador()
            }} />
          <span>{jogador.inventario_publico ? '🔓 Público' : '🔒 Privado'}</span>
        </label>
      </div>

      {/* Tabs */}
      <div className="inv2-tabs">
        <button className={`inv2-tab${aba === 'equipamento' ? ' active' : ''}`} onClick={() => setAba('equipamento')}>
          ⚔️ Equipamento
          {equipaveis.length > 0 && <span className="inv2-tab-badge">{equipaveis.length}</span>}
        </button>
        <button className={`inv2-tab${aba === 'consumiveis' ? ' active' : ''}`} onClick={() => setAba('consumiveis')}>
          🍎 Consumíveis
          {consumiveis.length > 0 && <span className="inv2-tab-badge">{consumiveis.length}</span>}
        </button>
        {contratos.length > 0 && (
          <button className={`inv2-tab${aba === 'contratos' ? ' active' : ''}`} onClick={() => setAba('contratos')}>
            📋 Contratos
            <span className="inv2-tab-badge">{contratos.length}</span>
          </button>
        )}
      </div>

      {/* === ABA EQUIPAMENTO === */}
      {aba === 'equipamento' && (
        <>
          <div className="inv2-equip-area" data-tutorial="inv-equipamento">
            <div className="inv2-personagem-wrap">
              <img src="/personagem-inventario.png" alt="" className="inv2-personagem-img" />
              <div className="inv2-personagem-glow" />

              {SLOTS.map(s => (
                <SlotPos
                  key={s.id}
                  slot={s}
                  equipped={equippedBySlot[s.id]}
                  contagemDisponivel={contagemDisponivel(s.id)}
                  slotSelecionado={slotSelecionado}
                  onClick={clicarSlot}
                />
              ))}
            </div>

            {/* Stats agregados */}
            <div className="inv2-stats-painel">
              <div className="inv2-stats-titulo">{jogador.nome}</div>
              <div className="inv2-stats-grid">
                <div className="inv2-stat">
                  <img src="/icons/forca.png" alt="" />
                  <div>
                    <div className="inv2-stat-label">Força</div>
                    <div className="inv2-stat-val">{jogador.forca}{totalBonus.forca > 0 && <span className="inv2-stat-bonus"> +{totalBonus.forca}</span>}</div>
                  </div>
                </div>
                <div className="inv2-stat">
                  <img src="/icons/velocidade.png" alt="" />
                  <div>
                    <div className="inv2-stat-label">Velocidade</div>
                    <div className="inv2-stat-val">{jogador.velocidade}{totalBonus.velocidade > 0 && <span className="inv2-stat-bonus"> +{totalBonus.velocidade}</span>}</div>
                  </div>
                </div>
                <div className="inv2-stat">
                  <img src="/icons/habilidade.png" alt="" />
                  <div>
                    <div className="inv2-stat-label">Habilidade</div>
                    <div className="inv2-stat-val">{jogador.habilidade}{totalBonus.habilidade > 0 && <span className="inv2-stat-bonus"> +{totalBonus.habilidade}</span>}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Painel de equipar (só aparece quando slot vazio é clicado) */}
          {slotSelecionado && disponiveisDoSlot.length > 0 && (
            <div className="inv2-equip-painel">
              <div className="inv2-equip-painel-titulo">
                <span>Itens pra {SLOTS.find(s => s.id === slotSelecionado)?.nome}</span>
                <button className="inv2-fechar" onClick={() => setSlotSelecionado(null)}>✕</button>
              </div>
              <div className="inv2-equip-grid">
                {disponiveisDoSlot.map(inv => {
                  const rar = corRar(inv.item?.raridade || 'comum')
                  return (
                    <button
                      key={inv.item_id}
                      className="inv2-equip-card"
                      style={{ '--rar-borda': rar.borda, '--rar-bg': rar.bg, '--rar-cor': rar.texto }}
                      onClick={() => equipar(inv.item_id)}
                    >
                      <span className="inv2-equip-card-icone">{inv.item?.icone}</span>
                      <div className="inv2-equip-card-nome">{inv.item?.nome}</div>
                      <div className="inv2-equip-card-desc">{gerarDescricaoItem(inv.item)}</div>
                      <div className="inv2-equip-card-rar">{(inv.item?.raridade || 'comum').toUpperCase()}</div>
                      <div className="inv2-equip-card-cta">⚡ EQUIPAR</div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {slotSelecionado && disponiveisDoSlot.length === 0 && (
            <div className="inv2-empty-msg">
              Você não tem itens pra <strong>{SLOTS.find(s => s.id === slotSelecionado)?.nome}</strong>. Compre na <a href="/loja" style={{ color: '#43a7ff' }}>Loja</a>.
              <button className="inv2-fechar inv2-fechar-msg" onClick={() => setSlotSelecionado(null)}>✕</button>
            </div>
          )}

          {/* Mochila — equipamentos NÃO equipados */}
          {equipaveis.length > 0 && (
            <div className="inv2-section">
              <h3 className="inv2-section-titulo">📦 Mochila — equipáveis ({equipaveis.length})</h3>
              <div className="inv2-grid">
                {equipaveis.map(inv => {
                  const rar = corRar(inv.item?.raridade || 'comum')
                  return (
                    <div
                      key={inv.item_id}
                      className="inv2-card"
                      style={{ '--rar-borda': rar.borda, '--rar-bg': rar.bg, '--rar-cor': rar.texto, '--rar-glow': rar.glow }}
                    >
                      <div className="inv2-card-icone">{inv.item?.icone}</div>
                      <div className="inv2-card-nome">{inv.item?.nome}</div>
                      <div className="inv2-card-slot">{SLOTS.find(s => s.id === inv.item?.slot)?.nome}</div>
                      <div className="inv2-card-desc">{gerarDescricaoItem(inv.item)}</div>
                      <div className="inv2-card-rar">{(inv.item?.raridade || 'comum').toUpperCase()}</div>
                      <div className="inv2-card-actions">
                        <button className="inv2-btn inv2-btn-verde" onClick={() => equipar(inv.item_id)}>Equipar</button>
                        {inv.item?.preco > 0 && (
                          <button className="inv2-btn inv2-btn-vender" onClick={() => venderItem(inv.item_id)}>
                            R${fmt(Math.max(1, Math.floor((inv.item?.preco || 0) * 0.7)))}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}

      {/* === ABA CONSUMIVEIS === */}
      {aba === 'consumiveis' && (
        <div className="inv2-section" data-tutorial="inv-consumiveis">
          {consumiveis.length === 0 && (
            <p className="inv2-empty">Sem consumíveis. Compre na <a href="/loja" style={{ color: '#43a7ff' }}>Loja</a>!</p>
          )}
          <div className="inv2-grid">
            {consumiveis.map(inv => {
              const rar = corRar(inv.item?.raridade || 'comum')
              const cdTs = inv.item?.recupera_energia > 0 ? inv.proximo_em : jogador.proximo_consumivel_em
              return (
                <div
                  key={inv.item_id}
                  className="inv2-card"
                  style={{ '--rar-borda': rar.borda, '--rar-bg': rar.bg, '--rar-cor': rar.texto, '--rar-glow': rar.glow }}
                >
                  <div className="inv2-card-icone">{inv.item?.icone}</div>
                  {inv.quantidade > 1 && <div className="inv2-card-qtd">x{inv.quantidade}</div>}
                  <div className="inv2-card-nome">{inv.item?.nome}</div>
                  <div className="inv2-card-desc">{gerarDescricaoItem(inv.item)}</div>
                  <div className="inv2-card-rar">{(inv.item?.raridade || 'comum').toUpperCase()}</div>
                  <div className="inv2-card-actions">
                    <BotaoCooldown ts={cdTs} onUsar={() => usarItem(inv.item_id)} />
                    {inv.item?.preco > 0 && (
                      <button className="inv2-btn inv2-btn-vender" onClick={() => venderItem(inv.item_id)}>
                        R${fmt(Math.max(1, Math.floor((inv.item?.preco || 0) * 0.7)))}
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* === ABA CONTRATOS === */}
      {aba === 'contratos' && contratos.length > 0 && (
        <div className="inv2-section">
          <div className="inv2-grid">
            {contratos.map(inv => {
              const rar = corRar(inv.item?.raridade || 'comum')
              return (
                <div
                  key={inv.item_id}
                  className="inv2-card"
                  style={{ '--rar-borda': rar.borda, '--rar-bg': rar.bg, '--rar-cor': rar.texto, '--rar-glow': rar.glow }}
                >
                  <div className="inv2-card-eq-badge">EQUIPADO</div>
                  <div className="inv2-card-icone">{inv.item?.icone}</div>
                  <div className="inv2-card-nome">{inv.item?.nome}</div>
                  <div className="inv2-card-desc">{gerarDescricaoItem(inv.item)}</div>
                  <div className="inv2-card-rar">{(inv.item?.raridade || 'comum').toUpperCase()}</div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {inventario.length === 0 && (
        <div className="inv2-section">
          <p className="inv2-empty">Mochila vazia. Compre itens na Loja ou complete missões!</p>
        </div>
      )}
    </>
  )
}
