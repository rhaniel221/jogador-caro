import React, { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useGame } from '../context/GameContext'
import API from '../api'
import { fmt } from '../utils'
import './MinhaVida.css'

// ========================
// TRATAMENTO
// ========================

const TRATAMENTOS = [
  {
    id: 'meditacao',
    nome: 'Meditacao',
    icone: '🧘',
    desc: 'Foco mental e vitalidade renovada.',
    custoBase: 8000,
    custoNivel: 400,
    ganhos: (n) => `+${5 + Math.floor(n / 5)} Saude . +${20 + Math.floor(n / 4)} Vitalidade`,
  },
  {
    id: 'nutricao',
    nome: 'Nutricionista',
    icone: '🥗',
    desc: 'Dieta equilibrada para o corpo.',
    custoBase: 12000,
    custoNivel: 640,
    ganhos: (n) => `+${8 + Math.floor(n / 4)} Saude . +${12 + Math.floor(n / 5)} Vitalidade . +${3 + Math.floor(n / 15)} Energia`,
  },
  {
    id: 'psicologo',
    nome: 'Psicologo',
    icone: '🧠',
    desc: 'Sessao de terapia para renovar a mente.',
    custoBase: 16000,
    custoNivel: 800,
    ganhos: (n) => `+${20 + Math.floor(n / 2)} Saude . +${10 + Math.floor(n / 5)} Vitalidade`,
  },
  {
    id: 'academia',
    nome: 'Academia',
    icone: '🏋️',
    desc: 'Treino pesado: recupera saude, forca e vitalidade.',
    custoBase: 20000,
    custoNivel: 960,
    ganhos: (n) => `+${10 + Math.floor(n / 3)} Saude . +1 Forca . +${15 + Math.floor(n / 5)} Vitalidade`,
  },
  {
    id: 'fisioterapia',
    nome: 'Fisioterapia',
    icone: '💆',
    desc: 'Recuperacao corporal completa.',
    custoBase: 28000,
    custoNivel: 1200,
    ganhos: (n) => `+${15 + Math.floor(n / 3)} Saude . +${20 + Math.floor(n / 4)} Vitalidade . +${5 + Math.floor(n / 10)} Energia`,
  },
  {
    id: 'spa',
    nome: 'Day Spa',
    icone: '🧖',
    desc: 'Relaxamento total: corpo e mente.',
    custoBase: 40000,
    custoNivel: 1600,
    ganhos: (n) => `+${25 + Math.floor(n / 2)} Saude . +${25 + Math.floor(n / 3)} Vitalidade . +${8 + Math.floor(n / 8)} Energia`,
  },
]

function SectionHeader({ icon, title, right }) {
  return (
    <div className="jc-section-header">
      <div className="jc-section-title-wrap">
        {icon && <span className="jc-section-icon">{icon}</span>}
        <h3>{title}</h3>
      </div>
      {right && <div className="jc-section-right">{right}</div>}
    </div>
  )
}

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
        mostrarNotificacao(`${t.icone} ${parts.join(' . ')}`, 'sucesso')
      } else {
        mostrarNotificacao(res.mensagem, 'erro')
      }
    } catch { mostrarNotificacao('Erro de conexao', 'erro') }
    setLoading(null)
  }

  if (!jogador) return null
  const saudeBaixa = jogador.saude < 30

  return (
    <section className="jc-section">
      <SectionHeader
        icon="❤️"
        title="Central de Tratamento"
        right={`${jogador.saude}/100 Saude . ${jogador.vitalidade}/${jogador.vitalidade_max} Vitalidade`}
      />
      {saudeBaixa && (
        <div className="jc-alert-danger">
          Saude abaixo de 30! Voce nao pode trabalhar. Faca um tratamento.
        </div>
      )}
      <div className="jc-treatment-grid">
        {TRATAMENTOS.map(t => {
          const custo = t.custoBase + t.custoNivel * jogador.nivel
          const semDinheiro = jogador.dinheiro_mao < custo
          const isLoading = loading === t.id
          return (
            <article key={t.id} className={`jc-treatment-card ${semDinheiro ? 'is-disabled' : ''}`}>
              <div className="jc-treatment-icon">{t.icone}</div>
              <div className="jc-treatment-content">
                <h4>{t.nome}</h4>
                <p>{t.desc}</p>
                <strong>{t.ganhos(jogador.nivel)}</strong>
              </div>
              <button className="jc-btn jc-btn-primary" onClick={() => fazerTratamento(t.id)} disabled={isLoading || semDinheiro}>
                {isLoading ? 'Aguarde...' : `R$ ${fmt(custo)}`}
              </button>
            </article>
          )
        })}
      </div>
    </section>
  )
}

// ========================
// CASA
// ========================

const CASA_IMGS = { basica: '/casas/init-casa-simples.png', media: '/casas/casa-propria.png', top: '/casas/mansao.png' }
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
    try {
      const res = await API.post('/api/casa/comprar', { jogador_id: jogadorID, tipo, pagar_com: pagarCom })
      if (res.sucesso) { if (res.jogador) setJogador(res.jogador); mostrarNotificacao(res.mensagem, 'sucesso'); carregar(); setShowModal(false) }
      else mostrarNotificacao(res.mensagem, 'erro')
    } catch { mostrarNotificacao('Erro de conexao', 'erro') }
    setLoading(false)
  }

  async function coletar() {
    setLoading(true)
    try {
      const res = await API.post('/api/casa/coletar', { jogador_id: jogadorID })
      if (res.sucesso) {
        if (res.jogador) setJogador(res.jogador)
        mostrarNotificacao(res.mensagem, 'sucesso')
        if (res.level_up) setLevelUp(res.novo_nivel)
        carregar()
      } else mostrarNotificacao(res.mensagem, 'erro')
    } catch { mostrarNotificacao('Erro de conexao', 'erro') }
    setLoading(false)
  }

  const temCasa = casa.tipo && casa.tipo !== ''
  const temRecompensa = casa.xp_disponivel > 0 || casa.energia_disponivel > 0
  const CASAS_ORDEM = { '': 0, basica: 1, media: 2, top: 3 }
  const tipoAtual = casa?.tipo || ''
  const casasDisponiveis = casas.filter(c => CASAS_ORDEM[c.tipo] > CASAS_ORDEM[tipoAtual])
  const CASA_DETALHES = {
    basica: { bonus: '+1 Forca', desc: 'Casa alugada para morar enquanto sobe na carreira.' },
    media: { bonus: '+2 Velocidade . +1 Forca', desc: 'Sua primeira casa propria. Liberada na Serie B.' },
    top: { bonus: '+2 Habilidade . +2 Velocidade . +1 Forca', desc: 'A mansao dos craques. Maxima performance passiva.' },
  }

  return (
    <>
      {showModal && casasDisponiveis.length > 0 && (
        <div className="jc-modal-overlay">
          <div className="jc-house-modal" onClick={e => e.stopPropagation()}>
            {!obrigatorio && <button className="jc-modal-close" onClick={() => setShowModal(false)}>x</button>}
            <div className="jc-house-modal-header">
              <span>🏠</span>
              <h2>{precisaUpgrade ? 'Hora de comprar sua casa!' : obrigatorio ? 'Hora de alugar sua casa!' : 'Sua moradia'}</h2>
              <p>{precisaUpgrade ? 'Voce chegou a Serie B. Agora pode comprar uma casa propria.' : obrigatorio ? 'Para continuar trabalhando na Serie C, voce precisa alugar uma casa.' : 'Aqui voce pode alugar uma casa ou comprar a sua.'}</p>
            </div>
            <div className="jc-house-modal-grid">
              {casasDisponiveis.map(c => {
                const det = CASA_DETALHES[c.tipo] || {}
                const isAluguel = c.tipo === 'basica'
                const bloqueada = !isAluguel && !podeComprar
                return (
                  <article key={c.tipo} className={`jc-house-option ${bloqueada ? 'is-disabled' : ''}`}>
                    <img src={CASA_IMGS[c.tipo]} alt={c.nome} onError={e => { e.target.style.display = 'none' }} />
                    <div className="jc-house-option-body">
                      <h4>{c.nome}</h4>
                      <p>{det.desc}</p>
                      <div className="jc-house-option-stats">
                        <span>{c.xp_hora} XP/h</span>
                        <span>+{c.energia_quant} a cada {c.energia_intervalo_min}min</span>
                        <strong>{det.bonus}</strong>
                      </div>
                      <div className="jc-house-price">
                        {isAluguel ? <>R$ {fmt(c.preco)}</> : <>R$ {fmt(c.preco)} ou 🪙 {c.preco_moedas}</>}
                      </div>
                      {bloqueada ? (
                        <div className="jc-blocked-label">Liberada na Serie B</div>
                      ) : isAluguel ? (
                        <button className="jc-btn jc-btn-primary jc-btn-full" onClick={() => comprar(c.tipo, 'dinheiro')} disabled={loading}>Alugar</button>
                      ) : (
                        <div className="jc-actions-row">
                          <button className="jc-btn jc-btn-primary" onClick={() => comprar(c.tipo, 'dinheiro')} disabled={loading}>Dinheiro</button>
                          <button className="jc-btn jc-btn-premium" onClick={() => comprar(c.tipo, 'moedas')} disabled={loading}>Moedas</button>
                        </div>
                      )}
                    </div>
                  </article>
                )
              })}
            </div>
            {obrigatorio ? <p className="jc-modal-note danger">Obrigatorio para continuar trabalhando.</p> : <p className="jc-modal-note">Voce pode fechar e alugar depois em Minha Vida.</p>}
          </div>
        </div>
      )}

      <section className="jc-section">
        <SectionHeader icon="🏠" title="Minha Casa" />
        {temCasa ? (
          <article className="jc-life-card jc-house-card">
            <div className="jc-card-image">
              <img src={CASA_IMGS[casa.tipo]} alt={CASA_NOMES[casa.tipo]} onError={e => { e.target.style.display = 'none' }} />
            </div>
            <div className="jc-card-body">
              <div className="jc-card-kicker">Moradia</div>
              <h4>
                {CASA_NOMES[casa.tipo]}
                {casa.tipo === 'basica' ? <span className="jc-badge danger">Alugada</span> : <span className="jc-badge success">Propria</span>}
              </h4>
              <p>Acumulando ganhos e construindo seu legado.</p>
              <div className="jc-reward-row">
                {casa.xp_disponivel > 0 && <span>+{casa.xp_disponivel} XP</span>}
                {casa.energia_disponivel > 0 && <span>+{casa.energia_disponivel} Energia</span>}
                {!temRecompensa && <span>Sem recompensa disponivel no momento.</span>}
              </div>
              <div className="jc-actions-row">
                {temRecompensa && <button className="jc-btn jc-btn-primary" onClick={coletar} disabled={loading}>{loading ? 'Coletando...' : 'Coletar'}</button>}
                {podeComprar && casa.tipo === 'basica' && <button className="jc-btn jc-btn-secondary" onClick={() => setShowModal(true)}>Comprar casa propria</button>}
              </div>
            </div>
            <div className="jc-card-arrow">></div>
          </article>
        ) : (
          <button className="jc-empty-card" onClick={() => setShowModal(true)}>
            <span>🏠</span>
            <strong>Voce ainda nao tem casa.</strong>
            <small>Toque para alugar uma moradia e continuar evoluindo.</small>
          </button>
        )}
      </section>
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

  const MATERIAL_ICONES = { Madeira: '🪵', Prego: '🔩', Gesso: '⬜', Cal: '🧱', Semente: '🌱', Adubo: '💩', Metal: '🔧', Solda: '🔥', Fio: '🔌', Lampada: '💡', Poste: '🏗️', Concreto: '🧱', Tinta: '🎨', Rede: '🥅' }
  const info = campinho.nivel_info
  const prox = campinho.proximo_nivel
  const podeColetar = !campinho.bonus_hoje && campinho.nivel >= 0
  const totalNiveis = 7
  const progressoPct = Math.round((campinho.nivel / (totalNiveis - 1)) * 100)

  async function coletarBonus() {
    setLoading(true)
    try {
      const res = await API.post('/api/campinho/bonus', { jogador_id: jogadorID })
      if (res.sucesso) { if (res.jogador) setJogador(res.jogador); mostrarNotificacao(res.mensagem, 'sucesso'); if (res.level_up) setLevelUp(res.novo_nivel); carregar() }
      else mostrarNotificacao(res.mensagem || 'Erro', 'erro')
    } catch { mostrarNotificacao('Erro de conexao', 'erro') }
    setLoading(false)
  }

  async function upgrade() {
    setLoading(true)
    try {
      const res = await API.post('/api/campinho/upgrade', { jogador_id: jogadorID })
      if (res.sucesso) { mostrarNotificacao(res.mensagem, 'sucesso'); carregar() }
      else mostrarNotificacao(res.mensagem || 'Materiais insuficientes', 'erro')
    } catch { mostrarNotificacao('Erro de conexao', 'erro') }
    setLoading(false)
  }

  const podeUpgrade = prox && prox.materiais && Object.entries(prox.materiais).every(([mat, qtd]) => (materiais[mat] || 0) >= qtd)
  let matCompletos = 0, matTotal = 0
  if (prox?.materiais) { const entries = Object.entries(prox.materiais); matTotal = entries.length; matCompletos = entries.filter(([mat, qtd]) => (materiais[mat] || 0) >= qtd).length }

  return (
    <section className="jc-section">
      <SectionHeader icon="🥅" title="Meu Campinho" right="Diario" />
      <article className="jc-camp-card">
        <div className="jc-camp-image">
          <img src={info?.arte || '/estadios/campo-simples.png'} alt={info?.nome || 'Campo'} onError={e => { e.target.src = '/estadios/campo-simples.png' }} />
          <div className="jc-level-shield"><small>Nivel</small><strong>{campinho.nivel}</strong></div>
        </div>
        <div className="jc-camp-info">
          <h4>{info?.nome || 'Campo de Terra'}</h4>
          <p>{info?.descricao}</p>
          <div className="jc-progress-block">
            <div className="jc-progress-top"><span>Evolucao do campinho</span><strong>{campinho.nivel}/{totalNiveis - 1}</strong></div>
            <div className="jc-progress"><div style={{ width: progressoPct + '%' }} /></div>
          </div>
          <div className="jc-bonus-strip"><span>⭐</span><strong>Bonus diario:</strong><em>+{campinho.bonus_xp} XP ({info?.bonus_xp_pct || 10}% do XP necessario)</em></div>
          {podeColetar ? (
            <button className="jc-btn jc-btn-primary" onClick={coletarBonus} disabled={loading}>{loading ? 'Coletando...' : `Coletar +${campinho.bonus_xp} XP`}</button>
          ) : (
            <div className="jc-collected"><span>✓</span>Bonus de hoje ja coletado.</div>
          )}
        </div>
      </article>

      {requisitos.length > 0 && (
        <div className="jc-upgrade-panel">
          <SectionHeader title="Desafios do Campo Atual" right={reqCompletos ? 'Completos' : 'Em andamento'} />
          <p>Complete todos os desafios para desbloquear a proxima evolucao.</p>
          <div className="jc-requirements-grid">
            {requisitos.map(rq => {
              const pct = Math.min(100, Math.round((rq.progresso / rq.objetivo) * 100))
              const ok = rq.progresso >= rq.objetivo
              return (
                <div key={rq.tipo} className={`jc-requirement ${ok ? 'done' : ''}`}>
                  <div><span>{rq.descricao}</span><strong>{Math.min(rq.progresso, rq.objetivo)}/{rq.objetivo}</strong></div>
                  <div className="jc-mini-progress"><div style={{ width: pct + '%' }} /></div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {prox && reqCompletos && (
        <div className="jc-upgrade-panel">
          <SectionHeader title={`Proxima evolucao: ${prox.nome}`} right={`${matCompletos}/${matTotal} materiais`} />
          <p>{prox.descricao}</p>
          <div className="jc-requirements-grid">
            {Object.entries(prox.materiais).map(([mat, qtd]) => {
              const tem = materiais[mat] || 0
              const ok = tem >= qtd
              const pct = Math.min(100, Math.round((tem / qtd) * 100))
              return (
                <div key={mat} className={`jc-requirement ${ok ? 'done' : ''}`}>
                  <div><span>{MATERIAL_ICONES[mat] || '📦'} {mat}</span><strong>{tem}/{qtd}</strong></div>
                  <div className="jc-mini-progress"><div style={{ width: pct + '%' }} /></div>
                </div>
              )
            })}
          </div>
          {podeUpgrade ? (
            <button className="jc-btn jc-btn-premium" onClick={upgrade} disabled={loading}>{loading ? 'Construindo...' : 'Construir agora'}</button>
          ) : (
            <p className="jc-hint">Complete <Link to="/missoes">Missoes</Link> para ganhar os materiais.</p>
          )}
        </div>
      )}

      {prox && !reqCompletos && <div className="jc-hint">Complete os desafios acima para desbloquear a construcao do proximo campo.</div>}
      {!prox && <div className="jc-complete">Campinho completo! Seu estadio e lendario.</div>}
    </section>
  )
}

// ========================
// PATRIMONIO
// ========================

const CAT_ICONE = { moto: '🏍️', carro: '🚗', apartamento: '🏢' }
const CAT_NOME = { moto: 'Motos', carro: 'Carros', apartamento: 'Imoveis' }

function PatrimonioSection({ jogadorID }) {
  const [dados, setDados] = useState(null)
  useEffect(() => { if (!jogadorID) return; API.get('/api/patrimonio/' + jogadorID).then(setDados).catch(() => {}) }, [jogadorID])
  if (!dados || !dados.itens || dados.itens.length === 0) return null

  const grupos = {}
  dados.itens.forEach(item => { const cat = item.categoria || 'outro'; if (!grupos[cat]) grupos[cat] = []; grupos[cat].push(item) })

  return (
    <section className="jc-section">
      <SectionHeader icon="💰" title="Meu Patrimonio" right={<span className="jc-money-total">R$ {fmt(dados.valor_total)}<small>Valor total</small></span>} />
      {['moto', 'carro', 'apartamento'].map(cat => {
        const itens = grupos[cat]
        if (!itens || itens.length === 0) return null
        return (
          <div key={cat} className="jc-patrimony-group">
            <div className="jc-category-label"><span>{CAT_ICONE[cat]}</span>{CAT_NOME[cat]}</div>
            <div className="jc-assets-grid">
              {itens.map(item => (
                <article key={item.id} className="jc-asset-card">
                  <div className="jc-asset-icon">{item.icone}</div>
                  <div className="jc-asset-info">
                    <span>{CAT_NOME[cat]}</span>
                    <h4>{item.nome}{item.quantidade > 1 ? ` x${item.quantidade}` : ''}</h4>
                    <p>{item.descricao}</p>
                    <strong>R$ {fmt(item.preco)}</strong>
                  </div>
                  <div className="jc-card-arrow">></div>
                </article>
              ))}
            </div>
          </div>
        )
      })}
    </section>
  )
}

// ========================
// COMPONENTE PRINCIPAL
// ========================

export default function MinhaVida() {
  const { jogador, setJogador, jogadorID, mostrarNotificacao, setLevelUp } = useGame()
  if (!jogador) return null

  return (
    <main className="jc-life-page">
      <div className="jc-life-hero">
        <div>
          <span className="jc-page-kicker">Vida do jogador</span>
          <h2>Minha Vida</h2>
          <p>Seu patrimonio, sua casa, sua estrutura e o caminho para viver como craque.</p>
        </div>
      </div>
      <PatrimonioSection jogadorID={jogadorID} />
      <CasaCard jogadorID={jogadorID} jogador={jogador} setJogador={setJogador} mostrarNotificacao={mostrarNotificacao} setLevelUp={setLevelUp} />
      <CampinhoSection jogadorID={jogadorID} jogador={jogador} setJogador={setJogador} mostrarNotificacao={mostrarNotificacao} setLevelUp={setLevelUp} />
      <TratamentoSection jogadorID={jogadorID} jogador={jogador} setJogador={setJogador} mostrarNotificacao={mostrarNotificacao} />
    </main>
  )
}
