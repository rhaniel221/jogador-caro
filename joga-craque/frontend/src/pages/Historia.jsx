import React, { useState, useEffect, useCallback } from 'react'
import { useGame } from '../context/GameContext'
import API from '../api'

const FASES = {
  1: { titulo: 'O Sonho', icone: '💭', cor: '#1a7dff' },
  2: { titulo: 'O Campinho', icone: '🏟️', cor: '#00b848', arte: '/estadios/campo-simples.png', desbloqueio: 'Campinho Simples Liberado!' },
  3: { titulo: 'O Estádio', icone: '⚽', cor: '#ff7a00', arte: '/estadio.png', desbloqueio: 'Acesso ao Estádio Liberado!' },
}

function TimerDisplay({ inicioEm, tempoMinutos, onDone }) {
  const [restante, setRestante] = useState(0)

  useEffect(() => {
    if (!inicioEm) return
    const fim = inicioEm + tempoMinutos * 60

    function tick() {
      const agora = Math.floor(Date.now() / 1000)
      const diff = fim - agora
      if (diff <= 0) {
        setRestante(0)
        onDone?.()
      } else {
        setRestante(diff)
      }
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [inicioEm, tempoMinutos, onDone])

  if (restante <= 0) return null
  const min = Math.floor(restante / 60)
  const seg = restante % 60
  return (
    <span className="missao-timer">
      {min}:{seg.toString().padStart(2, '0')}
    </span>
  )
}

function MissaoCard({ missao, onExecutar, onPular, loading }) {
  const isLoading = loading === missao.id
  const { status, tipo, vezes_feitas, vezes_necessarias, tempo_minutos, inicio_em } = missao
  const [timerDone, setTimerDone] = useState(false)

  const bloqueada = status === 'bloqueada'
  const completada = status === 'completada'
  const emTimer = status === 'timer' && !timerDone
  const disponivel = status === 'disponivel' || timerDone

  const pct = tipo === 'repetivel' && vezes_necessarias > 0
    ? Math.round((vezes_feitas / vezes_necessarias) * 100)
    : 0

  let statusClass = ''
  if (completada) statusClass = ' missao-completa'
  else if (bloqueada) statusClass = ' missao-bloqueada'
  else if (emTimer) statusClass = ' missao-timer-ativo'
  else statusClass = ' missao-disponivel'

  let btnLabel = 'Iniciar'
  if (tipo === 'repetivel') btnLabel = `Fazer (${vezes_feitas}/${vezes_necessarias})`
  if (tipo === 'timer' && !inicio_em) btnLabel = 'Iniciar'
  if (tipo === 'timer' && inicio_em && disponivel) btnLabel = 'Concluir'
  if (completada) btnLabel = 'Concluída'

  return (
    <div className={`missao-card${statusClass}`}>
      <div className="missao-header">
        <span className="missao-icone">{missao.icone}</span>
        <div className="missao-info">
          <h3 className="missao-nome">{missao.nome}</h3>
          <p className="missao-desc">{missao.descricao}</p>
        </div>
        {completada && <span className="missao-check">✅</span>}
      </div>

      {tipo === 'repetivel' && !completada && vezes_feitas > 0 && (
        <div className="missao-progress">
          <div className="missao-progress-track">
            <div className="missao-progress-fill" style={{ width: Math.min(100, pct) + '%' }} />
          </div>
          <span className="missao-progress-text">{vezes_feitas}/{vezes_necessarias}</span>
        </div>
      )}

      {emTimer && (
        <div className="missao-timer-row">
          <TimerDisplay
            inicioEm={inicio_em}
            tempoMinutos={tempo_minutos}
            onDone={() => setTimerDone(true)}
          />
          <button className="btn-pular" onClick={() => onPular(missao.id)} disabled={isLoading}>
            💎 Pular (1 moeda)
          </button>
        </div>
      )}

      {!completada && !bloqueada && (
        <div className="missao-rewards">
          {missao.recompensa_xp > 0 && <span className="mr-xp">+{missao.recompensa_xp} XP</span>}
          {missao.recompensa_dinheiro > 0 && <span className="mr-money">+R$ {missao.recompensa_dinheiro}</span>}
          {missao.recompensa_moedas > 0 && <span className="mr-coins">+{missao.recompensa_moedas} 💎</span>}
          {missao.custo_energia > 0 && <span className="mr-energy">⚡ {missao.custo_energia}</span>}
        </div>
      )}

      {!completada && !bloqueada && !emTimer && (
        <button
          className="btn-work btn-missao"
          onClick={() => onExecutar(missao.id)}
          disabled={isLoading}
        >
          {isLoading ? '...' : btnLabel}
        </button>
      )}

      {bloqueada && (
        <div className="missao-lock">🔒 Complete a missão anterior</div>
      )}
    </div>
  )
}

export default function Historia() {
  const { jogador, setJogador, mostrarNotificacao, jogadorID, setLevelUp, pushDialogo } = useGame()
  const [missoes, setMissoes] = useState([])
  const [loading, setLoading] = useState(null)

  const carregarMissoes = useCallback(() => {
    if (!jogadorID) return
    API.get('/api/missoes/' + jogadorID)
      .then(setMissoes)
      .catch(() => {})
  }, [jogadorID])

  useEffect(() => {
    carregarMissoes()
  }, [carregarMissoes])

  const faseAtiva = (() => {
    for (const m of missoes) {
      if (!m.completada) return m.fase
    }
    return 3
  })()

  const todasCompletas = missoes.length > 0 && missoes.every(m => m.completada)
  const missoesFase = missoes.filter(m => m.fase === faseAtiva)
  const faseInfo = FASES[faseAtiva] || FASES[1]

  async function handleExecutar(missaoID) {
    setLoading(missaoID)
    try {
      const missao = missoes.find(m => m.id === missaoID)

      // Mostra diálogo de início ANTES de chamar a API (na fila)
      if (missao?.dialogo_inicio && missao.status === 'disponivel' && missao.vezes_feitas === 0) {
        pushDialogo({ tipo: 'dialogo', texto: missao.dialogo_inicio, icone: missao.icone })
      }

      const res = await API.post('/api/missao/executar', {
        jogador_id: jogadorID,
        missao_id: missaoID,
      })

      if (res.sucesso) {
        if (res.jogador) setJogador(res.jogador)

        // Diálogo de resposta (na fila, aparece depois do primeiro)
        if (res.dialogo) {
          pushDialogo({ tipo: 'dialogo', texto: res.dialogo, icone: missao?.icone })
        }

        if (res.missao?.completada) {
          mostrarNotificacao('Missão concluída! ' + (missao?.nome || ''), 'sucesso')

          // Verifica se completou a última missão da fase → novo capítulo
          const faseAtualMissoes = missoes.filter(m => m.fase === missao.fase)
          const outrasCompletas = faseAtualMissoes.filter(m => m.id !== missaoID).every(m => m.completada)
          if (outrasCompletas) {
            const proxFase = FASES[missao.fase + 1]
            if (proxFase) {
              pushDialogo({
                tipo: 'novo_capitulo',
                fase: missao.fase + 1,
                titulo: proxFase.titulo,
                icone: proxFase.icone,
                desbloqueio: proxFase.desbloqueio,
                arte: proxFase.arte,
              })
            }
          }
        } else if (res.mensagem && !res.dialogo) {
          mostrarNotificacao(res.mensagem, 'sucesso')
        }

        if (res.level_up) {
          setLevelUp(res.novo_nivel)
        }

        carregarMissoes()
      } else {
        mostrarNotificacao(res.mensagem || 'Não foi possível.', 'erro')
      }
    } catch {
      mostrarNotificacao('Erro de conexão.', 'erro')
    }
    setLoading(null)
  }

  async function handlePular(missaoID) {
    setLoading(missaoID)
    try {
      const res = await API.post('/api/missao/pular', {
        jogador_id: jogadorID,
        missao_id: missaoID,
      })
      if (res.sucesso) {
        if (res.jogador) setJogador(res.jogador)
        mostrarNotificacao('Tempo pulado! 💎', 'sucesso')
        // Após pular o timer, executa a missão direto (conclui + mostra diálogos)
        setLoading(null)
        await handleExecutar(missaoID)
        return
      } else {
        mostrarNotificacao(res.mensagem || 'Não foi possível.', 'erro')
      }
    } catch {
      mostrarNotificacao('Erro de conexão.', 'erro')
    }
    setLoading(null)
  }

  return (
    <>
      <div className="historia-header">
        <span className="historia-fase-icone">{faseInfo.icone}</span>
        <div>
          <h2 className="historia-titulo">FASE {faseAtiva}: {faseInfo.titulo}</h2>
          <p className="historia-sub">Complete as missões para avançar na história</p>
        </div>
      </div>

      <div className="fases-progress">
        {Object.entries(FASES).map(([num, info]) => {
          const n = parseInt(num)
          const done = n < faseAtiva || todasCompletas
          const active = n === faseAtiva && !todasCompletas
          return (
            <div key={n} className={`fase-dot${done ? ' done' : ''}${active ? ' active' : ''}`}>
              <span className="fase-dot-icone">{info.icone}</span>
              <span className="fase-dot-label">{info.titulo}</span>
            </div>
          )
        })}
      </div>

      {todasCompletas ? (
        <div className="historia-completa">
          <span className="historia-completa-icone">🏆</span>
          <h2>Parabéns!</h2>
          <p>Você completou todas as missões da história!</p>
          <p>Agora sua <strong>carreira profissional</strong> começa. Acesse os <strong>Trabalhos</strong> pelo menu!</p>
        </div>
      ) : (
        <div className="missoes-lista" data-tutorial="missoes-lista">
          {missoesFase.map(m => (
            <MissaoCard
              key={m.id}
              missao={m}
              onExecutar={handleExecutar}
              onPular={handlePular}
              loading={loading}
            />
          ))}
        </div>
      )}
    </>
  )
}
