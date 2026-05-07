import React, { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useGame } from '../context/GameContext'
import API from '../api'
import { fmt } from '../utils'

function getMoralInfo(moral) {
  if (moral >= 81) return { label: 'Em Chamas!', cor: '#f39c12', emoji: '🔥' }
  if (moral >= 61) return { label: 'Motivado', cor: '#27ae60', emoji: '😊' }
  if (moral >= 31) return { label: 'Normal', cor: '#2980b9', emoji: '😐' }
  return { label: 'Desmotivado', cor: '#e74c3c', emoji: '😞' }
}

function gerarNoticias(jogador, historico, progressaoHoje) {
  const noticias = []
  const nome = jogador.nome

  // Combates recentes
  if (historico && historico.length > 0) {
    const recentes = historico.slice(0, 2)
    recentes.forEach(c => {
      const venceu = c.vencedor_id === jogador.id
      const oponente = c.atacante_id === jogador.id ? c.defensor_nome : c.atacante_nome
      if (venceu) {
        noticias.push({ icone: '🏆', texto: `${nome} domina ${oponente} em batalha épica e sobe no ranking!` })
      } else {
        noticias.push({ icone: '💢', texto: `${nome} enfrenta derrota para ${oponente}, mas promete revanche.` })
      }
    })
  }

  // Estado de moral
  const moral = jogador.moral ?? 70
  if (moral >= 81) {
    noticias.push({ icone: '🔥', texto: `${nome} está em chamas! Moral nas alturas após sequência impressionante.` })
  } else if (moral < 31) {
    noticias.push({ icone: '😟', texto: `Fontes próximas revelam que ${nome} passa por um momento de reflexão.` })
  }

  // Rank
  const rank = jogador.rank
  if (rank && rank !== 'Peladeiro' && rank !== 'Desconhecido') {
    noticias.push({ icone: '⭐', texto: `${nome}, ${rank} do futebol nacional, é destaque nas redes sociais esta semana.` })
  }

  // Level marco
  const nivel = jogador.nivel
  if (nivel >= 10 && nivel % 5 === 0) {
    noticias.push({ icone: '📈', texto: `${nome} alcança o nível ${nivel} e chama atenção de olheiros da região!` })
  }

  // Trabalho produtivo
  if (progressaoHoje) {
    const total = Object.values(progressaoHoje.trabalhos_hoje || {}).reduce((a, b) => a + b, 0)
    if (total >= 5) {
      noticias.push({ icone: '💪', texto: `Dia de batalha: ${nome} completa ${total} sessões de trabalho intenso.` })
    }
  }

  // Filler baseado no dia da semana
  const FILLERS = [
    { icone: '📰', texto: 'Mercado de craques esquenta: agentes monitoram jogadores da regiao.' },
    { icone: '🏟️', texto: 'Federacao anuncia novos torneios regionais para a proxima semana.' },
    { icone: '⚽', texto: 'Especialistas analisam o cenario do futebol amador nacional.' },
    { icone: '🥇', texto: 'Temporada promete ser historica para jogadores em ascensao.' },
    { icone: '📊', texto: 'Ranking semanal atualizado: confira as maiores subidas!' },
    { icone: '🎯', texto: 'Treinadores recomendam foco em atributos fisicos nesta fase da temporada.' },
    { icone: '💰', texto: 'Patrocinadores aumentam investimentos no futebol nacional.' },
  ]
  const dia = new Date().getDay()
  noticias.push(FILLERS[dia % FILLERS.length])
  if (noticias.length < 4) noticias.push(FILLERS[(dia + 2) % FILLERS.length])

  return noticias.slice(0, 5)
}

export default function Dashboard() {
  const { jogador, jogadorID, getAvatar } = useGame()
  const [pendencias, setPendencias] = useState({ casa: null, campinho: null, fama: null })
  const [historico, setHistorico] = useState([])
  const [progressaoHoje, setProgressaoHoje] = useState(null)
  const [tasks, setTasks] = useState([])

  const carregar = useCallback(async () => {
    if (!jogadorID) return
    try {
      const [casa, campinho, fama, hist, prog, tsk] = await Promise.all([
        API.get('/api/casa/' + jogadorID).catch(() => null),
        API.get('/api/campinho/' + jogadorID).catch(() => null),
        API.get('/api/fama/' + jogadorID).catch(() => null),
        API.get('/api/combates/historico?jogador_id=' + jogadorID).catch(() => []),
        API.get('/api/progressao/hoje/' + jogadorID).catch(() => null),
        API.get('/api/tasks/' + jogadorID).catch(() => []),
      ])
      setPendencias({ casa, campinho, fama })
      setHistorico(Array.isArray(hist) ? hist : [])
      setProgressaoHoje(prog)
      setTasks(Array.isArray(tsk) ? tsk : [])
    } catch (e) {}
  }, [jogadorID])

  useEffect(() => { carregar() }, [carregar])

  if (!jogador) return null

  const moral = jogador.moral ?? 70
  const moralInfo = getMoralInfo(moral)

  // Pendencias
  const casaData = pendencias.casa?.casa
  const campinhoData = pendencias.campinho?.campinho
  const famaData = pendencias.fama

  const casaPendente = (casaData?.xp_disponivel > 0 || casaData?.energia_disponivel > 0)
  const campinhoPendente = campinhoData && !campinhoData.bonus_hoje
  const patrocinioPendente = (famaData?.patrocinio_acumulado || 0) > 0
  const temPendencias = casaPendente || campinhoPendente || patrocinioPendente

  // Agenda
  const totalTrabalhos = progressaoHoje
    ? Object.values(progressaoHoje.trabalhos_hoje || {}).reduce((a, b) => a + b, 0)
    : 0

  const agendaItems = [
    {
      feito: totalTrabalhos > 0,
      label: totalTrabalhos > 0 ? `Trabalhou hoje (${totalTrabalhos}x)` : 'Trabalhar hoje',
      link: '/carreira',
      icone: '⚽',
    },
  ]
  if (campinhoData) {
    agendaItems.push({
      feito: campinhoData.bonus_hoje === true,
      label: 'Bonus do campinho coletado',
      link: '/vida',
      icone: '🏟️',
    })
  }
  if (casaData?.tipo) {
    agendaItems.push({
      feito: !casaPendente,
      label: 'Bonus da casa coletado',
      link: '/vida',
      icone: '🏠',
    })
  }
  if (famaData?.rank?.patrocinio) {
    agendaItems.push({
      feito: !patrocinioPendente,
      label: 'Patrocinio coletado',
      link: '/jogador',
      icone: '⭐',
    })
  }
  const tasksDiarias = tasks.filter(t => !t.completada && !t.coletada)
  if (tasksDiarias.length > 0) {
    agendaItems.push({
      feito: tasksDiarias.length === 0,
      label: `${tasksDiarias.length} tarefa(s) pendente(s)`,
      link: '/missoes',
      icone: '📋',
    })
  } else if (tasks.length > 0) {
    agendaItems.push({
      feito: true,
      label: 'Todas as tarefas do dia concluidas',
      link: '/missoes',
      icone: '📋',
    })
  }

  const noticias = gerarNoticias(jogador, historico, progressaoHoje)
  const mostrarHistoria = jogador.nivel < 4

  const ACESSO_RAPIDO = [
    { icon: '⚽', label: 'Trabalhar', to: '/carreira' },
    { icon: '🥊', label: 'Desafio 1v1', to: '/carreira?aba=desafio' },
    { icon: '🏋️', label: 'Treino', to: '/treino' },
    { icon: '👤', label: 'Meu Jogador', to: '/jogador' },
    { icon: '🏡', label: 'Minha Vida', to: '/vida' },
    { icon: '🛒', label: 'Loja', to: '/loja' },
  ]

  return (
    <div style={{ maxWidth: 620, margin: '0 auto' }}>

      {/* === HERO CARD === */}
      <div style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        borderRadius: 16, padding: '20px 22px', marginBottom: 14, color: '#fff',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: -20, right: -20, fontSize: 80, opacity: 0.06 }}>⚽</div>

        {/* Nome + Moral */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
          <div style={{
            fontSize: 40, background: 'rgba(255,255,255,0.1)', borderRadius: '50%',
            width: 56, height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            {getAvatar(jogador.avatar)}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 900, fontSize: 17, fontFamily: 'var(--font-titulo)' }}>{jogador.nome}</div>
            <div style={{ fontSize: 11, color: '#90cdf4', fontWeight: 700 }}>
              {jogador.rank || 'Peladeiro'} · Nivel {jogador.nivel}
            </div>
            {jogador.clube_nome && (
              <div style={{ fontSize: 11, color: '#68d391', marginTop: 2 }}>{jogador.clube_nome}</div>
            )}
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: 1 }}>Moral</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: moralInfo.cor }}>{moralInfo.emoji} {moral}</div>
            <div style={{ fontSize: 10, color: moralInfo.cor, fontWeight: 700 }}>{moralInfo.label}</div>
          </div>
        </div>

        {/* Barras de status */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {[
            { label: 'Energia', icon: '⚡', val: jogador.energia, max: jogador.energia_max, cor: '#f6e05e' },
            { label: 'Saude', icon: '❤️', val: jogador.saude, max: 100, cor: '#fc8181' },
            { label: 'XP', icon: '📊', val: jogador.xp, max: jogador.xp_proximo, cor: '#68d391' },
          ].map(({ label, icon, val, max, cor }) => {
            const pct = Math.min(100, Math.round((val / max) * 100))
            return (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 12, width: 68, flexShrink: 0, color: 'rgba(255,255,255,0.65)' }}>
                  {icon} {label}
                </span>
                <div style={{ flex: 1, background: 'rgba(255,255,255,0.1)', borderRadius: 6, height: 7, overflow: 'hidden' }}>
                  <div style={{ width: pct + '%', height: '100%', background: cor, borderRadius: 6, transition: 'width 0.4s' }} />
                </div>
                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', width: 52, textAlign: 'right', flexShrink: 0 }}>
                  {val}/{max}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* === BANNER HISTORIA (nivel < 4) === */}
      {mostrarHistoria && (
        <div style={{
          background: 'linear-gradient(135deg, #ff7a00, #e74c3c)',
          borderRadius: 12, padding: '14px 16px', marginBottom: 14, color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 14 }}>Missao de origem pendente!</div>
            <div style={{ fontSize: 11, marginTop: 3, opacity: 0.9 }}>
              Complete a historia para desbloquear o jogo completo.
            </div>
          </div>
          <Link to="/historia" style={{
            background: '#fff', color: '#e74c3c', fontWeight: 900, fontSize: 12,
            padding: '8px 14px', borderRadius: 8, textDecoration: 'none', whiteSpace: 'nowrap',
          }}>
            Jogar agora
          </Link>
        </div>
      )}

      {/* === COLETAS PENDENTES === */}
      {temPendencias && (
        <div style={{ marginBottom: 14 }}>
          <div style={{
            fontSize: 11, fontWeight: 900, color: '#888', marginBottom: 8,
            textTransform: 'uppercase', letterSpacing: 1,
          }}>
            Coletas disponiveis
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {casaPendente && (
              <Link to="/vida" style={{
                background: 'linear-gradient(135deg, #27ae60, #2ecc71)', color: '#fff',
                borderRadius: 10, padding: '8px 14px', textDecoration: 'none',
                fontSize: 12, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 5,
              }}>
                🏠 Bonus da Casa
              </Link>
            )}
            {campinhoPendente && (
              <Link to="/vida" style={{
                background: 'linear-gradient(135deg, #2980b9, #3498db)', color: '#fff',
                borderRadius: 10, padding: '8px 14px', textDecoration: 'none',
                fontSize: 12, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 5,
              }}>
                🏟️ Bonus Campinho
              </Link>
            )}
            {patrocinioPendente && (
              <Link to="/jogador" style={{
                background: 'linear-gradient(135deg, #f39c12, #e67e22)', color: '#fff',
                borderRadius: 10, padding: '8px 14px', textDecoration: 'none',
                fontSize: 12, fontWeight: 900, display: 'flex', alignItems: 'center', gap: 5,
              }}>
                ⭐ Patrocinio R$ {fmt(famaData?.patrocinio_acumulado || 0)}
              </Link>
            )}
          </div>
        </div>
      )}

      {/* === AGENDA DO DIA === */}
      <div className="pf-section" style={{ marginBottom: 14 }}>
        <div className="pf-section-header">
          <h3>AGENDA DO DIA</h3>
          <span className="pf-section-badge">
            {agendaItems.filter(a => a.feito).length}/{agendaItems.length} concluidos
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
          {agendaItems.map((item, i) => (
            <Link key={i} to={item.link} style={{ textDecoration: 'none' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                background: item.feito ? '#eafaf1' : '#f9f9f9',
                border: `2px solid ${item.feito ? '#82e0aa' : '#e0e0e0'}`,
                borderRadius: 10, transition: 'border-color 0.2s',
              }}>
                <div style={{
                  width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                  background: item.feito ? '#27ae60' : '#e0e0e0',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, color: '#fff', fontWeight: 900,
                }}>
                  {item.feito ? '✓' : ''}
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: item.feito ? '#27ae60' : '#333', flex: 1 }}>
                  {item.icone} {item.label}
                </span>
                {!item.feito && <span style={{ fontSize: 12, color: '#bbb' }}>→</span>}
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* === JORNAL ESPORTIVO === */}
      <div className="pf-section" style={{ marginBottom: 14 }}>
        <div className="pf-section-header">
          <h3>JORNAL ESPORTIVO</h3>
          <span className="pf-section-badge" style={{
            background: '#e74c3c', color: '#fff', borderRadius: 6, padding: '2px 7px', fontSize: 10,
          }}>
            AO VIVO
          </span>
        </div>
        <div>
          {noticias.map((n, i) => (
            <div key={i} style={{
              display: 'flex', gap: 10, padding: '10px 2px',
              borderBottom: i < noticias.length - 1 ? '1px solid #f0f0f0' : 'none',
              alignItems: 'flex-start',
            }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>{n.icone}</span>
              <span style={{ fontSize: 12, color: '#333', lineHeight: 1.6 }}>{n.texto}</span>
            </div>
          ))}
        </div>
      </div>

      {/* === ACESSO RAPIDO === */}
      <div className="pf-section">
        <div className="pf-section-header"><h3>ACESSO RAPIDO</h3></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
          {ACESSO_RAPIDO.map(({ icon, label, to }) => (
            <Link key={to} to={to} style={{ textDecoration: 'none' }}>
              <div style={{
                background: '#f8f9fa', border: '2px solid #e9ecef', borderRadius: 12,
                padding: '14px 8px', textAlign: 'center',
                transition: 'border-color 0.2s, background 0.2s',
              }}>
                <div style={{ fontSize: 26, marginBottom: 5 }}>{icon}</div>
                <div style={{ fontSize: 11, fontWeight: 900, color: '#333' }}>{label}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

    </div>
  )
}
