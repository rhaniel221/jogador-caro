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

  const carregarBadges = useCallback(async () => {
    if (!jogadorID) return
    try {
      const counts = {}

      // Coletas em /vida (casa + campinho)
      const [casaRes, campRes] = await Promise.all([
        API.get('/api/casa/' + jogadorID).catch(() => null),
        API.get('/api/campinho/' + jogadorID).catch(() => null),
      ])
      let vidaCount = 0
      if (casaRes?.casa?.xp_disponivel > 0 || casaRes?.casa?.energia_disponivel > 0) vidaCount++
      if (campRes?.campinho && !campRes.campinho.bonus_hoje) vidaCount++
      if (vidaCount > 0) counts['/vida'] = vidaCount

      // Patrocinio em /jogador
      const famaRes = await API.get('/api/fama/' + jogadorID).catch(() => null)
      if (famaRes?.patrocinio_acumulado > 0) counts['/jogador'] = (counts['/jogador'] || 0) + 1

      // Tasks prontas em /missoes
      const tasksRes = await API.get('/api/tasks/' + jogadorID).catch(() => [])
      const prontas = Array.isArray(tasksRes) ? tasksRes.filter(t => !t.completada && !t.coletada && t.progresso >= t.objetivo).length : 0
      if (prontas > 0) counts['/missoes'] = prontas

      setBadges(counts)
    } catch {}
  }, [jogadorID])

  // Carrega ao montar e quando muda de pagina (pode ter coletado algo)
  useEffect(() => {
    carregarBadges()
  }, [carregarBadges, location.pathname])

  // Refresh a cada 30s
  useEffect(() => {
    if (!jogadorID) return
    const id = setInterval(carregarBadges, 30000)
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
