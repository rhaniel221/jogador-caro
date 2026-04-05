import React, { useState, useEffect } from 'react'
import { useGame } from '../context/GameContext'
import API from '../api'

export default function Performance() {
  const { jogador, jogadorID } = useGame()
  const [weekly, setWeekly] = useState(null)
  const [skills, setSkills] = useState([])

  useEffect(() => {
    if (!jogadorID) return
    API.get('/api/skill-missions/' + jogadorID).then(res => setSkills(res.missions || [])).catch(() => {})
    // Get weekly position
    API.get('/api/weekly/xp').then(res => {
      const list = res.ranking || []
      const pos = list.findIndex(r => r.jogador_id === jogadorID)
      setWeekly({ pos: pos + 1, total: list.length, xp: list[pos]?.valor || 0 })
    }).catch(() => {})
  }, [jogadorID])

  if (!jogador) return null

  const winRate = jogador.vitorias + jogador.derrotas > 0
    ? Math.round((jogador.vitorias / (jogador.vitorias + jogador.derrotas)) * 100) : 0
  const poder = jogador.forca + jogador.velocidade + jogador.habilidade
  const completedSkills = skills.filter(s => s.completada).length

  return (
    <>
      <h2 className="page-title">📊 PERFORMANCE</h2>
      <p className="subtitle">Sua evolução real — sem sorte, só habilidade.</p>

      <div className="perf-grid">
        <div className="perf-card">
          <span className="perf-icon">⚔️</span>
          <span className="perf-val">{jogador.vitorias}</span>
          <span className="perf-label">Vitórias PvP</span>
        </div>
        <div className="perf-card">
          <span className="perf-icon">📊</span>
          <span className="perf-val">{winRate}%</span>
          <span className="perf-label">Win Rate</span>
        </div>
        <div className="perf-card">
          <span className="perf-icon">💪</span>
          <span className="perf-val">{poder}</span>
          <span className="perf-label">Poder Total</span>
        </div>
        <div className="perf-card">
          <span className="perf-icon">⭐</span>
          <span className="perf-val">{jogador.pontos_fama}</span>
          <span className="perf-label">Fama</span>
        </div>
        <div className="perf-card">
          <span className="perf-icon">🔥</span>
          <span className="perf-val">{jogador.pvp_streak || 0}</span>
          <span className="perf-label">PvP Streak</span>
        </div>
        <div className="perf-card">
          <span className="perf-icon">🎯</span>
          <span className="perf-val">{completedSkills}/{skills.length}</span>
          <span className="perf-label">Skill Missions</span>
        </div>
      </div>

      {weekly && weekly.pos > 0 && (
        <div className="perf-weekly">
          <h3>📅 Ranking Semanal</h3>
          <div className="perf-weekly-pos">#{weekly.pos} de {weekly.total}</div>
        </div>
      )}

      {skills.length > 0 && (
        <div className="pf-section" style={{ marginTop: 14 }}>
          <div className="pf-section-header"><h3>🎯 Missões de Habilidade</h3></div>
          <div className="pf-tasks">
            {skills.map(s => {
              const pct = Math.min(100, Math.round((s.progresso / s.alvo) * 100))
              return (
                <div key={s.id} className={`pf-task${s.completada ? ' pf-task-done' : ''}`}>
                  <div className="pf-task-info">
                    <strong>{s.icone} {s.nome}</strong>
                    <div className="pf-task-bar"><div className="pf-task-fill" style={{ width: pct + '%' }} /></div>
                    <span className="pf-task-prog">{s.progresso}/{s.alvo} — {s.descricao}</span>
                  </div>
                  {s.completada && <span>✅</span>}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </>
  )
}
