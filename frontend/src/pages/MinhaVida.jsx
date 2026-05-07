import React, { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useGame } from '../context/GameContext'
import API from '../api'
import { fmt } from '../utils'

// ========================
// TRATAMENTO
// ========================

const TRATAMENTOS = [
  {
    id: 'meditacao', nome: 'Meditacao', icone: '🧘',
    desc: 'Foco mental e vitalidade renovada.',
    custoBase: 8000, custoNivel: 400,
    ganhos: (n) => `+${5 + Math.floor(n / 5)} Saude · +${20 + Math.floor(n / 4)} Vitalidade`,
  },
  {
    id: 'nutricao', nome: 'Nutricionista', icone: '🥗',
    desc: 'Dieta equilibrada para o corpo.',
    custoBase: 12000, custoNivel: 640,
    ganhos: (n) => `+${8 + Math.floor(n / 4)} Saude · +${12 + Math.floor(n / 5)} Vitalidade · +${3 + Math.floor(n / 15)} Energia`,
  },
  {
    id: 'psicologo', nome: 'Psicologo', icone: '🧠',
    desc: 'Sessao de terapia para renovar a mente.',
    custoBase: 16000, custoNivel: 800,
    ganhos: (n) => `+${20 + Math.floor(n / 2)} Saude · +${10 + Math.floor(n / 5)} Vitalidade`,
  },
  {
    id: 'academia', nome: 'Academia', icone: '🏋️',
    desc: 'Treino pesado: recupera saude, forca e vitalidade.',
    custoBase: 20000, custoNivel: 960,
    ganhos: (n) => `+${10 + Math.floor(n / 3)} Saude · +1 Forca · +${15 + Math.floor(n / 5)} Vitalidade`,
  },
  {
    id: 'fisioterapia', nome: 'Fisioterapia', icone: '💆',
    desc: 'Recuperacao corporal completa.',
    custoBase: 28000, custoNivel: 1200,
    ganhos: (n) => `+${15 + Math.floor(n / 3)} Saude · +${20 + Math.floor(n / 4)} Vitalidade · +${5 + Math.floor(n / 10)} Energia`,
  },
  {
    id: 'spa', nome: 'Day Spa', icone: '🧖',
    desc: 'Relaxamento total: corpo e mente.',
    custoBase: 40000, custoNivel: 1600,
    ganhos: (n) => `+${25 + Math.floor(n / 2)} Saude · +${25 + Math.floor(n / 3)} Vitalidade · +${8 + Math.floor(n / 8)} Energia`,
  },
]

function TratamentoSection({ jogadorID, jogador, setJogador, mostrarNotificacao }) {
  const [loading, setLoading] = useState(null)

  async function fazerTratamento(tratamentoID) {
    const t = TRATAMENTOS.find(x => x.id === tratamentoID)
    if (!t) return
    const custo = t.custoBase + t.custoNivel * jogador.nivel
    if (!confirm(`Fazer ${t.nome} por R$ ${fmt(custo)}?`)) return
    setLoading(tratamentoID)
    try {
      const res = await API.post('/api/tratamento', { jogador_id: jogadorID, tratamento_id: tratamentoID })
      if (res.sucesso) {
        setJogador(res.jogador)
        const g = res.ganhos || {}
        const parts = []
        if (g.saude > 0) parts.push(`+${g.saude} Saude`)
        if (g.vitalidade > 0) parts.push(`+${g.vitalidade} Vitalidade`)
        if (g.forca > 0) parts.push(`+${g.forca} Forca`)
        if (g.energia > 0) parts.push(`+${g.energia} Energia`)
        mostrarNotificacao(`${t.icone} ${parts.join(' · ')}`, 'sucesso')
      } else {
        mostrarNotificacao(res.mensagem, 'erro')
      }
    } catch { mostrarNotificacao('Erro de conexao', 'erro') }
    setLoading(null)
  }

  if (!jogador) return null

  const saudeBaixa = jogador.saude < 30

  return (
    <div className="pf-section">
      <div className="pf-section-header">
        <h3>CENTRAL DE TRATAMENTO</h3>
        <span className="pf-section-badge">❤️ {jogador.saude}/100 · 💚 {jogador.vitalidade}/{jogador.vitalidade_max}</span>
      </div>

      {saudeBaixa && (
        <div style={{
          background: '#ffeaea', border: '2px solid var(--vermelho)', borderRadius: 10,
          padding: '10px 14px', marginBottom: 12, fontSize: 12, color: '#b00', fontWeight: 900,
        }}>
          Saude abaixo de 30! Voce nao pode trabalhar. Faca um tratamento!
        </div>
      )}

      <div className="pf-inv-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
        {TRATAMENTOS.map(t => {
          const custo = t.custoBase + t.custoNivel * jogador.nivel
          const semDinheiro = jogador.dinheiro_mao < custo
          const isLoading = loading === t.id
          return (
            <div key={t.id} className="pf-inv-card" style={{ borderColor: semDinheiro ? '#ccc' : 'var(--azul-claro)' }}>
              <div className="pf-inv-top">
                <span className="pf-inv-icon">{t.icone}</span>
              </div>
              <div className="pf-inv-name">{t.nome}</div>
              <div className="pf-inv-desc">{t.desc}</div>
              <div className="pf-inv-desc" style={{ color: 'var(--azul)', fontWeight: 900 }}>
                {t.ganhos(jogador.nivel)}
              </div>
              <div className="pf-inv-actions">
                <button
                  className={`btn-work btn-small${semDinheiro ? '' : ' btn-verde'}`}
                  onClick={() => fazerTratamento(t.id)}
                  disabled={isLoading || semDinheiro}
                >
                  {isLoading ? '...' : `R$ ${fmt(custo)}`}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ========================
// CASA
// ========================

const CASA_IMGS = {
  basica: '/casas/init-casa-simples.png',
  media: '/casas/init-casa-media.png',
  top: '/casas/initcasa-top.png',
}
const CASA_NOMES = { basica: 'Casa Alugada', media: 'Casa Propria', top: 'Mansao do Craque' }

function CasaCard({ jogadorID, jogador, setJogador, mostrarNotificacao, setLevelUp }) {
  const [casa, setCasa] = useState({ tipo: '' })
  const [casas, setCasas] = useState([])
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const carregar = useCallback(() => {
    if (!jogadorID) return
    API.get('/api/casa/' + jogadorID).then(res => {
      setCasa(res.casa || { tipo: '' })
      if (res.casas_disponiveis) setCasas(res.casas_disponiveis)
      setLoaded(true)
    }).catch(() => { setCasa({ tipo: '' }); setLoaded(true) })
  }, [jogadorID])

  useEffect(() => { carregar() }, [carregar])

  const temCasaAtual = casa?.tipo && casa.tipo !== ''
  const precisaUpgrade = jogador?.nivel >= 30 && casa?.tipo === 'basica'
  const obrigatorio = (jogador?.nivel >= 20 && !temCasaAtual) || precisaUpgrade
  const podeComprar = jogador?.nivel >= 30

  useEffect(() => {
    if (!loaded || !casa || !jogador) return
    if (jogador.nivel >= 30 && casa.tipo === 'basica') setShowModal(true)
    else if (jogador.nivel >= 20 && !temCasaAtual) setShowModal(true)
  }, [loaded, casa, jogador?.nivel])

  if (!jogador || jogador.nivel < 20) return null

  async function comprar(tipo, pagarCom) {
    setLoading(true)
    const res = await API.post('/api/casa/comprar', { jogador_id: jogadorID, tipo, pagar_com: pagarCom })
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

  const CASAS_ORDEM = { '': 0, basica: 1, media: 2, top: 3 }
  const tipoAtual = casa?.tipo || ''
  const casasDisponiveis = casas.filter(c => CASAS_ORDEM[c.tipo] > CASAS_ORDEM[tipoAtual])

  const CASA_DETALHES = {
    basica: { bonus: '+1 Forca', desc: 'Casa alugada para morar enquanto sobe na carreira. Aluguel acessivel.' },
    media: { bonus: '+2 Velocidade · +1 Forca', desc: 'Sua primeira casa propria. Liberada na Serie B.' },
    top: { bonus: '+2 Habilidade · +2 Velocidade · +1 Forca', desc: 'A mansao dos craques. Maxima performance passiva.' },
  }

  return (
    <>
      {showModal && casasDisponiveis.length > 0 && (
        <div className="modal-overlay">
          <div className="casa-modal" onClick={e => e.stopPropagation()}>
            {!obrigatorio && <button className="pm-close" onClick={() => setShowModal(false)}>x</button>}
            <div className="casa-modal-header">
              <span className="casa-modal-icon">🏠</span>
              <h2 className="casa-modal-title">
                {precisaUpgrade ? 'Hora de comprar sua casa!' : obrigatorio ? 'Hora de alugar sua casa!' : 'Sua moradia'}
              </h2>
              <p className="casa-modal-sub">
                {precisaUpgrade
                  ? 'Voce chegou a Serie B! Agora pode comprar uma casa propria — escolha abaixo.'
                  : obrigatorio
                  ? 'Para continuar trabalhando na Serie C, voce precisa alugar uma casa.'
                  : 'Aqui voce pode alugar uma casa ou comprar a sua.'}
              </p>
            </div>
            <div className="casa-modal-grid">
              {casasDisponiveis.map(c => {
                const det = CASA_DETALHES[c.tipo] || {}
                const isAluguel = c.tipo === 'basica'
                const bloqueada = !isAluguel && !podeComprar
                return (
                  <div key={c.tipo} className="casa-modal-card" style={bloqueada ? { opacity: 0.55 } : null}>
                    <img src={CASA_IMGS[c.tipo]} alt={c.nome} className="casa-modal-img"
                      onError={e => { e.target.style.display = 'none' }} />
                    <div className="casa-modal-card-body">
                      <strong className="casa-modal-nome">{c.nome}</strong>
                      <div className="casa-modal-desc">{det.desc}</div>
                      <div className="casa-modal-stats">
                        <span>📊 {c.xp_hora} XP/h · ⚡ +{c.energia_quant} a cada {c.energia_intervalo_min}min</span>
                        <span className="casa-modal-bonus">{det.bonus}</span>
                      </div>
                      <div className="casa-modal-preco">
                        {isAluguel ? <>R$ {fmt(c.preco)}</> : <>R$ {fmt(c.preco)} ou 🪙 {c.preco_moedas}</>}
                      </div>
                      {bloqueada ? (
                        <div className="btn-work" style={{ background: '#444', color: '#bbb', textAlign: 'center', fontSize: 11, marginTop: 4 }}>
                          Liberada na Serie B (nv 30)
                        </div>
                      ) : isAluguel ? (
                        <button className="btn-work btn-verde" onClick={() => comprar(c.tipo, 'dinheiro')} disabled={loading}
                          style={{ width: '100%', fontSize: 11, marginTop: 4 }}>
                          Alugar por R$ {fmt(c.preco)}
                        </button>
                      ) : (
                        <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                          <button className="btn-work btn-verde" onClick={() => comprar(c.tipo, 'dinheiro')} disabled={loading}
                            style={{ flex: 1, fontSize: 11 }}>
                            R$ {fmt(c.preco)}
                          </button>
                          <button className="btn-work btn-azul" onClick={() => comprar(c.tipo, 'moedas')} disabled={loading}
                            style={{ flex: 1, fontSize: 11 }}>
                            🪙 {c.preco_moedas}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
            {obrigatorio
              ? <p className="casa-modal-nota" style={{ color: '#e74c3c', fontWeight: 900 }}>Obrigatorio para continuar trabalhando!</p>
              : <p className="casa-modal-nota">Voce pode fechar e alugar depois em Minha Vida.</p>
            }
          </div>
        </div>
      )}

      <div className="pf-section">
        <div className="pf-section-header"><h3>MINHA CASA</h3></div>

        {temCasa ? (
          <div className="casa-card-perfil">
            <img src={CASA_IMGS[casa.tipo]} alt={CASA_NOMES[casa.tipo]} className="casa-img-perfil"
              onError={e => { e.target.style.display = 'none' }} />
            <div className="casa-card-info">
              <div className="casa-card-nome">
                {CASA_NOMES[casa.tipo]}
                {casa.tipo === 'basica'
                  ? <span style={{ fontSize: 10, color: '#c0392b', marginLeft: 6, fontWeight: 700 }}>ALUGADA</span>
                  : <span style={{ fontSize: 10, color: '#27ae60', marginLeft: 6, fontWeight: 700 }}>PROPRIA</span>}
              </div>
              <div className="casa-card-acumulado">
                {casa.xp_disponivel > 0 && <span className="casa-reward">📊 +{casa.xp_disponivel} XP</span>}
                {casa.energia_disponivel > 0 && <span className="casa-reward">⚡ +{casa.energia_disponivel}</span>}
                {!temRecompensa && <span style={{ color: '#888', fontSize: 11 }}>Acumulando ganhos...</span>}
              </div>
              {casa.tipo === 'basica' && temRecompensa && (
                <div style={{ fontSize: 10, color: '#c0392b', fontWeight: 700 }}>Aluguel sera cobrado ao coletar</div>
              )}
              {temRecompensa && (
                <button className="btn-work btn-verde btn-small" onClick={coletar} disabled={loading}>
                  {loading ? '...' : 'Coletar'}
                </button>
              )}
              {podeComprar && casa.tipo === 'basica' && (
                <button className="btn-work btn-azul btn-small" onClick={() => setShowModal(true)}
                  style={{ marginTop: 4, fontSize: 10 }}>
                  Comprar Casa Propria
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="casa-sem" onClick={() => setShowModal(true)}>
            <span className="casa-sem-icon">🏠</span>
            <span className="casa-sem-text">Voce ainda nao tem casa. Toque para alugar!</span>
          </div>
        )}
      </div>
    </>
  )
}

// ========================
// CAMPINHO
// ========================

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
  const totalNiveis = 7
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
    } catch { mostrarNotificacao('Erro de conexao', 'erro') }
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
    } catch { mostrarNotificacao('Erro de conexao', 'erro') }
    setLoading(false)
  }

  const podeUpgrade = prox && prox.materiais && Object.entries(prox.materiais).every(
    ([mat, qtd]) => (materiais[mat] || 0) >= qtd
  )

  let matCompletos = 0, matTotal = 0
  if (prox?.materiais) {
    const entries = Object.entries(prox.materiais)
    matTotal = entries.length
    matCompletos = entries.filter(([mat, qtd]) => (materiais[mat] || 0) >= qtd).length
  }

  return (
    <div className="campinho-section">
      <h3 className="campinho-titulo">MEU CAMPINHO</h3>

      <div className="campinho-card">
        <img
          src={info?.arte || '/estadios/campo-simples.png'}
          alt={info?.nome || 'Campo'}
          className="campinho-arte"
          onError={e => { e.target.src = '/estadios/campo-simples.png' }}
        />
        <div className="campinho-info">
          <div className="campinho-nivel-badge">Nivel {campinho.nivel}</div>
          <div className="campinho-nome">{info?.nome || 'Campo de Terra'}</div>
          <div className="campinho-desc">{info?.descricao}</div>
          <div className="campinho-progress">
            <div className="campinho-progress-label">Evolucao do campinho</div>
            <div className="campinho-progress-bar">
              <div className="campinho-progress-fill" style={{ width: progressoPct + '%' }} />
            </div>
            <div className="campinho-progress-text">{campinho.nivel}/{totalNiveis - 1}</div>
          </div>
          <div className="campinho-bonus-label">
            Bonus diario: +{campinho.bonus_xp} XP ({info?.bonus_xp_pct || 10}% do XP necessario)
          </div>
          {podeColetar ? (
            <button className="btn-work btn-verde" onClick={coletarBonus} disabled={loading}>
              {loading ? '...' : `Coletar +${campinho.bonus_xp} XP`}
            </button>
          ) : (
            <div className="campinho-coletado">Bonus de hoje ja coletado!</div>
          )}
        </div>
      </div>

      {requisitos.length > 0 && (
        <div className="campinho-upgrade">
          <h4>Desafios do Campo Atual</h4>
          <p className="campinho-upgrade-desc">Complete todos os desafios para desbloquear a proxima evolucao.</p>
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
          {reqCompletos && <div style={{ color: 'var(--verde)', fontWeight: 900, fontSize: 13, marginTop: 8 }}>Desafios completos!</div>}
        </div>
      )}

      {prox && reqCompletos && (
        <div className="campinho-upgrade" style={{ marginTop: 12 }}>
          <div className="campinho-upgrade-header">
            <h4>Proxima evolucao: {prox.nome}</h4>
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
              {loading ? '...' : 'Construir Agora!'}
            </button>
          ) : (
            <p className="campinho-hint">
              Complete <Link to="/missoes">Missoes</Link> para ganhar os materiais!
            </p>
          )}
        </div>
      )}

      {prox && !reqCompletos && (
        <div style={{ marginTop: 10, fontSize: 12, fontWeight: 700, color: '#556' }}>
          Complete os desafios acima para desbloquear a construcao do proximo campo.
        </div>
      )}

      {!prox && (
        <div className="campinho-completo">Campinho completo! Seu estadio e lendario!</div>
      )}
    </div>
  )
}

// ========================
// PATRIMONIO
// ========================

const CAT_ICONE = { moto: '🏍️', carro: '🚗', apartamento: '🏢' }
const CAT_NOME = { moto: 'MOTOS', carro: 'CARROS', apartamento: 'IMOVEIS' }

function PatrimonioSection({ jogadorID }) {
  const [dados, setDados] = useState(null)

  useEffect(() => {
    if (!jogadorID) return
    API.get('/api/patrimonio/' + jogadorID).then(setDados).catch(() => {})
  }, [jogadorID])

  if (!dados || !dados.itens || dados.itens.length === 0) return null

  const grupos = {}
  dados.itens.forEach(item => {
    const cat = item.categoria || 'outro'
    if (!grupos[cat]) grupos[cat] = []
    grupos[cat].push(item)
  })

  return (
    <div className="pf-section">
      <div className="pf-section-header">
        <h3>MEU PATRIMONIO</h3>
        <span className="pf-section-badge">R$ {fmt(dados.valor_total)}</span>
      </div>
      {['moto', 'carro', 'apartamento'].map(cat => {
        const itens = grupos[cat]
        if (!itens || itens.length === 0) return null
        return (
          <div key={cat} className="pat-grupo">
            <div className="pat-grupo-titulo">{CAT_ICONE[cat]} {CAT_NOME[cat]}</div>
            <div className="pat-grid">
              {itens.map(item => (
                <div key={item.id} className="pat-card">
                  <div className="pat-icone">{item.icone}</div>
                  <div className="pat-info">
                    <div className="pat-nome">{item.nome}{item.quantidade > 1 ? ` x${item.quantidade}` : ''}</div>
                    <div className="pat-desc">{item.descricao}</div>
                    <div className="pat-valor">R$ {fmt(item.preco)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ========================
// COMPONENTE PRINCIPAL
// ========================

export default function MinhaVida() {
  const { jogador, setJogador, jogadorID, mostrarNotificacao, setLevelUp } = useGame()

  if (!jogador) return null

  return (
    <div className="pf">
      <h2 className="page-title">MINHA VIDA</h2>

      <PatrimonioSection jogadorID={jogadorID} />

      <CasaCard
        jogadorID={jogadorID}
        jogador={jogador}
        setJogador={setJogador}
        mostrarNotificacao={mostrarNotificacao}
        setLevelUp={setLevelUp}
      />

      <CampinhoSection
        jogadorID={jogadorID}
        jogador={jogador}
        setJogador={setJogador}
        mostrarNotificacao={mostrarNotificacao}
        setLevelUp={setLevelUp}
      />

      <TratamentoSection
        jogadorID={jogadorID}
        jogador={jogador}
        setJogador={setJogador}
        mostrarNotificacao={mostrarNotificacao}
      />
    </div>
  )
}
