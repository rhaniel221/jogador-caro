import React, { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useGame } from '../context/GameContext'
import { fmt } from '../utils'

function RegenCounter({ atual, max, timestamp, label }) {
  const [display, setDisplay] = useState('')

  useEffect(() => {
    function tick() {
      if (atual >= max) { setDisplay('CHEIO'); return }
      if (!timestamp) return
      const agora = Math.floor(Date.now() / 1000)
      const restante = timestamp - agora
      if (restante <= 0) { setDisplay('...'); return }
      const m = Math.floor(restante / 60)
      const s = restante % 60
      setDisplay(`${label} em ${m}:${String(s).padStart(2, '0')}`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [atual, max, timestamp, label])

  return <span className="regen-timer">{display}</span>
}

export default function Header() {
  const { jogador, sair, recarregarJogador, getAvatar } = useGame()
  const recarregandoRef = useRef(false)

  useEffect(() => {
    if (!jogador) return
    const interval = setInterval(async () => {
      if (recarregandoRef.current) return
      const ts = jogador.proxima_energia_em || jogador.proxima_vitalidade_em || jogador.proxima_saude_em
      if (!ts) return
      const agora = Math.floor(Date.now() / 1000)
      if (ts <= agora) {
        recarregandoRef.current = true
        await recarregarJogador()
        recarregandoRef.current = false
      }
    }, 5000)
    return () => clearInterval(interval)
  }, [jogador, recarregarJogador])

  if (!jogador) return (
    <header className="top-bar">
      <div className="logo"><img src="/logo.png" alt="Joga Craque" className="logo-img" /></div>
    </header>
  )

  const xpPct = Math.min(100, Math.round((jogador.xp / jogador.xp_proximo) * 100))
  const regenE = Math.max(1, Math.floor(jogador.energia_max / 15))

  return (
    <header className="top-bar">
      <div className="logo">
        <img src="/logo.png" alt="Joga Craque" className="logo-img" />
      </div>

      <div className="stats-panel">
        <div className="stat" data-tutorial="stat-energia">
          <span className="stat-icon-big">⚡</span>
          <div className="stat-info">
            <span className="stat-label">Energia</span>
            <span className="stat-value">{jogador.energia}<span className="stat-max">/{jogador.energia_max}</span></span>
            <RegenCounter atual={jogador.energia} max={jogador.energia_max} timestamp={jogador.proxima_energia_em} label={`+${regenE}`} />
          </div>
        </div>
        <div className="stat" data-tutorial="stat-vitalidade">
          <span className="stat-icon-big">💚</span>
          <div className="stat-info">
            <span className="stat-label">Vitalidade</span>
            <span className="stat-value">{jogador.vitalidade}<span className="stat-max">/{jogador.vitalidade_max}</span></span>
            <RegenCounter atual={jogador.vitalidade} max={jogador.vitalidade_max} timestamp={jogador.proxima_vitalidade_em} label="+1" />
          </div>
        </div>
        <div className="stat" data-tutorial="stat-saude">
          <span className="stat-icon-big">❤️</span>
          <div className="stat-info">
            <span className="stat-label">Saúde</span>
            <span className="stat-value">{jogador.saude}<span className="stat-max">/{jogador.saude_max}</span></span>
            <RegenCounter atual={jogador.saude} max={jogador.saude_max} timestamp={jogador.proxima_saude_em} label="+5" />
          </div>
        </div>

        {/* Inventário shortcut */}
        <Link to="/inventario" className="stat stat-inv">
          <span className="stat-icon-big">🎒</span>
          <div className="stat-info">
            <span className="stat-label">Inventário</span>
          </div>
        </Link>
      </div>

      <div className="profile-panel">
        <div className="player-name">
          <span className="player-avatar">{getAvatar(jogador.avatar)}</span>
          <div className="player-details">
            <span className="player-nome">{jogador.nome}</span>
            <span className="player-rank">{jogador.rank || 'Peladeiro'}</span>
          </div>
          <button className="sair-btn" onClick={sair}>Sair</button>
        </div>
        <div className="level-info" data-tutorial="stat-xp">
          {jogador.posicao && <span className="pos-badge-header">{jogador.posicao}</span>}
          <span className="level-label">NVL</span>
          <span className="level-number">{jogador.nivel}</span>
          <div className="xp-bar"><div className="xp-fill" style={{ width: xpPct + '%' }}></div></div>
          <span className="xp-text">{jogador.xp}/{jogador.xp_proximo}</span>
        </div>
        <div className="money-info" data-tutorial="stat-dinheiro">
          <span className="money-main">R$ {fmt(jogador.dinheiro_mao)}</span>
          <span className="money-coins">🪙 {jogador.moedas || 0}</span>
          <Link to="/banco" className="bank-link">🏦 Banco</Link>
        </div>
      </div>
    </header>
  )
}
