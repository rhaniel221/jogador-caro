import React, { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useGame } from '../context/GameContext'
import API from '../api'
import { fmt } from '../utils'

function getMoralInfo(moral) {
  if (moral >= 81) return { label: 'Em Chamas!', cor: '#D6A84F', emoji: '🔥' }
  if (moral >= 61) return { label: 'Motivado', cor: '#22c55e', emoji: '😊' }
  if (moral >= 31) return { label: 'Normal', cor: '#38A8F8', emoji: '😐' }
  return { label: 'Desmotivado', cor: '#ef4444', emoji: '😞' }
}

function gerarNoticias(jogador, historico, progressaoHoje) {
  const noticias = []
  const nome = jogador.nome

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

  const moral = jogador.moral ?? 70
  if (moral >= 81) {
    noticias.push({ icone: '🔥', texto: `${nome} está em chamas! Moral nas alturas após sequência impressionante.` })
  } else if (moral < 31) {
    noticias.push({ icone: '😟', texto: `Fontes próximas revelam que ${nome} passa por um momento de reflexão.` })
  }

  const rank = jogador.rank
  if (rank && rank !== 'Peladeiro' && rank !== 'Desconhecido') {
    noticias.push({ icone: '⭐', texto: `${nome}, ${rank} do futebol nacional, é destaque nas redes sociais esta semana.` })
  }

  if (progressaoHoje) {
    const total = Object.values(progressaoHoje.trabalhos_hoje || {}).reduce((a, b) => a + b, 0)
    if (total >= 5) {
      noticias.push({ icone: '💪', texto: `Dia de batalha: ${nome} completa ${total} sessões de trabalho intenso.` })
    }
  }

  const FILLERS = [
    { icone: '📰', texto: 'Mercado de craques esquenta: agentes monitoram jogadores da região.' },
    { icone: '🏟️', texto: 'Federação anuncia novos torneios regionais para a próxima semana.' },
    { icone: '⚽', texto: 'Especialistas analisam o cenário do futebol amador nacional.' },
    { icone: '🥇', texto: 'Temporada promete ser histórica para jogadores em ascensão.' },
    { icone: '📊', texto: 'Ranking semanal atualizado: confira as maiores subidas!' },
    { icone: '🎯', texto: 'Treinadores recomendam foco em atributos físicos nesta fase.' },
    { icone: '💰', texto: 'Patrocinadores aumentam investimentos no futebol nacional.' },
  ]
  const dia = new Date().getDay()
  noticias.push(FILLERS[dia % FILLERS.length])
  if (noticias.length < 4) noticias.push(FILLERS[(dia + 2) % FILLERS.length])

  return noticias.slice(0, 5)
}

const S = {
  card: {
    background: '#0D1B2F',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  cardHead: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '14px 18px 10px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  cardTitle: {
    fontFamily: "'Teko', sans-serif",
    fontWeight: 600, fontSize: 17, textTransform: 'uppercase',
    letterSpacing: 2, color: '#F8FAFC',
  },
  cardTitleBar: {
    width: 3, height: 16, background: '#D6A84F',
    borderRadius: 2, display: 'inline-block', marginRight: 8, verticalAlign: 'middle',
  },
  cardBody: { padding: '8px 18px 16px' },
  badge: {
    fontSize: 10, fontWeight: 800, padding: '3px 10px',
    borderRadius: 6, textTransform: 'uppercase', letterSpacing: 0.5,
  },
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

  const casaData = pendencias.casa?.casa
  const campinhoData = pendencias.campinho?.campinho
  const famaData = pendencias.fama

  const casaPendente = (casaData?.xp_disponivel > 0 || casaData?.energia_disponivel > 0)
  const campinhoPendente = campinhoData && !campinhoData.bonus_hoje
  const patrocinioPendente = (famaData?.patrocinio_acumulado || 0) > 0
  const temPendencias = casaPendente || campinhoPendente || patrocinioPendente

  const totalTrabalhos = progressaoHoje
    ? Object.values(progressaoHoje.trabalhos_hoje || {}).reduce((a, b) => a + b, 0)
    : 0

  const agendaItems = [
    {
      feito: totalTrabalhos > 0,
      label: totalTrabalhos > 0 ? `Trabalhou hoje (${totalTrabalhos}x)` : 'Trabalhar hoje',
      link: '/carreira', icone: '⚽',
    },
  ]
  if (campinhoData) {
    agendaItems.push({ feito: campinhoData.bonus_hoje === true, label: 'Bonus do campinho coletado', link: '/vida', icone: '🏟️' })
  }
  if (casaData?.tipo) {
    agendaItems.push({ feito: !casaPendente, label: 'Bonus da casa coletado', link: '/vida', icone: '🏠' })
  }
  if (famaData?.rank?.patrocinio) {
    agendaItems.push({ feito: !patrocinioPendente, label: 'Patrocinio coletado', link: '/jogador', icone: '⭐' })
  }
  const tasksDiarias = tasks.filter(t => !t.completada && !t.coletada)
  if (tasksDiarias.length > 0) {
    agendaItems.push({ feito: false, label: `${tasksDiarias.length} tarefa(s) pendente(s)`, link: '/missoes', icone: '📋' })
  } else if (tasks.length > 0) {
    agendaItems.push({ feito: true, label: 'Todas as tarefas concluidas', link: '/missoes', icone: '📋' })
  }

  const noticias = gerarNoticias(jogador, historico, progressaoHoje)
  const mostrarHistoria = jogador.nivel < 4

  const ACESSO_RAPIDO = [
    { icon: '⚽', label: 'Trabalhar', to: '/carreira' },
    { icon: '🎮', label: 'MiniGame', to: '/carreira?aba=minigame' },
    { icon: '🥊', label: 'Desafio 1v1', to: '/carreira?aba=desafio' },
    { icon: '🏋️', label: 'Treino', to: '/treino' },
    { icon: '👤', label: 'Meu Jogador', to: '/jogador' },
    { icon: '🛒', label: 'Loja', to: '/loja' },
  ]

  return (
    <div style={{ maxWidth: 660, margin: '0 auto' }}>

      {/* === HERO COM CAPA === */}
      <div style={{
        borderRadius: 16, marginBottom: 16, color: '#F8FAFC',
        position: 'relative', overflow: 'hidden',
        border: '1px solid rgba(214,168,79,0.1)',
        backgroundImage: 'url(/capa.png)',
        backgroundSize: 'cover', backgroundPosition: 'center',
        minHeight: 200,
      }}>
        {/* Overlay escuro pra legibilidade */}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg, rgba(6,17,31,0.85) 0%, rgba(6,17,31,0.6) 50%, rgba(6,17,31,0.4) 100%)', pointerEvents: 'none' }} />
        {/* Linha dourada no topo */}
        <div style={{ position: 'absolute', top: 0, left: '10%', right: '10%', height: 1, background: 'linear-gradient(90deg, transparent, rgba(214,168,79,0.4), transparent)', pointerEvents: 'none' }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18, position: 'relative', zIndex: 1, padding: '24px 22px 0' }}>
          <div style={{
            fontSize: 40, background: 'rgba(6,17,31,0.6)', borderRadius: 14,
            width: 64, height: 64, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            border: '2px solid rgba(214,168,79,0.3)', boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
          }}>
            {getAvatar(jogador.avatar)}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: "'Teko', sans-serif", fontWeight: 700, fontSize: 28, letterSpacing: 1, lineHeight: 1, textTransform: 'uppercase' }}>
              {jogador.nome}
            </div>
            <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 700, marginTop: 3 }}>
              {jogador.rank || 'Peladeiro'} &middot; Nivel {jogador.nivel}
            </div>
            {jogador.clube_nome && (
              <div style={{ fontSize: 11, color: '#22c55e', marginTop: 2 }}>{jogador.clube_nome}</div>
            )}
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{
              width: 68, height: 68, borderRadius: '50%', border: `3px solid ${moralInfo.cor}`,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 0 20px ${moralInfo.cor}22`,
            }}>
              <div style={{ fontFamily: "'Teko', sans-serif", fontSize: 28, fontWeight: 700, lineHeight: 1, color: '#fff' }}>{moral}</div>
              <div style={{ fontSize: 7, textTransform: 'uppercase', letterSpacing: 1, color: '#94A3B8' }}>Moral</div>
            </div>
            <div style={{ fontSize: 10, color: moralInfo.cor, fontWeight: 700, marginTop: 3 }}>{moralInfo.emoji} {moralInfo.label}</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, position: 'relative', zIndex: 1, padding: '0 22px 22px' }}>
          {[
            { label: 'Energia', icon: '⚡', val: jogador.energia, max: jogador.energia_max, cor: '#D6A84F' },
            { label: 'Saude', icon: '❤️', val: jogador.saude, max: 100, cor: '#ef4444' },
            { label: 'XP', icon: '📊', val: jogador.xp, max: jogador.xp_proximo, cor: '#0F5FD6' },
          ].map(({ label, icon, val, max, cor }) => {
            const pct = Math.min(100, Math.round((val / max) * 100))
            return (
              <div key={label} style={{ flex: 1, background: 'rgba(0,0,0,0.25)', borderRadius: 8, padding: '10px 12px', border: '1px solid rgba(255,255,255,0.04)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, fontWeight: 700, marginBottom: 5, textTransform: 'uppercase', letterSpacing: 0.5, color: '#94A3B8' }}>
                  <span>{icon} {label}</span>
                  <span style={{ color: '#F8FAFC' }}>{val}/{max}</span>
                </div>
                <div style={{ height: 5, background: 'rgba(255,255,255,0.06)', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ width: pct + '%', height: '100%', background: cor, borderRadius: 4, transition: 'width 0.6s' }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* === HISTORIA BANNER === */}
      {mostrarHistoria && (
        <div style={{
          background: 'linear-gradient(135deg, #0F5FD6, #0B4DB8)',
          borderRadius: 12, padding: '14px 16px', marginBottom: 16, color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 14 }}>Missao de origem pendente!</div>
            <div style={{ fontSize: 11, marginTop: 3, opacity: 0.8 }}>Complete a historia para desbloquear o jogo completo.</div>
          </div>
          <Link to="/historia" style={{
            background: '#fff', color: '#0F5FD6', fontWeight: 900, fontSize: 12,
            padding: '8px 14px', borderRadius: 8, textDecoration: 'none', whiteSpace: 'nowrap',
          }}>
            Jogar agora
          </Link>
        </div>
      )}

      {/* === COLETAS === */}
      {temPendencias && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          {casaPendente && (
            <Link to="/vida" style={{
              flex: 1, display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
              background: '#0D1B2F', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)',
              borderLeft: '3px solid #22c55e', textDecoration: 'none', color: '#F8FAFC',
            }}>
              <span style={{ fontSize: 22 }}>🏠</span>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' }}>Casa</div>
                <div style={{ fontFamily: "'Teko', sans-serif", fontWeight: 600, fontSize: 16, color: '#22c55e' }}>Coletar</div>
              </div>
            </Link>
          )}
          {campinhoPendente && (
            <Link to="/vida" style={{
              flex: 1, display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
              background: '#0D1B2F', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)',
              borderLeft: '3px solid #0F5FD6', textDecoration: 'none', color: '#F8FAFC',
            }}>
              <span style={{ fontSize: 22 }}>🏟️</span>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' }}>Campinho</div>
                <div style={{ fontFamily: "'Teko', sans-serif", fontWeight: 600, fontSize: 16, color: '#38A8F8' }}>Coletar</div>
              </div>
            </Link>
          )}
          {patrocinioPendente && (
            <Link to="/jogador" style={{
              flex: 1, display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px',
              background: '#0D1B2F', borderRadius: 10, border: '1px solid rgba(255,255,255,0.08)',
              borderLeft: '3px solid #D6A84F', textDecoration: 'none', color: '#F8FAFC',
            }}>
              <span style={{ fontSize: 22 }}>⭐</span>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase' }}>Patrocinio</div>
                <div style={{ fontFamily: "'Teko', sans-serif", fontWeight: 600, fontSize: 16, color: '#D6A84F' }}>R$ {fmt(famaData?.patrocinio_acumulado || 0)}</div>
              </div>
            </Link>
          )}
        </div>
      )}

      {/* === AGENDA DO DIA === */}
      <div style={S.card}>
        <div style={S.cardHead}>
          <div style={S.cardTitle}><span style={S.cardTitleBar} />Agenda do Dia</div>
          <span style={{ ...S.badge, background: 'rgba(34,197,94,0.12)', color: '#22c55e' }}>
            {agendaItems.filter(a => a.feito).length}/{agendaItems.length}
          </span>
        </div>
        <div style={S.cardBody}>
          {agendaItems.map((item, i) => (
            <Link key={i} to={item.link} style={{ textDecoration: 'none' }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12, padding: '11px 0',
                borderTop: i > 0 ? '1px solid rgba(255,255,255,0.04)' : 'none',
              }}>
                <div style={{
                  width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                  background: item.feito ? '#22c55e' : 'transparent',
                  border: item.feito ? '2px solid #22c55e' : '2px dashed #475569',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, color: '#fff', fontWeight: 900,
                  boxShadow: item.feito ? '0 0 8px rgba(34,197,94,0.3)' : 'none',
                }}>
                  {item.feito ? '✓' : ''}
                </div>
                <span style={{ fontSize: 13, fontWeight: 600, color: item.feito ? '#22c55e' : '#94A3B8', flex: 1 }}>
                  {item.icone} {item.label}
                </span>
                {!item.feito && <span style={{ fontSize: 14, color: '#475569' }}>›</span>}
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* === JORNAL ESPORTIVO === */}
      <div style={S.card}>
        <div style={S.cardHead}>
          <div style={S.cardTitle}><span style={S.cardTitleBar} />Jornal Esportivo</div>
          <span style={{ ...S.badge, background: 'rgba(239,68,68,0.12)', color: '#ef4444' }}>AO VIVO</span>
        </div>
        <div style={S.cardBody}>
          {noticias.map((n, i) => (
            <div key={i} style={{
              display: 'flex', gap: 10, padding: '11px 0',
              borderTop: i > 0 ? '1px solid rgba(255,255,255,0.04)' : 'none',
              alignItems: 'flex-start',
            }}>
              <span style={{ fontSize: 20, flexShrink: 0 }}>{n.icone}</span>
              <span style={{ fontSize: 12, color: '#94A3B8', lineHeight: 1.6 }}>{n.texto}</span>
            </div>
          ))}
        </div>
      </div>

      {/* === ACESSO RAPIDO === */}
      <div style={S.card}>
        <div style={S.cardHead}>
          <div style={S.cardTitle}><span style={S.cardTitleBar} />Acesso Rapido</div>
        </div>
        <div style={{ padding: '12px 18px 16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {ACESSO_RAPIDO.map(({ icon, label, to }) => (
              <Link key={to} to={to} style={{ textDecoration: 'none' }}>
                <div style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                  padding: '16px 8px', background: '#112740', borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.06)',
                  transition: 'all 0.2s', cursor: 'pointer',
                }}>
                  <div style={{ fontSize: 28 }}>{icon}</div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>

    </div>
  )
}
