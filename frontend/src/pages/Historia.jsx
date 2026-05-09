import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useGame } from '../context/GameContext'
import { useTutorial } from '../context/TutorialContext'
import API from '../api'

// ================================================================
// FASES DA NARRATIVA
// ================================================================
const FASES = {
  1: {
    titulo: 'O Sonho',
    subtitulo: 'Capítulo Um',
    cor: '#1a7dff',
    img: '/historia-img/fase-sonho.png',
    aberturaImgs: [
      '/historia-img/abertura-1.webp',
      '/historia-img/abertura-2.webp',
      '/historia-img/abertura-3.webp',
      '/historia-img/abertura-4.webp',
    ],
    fallbackIcone: '💭',
    abertura: {
      linhas: [
        'Você é mais um.',
        'Mais um moleque do bairro com a chuteira gasta e o coração inquieto.',
        'A vizinhança sabe seu nome. Ninguém ainda sabe sua história.',
        'Mas hoje, na curva da rua de terra, vai começar tudo.',
      ],
    },
    fechamento: 'Você não tinha um campo. Mas tinha a bola. E tinha o sonho.',
  },
  2: {
    titulo: 'O Campinho',
    subtitulo: 'Capítulo Dois',
    cor: '#00b848',
    img: '/historia-img/fase-campinho.png',
    fallbackIcone: '🏟️',
    desbloqueio: 'Campinho liberado!',
    abertura: {
      linhas: [
        'Não é estádio. Não tem grama de verdade.',
        'É um terreno baldio com duas pedras como traves.',
        'Mas é teu. É onde tu vais virar craque.',
      ],
    },
    fechamento: 'Tu construiu o teu primeiro palco. A torcida ainda é só de moleques. Mas ela vai crescer.',
  },
  3: {
    titulo: 'O Estádio',
    subtitulo: 'Capítulo Três',
    cor: '#ff7a00',
    img: '/historia-img/fase-estadio.png',
    fallbackIcone: '🏟️',
    desbloqueio: 'Acesso ao estádio!',
    abertura: {
      linhas: [
        'O estádio não te conhece ainda.',
        'Mas tu chegaste — pela porta de serviço, vendendo dogão pra entrar.',
        'O cheiro de gramado, o eco da torcida... isso vai marcar tua alma.',
      ],
    },
    fechamento: 'Tu não és mais o moleque da rua. Agora a cidade sabe teu nome. E tua carreira começa AGORA.',
  },
}

// ================================================================
// TIMER (mantido)
// ================================================================
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
      ⏳ {min}:{seg.toString().padStart(2, '0')}
    </span>
  )
}

// ================================================================
// MISSAO CARD — visual cinematográfico
// ================================================================
function MissaoCard({ missao, onExecutar, onPular, loading, indice, faseCor }) {
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
  if (tipo === 'repetivel') btnLabel = `Continuar (${vezes_feitas}/${vezes_necessarias})`
  if (tipo === 'timer' && !inicio_em) btnLabel = 'Começar'
  if (tipo === 'timer' && inicio_em && disponivel) btnLabel = 'Concluir'
  if (completada) btnLabel = 'Concluída'

  const pngImg = `/historia-img/missao-${missao.id}.png`

  return (
    <article
      className={`missao-card-cine${statusClass}`}
      style={{ '--fase-cor': faseCor }}
    >
      <div className="mcc-num">{String(indice + 1).padStart(2, '0')}</div>

      <div className="mcc-icon-wrap">
        <img
          src={pngImg}
          alt={missao.nome}
          className="mcc-icon-img"
          onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex' }}
        />
        <span className="mcc-icon-emoji" style={{ display: 'none' }}>{missao.icone}</span>
        {bloqueada && <div className="mcc-lock-overlay">🔒</div>}
        {completada && <div className="mcc-done-overlay">✓</div>}
      </div>

      <div className="mcc-body">
        <h3 className="mcc-titulo">{missao.nome}</h3>
        <p className="mcc-desc">{missao.descricao}</p>

        {tipo === 'repetivel' && !completada && (
          <div className="mcc-progress">
            <div className="mcc-progress-track">
              <div className="mcc-progress-fill" style={{ width: Math.min(100, pct) + '%' }} />
            </div>
            <span className="mcc-progress-text">{vezes_feitas}/{vezes_necessarias}</span>
          </div>
        )}

        {!completada && !bloqueada && (
          <div className="mcc-rewards">
            {missao.recompensa_xp > 0 && <span className="mcc-reward mcc-reward-xp">+{missao.recompensa_xp} XP</span>}
            {missao.recompensa_dinheiro > 0 && <span className="mcc-reward mcc-reward-din">+R$ {missao.recompensa_dinheiro}</span>}
            {missao.recompensa_moedas > 0 && <span className="mcc-reward mcc-reward-coin">+{missao.recompensa_moedas} 💎</span>}
            {missao.custo_energia > 0 && <span className="mcc-reward mcc-reward-energy">⚡ {missao.custo_energia}</span>}
          </div>
        )}

        {emTimer && (
          <div className="mcc-timer-row">
            <TimerDisplay
              inicioEm={inicio_em}
              tempoMinutos={tempo_minutos}
              onDone={() => setTimerDone(true)}
            />
            <button className="mcc-btn-pular" onClick={() => onPular(missao.id)} disabled={isLoading}>
              💎 Pular (1)
            </button>
          </div>
        )}

        {!completada && !bloqueada && !emTimer && (
          <button
            className="mcc-btn-acao"
            onClick={() => onExecutar(missao.id)}
            disabled={isLoading}
          >
            {isLoading ? '...' : btnLabel}
            <span className="mcc-btn-arrow">→</span>
          </button>
        )}

        {bloqueada && (
          <div className="mcc-bloqueio">🔒 Termine a missão anterior pra liberar</div>
        )}
      </div>
    </article>
  )
}

// ================================================================
// ABERTURA CINEMATOGRAFICA DA FASE
// ================================================================
// Direcao do slide-in pra cada um dos 4 segmentos da colagem
const SEG_DIRS = ['from-top', 'from-bottom', 'from-top', 'from-bottom']

function AberturaFase({ fase, onContinuar }) {
  const imgs = fase.aberturaImgs || []
  const [imgsLoaded, setImgsLoaded] = useState(imgs.length === 0)
  const [revealedCount, setRevealedCount] = useState(0)
  const [phase, setPhase] = useState(imgs.length > 0 ? 'reveal' : 'text')
  const [flashing, setFlashing] = useState(false)
  const [linhaAtiva, setLinhaAtiva] = useState(0)
  const [pronto, setPronto] = useState(false)
  const { setPaused } = useTutorial()

  // Pausa o tutorial enquanto a abertura ta no ar — so libera no "Começar →"
  useEffect(() => {
    setPaused(true)
    return () => setPaused(false)
  }, [setPaused])

  // Preload — espera as 4 imagens carregarem antes de animar
  useEffect(() => {
    if (imgs.length === 0) return
    let loaded = 0
    let cancelled = false
    imgs.forEach(src => {
      const img = new Image()
      const done = () => {
        if (cancelled) return
        loaded++
        if (loaded >= imgs.length) setImgsLoaded(true)
      }
      img.onload = done
      img.onerror = done
      img.src = src
    })
    return () => { cancelled = true }
  }, [imgs.length])

  // Sequencia: flash → reveal seg 1 → hold → flash → reveal seg 2 → ...
  useEffect(() => {
    if (!imgsLoaded || phase !== 'reveal') return
    let cancelled = false
    const sleep = ms => new Promise(r => setTimeout(r, ms))
    const run = async () => {
      for (let i = 0; i < imgs.length; i++) {
        if (cancelled) return
        setFlashing(true)
        await sleep(220)
        if (cancelled) return
        setFlashing(false)
        setRevealedCount(i + 1)
        await sleep(700)
      }
      if (cancelled) return
      // Pequeno respiro antes do texto
      await sleep(400)
      if (!cancelled) setPhase('text')
    }
    run()
    return () => { cancelled = true }
  }, [imgsLoaded, phase, imgs.length])

  // Reveal das linhas — so depois que o collage termina
  useEffect(() => {
    if (phase !== 'text') return
    if (linhaAtiva >= fase.abertura.linhas.length) {
      setPronto(true)
      return
    }
    const timer = setTimeout(() => setLinhaAtiva(i => i + 1), 1500)
    return () => clearTimeout(timer)
  }, [phase, linhaAtiva, fase.abertura.linhas.length])

  return (
    <div className="abertura-overlay" style={{ '--fase-cor': fase.cor }}>
      <div className="abertura-bg" />

      {/* Colagem geometrica: 4 imagens recortadas por horizontal + diagonal */}
      {imgs.length > 0 && (
        <div className="abertura-colagem">
          {imgs.map((src, i) => (
            <div key={i} className={`abertura-seg seg-${i + 1}`}>
              <img
                src={src}
                alt=""
                className={`abertura-seg-img ${SEG_DIRS[i]}${revealedCount > i ? ' is-shown' : ''}`}
                onError={e => { e.currentTarget.style.display = 'none' }}
              />
            </div>
          ))}

          {/* Linhas brancas: horizontal no centro + diagonal inclinada pra direita */}
          <svg className="abertura-lines" width="100%" height="100%" preserveAspectRatio="none">
            <line x1="0%"  y1="50%"  x2="100%" y2="50%"   stroke="#fff" strokeWidth="6" vectorEffect="non-scaling-stroke" />
            <line x1="35%" y1="0%"   x2="65%"  y2="100%"  stroke="#fff" strokeWidth="6" vectorEffect="non-scaling-stroke" />
          </svg>

          {/* Camera flash — bounded ao collage */}
          <div className={`abertura-flash${flashing ? ' is-flashing' : ''}`} />

          {/* Vignette + texto centralizado — so na fase texto, sobre o collage */}
          {phase === 'text' && (
            <>
              <div className="abertura-vinheta" />
              <div className="abertura-conteudo">
                <div className="abertura-cap">{fase.subtitulo}</div>
                <h1 className="abertura-titulo">{fase.titulo}</h1>

                <div className="abertura-linhas">
                  {fase.abertura.linhas.slice(0, linhaAtiva + 1).map((linha, i) => (
                    <p key={i} className="abertura-linha" style={{ animationDelay: `${i * 0.1}s` }}>
                      {linha}
                    </p>
                  ))}
                </div>

                {pronto && (
                  <button className="abertura-btn" onClick={onContinuar}>
                    Começar →
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ================================================================
// PAGINA HISTORIA
// ================================================================
export default function Historia() {
  const { jogador, setJogador, mostrarNotificacao, jogadorID, setLevelUp, pushDialogo } = useGame()
  const [missoes, setMissoes] = useState([])
  const [loading, setLoading] = useState(null)
  const [aberturaPendente, setAberturaPendente] = useState(null)
  const aberturaShownRef = useRef(new Set())

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

  // Mostra abertura quando entra numa fase nova
  useEffect(() => {
    if (!missoes.length) return
    const key = `historia-abertura-fase-${faseAtiva}-${jogadorID}`
    if (aberturaShownRef.current.has(faseAtiva)) return
    if (localStorage.getItem(key)) return
    // Só mostra abertura se a fase tem missões pendentes (não exibe ao revisitar fase já completada)
    const temPendente = missoesFase.some(m => !m.completada)
    if (!temPendente) return
    aberturaShownRef.current.add(faseAtiva)
    setAberturaPendente(faseAtiva)
  }, [faseAtiva, missoes.length, jogadorID])

  function fecharAbertura() {
    if (aberturaPendente) {
      localStorage.setItem(`historia-abertura-fase-${aberturaPendente}-${jogadorID}`, '1')
    }
    setAberturaPendente(null)
  }

  async function handleExecutar(missaoID) {
    setLoading(missaoID)
    try {
      const missao = missoes.find(m => m.id === missaoID)

      if (missao?.dialogo_inicio && missao.status === 'disponivel' && missao.vezes_feitas === 0) {
        pushDialogo({ tipo: 'dialogo', texto: missao.dialogo_inicio, icone: missao.icone })
      }

      const res = await API.post('/api/missao/executar', {
        jogador_id: jogadorID,
        missao_id: missaoID,
      })

      if (res.sucesso) {
        if (res.jogador) setJogador(res.jogador)

        if (res.dialogo) {
          pushDialogo({ tipo: 'dialogo', texto: res.dialogo, icone: missao?.icone })
        }

        if (res.missao?.completada) {
          mostrarNotificacao('Missão concluída! ' + (missao?.nome || ''), 'sucesso')

          const faseAtualMissoes = missoes.filter(m => m.fase === missao.fase)
          const outrasCompletas = faseAtualMissoes.filter(m => m.id !== missaoID).every(m => m.completada)
          if (outrasCompletas) {
            const proxFase = FASES[missao.fase + 1]
            if (proxFase) {
              pushDialogo({
                tipo: 'novo_capitulo',
                fase: missao.fase + 1,
                titulo: proxFase.titulo,
                icone: proxFase.fallbackIcone,
                desbloqueio: proxFase.desbloqueio,
                arte: proxFase.img,
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
      {aberturaPendente && (
        <AberturaFase fase={FASES[aberturaPendente]} onContinuar={fecharAbertura} />
      )}

      {/* Cabeçalho cinematográfico da fase */}
      <header className="historia-cine-header" style={{ '--fase-cor': faseInfo.cor }}>
        <div className="hch-img-wrap">
          <img
            src={faseInfo.img}
            alt={faseInfo.titulo}
            className="hch-img"
            onError={e => { e.currentTarget.style.display = 'none'; e.currentTarget.nextSibling.style.display = 'flex' }}
          />
          <span className="hch-img-emoji" style={{ display: 'none' }}>{faseInfo.fallbackIcone}</span>
        </div>
        <div className="hch-info">
          <div className="hch-cap">{faseInfo.subtitulo}</div>
          <h1 className="hch-titulo">{faseInfo.titulo}</h1>
          <p className="hch-sub">Sua história. Seu legado. Comece a forjar agora.</p>
        </div>
      </header>

      {/* Barra de capítulos */}
      <div className="historia-fases-bar">
        {Object.entries(FASES).map(([num, info]) => {
          const n = parseInt(num)
          const done = n < faseAtiva || todasCompletas
          const active = n === faseAtiva && !todasCompletas
          const future = n > faseAtiva && !todasCompletas
          return (
            <div key={n} className={`hfb-step${done ? ' done' : ''}${active ? ' active' : ''}${future ? ' future' : ''}`}>
              <div className="hfb-step-circle" style={{ '--cor': info.cor }}>
                {done ? '✓' : n}
              </div>
              <div className="hfb-step-label">
                <span className="hfb-step-cap">CAP. {n}</span>
                <span className="hfb-step-titulo">{info.titulo}</span>
              </div>
              {n < 3 && <div className="hfb-step-line" />}
            </div>
          )
        })}
      </div>

      {todasCompletas ? (
        <div className="historia-completa-cine">
          <div className="hcc-glow" />
          <div className="hcc-trofeu">🏆</div>
          <h2 className="hcc-titulo">A história começa agora</h2>
          <p className="hcc-texto">
            Você completou os primeiros capítulos. A rua, o campinho e o estádio te formaram.
            Agora a vida real de craque começa — saia do menu Carreira e enfrente o mundo.
          </p>
        </div>
      ) : (
        <>
          <div className="historia-fase-frase">
            "{faseInfo.fechamento}"
          </div>

          <div className="missoes-cine-lista" data-tutorial="missoes-lista">
            {missoesFase.map((m, i) => (
              <MissaoCard
                key={m.id}
                missao={m}
                indice={i}
                faseCor={faseInfo.cor}
                onExecutar={handleExecutar}
                onPular={handlePular}
                loading={loading}
              />
            ))}
          </div>
        </>
      )}
    </>
  )
}
