import React from 'react'
import { NavLink } from 'react-router-dom'

const links = [
  { to: '/inicio', label: 'Perfil', tid: 'nav-perfil' },
  { to: '/', label: 'Trabalhos', end: true, tid: 'nav-trabalhos' },
  { to: '/missoes', label: 'Missões', tid: 'nav-missoes' },
  { to: '/estadio', label: 'Estádio', tid: 'nav-estadio' },
  { to: '/desafio', label: 'Desafio 1v1', tid: 'nav-desafio' },
  { to: '/minigame', label: 'MiniGame', tid: 'nav-minigame' },
  { to: '/torneio', label: 'Torneio', tid: 'nav-torneio' },
  { to: '/top-craques', label: 'Top Craques', tid: 'nav-top' },
  { to: '/loja', label: 'Loja', tid: 'nav-loja' },
  { to: '/foruns', label: 'Fóruns', tid: 'nav-foruns' },
]

export default function Nav() {
  return (
    <nav className="main-menu">
      <ul>
        {links.map(l => (
          <li key={l.to}>
            <NavLink
              to={l.to}
              end={l.end}
              className={({ isActive }) => isActive ? 'active' : ''}
              data-tutorial={l.tid}
            >
              {l.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
