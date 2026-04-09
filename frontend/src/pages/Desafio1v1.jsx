import React, { useState, useEffect } from 'react'
import { useGame } from '../context/GameContext'
import API from '../api'

const DIRECOES = ['esquerda', 'centro', 'direita']
const DIR_EMOJI = { esquerda: '⬅️', centro: '⬆️', direita: '➡️' }

function GolView({ onChutar, disabled, numero, fase }) {
  return (
    <div className="gol-container">
      <div className="gol-numero">
        {fase === 'chute' ? `⚽ Chute ${numero}/5` : `🧤 Defesa ${numero}/5`}
      </div>
      <div className={`gol-frame ${fase === 'defesa' ? 'gol-defesa' : ''}`}>
        <div className="gol-rede" />
        <div className="gol-zones">
          {DIRECOES.map(dir => (
            <button
              key={dir}
              className={`gol-zone gol-${dir}`}
              onClick={() => onChutar(dir)}
              disabled={disabled}
            >
              <span className="gol-zone-icon">{fase === 'chute' ? '⚽' : '🧤'}</span>
              <span className="gol-zone-label">
                {dir === 'esquerda' ? 'Esquerda' : dir === 'centro' ? 'Centro' : 'Direita'}
              </span>
            </button>
          ))}
        </div>
        <div className="gol-trave-esq" />
        <div className="gol-trave-dir" />
        <div className="gol-travessao" />
      </div>
    </div>
  )
}

function ResultadoChute({ num, chute, defesa, gol }) {
  return (
    <div className={`resultado-chute ${gol ? 'gol' : 'defesa'}`}>
      <span className="rc-num">{num}</span>
      <span className="rc-chute">{DIR_EMOJI[chute]} {chute}</span>
      <span className="rc-vs">vs</span>
      <span className="rc-defesa">{DIR_EMOJI[defesa]} {defesa}</span>
      <span className="rc-result">{gol ? '⚽ GOL!' : '🧤 DEFESA!'}</span>
    </div>
  )
}

function MatchResult({ desafio, jogadorID }) {
  const ganhei = desafio.vencedor_id === jogadorID
  const empate = desafio.vencedor_id === 0
  const gols = desafio.gols_desafiante
  const defesas = 5 - gols

  const chutes = (desafio.chutes_desafiante || '').split(',').filter(Boolean)
  const defList = (desafio.defesas_desafiado || '').split(',').filter(Boolean)

  return (
    <div className={`match-result ${ganhei ? 'match-win' : empate ? 'match-draw' : 'match-loss'}`}>
      <div className="match-score">
        <span>⚽ {gols}</span>
        <span className="match-x">gols</span>
        <span>🧤 {defesas}</span>
        <span className="match-x">defesas</span>
      </div>
      <div className="match-status">
        {ganhei ? '🏆 VITÓRIA!' : empate ? '🤝 EMPATE!' : '😢 DERROTA!'}
      </div>
      <div className="match-detail">
        <div className="match-col">
          <strong>⚽ {desafio.nome_desafiante} (cobrador)</strong>
          {chutes.map((c, i) => (
            <ResultadoChute key={i} num={i + 1} chute={c} defesa={defList[i] || '?'} gol={c !== defList[i]} />
          ))}
        </div>
      </div>
      <div style={{ marginTop: 8, fontSize: 12, fontWeight: 700, color: '#556' }}>
        {desafio.nome_desafiante} chutou → {desafio.nome_desafiado} defendeu
      </div>
    </div>
  )
}

// Tela de 5 ações (chute OU defesa), clique direto
function TelaAcao({ titulo, subtitulo, modo, onFinalizar, onCancelar, loading }) {
  // modo: 'chute' ou 'defesa'
  const [acoes, setAcoes] = useState([])
  const finalizouRef = React.useRef(false)

  function registrar(dir) {
    if (finalizouRef.current) return
    const novos = [...acoes, dir]
    setAcoes(novos)
    if (novos.length === 5 && !finalizouRef.current) {
      finalizouRef.current = true
      onFinalizar(novos)
    }
  }

  if (acoes.length >= 5) return (
    <div style={{ textAlign: 'center', padding: 20, fontWeight: 900 }}>Enviando...</div>
  )

  return (
    <>
      <h2 className="page-title">⚽ DESAFIO 1v1</h2>
      <p className="subtitle">{titulo}</p>
      {subtitulo && <p style={{ fontSize: 12, fontWeight: 700, color: '#556', marginBottom: 8 }}>{subtitulo}</p>}

      <GolView
        onChutar={registrar}
        disabled={loading}
        numero={acoes.length + 1}
        fase={modo}
      />

      <div className="chutes-feitos">
        {acoes.map((c, i) => (
          <span key={i} className={`chute-badge${modo === 'defesa' ? ' chute-badge-def' : ''}`}>
            {modo === 'chute' ? '⚽' : '🧤'}{i + 1}: {DIR_EMOJI[c]}
          </span>
        ))}
      </div>

      <button className="btn-work" onClick={onCancelar} style={{ marginTop: 12 }}>Cancelar</button>
    </>
  )
}

export default function Desafio1v1() {
  const { jogador, setJogador, mostrarNotificacao, jogadorID, setLevelUp } = useGame()

  const [oponentes, setOponentes] = useState([])
  const [desafios, setDesafios] = useState([])
  const [modo, setModo] = useState('lista')
  const [adversario, setAdversario] = useState(null)
  const [desafioAtivo, setDesafioAtivo] = useState(null)
  const [resultado, setResultado] = useState(null)
  const [loading, setLoading] = useState(false)
  const [enviado, setEnviado] = useState(false)

  function carregar() {
    if (!jogadorID) return
    API.get('/api/jogadores?excluir=' + jogadorID).then(setOponentes).catch(() => {})
    API.get('/api/desafios-1v1/' + jogadorID).then(res => setDesafios(res.desafios || [])).catch(() => {})
  }

  useEffect(() => { carregar() }, [jogadorID])

  if (!jogador || jogador.nivel < 12) return (
    <div style={{ textAlign: 'center', padding: 40 }}>
      <div style={{ fontSize: 60 }}>🔒</div>
      <h2 style={{ fontFamily: 'var(--font-titulo)', marginTop: 10 }}>Desafio 1v1 bloqueado</h2>
      <p style={{ fontWeight: 700, color: '#555' }}>Alcance o nível 12 para desbloquear os pênaltis!</p>
    </div>
  )

  const pendentesRecebidos = desafios.filter(d => d.status === 'pendente' && d.desafiado_id === jogadorID)
  const pendentesEnviados = desafios.filter(d => d.status === 'pendente' && d.desafiante_id === jogadorID)
  const concluidos = desafios.filter(d => d.status === 'concluido')

  async function enviarDesafio(chutes) {
    if (enviado) return
    setEnviado(true)
    setLoading(true)
    try {
      const res = await API.post('/api/desafio-1v1', {
        desafiante_id: jogadorID,
        desafiado_id: adversario.id,
        chutes,
      })
      if (res.sucesso) {
        mostrarNotificacao(res.mensagem, 'sucesso')
        setModo('lista')
        carregar()
      } else {
        mostrarNotificacao(res.mensagem || 'Erro', 'erro')
      }
    } catch { mostrarNotificacao('Erro de conexão', 'erro') }
    setLoading(false)
    setEnviado(false)
  }

  async function responderDesafio(defesas) {
    if (enviado) return
    setEnviado(true)
    setLoading(true)
    try {
      const res = await API.post('/api/desafio-1v1/responder', {
        desafio_id: desafioAtivo.id,
        jogador_id: jogadorID,
        defesas,
      })
      if (res.sucesso) {
        if (res.jogador) setJogador(res.jogador)
        setResultado(res.desafio)
        setModo('resultado')
        mostrarNotificacao(res.mensagem, res.desafio?.vencedor_id === jogadorID ? 'sucesso' : 'erro')
        if (res.level_up) setLevelUp(res.novo_nivel)
        carregar()
      } else {
        mostrarNotificacao(res.mensagem || 'Erro', 'erro')
      }
    } catch { mostrarNotificacao('Erro de conexão', 'erro') }
    setLoading(false)
    setEnviado(false)
  }

  function voltar() {
    setModo('lista')
    setAdversario(null)
    setDesafioAtivo(null)
    setResultado(null)
    setEnviado(false)
  }

  if (modo === 'resultado' && resultado) {
    return (
      <>
        <h2 className="page-title">⚽ DESAFIO 1v1</h2>
        <MatchResult desafio={resultado} jogadorID={jogadorID} />
        <button className="btn-work btn-verde" onClick={voltar} style={{ marginTop: 16 }}>Voltar</button>
      </>
    )
  }

  if (modo === 'desafiar' && adversario) {
    return (
      <TelaAcao
        titulo={`Desafiando ${adversario.nome} (Nível ${adversario.nivel})`}
        subtitulo="Você é o cobrador! Escolha a direção dos seus 5 chutes."
        modo="chute"
        onFinalizar={enviarDesafio}
        onCancelar={voltar}
        loading={loading}
      />
    )
  }

  if (modo === 'responder' && desafioAtivo) {
    return (
      <TelaAcao
        titulo={`Defendendo contra ${desafioAtivo.nome_desafiante}`}
        subtitulo="Você é o goleiro! Escolha pra qual lado pular em cada cobrança."
        modo="defesa"
        onFinalizar={responderDesafio}
        onCancelar={voltar}
        loading={loading}
      />
    )
  }

  return (
    <>
      <h2 className="page-title">⚽ DESAFIO 1v1</h2>
      <p className="subtitle">Cobranças de pênalti! 5 chutes + 5 defesas cada.</p>

      <div className="desafio-info-box">
        <div>🏆 Desafiante vence: <strong>+100 XP</strong></div>
        <div>🎯 Desafiado vence: <strong>+150 XP</strong></div>
        <div>🤝 Empate: <strong>+25 XP cada</strong></div>
        <div>⚠️ 1 desafio por oponente por dia</div>
      </div>

      {pendentesRecebidos.length > 0 && (
        <div className="desafio-pendentes">
          <h3 className="desafio-section-title">📩 Desafios Recebidos</h3>
          {pendentesRecebidos.map(d => (
            <div key={d.id} className="desafio-pendente-card">
              <div className="dp-info"><strong>{d.nome_desafiante}</strong> te desafiou!</div>
              <button className="btn-work btn-verde" onClick={() => { setDesafioAtivo(d); setModo('responder') }}>
                ⚽ Responder!
              </button>
            </div>
          ))}
        </div>
      )}

      {pendentesEnviados.length > 0 && (
        <div className="desafio-pendentes">
          <h3 className="desafio-section-title">📤 Desafios Enviados</h3>
          {pendentesEnviados.map(d => (
            <div key={d.id} className="desafio-pendente-card dp-enviado">
              <span>Aguardando <strong>{d.nome_desafiado}</strong> responder...</span>
              <span className="dp-status">⏳ Pendente</span>
            </div>
          ))}
        </div>
      )}

      <h3 className="desafio-section-title">Escolha seu adversário:</h3>
      <div className="desafio-oponentes">
        {oponentes.map(op => {
          const jaDesafiou = desafios.some(d => d.desafiante_id === jogadorID && d.desafiado_id === op.id)
          return (
            <div key={op.id} className={`desafio-oponente${jaDesafiou ? ' do-bloqueado' : ''}`}
              onClick={() => { if (!jaDesafiou) { setAdversario(op); setModo('desafiar') } }}>
              <div className="do-info">
                <strong>{op.nome}</strong>
                <span>Nível {op.nivel}</span>
              </div>
              <div className="do-stats">
                <span>💪{op.forca}</span>
                <span>🏃{op.velocidade}</span>
                <span>⚽{op.habilidade}</span>
              </div>
              {jaDesafiou
                ? <span className="do-bloqueado-tag">✅ Já desafiado</span>
                : <button className="btn-work btn-small btn-verde">Desafiar!</button>
              }
            </div>
          )
        })}
        {oponentes.length === 0 && <p style={{ color: '#888', padding: 16 }}>Nenhum oponente disponível.</p>}
      </div>

      {concluidos.length > 0 && (
        <>
          <h3 className="desafio-section-title">Resultados de hoje:</h3>
          <div className="desafio-historico">
            {concluidos.map(d => {
              const ganhei = d.vencedor_id === jogadorID
              const empate = d.vencedor_id === 0
              return (
                <div key={d.id} className={`dh-item ${ganhei ? 'dh-win' : empate ? 'dh-draw' : 'dh-loss'}`}
                  onClick={() => { setResultado(d); setModo('resultado') }} style={{ cursor: 'pointer' }}>
                  <span>{d.nome_desafiante} vs {d.nome_desafiado}</span>
                  <span className="dh-score">⚽{d.gols_desafiante} 🧤{5 - d.gols_desafiante}</span>
                  <span>{ganhei ? '🏆' : empate ? '🤝' : '😢'}</span>
                </div>
              )
            })}
          </div>
        </>
      )}
    </>
  )
}
