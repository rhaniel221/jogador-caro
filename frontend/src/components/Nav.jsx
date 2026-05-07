import React, { useState, useEffect, useCallback } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useGame } from '../context/GameContext'
import API from '../api'

// Ordem por prioridade de gameplay
const links = [
  { to: '/',           label: 'Inicio',   icon: '🏠', end: true, tid: 'nav-inicio' },
  { to: '/carreira',   label: 'Carreira', icon: '⚽', tid: 'nav-trabalhos' },
  { to: '/treino',     label: 'Treino',   icon: '🏋️', tid: 'nav-treino' },
  { to: '/missoes',    label: 'Missoes',  icon: '📖', tid: 'nav-missoes' },
  { to: '/jogador',    label: 'Jogador',  icon: '👤', tid: 'nav-perfil' },
  { to: '/loja',       label: 'Loja',     icon: '🛒', tid: 'nav-loja' },
  { to: '/vida',       label: 'Vida',     icon: '🏡', tid: 'nav-vida', minLevel: 20 },
  { to: '/banco',      label: 'Banco',    icon: '💰', tid: 'nav-banco', minLevel: 20 },
  { to: '/top-craques', label: 'Rankings', icon: '📊', tid: 'nav-top', minLevel: 10 },
  { to: '/foruns',     label: 'Forums',   icon: '💬', tid: 'nav-foruns', minLevel: 10 },
]

function isNewFeature(path, minLevel, nivel) {
  if (!minLevel) return false
  const key = 'visited_' + path
  if (localStorage.getItem(key)) return false
  return nivel >= minLevel && nivel < minLevel + 5
}

function markVisited(path) {
  localStorage.setItem('visited_' + path, '1')
}

export default function Nav() {
  const { jogador, jogadorID } = useGame()
  const nivel = jogador?.nivel || 1
  const location = useLocation()
  const [badges, setBadges] = useState({})
  // Usar jogador.xp como "versao" — muda sempre que setJogador e chamado (apos coleta, trabalho, etc)
  const jogadorVersion = jogador ? `${jogador.xp}-${jogador.dinheiro_mao}-${jogador.energia}` : ''

  const carregarBadges = useCallback(async () => {
    if (!jogadorID) return
    try {
      const counts = {}

      const [casaRes, campRes, famaRes, tasksRes] = await Promise.all([
        API.get('/api/casa/' + jogadorID).catch(() => null),
        API.get('/api/campinho/' + jogadorID).catch(() => null),
        API.get('/api/fama/' + jogadorID).catch(() => null),
        API.get('/api/tasks/' + jogadorID).catch(() => []),
      ])

      let vidaCount = 0
      if (casaRes?.casa?.xp_disponivel > 0 || casaRes?.casa?.energia_disponivel > 0) vidaCount++
      if (campRes?.campinho && !campRes.campinho.bonus_hoje) vidaCount++
      if (vidaCount > 0) counts['/vida'] = vidaCount

      if (famaRes?.patrocinio_acumulado > 0) counts['/jogador'] = (counts['/jogador'] || 0) + 1

      const prontas = Array.isArray(tasksRes) ? tasksRes.filter(t => !t.completada && !t.coletada && t.progresso >= t.objetivo).length : 0
      if (prontas > 0) counts['/missoes'] = prontas

      setBadges(counts)
    } catch {}
  }, [jogadorID])

  // Recarrega quando: monta, muda de pagina, OU jogador muda (coleta, trabalho, etc)
  useEffect(() => {
    carregarBadges()
  }, [carregarBadges, location.pathname, jogadorVersion])

  // Refresh a cada 60s como fallback
  useEffect(() => {
    if (!jogadorID) return
    const id = setInterval(carregarBadges, 60000)
    return () => clearInterval(id)
  }, [jogadorID, carregarBadges])

  return (
    <nav className="main-menu">
      <ul>
        {links.map(l => {
          const locked = l.minLevel && nivel < l.minLevel
          const badgeCount = badges[l.to] || 0
          return (
            <li key={l.to}>
              {locked ? (
                <span className="nav-locked" data-tutorial={l.tid}>
                  {l.icon} {l.label} 🔒{l.minLevel}
                </span>
              ) : (
                <NavLink
                  to={l.to}
                  end={l.end}
                  className={({ isActive }) => isActive ? 'active' : ''}
                  data-tutorial={l.tid}
                  onClick={() => markVisited(l.to)}
                >
                  <span style={{ fontSize: 14 }}>{l.icon}</span> {l.label}
                  {badgeCount > 0 && <span className="nav-count-badge">{badgeCount}</span>}
                  {isNewFeature(l.to, l.minLevel, nivel) && <span className="nav-new-badge">NOVO</span>}
                </NavLink>
              )}
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
