import React, { useState, useEffect, Suspense, lazy } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useGame } from '../context/GameContext'
import Desafio1v1 from './Desafio1v1'
import Torneio from './Torneio'
import Estadio from './Estadio'
const MiniGame = lazy(() => import('./MiniGame'))

const ABAS = [
  { id: 'desafio',  label: 'Desafio 1v1', icon: '🥊', minLevel: 12 },
  { id: 'estadio',  label: 'Estadio PvP', icon: '⚔️', minLevel: 10 },
  { id: 'minigame', label: 'MiniGame',    icon: '🎮', minLevel: 15 },
  { id: 'torneio',  label: 'Torneio',     icon: '🏆', minLevel: 1 },
]

export default function Disputas() {
  const { jogador } = useGame()
  const [searchParams, setSearchParams] = useSearchParams()
  const nivel = jogador?.nivel || 1

  const abaParam = searchParams.get('aba')
  const abaInicial = ABAS.find(a => a.id === abaParam && nivel >= a.minLevel)?.id || 'torneio'
  const [abaAtiva, setAbaAtiva] = useState(abaInicial)

  useEffect(() => {
    if (abaParam && abaParam !== abaAtiva) {
      const aba = ABAS.find(a => a.id === abaParam && nivel >= a.minLevel)
      if (aba) setAbaAtiva(aba.id)
    }
  }, [abaParam])

  function trocarAba(id) {
    setAbaAtiva(id)
    setSearchParams(id !== 'torneio' ? { aba: id } : {})
  }

  return (
    <>
      <div style={{
        display: 'flex', gap: 6, marginBottom: 18, overflowX: 'auto',
        padding: '6px', background: '#0D1B2F', borderRadius: 14, border: '1px solid rgba(255,255,255,0.06)',
      }}>
        {ABAS.map(aba => {
          const bloqueada = nivel < aba.minLevel
          const ativa = abaAtiva === aba.id
          return (
            <button
              key={aba.id}
              onClick={() => !bloqueada && trocarAba(aba.id)}
              disabled={bloqueada}
              style={{
                padding: '12px 18px', border: 'none', cursor: bloqueada ? 'not-allowed' : 'pointer',
                background: ativa ? '#0F5FD6' : 'transparent',
                boxShadow: ativa ? '0 2px 8px rgba(15,95,214,0.3)' : 'none',
                borderRadius: 10,
                color: bloqueada ? '#475569' : ativa ? '#fff' : '#94A3B8',
                fontWeight: 900, fontSize: 13, whiteSpace: 'nowrap',
                transition: 'all 0.2s', flex: '1 1 0',
                textAlign: 'center', opacity: bloqueada ? 0.5 : 1,
              }}
            >
              <div style={{ fontSize: 20, marginBottom: 2 }}>{aba.icon}</div>
              <div>{aba.label}</div>
              {bloqueada && <div style={{ fontSize: 9, color: '#475569', marginTop: 2 }}>Nv.{aba.minLevel}</div>}
            </button>
          )
        })}
      </div>

      {abaAtiva === 'torneio' && <Torneio />}
      {abaAtiva === 'estadio' && <Estadio />}
      {abaAtiva === 'desafio' && <Desafio1v1 />}
      {abaAtiva === 'minigame' && (
        <Suspense fallback={<div style={{ textAlign: 'center', padding: 40, fontWeight: 900 }}>Carregando MiniGame...</div>}>
          <MiniGame />
        </Suspense>
      )}
    </>
  )
}
