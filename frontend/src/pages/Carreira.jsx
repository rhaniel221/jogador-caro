import React, { useState, useEffect, Suspense, lazy } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useGame } from '../context/GameContext'
import Trabalhos from './Trabalhos'
import Desafio1v1 from './Desafio1v1'
import Torneio from './Torneio'
import Estadio from './Estadio'
const MiniGame = lazy(() => import('./MiniGame'))

const ABAS = [
  { id: 'trabalhos', label: 'Trabalhos', icon: '⚽', minLevel: 1 },
  { id: 'minigame', label: 'MiniGame', icon: '🎮', minLevel: 15 },
  { id: 'desafio', label: 'Desafio 1v1', icon: '🥊', minLevel: 12 },
  { id: 'estadio', label: 'Estadio PvP', icon: '⚔️', minLevel: 10 },
  { id: 'torneio', label: 'Torneio', icon: '🏆', minLevel: 1 },
]

export default function Carreira() {
  const { jogador } = useGame()
  const [searchParams, setSearchParams] = useSearchParams()
  const nivel = jogador?.nivel || 1

  const abaParam = searchParams.get('aba')
  const abaInicial = ABAS.find(a => a.id === abaParam && nivel >= a.minLevel)?.id || 'trabalhos'
  const [abaAtiva, setAbaAtiva] = useState(abaInicial)

  useEffect(() => {
    if (abaParam && abaParam !== abaAtiva) {
      const aba = ABAS.find(a => a.id === abaParam && nivel >= a.minLevel)
      if (aba) setAbaAtiva(aba.id)
    }
  }, [abaParam])

  function trocarAba(id) {
    setAbaAtiva(id)
    setSearchParams(id !== 'trabalhos' ? { aba: id } : {})
  }

  return (
    <>
      {/* Tabs de navegacao */}
      <div style={{
        display: 'flex', gap: 4, marginBottom: 16, overflowX: 'auto',
        borderBottom: '2px solid #e0e0e0', paddingBottom: 0,
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
                padding: '10px 16px', border: 'none', cursor: bloqueada ? 'not-allowed' : 'pointer',
                background: 'transparent', borderBottom: ativa ? '3px solid var(--azul)' : '3px solid transparent',
                color: bloqueada ? '#bbb' : ativa ? 'var(--azul)' : '#555',
                fontWeight: ativa ? 900 : 700, fontSize: 13, whiteSpace: 'nowrap',
                transition: 'all 0.2s', marginBottom: -2,
              }}
            >
              {aba.icon} {aba.label}
              {bloqueada && <span style={{ fontSize: 10, marginLeft: 4 }}>nv{aba.minLevel}</span>}
            </button>
          )
        })}
      </div>

      {/* Conteudo da aba ativa */}
      {abaAtiva === 'trabalhos' && <Trabalhos />}
      {abaAtiva === 'minigame' && (
        <Suspense fallback={<div style={{ textAlign: 'center', padding: 40, fontWeight: 900 }}>Carregando MiniGame...</div>}>
          <MiniGame />
        </Suspense>
      )}
      {abaAtiva === 'desafio' && <Desafio1v1 />}
      {abaAtiva === 'estadio' && <Estadio />}
      {abaAtiva === 'torneio' && <Torneio />}
    </>
  )
}
