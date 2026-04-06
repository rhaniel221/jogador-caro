import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom'
import { useGame } from '../context/GameContext'
import API from '../api'
import { fmt, gerarDescricaoItem } from '../utils'

const ELO_TIERS = [
  { min: 190, id: 'desafiante', nome: 'Desafiante' },
  { min: 160, id: 'grao-mestre', nome: 'Grão-Mestre' },
  { min: 135, id: 'mestre', nome: 'Mestre' },
  { min: 100, id: 'diamante', nome: 'Diamante' },
  { min: 72, id: 'esmeralda', nome: 'Esmeralda' },
  { min: 50, id: 'platina', nome: 'Platina' },
  { min: 30, id: 'ouro', nome: 'Ouro' },
  { min: 20, id: 'prata', nome: 'Prata' },
  { min: 10, id: 'bronze', nome: 'Bronze' },
  { min: 0, id: 'ferro', nome: 'Ferro' },
]
function getElo(nivel) {
  return ELO_TIERS.find(t => nivel >= t.min) || ELO_TIERS[ELO_TIERS.length - 1]
}

const CAT_NOME = { moto: 'Motos', carro: 'Carros', apartamento: 'Imóveis' }

function PerfilModal({ jogadorID, targetID, onClose, getAvatar }) {
  const [perfil, setPerfil] = useState(null)
  const [loading, setLoading] = useState(true)
  const cardRef = React.useRef(null)

  useEffect(() => {
    if (!targetID) return
    setLoading(true)
    API.get(`/api/perfil-publico/${targetID}?viewer=${jogadorID}`)
      .then(res => { setPerfil(res.perfil || res); setLoading(false) })
      .catch(() => setLoading(false))
  }, [targetID, jogadorID])

  // Scroll card pro topo quando carrega
  useEffect(() => {
    if (!loading && cardRef.current) cardRef.current.scrollTop = 0
  }, [loading])

  // Trava scroll do fundo quando modal abre
  useEffect(() => {
    const el = document.querySelector('.game-container')
    if (el) el.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    document.documentElement.style.overflow = 'hidden'
    return () => {
      if (el) el.style.overflow = ''
      document.body.style.overflow = ''
      document.documentElement.style.overflow = ''
    }
  }, [])

  if (loading) return ReactDOM.createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="pm-card" onClick={e => e.stopPropagation()}>
        <div style={{ textAlign: 'center', padding: 40, fontWeight: 900 }}>Carregando...</div>
      </div>
    </div>,
    document.body
  )

  if (!perfil) return null

  const winRate = perfil.vitorias + perfil.derrotas > 0
    ? Math.round((perfil.vitorias / (perfil.vitorias + perfil.derrotas)) * 100) : 0
  const poder = perfil.forca + perfil.velocidade + perfil.habilidade
  const elo = getElo(perfil.nivel)

  // Agrupar patrimônio por categoria
  const patGrupos = {}
  if (perfil.patrimonio) {
    perfil.patrimonio.forEach(p => {
      if (!patGrupos[p.categoria]) patGrupos[p.categoria] = []
      patGrupos[p.categoria].push(p)
    })
  }

  async function adicionarAmigo() {
    const res = await API.post('/api/amizade/solicitar', { jogador_id: jogadorID, amigo_id: targetID })
    if (res.sucesso) setPerfil(p => ({ ...p, solicitacao_pendente: true }))
  }

  return ReactDOM.createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="pm-card" ref={cardRef} onClick={e => e.stopPropagation()}>
        <button className="pm-close" onClick={onClose}>✕</button>

        {/* Banner topo com moldura de elo ÉPICA */}
        <div className={`pm-banner pm-elo-${elo.id}`}>
          <div className="pm-banner-bg" />
          <div className="pm-rays" />
          <div className="pm-particles">
            {Array.from({ length: 12 }, (_, i) => (
              <span key={i} className="pm-particle" style={{
                left: (8 + Math.random() * 84) + '%',
                animationDelay: (Math.random() * 3) + 's',
                animationDuration: (2 + Math.random() * 2) + 's',
                fontSize: (8 + Math.random() * 10) + 'px',
              }}>{['✦','✧','⬥','◆','★'][Math.floor(Math.random() * 5)]}</span>
            ))}
          </div>

          <div className="pm-elo-showcase">
            <div className="pm-elo-glow" />
            <div className="pm-elo-ring" />
            <img src={`/elos/${elo.id}.png`} alt={elo.nome} className="pm-elo-image"
              onError={e => { e.target.style.display = 'none' }} />
            <div className="pf-avatar" style={{ fontSize: 44, width: 64, height: 64, position: 'relative', zIndex: 2 }}>{getAvatar(perfil.avatar)}</div>
          </div>

          <div className="pm-nome-big">{perfil.nome}</div>
          <div className="pm-badges-row">
            <span className="pm-rank-badge">{perfil.rank || 'Peladeiro'}</span>
            <span className={`pm-elo-badge pm-elo-badge-${elo.id}`}>{elo.nome}</span>
          </div>
          {perfil.titulo && <div className="pm-titulo-tag">{perfil.titulo}</div>}
          {perfil.titulos && (
            <div className="pm-titulos-row">
              {perfil.titulos.split(',').filter(Boolean).map((t, i) => (
                <span key={i} className={`pf-hero-titulo-badge${t === perfil.titulo ? ' pf-hero-titulo-ativo' : ''}`}
                  style={{ fontSize: 9 }}>{t}</span>
              ))}
            </div>
          )}
        </div>

        {/* Stats principais */}
        <div className="pm-stats-row">
          <div className="pm-stat-card">
            <span className="pm-sc-icon">⭐</span>
            <span className="pm-sc-val">{perfil.nivel}</span>
            <span className="pm-sc-lbl">Nível</span>
          </div>
          <div className="pm-stat-card">
            <span className="pm-sc-icon">🏆</span>
            <span className="pm-sc-val">{perfil.pontos_fama}</span>
            <span className="pm-sc-lbl">Fama</span>
          </div>
          <div className="pm-stat-card">
            <span className="pm-sc-icon">⚔️</span>
            <span className="pm-sc-val">{perfil.vitorias}</span>
            <span className="pm-sc-lbl">Vitórias</span>
          </div>
          <div className="pm-stat-card">
            <span className="pm-sc-icon">📊</span>
            <span className="pm-sc-val">{winRate}%</span>
            <span className="pm-sc-lbl">Win Rate</span>
          </div>
        </div>

        {/* Atributos barra */}
        <div className="pm-attrs-section">
          <div className="pm-attr-row">
            <span className="pm-attr-icon">💪</span>
            <span className="pm-attr-name">Força</span>
            <div className="pm-attr-bar"><div className="pm-attr-fill pm-fill-forca" style={{ width: Math.min(100, perfil.forca * 2) + '%' }} /></div>
            <span className="pm-attr-val">{perfil.forca}</span>
          </div>
          <div className="pm-attr-row">
            <span className="pm-attr-icon">🏃</span>
            <span className="pm-attr-name">Velocidade</span>
            <div className="pm-attr-bar"><div className="pm-attr-fill pm-fill-vel" style={{ width: Math.min(100, perfil.velocidade * 2) + '%' }} /></div>
            <span className="pm-attr-val">{perfil.velocidade}</span>
          </div>
          <div className="pm-attr-row">
            <span className="pm-attr-icon">⚽</span>
            <span className="pm-attr-name">Habilidade</span>
            <div className="pm-attr-bar"><div className="pm-attr-fill pm-fill-hab" style={{ width: Math.min(100, perfil.habilidade * 2) + '%' }} /></div>
            <span className="pm-attr-val">{perfil.habilidade}</span>
          </div>
          <div className="pm-poder-total">Poder Total: <strong>{poder}</strong></div>
        </div>

        {/* Patrimônio */}
        {perfil.patrimonio && perfil.patrimonio.length > 0 && (
          <div className="pm-pat-section">
            <div className="pm-pat-title">🏆 Patrimônio <span style={{ fontSize: 11, color: '#888' }}>R$ {fmt(perfil.patrimonio_total)}</span></div>
            {['moto', 'carro', 'apartamento'].map(cat => {
              const itens = patGrupos[cat]
              if (!itens) return null
              return (
                <div key={cat} className="pm-pat-grupo">
                  <div className="pm-pat-cat">{CAT_NOME[cat]}</div>
                  {itens.map(p => (
                    <div key={p.id} className="pm-pat-item">
                      <span>{p.icone} {p.nome}{p.quantidade > 1 ? ` x${p.quantidade}` : ''}</span>
                      <span style={{ color: 'var(--verde)', fontWeight: 900 }}>R$ {fmt(p.preco)}</span>
                    </div>
                  ))}
                </div>
              )
            })}
          </div>
        )}

        {/* Código de amigo */}
        <div className="pm-code-box">
          <span>Código:</span>
          <strong>{perfil.codigo_amigo}</strong>
        </div>

        {/* Inventário público */}
        {perfil.inventario_publico && perfil.inventario?.length > 0 && (
          <div className="pm-inv-section">
            <div className="pm-inv-title">🎒 Inventário</div>
            <div className="pm-inv-list">
              {perfil.inventario.map(inv => inv.item && (
                <div key={inv.item_id} className="pm-inv-row">
                  <span className="pm-inv-icon">{inv.item.icone}</span>
                  <span className="pm-inv-name">{inv.item.nome}</span>
                  {inv.equipado && <span className="pm-inv-eq">E</span>}
                  {inv.quantidade > 1 && <span className="pm-inv-qtd">x{inv.quantidade}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ações */}
        <div className="pm-acoes">
          {!perfil.eh_amigo && !perfil.solicitacao_pendente && perfil.id !== jogadorID && (
            <button className="btn-work btn-verde pm-acao-btn" onClick={adicionarAmigo}>🤝 Adicionar Amigo</button>
          )}
          {perfil.solicitacao_pendente && <div className="pm-status-tag pm-status-pendente">⏳ Solicitação enviada</div>}
          {perfil.eh_amigo && <div className="pm-status-tag pm-status-amigo">✅ Amigos</div>}
        </div>
      </div>
    </div>,
    document.body
  )
}

export default function TopCraques() {
  const { jogador, jogadorID, mostrarNotificacao, getAvatar } = useGame()
  const [dados, setDados] = useState([])
  const [modo, setModo] = useState('nivel')
  const [perfilTarget, setPerfilTarget] = useState(null)
  const [amigos, setAmigos] = useState([])
  const [codigoInput, setCodigoInput] = useState('')
  const [tab, setTab] = useState('ranking')

  useEffect(() => {
    API.get('/api/leaderboard').then(setDados).catch(() => {})
    if (jogadorID) API.get('/api/amizades/' + jogadorID).then(res => setAmigos(res.amizades || [])).catch(() => {})
  }, [jogadorID])

  let lista = [...dados]
  if (modo === 'fama') lista.sort((a, b) => b.pontos_fama - a.pontos_fama)
  else if (modo === 'riqueza') lista.sort((a, b) => b.riqueza - a.riqueza)
  else if (modo === 'vitorias') lista.sort((a, b) => b.vitorias - a.vitorias)

  const top3 = dados.slice(0, 3)
  const podio = [top3[1], top3[0], top3[2]].filter(Boolean)
  const podioH = [110, 145, 90]
  const podioCor = ['linear-gradient(180deg,#e0e0e0,#9e9e9e)', 'linear-gradient(180deg,#ffd700,#b8860b)', 'linear-gradient(180deg,#cd7f32,#8b4513)']
  const podioLabel = ['🥈 2º', '🥇 1º', '🥉 3º']

  async function adicionarPorCodigo() {
    if (!codigoInput.trim()) return
    const res = await API.post('/api/amizade/solicitar', { jogador_id: jogadorID, codigo_amigo: codigoInput.trim() })
    mostrarNotificacao(res.mensagem || (res.sucesso ? 'Enviado!' : 'Erro'), res.sucesso ? 'sucesso' : 'erro')
    if (res.sucesso) { setCodigoInput(''); API.get('/api/amizades/' + jogadorID).then(res => setAmigos(res.amizades || [])).catch(() => {}) }
  }

  async function responderAmizade(id, aceitar) {
    const res = await API.post('/api/amizade/responder', { amizade_id: id, jogador_id: jogadorID, aceitar })
    mostrarNotificacao(res.mensagem || (aceitar ? 'Aceito!' : 'Recusado'), res.sucesso ? 'sucesso' : 'erro')
    API.get('/api/amizades/' + jogadorID).then(res => setAmigos(res.amizades || [])).catch(() => {})
  }

  const pendentes = amigos.filter(a => a.status === 'pendente' && a.amigo_id === jogadorID)
  const aceitos = amigos.filter(a => a.status === 'aceita')
  const enviados = amigos.filter(a => a.status === 'pendente' && a.jogador_id === jogadorID)

  return (
    <>
      {perfilTarget && <PerfilModal jogadorID={jogadorID} targetID={perfilTarget} onClose={() => setPerfilTarget(null)} getAvatar={getAvatar} />}

      <h2 className="page-title">🏆 TOP CRAQUES</h2>

      <div className="tabs" style={{ marginBottom: 12 }}>
        <div className={`tab${tab === 'ranking' ? ' active' : ''}`} onClick={() => setTab('ranking')}>🏅 Ranking</div>
        <div className={`tab${tab === 'amigos' ? ' active' : ''}`} onClick={() => setTab('amigos')}>
          🤝 Amigos {pendentes.length > 0 && <span className="tab-badge">{pendentes.length}</span>}
        </div>
      </div>

      {tab === 'ranking' && (
        <>
          {/* Podio */}
          <div className="podio-novo">
            {podio.map((j, i) => j && (
              <div key={j.id} className="podio-item" onClick={() => j.id !== jogadorID && setPerfilTarget(j.id)}>
                {i === 1 && <div className="podio-crown">👑</div>}
                <div className="podio-nome">{j.nome}</div>
                <div className="podio-nivel">Nv.{j.nivel} · ⭐{j.pontos_fama}</div>
                <div className="podio-pedestal" style={{ height: podioH[i], background: podioCor[i] }}>
                  <span className="podio-pos">{podioLabel[i]}</span>
                </div>
              </div>
            ))}
          </div>

          <div className="tabs" style={{ marginBottom: 10 }}>
            {[['nivel', '🏅 Nível'], ['fama', '⭐ Fama'], ['riqueza', '💰 Riqueza'], ['vitorias', '⚔️ Vitórias']].map(([m, l]) => (
              <div key={m} className={`tab${modo === m ? ' active' : ''}`} onClick={() => setModo(m)}>{l}</div>
            ))}
          </div>

          <div className="ranking-lista">
            {lista.map((j, i) => {
              const medalha = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}`
              const isMeu = j.id === jogadorID
              const jElo = getElo(j.nivel)
              return (
                <div key={j.id} className={`ranking-row${isMeu ? ' ranking-meu' : ''}`}
                  onClick={() => !isMeu && setPerfilTarget(j.id)}>
                  <span className="ranking-pos">{medalha}</span>
                  <img src={`/elos/${jElo.id}.png`} alt={jElo.nome} className="ranking-elo-img"
                    onError={e => { e.target.style.display = 'none' }} />
                  <div className="ranking-info">
                    <strong>{j.nome} {isMeu && <span style={{ color: 'var(--amarelo)', fontSize: 10 }}>(você)</span>}</strong>
                    <span className="ranking-sub">Nv.{j.nivel} · {jElo.nome} · ⭐{j.pontos_fama} · {j.vitorias}V/{j.derrotas}D</span>
                  </div>
                  <span className="ranking-valor">
                    {modo === 'fama' ? `⭐${j.pontos_fama}` :
                     modo === 'riqueza' ? `R$${fmt(j.riqueza)}` :
                     modo === 'vitorias' ? `${j.vitorias}V` : `Nv.${j.nivel}`}
                  </span>
                </div>
              )
            })}
          </div>
        </>
      )}

      {tab === 'amigos' && (
        <>
          <div className="amigo-add-box">
            <div className="amigo-add-label">Adicionar amigo por código:</div>
            {jogador && <div className="amigo-meu-code">Seu código: <strong>{jogador.codigo_amigo}</strong></div>}
            <div className="amigo-add-input">
              <input type="text" placeholder="Ex: A1B-234" value={codigoInput}
                onChange={e => setCodigoInput(e.target.value.toUpperCase())} maxLength={7} />
              <button className="btn-work btn-verde btn-small" onClick={adicionarPorCodigo}>Adicionar</button>
            </div>
          </div>

          {pendentes.length > 0 && (
            <div className="amigo-section">
              <h3 className="amigo-section-title">📩 Solicitações ({pendentes.length})</h3>
              {pendentes.map(a => (
                <div key={a.id} className="amigo-card amigo-pendente">
                  <div className="amigo-card-info"><strong>{a.nome}</strong><span>Nível {a.nivel}</span></div>
                  <div className="amigo-card-acoes">
                    <button className="btn-work btn-verde btn-small" onClick={() => responderAmizade(a.id, true)}>Aceitar</button>
                    <button className="btn-work btn-small" onClick={() => responderAmizade(a.id, false)}>Recusar</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {enviados.length > 0 && (
            <div className="amigo-section">
              <h3 className="amigo-section-title">📤 Enviados</h3>
              {enviados.map(a => (
                <div key={a.id} className="amigo-card">
                  <div className="amigo-card-info"><strong>{a.nome}</strong><span>Nível {a.nivel}</span></div>
                  <span style={{ color: '#888', fontSize: 11, fontWeight: 700 }}>⏳ Pendente</span>
                </div>
              ))}
            </div>
          )}

          <div className="amigo-section">
            <h3 className="amigo-section-title">🤝 Amigos ({aceitos.length})</h3>
            {aceitos.length === 0 && <p style={{ color: '#888', fontSize: 13, padding: 10 }}>Nenhum amigo ainda.</p>}
            {aceitos.map(a => (
              <div key={a.id} className="amigo-card" onClick={() => setPerfilTarget(a.jogador_id === jogadorID ? a.amigo_id : a.jogador_id)} style={{ cursor: 'pointer' }}>
                <div className="amigo-card-info"><strong>{a.nome}</strong><span>Nível {a.nivel} · {a.rank}</span></div>
                <span className="btn-work btn-small">Ver Perfil</span>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  )
}
