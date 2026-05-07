import React from 'react'
import { NavLink } from 'react-router-dom'
import { useGame } from '../context/GameContext'

const links = [
  { to: '/', label: 'Inicio', icon: '🏠', end: true, tid: 'nav-inicio' },
  { to: '/carreira', label: 'Carreira', icon: '⚽', tid: 'nav-trabalhos' },
  { to: '/jogador', label: 'Jogador', icon: '👤', tid: 'nav-perfil' },
  { to: '/vida', label: 'Vida', icon: '🏡', tid: 'nav-vida' },
  { to: '/missoes', label: 'Missoes', icon: '📖', tid: 'nav-missoes' },
  { to: '/treino', label: 'Treino', icon: '🏋️', tid: 'nav-treino' },
  { to: '/loja', label: 'Loja', icon: '🛒', tid: 'nav-loja' },
  { to: '/banco', label: 'Banco', icon: '💰', tid: 'nav-banco' },
  { to: '/top-craques', label: 'Rankings', icon: '📊', tid: 'nav-top' },
  { to: '/foruns', label: 'Forums', icon: '💬', tid: 'nav-foruns' },
]

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
                  {l.icon} {l.label} 🔒
                </span>
              ) : (
                <NavLink
                  to={l.to}
                  end={l.end}
                  className={({ isActive }) => isActive ? 'active' : ''}
                  data-tutorial={l.tid}
                >
                  <span style={{ fontSize: 14 }}>{l.icon}</span> {l.label}
                </NavLink>
              )}
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
