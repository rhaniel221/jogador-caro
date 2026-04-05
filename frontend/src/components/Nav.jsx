import React from 'react'
import { NavLink } from 'react-router-dom'
import { useGame } from '../context/GameContext'

const links = [
  { to: '/inicio', label: 'Perfil', tid: 'nav-perfil' },
  { to: '/', label: 'Trabalhos', end: true, tid: 'nav-trabalhos' },
  { to: '/missoes', label: 'Missões', tid: 'nav-missoes' },
  { to: '/estadio', label: 'Estádio', tid: 'nav-estadio', minLevel: 10 },
  { to: '/desafio', label: 'Desafio 1v1', tid: 'nav-desafio', minLevel: 12 },
  { to: '/minigame', label: 'MiniGame', tid: 'nav-minigame', minLevel: 15 },
  { to: '/torneio', label: 'Torneio', tid: 'nav-torneio' },
  { to: '/top-craques', label: 'Top Craques', tid: 'nav-top' },
  { to: '/loja', label: 'Loja', tid: 'nav-loja' },
  { to: '/foruns', label: 'Fóruns', tid: 'nav-foruns' },
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
                  {l.label} 🔒{l.minLevel}
                </span>
              ) : (
                <NavLink
                  to={l.to}
                  end={l.end}
                  className={({ isActive }) => isActive ? 'active' : ''}
                  data-tutorial={l.tid}
                >
                  {l.label}
                </NavLink>
              )}
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
