import React from 'react'
import { NavLink } from 'react-router-dom'
import { useGame } from '../context/GameContext'

const links = [
  { to: '/', label: 'Inicio', icon: '🏠', end: true },
  { to: '/carreira', label: 'Carreira', icon: '⚽' },
  { to: '/jogador', label: 'Meu Jogador', icon: '👤' },
  { to: '/vida', label: 'Minha Vida', icon: '🏡' },
  { to: '/missoes', label: 'Missoes', icon: '📖' },
  { to: '/treino', label: 'Treino', icon: '🏋️' },
  { to: '/loja', label: 'Loja', icon: '🛒' },
  { to: '/banco', label: 'Banco', icon: '💰' },
  { to: '/top-craques', label: 'Rankings', icon: '📊' },
  { to: '/foruns', label: 'Forums', icon: '💬' },
  { to: '/minigame', label: 'MiniGame', icon: '🎮', minLevel: 15 },
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
                <span className="nav-locked">
                  {l.icon} {l.label} 🔒{l.minLevel}
                </span>
              ) : (
                <NavLink
                  to={l.to}
                  end={l.end}
                  className={({ isActive }) => isActive ? 'active' : ''}
                >
                  {l.icon} {l.label}
                </NavLink>
              )}
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
