import React, { useEffect, useState, useCallback } from 'react'
import { useGame } from '../context/GameContext'
import { Link } from 'react-router-dom'
import API from '../api'
import { fmt, gerarDescricaoItem } from '../utils'

// Componente do botão com timer (motorzinho local para o tempo do Go)
function BotaoCooldown({ ts, onUsar }) {
  const calcularRestante = () => {
    if (!ts) return 0
    const dif = ts - Math.floor(Date.now() / 1000)
    return dif > 0 ? dif : 0
  }

  const [restante, setRestante] = useState(calcularRestante())

  useEffect(() => {
    setRestante(calcularRestante())
    if (ts <= Math.floor(Date.now() / 1000)) return

    const intervalo = setInterval(() => {
      const tempoAgora = calcularRestante()
      setRestante(tempoAgora)
      if (tempoAgora <= 0) clearInterval(intervalo)
    }, 1000)

    return () => clearInterval(intervalo)
  }, [ts])

  if (restante > 0) {
    const min = Math.floor(restante / 60)
    const seg = String(restante % 60).padStart(2, '0')
    return (
      <button className="btn-work btn-small perfil-btn perfil-btn-disabled" disabled>
        ⏳ {min}:{seg}
      </button>
    )
  }

  return (
    <button className="btn-work btn-small perfil-btn perfil-btn-success" onClick={onUsar}>
      Usar
    </button>
  )
}

export default function Perfil() {
  const { jogador, setJogador, jogadorID, mostrarNotificacao, setLevelUp, recarregarJogador, avatares, getAvatar } = useGame()
  const [inventario, setInventario] = useState([])
  const [itensFama, setItensFama] = useState([])
  const [tasks, setTasks] = useState([])

  const carregarDados = async () => {
    if (!jogadorID) return
    try {
      const [inv, fama, tsk] = await Promise.all([
        API.get('/api/inventario/' + jogadorID),
        API.get('/api/itens-fama'),
        API.get('/api/tasks/' + jogadorID)
      ])
      setInventario(inv)
      setItensFama(fama)
      setTasks(tsk)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    carregarDados()
  }, [jogadorID])

  async function selecionarAvatar(id) {
    const res = await API.post('/api/jogador/' + jogadorID, { avatar: id })
    setJogador(res)
    mostrarNotificacao('Avatar atualizado!', 'sucesso')
  }

  async function usarItem(itemID) {
    const res = await API.post('/api/usar-item', { jogador_id: jogadorID, item_id: itemID })
    if (res.sucesso) {
      setJogador(res.jogador)
      carregarDados()
      mostrarNotificacao(res.mensagem, 'sucesso')
    } else {
      mostrarNotificacao(res.mensagem, 'erro')
    }
  }

  async function equipar(itemID, eq) {
    const res = await API.post('/api/equipar', { jogador_id: jogadorID, item_id: itemID, equipar: eq })
    if (res.sucesso) {
      setJogador(res.jogador)
      carregarDados()
      mostrarNotificacao(res.mensagem, 'sucesso')
    } else {
      mostrarNotificacao(res.mensagem, 'erro')
    }
  }

  async function venderItem(itemID) {
    const res = await API.post('/api/vender-item', { jogador_id: jogadorID, item_id: itemID })
    if (res.sucesso) {
      setJogador(res.jogador)
      carregarDados()
      mostrarNotificacao(res.mensagem, 'sucesso')
    } else {
      mostrarNotificacao(res.mensagem, 'erro')
    }
  }

  async function coletarTask(taskID) {
    const res = await API.post('/api/completar-task', { jogador_id: jogadorID, task_id: taskID })
    if (res.sucesso) {
      setJogador(res.jogador)
      carregarDados()
      mostrarNotificacao(res.mensagem, 'sucesso')
      if (res.level_up) setLevelUp(res.novo_nivel)
    } else {
      mostrarNotificacao(res.mensagem, 'erro')
    }
  }

  if (!jogador) return null

  const xpPct = Math.min(100, Math.round((jogador.xp / jogador.xp_proximo) * 100))
  const desbloqueados = (jogador.avatares_premium || '')
    .split(',')
    .filter(Boolean)
    .map(Number)

  const RAR_COR = { comum: '#666', raro: '#2980b9', epico: '#8e44ad', lendario: '#f39c12' }
  const RAR_BG = { comum: '#f5f5f5', raro: '#e8f4fd', epico: '#f3e8fd', lendario: '#fdf8e8' }
  const RAR_BORDER = { comum: '#ccc', raro: '#85c1e9', epico: '#bb8fce', lendario: '#f0c040' }
  const equipados = inventario.filter(i => i.equipado)
  const consumiveis = inventario.filter(i => !i.equipado && i.item?.tipo === 'consumivel')
  const outrosItens = inventario.filter(i => !i.equipado && i.item?.tipo !== 'consumivel')
  const winRate = jogador.vitorias + jogador.derrotas > 0 ? Math.round((jogador.vitorias / (jogador.vitorias + jogador.derrotas)) * 100) : 0

  return (
    <div className="pf" data-tutorial="perfil-area">

      {/* === CARD DO JOGADOR === */}
      <div className="pf-hero">
        <div className="pf-hero-bg" />
        <div className="pf-hero-content">
          <div className="pf-avatar-area">
            <div className="pf-avatar">{getAvatar(jogador.avatar)}</div>
            <div className="pf-avatar-selector">
              {avatares.filter(a => a.tipo === 'comum').map(a => (
                <span key={a.id} className={`pf-av-opt${jogador.avatar === a.id ? ' sel' : ''}`}
                  onClick={() => selecionarAvatar(a.id)}>{a.icone}</span>
              ))}
              {desbloqueados.map(id => {
                const av = avatares.find(a => a.id === id)
                return av ? <span key={id} className={`pf-av-opt prem${jogador.avatar === id ? ' sel' : ''}`}
                  onClick={() => selecionarAvatar(id)}>{av.icone}</span> : null
              })}
            </div>
          </div>
          <div className="pf-hero-info">
            <div className="pf-nome">{jogador.nome}</div>
            {jogador.titulo && <div className="pf-titulo">{jogador.titulo}</div>}
            <div className="pf-rank-row">
              <span className="pf-rank">{jogador.rank || 'Peladeiro'}</span>
              {jogador.posicao && <span className="pf-pos-badge">{
                {GK:'🧤 Goleiro', DEF:'🛡️ Defensor', MED:'🎯 Meia', ATA:'⚽ Atacante'}[jogador.posicao] || jogador.posicao
              }</span>}
            </div>
            <div className="pf-level-row">
              <span className="pf-level-chip">LVL {jogador.nivel}</span>
              <span className="pf-xp-text">{jogador.xp}/{jogador.xp_proximo} XP</span>
            </div>
            <div className="pf-xp-bar"><div className="pf-xp-fill" style={{ width: xpPct + '%' }} /></div>
            <div className="pf-code">Código: <strong>{jogador.codigo_amigo}</strong></div>
          </div>
        </div>
      </div>

      {/* === STATS GRID === */}
      <div className="pf-stats">
        <div className="pf-stat"><span className="pf-stat-icon">💪</span><span className="pf-stat-val">{jogador.forca}</span><span className="pf-stat-lbl">Força</span></div>
        <div className="pf-stat"><span className="pf-stat-icon">🏃</span><span className="pf-stat-val">{jogador.velocidade}</span><span className="pf-stat-lbl">Velocidade</span></div>
        <div className="pf-stat"><span className="pf-stat-icon">⚽</span><span className="pf-stat-val">{jogador.habilidade}</span><span className="pf-stat-lbl">Habilidade</span></div>
        <div className="pf-stat"><span className="pf-stat-icon">💰</span><span className="pf-stat-val">R${fmt(jogador.dinheiro_mao)}</span><span className="pf-stat-lbl">Dinheiro</span></div>
        <div className="pf-stat"><span className="pf-stat-icon">⭐</span><span className="pf-stat-val">{jogador.pontos_fama}</span><span className="pf-stat-lbl">Fama</span></div>
        <div className="pf-stat"><span className="pf-stat-icon">⚔️</span><span className="pf-stat-val">{jogador.vitorias}V/{jogador.derrotas}D</span><span className="pf-stat-lbl">{winRate}% Win</span></div>
      </div>

      {/* === CASA === */}
      <CasaCard jogadorID={jogadorID} jogador={jogador} setJogador={setJogador} mostrarNotificacao={mostrarNotificacao} setLevelUp={setLevelUp} />

      {/* === TÍTULOS === */}
      {jogador.titulos && (
        <div className="pf-section">
          <div className="pf-section-header"><h3>🏅 TÍTULOS CONQUISTADOS</h3></div>
          <div className="pf-titulos">
            {jogador.titulos.split(',').filter(Boolean).map((t, i) => (
              <span key={i} className={`pf-titulo-badge${t === jogador.titulo ? ' pf-titulo-ativo' : ''}`}>{t}</span>
            ))}
          </div>
        </div>
      )}

      <CampinhoSection jogadorID={jogadorID} jogador={jogador} setJogador={setJogador} mostrarNotificacao={mostrarNotificacao} setLevelUp={setLevelUp} />
    </div>
  )
}

function CampinhoSection({ jogadorID, jogador, setJogador, mostrarNotificacao, setLevelUp }) {
  const [campinho, setCampinho] = useState(null)
  const [materiais, setMateriais] = useState({})
  const [requisitos, setRequisitos] = useState([])
  const [reqCompletos, setReqCompletos] = useState(false)
  const [loading, setLoading] = useState(false)

  const carregar = useCallback(() => {
    if (!jogadorID) return
    API.get('/api/campinho/' + jogadorID).then(res => {
      setCampinho(res.campinho)
      if (res.materiais) setMateriais(res.materiais)
      if (res.requisitos) setRequisitos(res.requisitos)
      setReqCompletos(res.requisitos_completos || false)
    }).catch(() => {})
  }, [jogadorID])

  useEffect(() => { carregar() }, [carregar])

  if (!campinho) return null

  const MATERIAL_ICONES = {
    Madeira: '🪵', Prego: '🔩', Gesso: '⬜', Cal: '🧱', Semente: '🌱', Adubo: '💩',
    Metal: '🔧', Solda: '🔥', Fio: '🔌', Lampada: '💡', Poste: '🏗️',
    Concreto: '🧱', Tinta: '🎨', Rede: '🥅',
  }

  const info = campinho.nivel_info
  const prox = campinho.proximo_nivel
  const podeColetar = !campinho.bonus_hoje && campinho.nivel >= 0
  const totalNiveis = 7 // 0-6
  const progressoPct = Math.round((campinho.nivel / (totalNiveis - 1)) * 100)

  async function coletarBonus() {
    setLoading(true)
    try {
      const res = await API.post('/api/campinho/bonus', { jogador_id: jogadorID })
      if (res.sucesso) {
        if (res.jogador) setJogador(res.jogador)
        mostrarNotificacao(res.mensagem, 'sucesso')
        if (res.level_up) setLevelUp(res.novo_nivel)
        carregar()
      } else {
        mostrarNotificacao(res.mensagem || 'Erro', 'erro')
      }
    } catch { mostrarNotificacao('Erro de conexão', 'erro') }
    setLoading(false)
  }

  async function upgrade() {
    setLoading(true)
    try {
      const res = await API.post('/api/campinho/upgrade', { jogador_id: jogadorID })
      if (res.sucesso) {
        mostrarNotificacao(res.mensagem, 'sucesso')
        carregar()
      } else {
        mostrarNotificacao(res.mensagem || 'Materiais insuficientes', 'erro')
      }
    } catch { mostrarNotificacao('Erro de conexão', 'erro') }
    setLoading(false)
  }

  const podeUpgrade = prox && prox.materiais && Object.entries(prox.materiais).every(
    ([mat, qtd]) => (materiais[mat] || 0) >= qtd
  )

  // Conta materiais completos / total pro progresso detalhado
  let matCompletos = 0
  let matTotal = 0
  if (prox?.materiais) {
    const entries = Object.entries(prox.materiais)
    matTotal = entries.length
    matCompletos = entries.filter(([mat, qtd]) => (materiais[mat] || 0) >= qtd).length
  }

  return (
    <div className="campinho-section">
      <h3 className="campinho-titulo">🏟️ MEU CAMPINHO</h3>

      {/* Card principal com arte */}
      <div className="campinho-card">
        <img
          src={info?.arte || '/estadios/campo-simples.png'}
          alt={info?.nome || 'Campo'}
          className="campinho-arte"
          onError={e => { e.target.src = '/estadios/campo-simples.png' }}
        />

        <div className="campinho-info">
          <div className="campinho-nivel-badge">Nível {campinho.nivel}</div>
          <div className="campinho-nome">{info?.nome || 'Campo de Terra'}</div>
          <div className="campinho-desc">{info?.descricao}</div>

          {/* Barra de progresso geral */}
          <div className="campinho-progress">
            <div className="campinho-progress-label">Evolução do campinho</div>
            <div className="campinho-progress-bar">
              <div className="campinho-progress-fill" style={{ width: progressoPct + '%' }} />
            </div>
            <div className="campinho-progress-text">{campinho.nivel}/{totalNiveis - 1}</div>
          </div>

          {/* Bônus diário */}
          <div className="campinho-bonus-label">
            🎁 Bônus diário: +{campinho.bonus_xp} XP ({info?.bonus_xp_pct || 10}% do XP necessário)
          </div>

          {podeColetar ? (
            <button className="btn-work btn-verde" onClick={coletarBonus} disabled={loading}>
              {loading ? '...' : `🎁 Coletar +${campinho.bonus_xp} XP`}
            </button>
          ) : (
            <div className="campinho-coletado">✅ Bônus de hoje já coletado!</div>
          )}
        </div>
      </div>

      {/* Desafios do nível atual */}
      {requisitos.length > 0 && (
        <div className="campinho-upgrade">
          <h4>🎯 Desafios do Campo Atual</h4>
          <p className="campinho-upgrade-desc">Complete todos os desafios para desbloquear a próxima evolução.</p>

          <div className="campinho-materiais">
            {requisitos.map(rq => {
              const pct = Math.min(100, Math.round((rq.progresso / rq.objetivo) * 100))
              const ok = rq.progresso >= rq.objetivo
              return (
                <div key={rq.tipo} className={`campinho-mat${ok ? ' mat-ok' : ' mat-falta'}`}>
                  <div className="cm-top">
                    <span>{rq.descricao}</span>
                    <span className="cm-qtd">{Math.min(rq.progresso, rq.objetivo)}/{rq.objetivo}</span>
                  </div>
                  <div className="cm-bar">
                    <div className="cm-bar-fill" style={{ width: pct + '%' }} />
                  </div>
                </div>
              )
            })}
          </div>

          {reqCompletos && <div style={{ color: 'var(--verde)', fontWeight: 900, fontSize: 13, marginTop: 8 }}>✅ Desafios completos!</div>}
        </div>
      )}

      {/* Materiais (só mostra depois dos requisitos completos) */}
      {prox && reqCompletos && (
        <div className="campinho-upgrade" style={{ marginTop: 12 }}>
          <div className="campinho-upgrade-header">
            <h4>🏗️ Próxima evolução: {prox.nome}</h4>
            <span className="campinho-mat-count">{matCompletos}/{matTotal} materiais</span>
          </div>
          <p className="campinho-upgrade-desc">{prox.descricao}</p>

          <div className="campinho-materiais">
            {Object.entries(prox.materiais).map(([mat, qtd]) => {
              const tem = materiais[mat] || 0
              const ok = tem >= qtd
              const pct = Math.min(100, Math.round((tem / qtd) * 100))
              return (
                <div key={mat} className={`campinho-mat${ok ? ' mat-ok' : ' mat-falta'}`}>
                  <div className="cm-top">
                    <span>{MATERIAL_ICONES[mat] || '📦'} {mat}</span>
                    <span className="cm-qtd">{tem}/{qtd}</span>
                  </div>
                  <div className="cm-bar">
                    <div className="cm-bar-fill" style={{ width: pct + '%' }} />
                  </div>
                </div>
              )
            })}
          </div>

          {podeUpgrade ? (
            <button className="btn-work btn-verde campinho-build-btn" onClick={upgrade} disabled={loading}>
              {loading ? '...' : '🏗️ Construir Agora!'}
            </button>
          ) : (
            <p className="campinho-hint">
              Complete <Link to="/missoes">Missões</Link> para ganhar os materiais!
            </p>
          )}
        </div>
      )}

      {/* Requisitos pendentes — mostra dica */}
      {prox && !reqCompletos && (
        <div style={{ marginTop: 10, fontSize: 12, fontWeight: 700, color: '#556' }}>
          🔒 Complete os desafios acima para desbloquear a construção do próximo campo.
        </div>
      )}

      {!prox && (
        <div className="campinho-completo">
          🏆 Campinho completo! Seu estádio é lendário!
        </div>
      )}
    </div>
  )
}

const CASA_IMGS = {
  basica: '/casas/init-casa-simples.png',
  media: '/casas/init-casa-media.png',
  top: '/casas/initcasa-top.png',
}
const CASA_NOMES = { basica: 'Casa Básica', media: 'Casa Média', top: 'Casa Top' }

function CasaCard({ jogadorID, jogador, setJogador, mostrarNotificacao, setLevelUp }) {
  const [casa, setCasa] = useState(null)
  const [casas, setCasas] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(false)

  const carregar = useCallback(() => {
    if (!jogadorID) return
    API.get('/api/casa/' + jogadorID).then(res => {
      setCasa(res.casa)
      if (res.casas_disponiveis) setCasas(res.casas_disponiveis)
    }).catch(() => {})
  }, [jogadorID])

  useEffect(() => { carregar() }, [carregar])

  // Auto-abrir modal quando chega na Série C sem casa
  const temCasaAtual = casa?.tipo && casa.tipo !== ''
  const obrigatorio = jogador?.nivel >= 18 && !temCasaAtual

  useEffect(() => {
    if (!casa || !jogador) return
    const temCasa = casa.tipo && casa.tipo !== ''
    if (jogador.nivel >= 18 && !temCasa) {
      setShowModal(true)
    }
  }, [casa, jogador?.nivel])

  // Só mostra a partir da Série C (nível 18+)
  if (!jogador || jogador.nivel < 18) return null
  if (!casa) return null

  async function comprar(tipo) {
    setLoading(true)
    const res = await API.post('/api/casa/comprar', { jogador_id: jogadorID, tipo })
    if (res.sucesso) { if (res.jogador) setJogador(res.jogador); mostrarNotificacao(res.mensagem, 'sucesso'); carregar(); setShowModal(false) }
    else mostrarNotificacao(res.mensagem, 'erro')
    setLoading(false)
  }

  async function coletar() {
    setLoading(true)
    const res = await API.post('/api/casa/coletar', { jogador_id: jogadorID })
    if (res.sucesso) {
      if (res.jogador) setJogador(res.jogador)
      mostrarNotificacao(res.mensagem, 'sucesso')
      if (res.level_up) setLevelUp(res.novo_nivel)
      carregar()
    } else mostrarNotificacao(res.mensagem, 'erro')
    setLoading(false)
  }

  const temCasa = casa.tipo && casa.tipo !== ''
  const temRecompensa = casa.xp_disponivel > 0 || casa.energia_disponivel > 0

  const CASA_DETALHES = {
    basica: { bonus: '+1 Força 💪', desc: 'Uma casa simples mas sua. Gera XP e energia passivamente.' },
    media: { bonus: '+2 Velocidade 🏃 · +1 Força 💪', desc: 'Confortável e funcional. Recuperação mais rápida.' },
    top: { bonus: '+2 Habilidade ⚽ · +2 Velocidade 🏃 · +1 Força 💪', desc: 'Mansão do craque. Máxima performance passiva.' },
  }

  return (
    <>
      {/* Modal de aluguel */}
      {showModal && (
        <div className="modal-overlay">
          <div className="casa-modal" onClick={e => e.stopPropagation()}>
            {!obrigatorio && <button className="pm-close" onClick={() => setShowModal(false)}>✕</button>}
            <div className="casa-modal-header">
              <span className="casa-modal-icon">🏠</span>
              <h2 className="casa-modal-title">{obrigatorio ? 'Hora de alugar sua casa!' : 'Parabéns, Série C!'}</h2>
              <p className="casa-modal-sub">
                {obrigatorio
                  ? 'Para continuar trabalhando na Série C, você precisa alugar uma casa! Escolha a sua abaixo.'
                  : 'Agora você pode alugar uma casa! Ela gera XP e energia passivamente, mesmo quando você não está jogando.'}
              </p>
            </div>
            <div className="casa-modal-grid">
              {casas.map(c => {
                const det = CASA_DETALHES[c.tipo] || {}
                return (
                  <div key={c.tipo} className="casa-modal-card">
                    <img src={CASA_IMGS[c.tipo]} alt={c.nome} className="casa-modal-img" onError={e => { e.target.style.display = 'none' }} />
                    <strong className="casa-modal-nome">{c.nome}</strong>
                    <div className="casa-modal-desc">{det.desc}</div>
                    <div className="casa-modal-stats">
                      <span>📊 {c.xp_hora} XP por hora</span>
                      <span>⚡ +{c.energia_quant} energia a cada {c.energia_intervalo_min}min</span>
                      <span className="casa-modal-bonus">{det.bonus}</span>
                    </div>
                    <div className="casa-modal-preco">R$ {c.preco}</div>
                    <button className="btn-work btn-verde" onClick={() => comprar(c.tipo)} disabled={loading} style={{ width: '100%' }}>
                      Alugar
                    </button>
                  </div>
                )
              })}
            </div>
            {obrigatorio
              ? <p className="casa-modal-nota" style={{ color: '#e74c3c', fontWeight: 900 }}>⚠️ Obrigatório para trabalhar na Série C!</p>
              : <p className="casa-modal-nota">💡 Você pode fechar e alugar depois no Perfil.</p>
            }
          </div>
        </div>
      )}

      {/* Card no perfil */}
      <div className="pf-section">
        <div className="pf-section-header"><h3>🏠 MINHA CASA</h3></div>

        {temCasa ? (
          <div className="casa-card-perfil">
            <img src={CASA_IMGS[casa.tipo]} alt={CASA_NOMES[casa.tipo]} className="casa-img-perfil"
              onError={e => { e.target.style.display = 'none' }} />
            <div className="casa-card-info">
              <div className="casa-card-nome">{CASA_NOMES[casa.tipo]}</div>
              <div className="casa-card-acumulado">
                {casa.xp_disponivel > 0 && <span className="casa-reward">📊 +{casa.xp_disponivel} XP</span>}
                {casa.energia_disponivel > 0 && <span className="casa-reward">⚡ +{casa.energia_disponivel}</span>}
                {!temRecompensa && <span style={{ color: '#888', fontSize: 11 }}>Acumulando ganhos...</span>}
              </div>
              {temRecompensa && (
                <button className="btn-work btn-verde btn-small" onClick={coletar} disabled={loading}>
                  {loading ? '...' : '🎁 Coletar'}
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="casa-sem" onClick={() => setShowModal(true)}>
            <span className="casa-sem-icon">🏠</span>
            <span className="casa-sem-text">Você ainda não tem casa. Toque para alugar!</span>
          </div>
        )}
      </div>
    </>
  )
}