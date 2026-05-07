import React from 'react'
import { NavLink } from 'react-router-dom'
import { useGame } from '../context/GameContext'

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
  const { jogador } = useGame()
  const nivel = jogador?.nivel || 1

  return (
    <nav className="main-menu">
      <ul>
        {links.map(l => {
          const locked = l.minLevel && nivel < l.minLevel
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
