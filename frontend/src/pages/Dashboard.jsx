import React, { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useGame } from '../context/GameContext'
import API from '../api'
import { fmt } from '../utils'
import './Dashboard.css'

function getMoralInfo(moral) {
  if (moral >= 81) return { label: 'Em Chamas!', cor: '#D6A84F', emoji: '🔥' }
  if (moral >= 61) return { label: 'Motivado', cor: '#22c55e', emoji: '😊' }
  if (moral >= 31) return { label: 'Normal', cor: '#38A8F8', emoji: '😐' }
  return { label: 'Desmotivado', cor: '#ef4444', emoji: '😞' }
}

const POSICAO_LABEL = { GK: 'GOL', DEF: 'ZAG', MED: 'MEI', ATA: 'ATA' }

function getBordaTier(nivel) {
  if (nivel >= 190) return 'Desafiante'
  if (nivel >= 160) return 'Grao-Mestre'
  if (nivel >= 135) return 'Mestre'
  if (nivel >= 100) return 'Diamante'
  if (nivel >= 72)  return 'Esmeralda'
  if (nivel >= 50)  return 'Platina'
  if (nivel >= 30)  return 'Ouro'
  if (nivel >= 20)  return 'Prata'
  if (nivel >= 10)  return 'Bronze'
  return 'Ferro'
}

const TIER_COR = {
  'Ferro': '#64748b', 'Bronze': '#a16207', 'Prata': '#94a3b8', 'Ouro': '#D6A84F',
  'Platina': '#22d3ee', 'Esmeralda': '#22c55e', 'Diamante': '#43a7ff',
  'Mestre': '#a855f7', 'Grao-Mestre': '#ef4444', 'Desafiante': '#fbbf24',
}

function gerarNoticias(jogador, historico, progressaoHoje) {
  const noticias = []
  const nome = jogador.nome
  if (historico && historico.length > 0) {
    historico.slice(0, 2).forEach(c => {
      const venceu = c.vencedor_id === jogador.id
      const oponente = c.atacante_id === jogador.id ? c.defensor_nome : c.atacante_nome
      noticias.push(venceu
        ? { icone: '🏆', texto: `${nome} domina ${oponente} em batalha epica e sobe no ranking!` }
        : { icone: '💢', texto: `${nome} enfrenta derrota para ${oponente}, mas promete revanche.` })
    })
  }
  const moral = jogador.moral ?? 70
  if (moral >= 81) noticias.push({ icone: '🔥', texto: `${nome} esta em chamas! Moral nas alturas.` })
  else if (moral < 31) noticias.push({ icone: '😟', texto: `Fontes revelam que ${nome} passa por momento de reflexao.` })
  const rank = jogador.rank
  if (rank && rank !== 'Peladeiro' && rank !== 'Desconhecido')
    noticias.push({ icone: '⭐', texto: `${nome}, ${rank} do futebol nacional, e destaque nas redes.` })
  if (progressaoHoje) {
    const total = Object.values(progressaoHoje.trabalhos_hoje || {}).reduce((a, b) => a + b, 0)
    if (total >= 5) noticias.push({ icone: '💪', texto: `Dia de batalha: ${nome} completa ${total} sessoes de trabalho.` })
  }
  const FILLERS = [
    { icone: '📰', texto: 'Mercado de craques esquenta: agentes monitoram jogadores.' },
    { icone: '🏟️', texto: 'Federacao anuncia novos torneios regionais.' },
    { icone: '⚽', texto: 'Especialistas analisam o cenario do futebol amador.' },
    { icone: '🥇', texto: 'Temporada promete ser historica para jogadores em ascensao.' },
    { icone: '📊', texto: 'Ranking semanal atualizado: confira as maiores subidas!' },
    { icone: '🎯', texto: 'Treinadores recomendam foco em atributos fisicos.' },
    { icone: '💰', texto: 'Patrocinadores aumentam investimentos no futebol.' },
  ]
  const dia = new Date().getDay()
  noticias.push(FILLERS[dia % FILLERS.length])
  if (noticias.length < 4) noticias.push(FILLERS[(dia + 2) % FILLERS.length])
  return noticias.slice(0, 5)
}

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

export default function Dashboard() {
  const { jogador, jogadorID, getAvatar } = useGame()
  const [pendencias, setPendencias] = useState({ casa: null, campinho: null, fama: null })
  const [historico, setHistorico] = useState([])
  const [progressaoHoje, setProgressaoHoje] = useState(null)
  const [tasks, setTasks] = useState([])
  const [boleto, setBoleto] = useState(null)

  const carregar = useCallback(async () => {
    if (!jogadorID) return
    try {
      const [casa, campinho, fama, hist, prog, tsk, bol] = await Promise.all([
        API.get('/api/casa/' + jogadorID).catch(() => null),
        API.get('/api/campinho/' + jogadorID).catch(() => null),
        API.get('/api/fama/' + jogadorID).catch(() => null),
        API.get('/api/combates/historico?jogador_id=' + jogadorID).catch(() => []),
        API.get('/api/progressao/hoje/' + jogadorID).catch(() => null),
        API.get('/api/tasks/' + jogadorID).catch(() => []),
        API.get('/api/boletos/verificar/' + jogadorID).catch(() => null),
      ])
      setPendencias({ casa, campinho, fama })
      setHistorico(Array.isArray(hist) ? hist : [])
      setProgressaoHoje(prog)
      setTasks(Array.isArray(tsk) ? tsk : [])
      setBoleto(bol && bol.tem_boleto ? bol : null)
    } catch (e) {}
  }, [jogadorID])

  useEffect(() => { carregar() }, [carregar])
  if (!jogador) return null

  const moral = jogador.moral ?? 70
  const moralInfo = getMoralInfo(moral)
  const casaData = pendencias.casa?.casa
  const campinhoData = pendencias.campinho?.campinho
  const famaData = pendencias.fama
  const casaPendente = (casaData?.xp_disponivel > 0 || casaData?.energia_disponivel > 0)
  const campinhoPendente = campinhoData && !campinhoData.bonus_hoje
  const patrocinioPendente = (famaData?.patrocinio_acumulado || 0) > 0
  const temPendencias = casaPendente || campinhoPendente || patrocinioPendente
  const totalTrabalhos = progressaoHoje ? Object.values(progressaoHoje.trabalhos_hoje || {}).reduce((a, b) => a + b, 0) : 0

  const agendaItems = [{ feito: totalTrabalhos > 0, label: totalTrabalhos > 0 ? `Trabalhou hoje (${totalTrabalhos}x)` : 'Trabalhar hoje', link: '/carreira', icone: '⚽' }]
  if (campinhoData) agendaItems.push({ feito: campinhoData.bonus_hoje === true, label: 'Bonus do campinho', link: '/vida', icone: '🏟️' })
  if (casaData?.tipo) agendaItems.push({ feito: !casaPendente, label: 'Bonus da casa', link: '/vida', icone: '🏠' })
  if (famaData?.rank?.patrocinio) agendaItems.push({ feito: !patrocinioPendente, label: 'Patrocinio', link: '/jogador', icone: '⭐' })
  const tasksDiarias = tasks.filter(t => !t.completada && !t.coletada)
  if (tasksDiarias.length > 0) agendaItems.push({ feito: false, label: `${tasksDiarias.length} tarefa(s) pendente(s)`, link: '/missoes', icone: '📋' })
  else if (tasks.length > 0) agendaItems.push({ feito: true, label: 'Tarefas concluidas', link: '/missoes', icone: '📋' })

  const noticias = gerarNoticias(jogador, historico, progressaoHoje)

  // === O QUE FAZER AGORA (priorizado) ===
  const proximosPassos = []
  if (jogador.saude < 30) {
    proximosPassos.push({ icone: '❤️', titulo: 'Saude Critica!', desc: 'Va ate Minha Vida e faca um tratamento.', link: '/vida', cor: '#ef4444' })
  }
  if (jogador.energia <= 3) {
    proximosPassos.push({ icone: '⚡', titulo: 'Energia Baixa!', desc: 'Compre energia na Loja para continuar.', link: '/loja', cor: '#D6A84F' })
  }
  if (totalTrabalhos === 0 && jogador.energia > 3) {
    proximosPassos.push({ icone: '⚽', titulo: 'Hora de Trabalhar!', desc: 'Comece o dia na Carreira.', link: '/carreira', cor: '#1e6fff' })
  }
  const tasksPend = tasks.filter(t => !t.completada && !t.coletada && t.progresso >= t.objetivo)
  if (tasksPend.length > 0) {
    proximosPassos.push({ icone: '🎁', titulo: `${tasksPend.length} Recompensa(s)!`, desc: 'Tarefas prontas pra coletar.', link: '/missoes', cor: '#22c55e' })
  }
  if (temPendencias && proximosPassos.length < 3) {
    proximosPassos.push({ icone: '📦', titulo: 'Coletas Disponiveis', desc: 'Colete bonus da casa, campinho ou patrocinio.', link: casaPendente ? '/vida' : '/jogador', cor: '#D6A84F' })
  }
  if (proximosPassos.length < 2) {
    proximosPassos.push({ icone: '🏋️', titulo: 'Evoluir Atributos', desc: 'Treine para ficar mais forte.', link: '/treino', cor: '#43a7ff' })
  }

  // === ACESSO RAPIDO DINAMICO (por nivel) ===
  const quickLinks = [
    { img: '/nav/carreira.png', label: 'Trabalhar', to: '/carreira' },
    { img: '/nav/treino.png', label: 'Treino', to: '/treino' },
    { img: '/nav/missoes.png', label: 'Missoes', to: '/missoes' },
    { img: '/nav/loja.png', label: 'Loja', to: '/loja' },
    jogador.nivel >= 12 && { img: '/elos/desafiante.png', label: 'Desafio 1v1', to: '/disputas?aba=desafio' },
    jogador.nivel >= 10 && { img: '/elos/diamante.png', label: 'Estadio PvP', to: '/disputas?aba=estadio' },
    jogador.nivel >= 15 && { img: '/logo-mini-game.png', label: 'MiniGame', to: '/disputas?aba=minigame' },
    jogador.nivel >= 20 && { img: '/nav/vida.png', label: 'Minha Vida', to: '/vida' },
    { img: '/nav/jogador.png', label: 'Meu Jogador', to: '/jogador' },
  ].filter(Boolean).slice(0, 6)

  // Carta do Craque: overall = média de FOR/VEL/HAB
  const overall = Math.round(((jogador.forca || 0) + (jogador.velocidade || 0) + (jogador.habilidade || 0)) / 3)
  const bordaTier = getBordaTier(jogador.nivel)
  const corTier = TIER_COR[bordaTier] || '#D6A84F'
  const posLabel = POSICAO_LABEL[jogador.posicao] || 'JOG'

  return (
    <main className="jc-dashboard">
      {/* Carta do Craque */}
      <div className="jc-hero jc-card">
        <div className="jc-hero-overlay" />
        <div className="jc-card-shine" />
        <div className="jc-hero-content">
          <div className="jc-card-top">
            <div className="jc-card-rating" style={{ borderColor: corTier + '55' }}>
              <div className="jc-card-overall" style={{ color: corTier }}>{overall || '-'}</div>
              <div className="jc-card-pos">{posLabel}</div>
              <div className="jc-card-tier" style={{ color: corTier, borderColor: corTier + '44' }}>{bordaTier}</div>
            </div>

            <div className="jc-card-avatar">
              {getAvatar(jogador.avatar)}
            </div>

            <div className="jc-card-info">
              <div className="jc-card-name">{jogador.nome}</div>
              <div className="jc-hero-meta">
                <span className="jc-hero-tag rank">{jogador.rank || 'Peladeiro'}</span>
                <span className="jc-hero-tag level">Lv {jogador.nivel}</span>
                {jogador.clube_nome && <span className="jc-hero-tag clube">{jogador.clube_nome}</span>}
              </div>
              <div className="jc-card-attrs">
                <div className="jc-card-attr"><span>FOR</span><strong>{jogador.forca || 0}</strong></div>
                <div className="jc-card-attr"><span>VEL</span><strong>{jogador.velocidade || 0}</strong></div>
                <div className="jc-card-attr"><span>HAB</span><strong>{jogador.habilidade || 0}</strong></div>
                <div className="jc-card-attr jc-card-moral" style={{ color: moralInfo.cor }}>
                  <span>MOR</span><strong>{moralInfo.emoji} {moral}</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="jc-hero-bars">
            {[
              { label: 'Energia', icon: '⚡', val: jogador.energia, max: jogador.energia_max, cor: '#D6A84F' },
              { label: 'Saude', icon: '❤️', val: jogador.saude, max: 100, cor: '#ef4444' },
              { label: 'XP', icon: '📊', val: jogador.xp, max: jogador.xp_proximo, cor: '#1e6fff' },
            ].map(({ label, icon, val, max, cor }) => (
              <div key={label} className="jc-hero-bar">
                <div className="jc-hero-bar-top">
                  <span>{icon} {label}</span>
                  <span className="jc-hero-bar-val">{val}/{max}</span>
                </div>
                <div className="jc-hero-bar-track">
                  <div className="jc-hero-bar-fill" style={{ width: Math.min(100, Math.round((val / max) * 100)) + '%', background: cor }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Historia */}
      {jogador.nivel < 4 && (
        <div className="jc-historia-banner">
          <div>
            <div style={{ fontWeight: 900, fontSize: 14 }}>Missao de origem pendente!</div>
            <div style={{ fontSize: 11, marginTop: 3, opacity: 0.8 }}>Complete a historia para desbloquear o jogo.</div>
          </div>
          <Link to="/historia">Jogar agora</Link>
        </div>
      )}

      {/* Aviso de contas atrasadas */}
      {boleto && boleto.dias_atraso > 0 && (
        <Link to="/banco" className="jc-alerta-contas">
          <span className="jc-alerta-icon">⚠️</span>
          <div className="jc-alerta-content">
            <div className="jc-alerta-titulo">Contas em atraso!</div>
            <div className="jc-alerta-desc">
              {boleto.dias_atraso} dia{boleto.dias_atraso > 1 ? 's' : ''} em atraso · R$ {fmt(boleto.total)} (juros 5%/dia)
            </div>
          </div>
          <span className="jc-alerta-cta">PAGAR →</span>
        </Link>
      )}

      {/* Coletas */}
      {temPendencias && (
        <div className="jc-coletas">
          {casaPendente && (
            <Link to="/vida" className="jc-coleta" style={{ borderLeft: '3px solid #22c55e' }}>
              <span className="jc-coleta-icon">🏠</span>
              <div><div className="jc-coleta-label">Casa</div><div className="jc-coleta-val" style={{ color: '#22c55e' }}>Coletar</div></div>
            </Link>
          )}
          {campinhoPendente && (
            <Link to="/vida" className="jc-coleta" style={{ borderLeft: '3px solid #1e6fff' }}>
              <span className="jc-coleta-icon">🏟️</span>
              <div><div className="jc-coleta-label">Campinho</div><div className="jc-coleta-val" style={{ color: '#43a7ff' }}>Coletar</div></div>
            </Link>
          )}
          {patrocinioPendente && (
            <Link to="/jogador" className="jc-coleta" style={{ borderLeft: '3px solid #D6A84F' }}>
              <span className="jc-coleta-icon">⭐</span>
              <div><div className="jc-coleta-label">Patrocinio</div><div className="jc-coleta-val" style={{ color: '#D6A84F' }}>R$ {fmt(famaData?.patrocinio_acumulado || 0)}</div></div>
            </Link>
          )}
        </div>
      )}

      {/* PRÓXIMO PASSO — CTA principal */}
      {proximosPassos.length > 0 && (
        <section className="jc-section" style={{ marginBottom: 18 }}>
          <SectionHeader icon="🎯" title="Sua Próxima Jogada" />
          <Link
            to={proximosPassos[0].link}
            className="jc-cta-principal"
            style={{ borderColor: proximosPassos[0].cor + '55', boxShadow: `0 6px 24px ${proximosPassos[0].cor}22` }}
          >
            <div className="jc-cta-icon-wrap" style={{ background: proximosPassos[0].cor + '22', color: proximosPassos[0].cor }}>
              <span>{proximosPassos[0].icone}</span>
            </div>
            <div className="jc-cta-content">
              <div className="jc-cta-titulo">{proximosPassos[0].titulo}</div>
              <div className="jc-cta-desc">{proximosPassos[0].desc}</div>
            </div>
            <span className="jc-cta-btn" style={{ background: proximosPassos[0].cor }}>JOGAR →</span>
          </Link>

          {proximosPassos.length > 1 && (
            <div className="jc-proximos-grid" style={{ marginTop: 10 }}>
              {proximosPassos.slice(1, 3).map((p, i) => (
                <Link key={i} to={p.link} className="jc-proximo-card" style={{ borderLeftColor: p.cor, textDecoration: 'none' }}>
                  <span className="jc-proximo-icon">{p.icone}</span>
                  <div style={{ flex: 1 }}>
                    <div className="jc-proximo-titulo">{p.titulo}</div>
                    <div className="jc-proximo-desc">{p.desc}</div>
                  </div>
                  <span className="jc-proximo-arrow">→</span>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Agenda + Jornal */}
      <div className="jc-grid-2">
        <section className="jc-section">
          <SectionHeader icon="📋" title="Agenda do Dia" right={`${agendaItems.filter(a => a.feito).length}/${agendaItems.length}`} />
          <div>
            {agendaItems.map((item, i) => (
              <Link key={i} to={item.link} style={{ textDecoration: 'none' }}>
                <div className="jc-agenda-item" style={{ borderTop: i > 0 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                  <div className={`jc-agenda-check ${item.feito ? 'done' : 'pending'}`}>{item.feito ? '✓' : ''}</div>
                  <span className={`jc-agenda-text ${item.feito ? 'done' : 'pending'}`}>{item.icone} {item.label}</span>
                  {!item.feito && <span className="jc-agenda-arrow">></span>}
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section className="jc-section">
          <SectionHeader icon="📰" title="Jornal Esportivo" right={<span className="jc-badge danger" style={{ background: 'rgba(239,68,68,0.12)', color: '#ef4444', padding: '3px 10px', borderRadius: 6, fontSize: 10, fontWeight: 800 }}>AO VIVO</span>} />
          <div>
            {noticias.map((n, i) => (
              <div key={i} className="jc-news-item" style={{ borderTop: i > 0 ? '1px solid rgba(255,255,255,0.04)' : 'none' }}>
                <span className="jc-news-icon">{n.icone}</span>
                <span className="jc-news-text">{n.texto}</span>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Acesso Rapido (dinamico por nivel) */}
      <section className="jc-section">
        <SectionHeader icon="⚡" title="Acesso Rapido" />
        <div className="jc-quick-grid">
          {quickLinks.map(({ img, label, to }) => (
            <Link key={to} to={to} className="jc-quick-btn">
              <span className="jc-quick-icon">
                <img src={img} alt="" className="jc-quick-icon-img" />
              </span>
              <span className="jc-quick-label">{label}</span>
            </Link>
          ))}
        </div>
      </section>
    </main>
  )
}
