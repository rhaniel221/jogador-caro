import React, { useState, useEffect } from 'react'
import { useGame } from '../context/GameContext'
import API from '../api'
import { gerarDescricaoItem } from '../utils'

const MATERIAL_ICONES = {
  Madeira: '🪵', Prego: '🔩', Gesso: '⬜', Cal: '🧱', Semente: '🌱', Adubo: '💩',
  Metal: '🔧', Solda: '🔥', Fio: '🔌', Lampada: '💡', Poste: '🏗️',
  Concreto: '🧱', Tinta: '🎨', Rede: '🥅',
}

const RARIDADE_CORES = {
  comum: '#555',
  raro: '#2980b9',
  epico: '#8e44ad',
  lendario: '#f39c12',
}
const RARIDADE_BG = {
  comum: '#f0f0f0',
  raro: '#ebf5fb',
  epico: '#f5eef8',
  lendario: '#fef9e7',
}

function QuestCard({ quest, onResgatar, loading, itensMap }) {
  const pct = quest.objetivo > 0 ? Math.min(100, Math.round((quest.progresso / quest.objetivo) * 100)) : 0
  const pronta = quest.progresso >= quest.objetivo && !quest.completada
  const isLoading = loading === quest.id
  const rewardItem = quest.recompensa_item_id > 0 ? itensMap[quest.recompensa_item_id] : null

  return (
    <div className={`quest-card${quest.completada ? ' quest-completa' : pronta ? ' quest-pronta' : ''}`}>
      <div className="quest-header">
        <span className="quest-icone">{quest.icone}</span>
        <div className="quest-info">
          <h3 className="quest-nome">{quest.nome}</h3>
          <p className="quest-desc">{quest.descricao}</p>
          {quest.nivel_max > 0 && (
            <span className="quest-nivel-tag">Nível {quest.nivel_min}-{quest.nivel_max}</span>
          )}
        </div>
        {quest.completada && <span className="quest-check">✅</span>}
      </div>

      <div className="quest-progress">
        <div className="quest-bar">
          <div className="quest-bar-fill" style={{ width: pct + '%' }} />
        </div>
        <span className="quest-bar-text">{Math.min(quest.progresso, quest.objetivo)}/{quest.objetivo}</span>
      </div>

      <div className="quest-rewards">
        {/* Item reward */}
        {rewardItem && (
          <div className="quest-reward-item" style={{
            borderColor: RARIDADE_CORES[rewardItem.raridade] || '#555',
            background: RARIDADE_BG[rewardItem.raridade] || '#f0f0f0',
          }}>
            <span className="qri-icone">{rewardItem.icone}</span>
            <div className="qri-info">
              <span className="qri-nome" style={{ color: RARIDADE_CORES[rewardItem.raridade] }}>
                {rewardItem.nome}
              </span>
              <span className="qri-desc">{gerarDescricaoItem(rewardItem)}</span>
              <span className="qri-raridade" style={{ color: RARIDADE_CORES[rewardItem.raridade] }}>
                {(rewardItem.raridade || 'comum').toUpperCase()}
              </span>
            </div>
          </div>
        )}

        {/* Material reward */}
        {quest.recompensa_material && quest.recompensa_quantidade > 0 && (
          <span className="quest-reward quest-reward-mat">
            {MATERIAL_ICONES[quest.recompensa_material] || '📦'} {quest.recompensa_quantidade}x {quest.recompensa_material}
          </span>
        )}

        {quest.recompensa_xp > 0 && <span className="quest-reward quest-reward-xp">+{quest.recompensa_xp} XP</span>}
        {quest.recompensa_dinheiro > 0 && <span className="quest-reward quest-reward-money">+R$ {quest.recompensa_dinheiro}</span>}
        {quest.recompensa_energia > 0 && <span className="quest-reward quest-reward-energy">+{quest.recompensa_energia} ⚡ Energia</span>}
      </div>

      {pronta && (
        <button className="btn-work btn-verde quest-btn" onClick={() => onResgatar(quest.id)} disabled={isLoading}>
          {isLoading ? '...' : '🎁 Resgatar Recompensa!'}
        </button>
      )}
    </div>
  )
}

export default function Missoes() {
  const { jogador, setJogador, mostrarNotificacao, jogadorID, setLevelUp } = useGame()
  const [quests, setQuests] = useState([])
  const [itens, setItens] = useState([])
  const [materiais, setMateriais] = useState({})
  const [tasks, setTasks] = useState([])
  const [reqCompletos, setReqCompletos] = useState(false)
  const [temProxCampinho, setTemProxCampinho] = useState(false)
  const [skillMissions, setSkillMissions] = useState([])
  const [combinedMissions, setCombinedMissions] = useState([])
  const [loading, setLoading] = useState(null)
  const [tab, setTab] = useState('diarias')

  useEffect(() => {
    if (!jogadorID) return
    API.get('/api/quests/' + jogadorID).then(res => setQuests(res.quests || [])).catch(() => {})
    API.get('/api/skill-missions/' + jogadorID).then(res => setSkillMissions(res.missions || [])).catch(() => {})
    API.get('/api/combined-missions/' + jogadorID).then(res => setCombinedMissions(res.missions || [])).catch(() => {})
    API.get('/api/itens').then(setItens).catch(() => {})
    API.get('/api/tasks/' + jogadorID).then(setTasks).catch(() => {})
    API.get('/api/campinho/' + jogadorID).then(res => {
      if (res.materiais) setMateriais(res.materiais)
      setReqCompletos(res.requisitos_completos || false)
      setTemProxCampinho(!!res.campinho?.proximo_nivel)
    }).catch(() => {})
  }, [jogadorID])

  // Mapa de itens por ID pra lookup rápido
  const itensMap = {}
  itens.forEach(i => { itensMap[i.id] = i })

  async function handleResgatar(questId) {
    setLoading(questId)
    try {
      const res = await API.post('/api/quests/resgatar', { jogador_id: jogadorID, quest_id: questId })
      if (res.sucesso) {
        if (res.jogador) setJogador(res.jogador)
        mostrarNotificacao(res.mensagem, 'sucesso')
        API.get('/api/quests/' + jogadorID).then(res => setQuests(res.quests || [])).catch(() => {})
        API.get('/api/campinho/' + jogadorID).then(r => {
          if (r.materiais) setMateriais(r.materiais)
        }).catch(() => {})
      } else {
        mostrarNotificacao(res.mensagem || 'Erro', 'erro')
      }
    } catch {
      mostrarNotificacao('Erro de conexão', 'erro')
    }
    setLoading(null)
  }

  async function coletarTask(taskID) {
    const res = await API.post('/api/completar-task', { jogador_id: jogadorID, task_id: taskID })
    if (res.sucesso) {
      if (res.jogador) setJogador(res.jogador)
      mostrarNotificacao(res.mensagem, 'sucesso')
      if (res.level_up) setLevelUp(res.novo_nivel)
      API.get('/api/tasks/' + jogadorID).then(setTasks).catch(() => {})
    } else {
      mostrarNotificacao(res.mensagem, 'erro')
    }
  }

  // Separa missões de nível (tem nivel_max > 0) vs campinho (nivel_max = 0)
  const missoesPorNivel = quests.filter(q => q.nivel_max > 0)
  const missoesCampinho = quests.filter(q => !q.nivel_max || q.nivel_max === 0)

  const disponivelNivel = missoesPorNivel.filter(q => !q.completada)
  const completadaNivel = missoesPorNivel.filter(q => q.completada)
  const disponivelCamp = missoesCampinho.filter(q => !q.completada)
  const completadaCamp = missoesCampinho.filter(q => q.completada)

  // Aba campinho só aparece quando requisitos do campo estão completos e tem próximo nível
  const mostrarCampinho = reqCompletos && temProxCampinho

  const materiaisLista = Object.entries(materiais).filter(([, v]) => v > 0)

  return (
    <>
      <h2 className="page-title">🎯 MISSÕES</h2>
      <p className="subtitle">
        Complete missões para ganhar itens exclusivos, materiais e XP!
        {jogador && <strong> (Seu nível: {jogador.nivel})</strong>}
      </p>

      <div className="tabs" style={{ marginBottom: 16 }}>
        <div className={`tab${tab === 'diarias' ? ' active' : ''}`} onClick={() => setTab('diarias')}>
          📋 Diárias ({tasks.filter(t => !t.completada).length})
        </div>
        <div className={`tab${tab === 'nivel' ? ' active' : ''}`} onClick={() => setTab('nivel')}>
          ⚔️ Missões ({disponivelNivel.length})
        </div>
        {mostrarCampinho && (
          <div className={`tab${tab === 'campinho' ? ' active' : ''}`} onClick={() => setTab('campinho')}>
            🏟️ Campinho ({disponivelCamp.length})
          </div>
        )}
        <div className={`tab${tab === 'skill' ? ' active' : ''}`} onClick={() => setTab('skill')}>
          🎯 Habilidade ({skillMissions.filter(s => !s.completada).length})
        </div>
        <div className={`tab${tab === 'combinadas' ? ' active' : ''}`} onClick={() => setTab('combinadas')}>
          🔗 Combinadas ({combinedMissions.filter(c => !c.completada).length})
        </div>
      </div>

      {tab === 'diarias' && (
        <div className="pf-section">
          <div className="pf-tasks">
            {tasks.length === 0 && <p className="pf-empty">Nenhuma task disponível hoje.</p>}
            {tasks.map(t => {
              const pct = Math.min(100, Math.round((t.progresso / t.objetivo) * 100))
              const recompensas = []
              if (t.recompensa_xp > 0) recompensas.push(`+${t.recompensa_xp} XP`)
              if (t.recompensa_dinheiro > 0) recompensas.push(`+R$${t.recompensa_dinheiro}`)
              if (t.recompensa_fama > 0) recompensas.push(`+${t.recompensa_fama} Fama`)
              return (
                <div key={t.id} className={`pf-task${t.completada ? ' pf-task-done' : ''}`}>
                  <div className="pf-task-info">
                    <strong>{t.nome}</strong>
                    <div className="pf-task-bar"><div className="pf-task-fill" style={{ width: pct + '%' }} /></div>
                    <span className="pf-task-prog">{t.progresso}/{t.objetivo}</span>
                    {recompensas.length > 0 && (
                      <span className="pf-task-rewards">{recompensas.join(' · ')}</span>
                    )}
                  </div>
                  {!t.completada && t.progresso >= t.objetivo && (
                    <button className="btn-work btn-small btn-verde" onClick={() => coletarTask(t.id)}>Coletar</button>
                  )}
                  {t.completada && <span>✅</span>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {tab === 'nivel' && (
        <>
          {disponivelNivel.length === 0 && (
            <p style={{ color: '#888', padding: 16, textAlign: 'center', fontWeight: 700 }}>
              Nenhuma missão disponível pro seu nível. Suba de nível!
            </p>
          )}
          <div className="quests-lista">
            {disponivelNivel.map(q => (
              <QuestCard key={q.id} quest={q} onResgatar={handleResgatar} loading={loading} itensMap={itensMap} />
            ))}
          </div>
          {completadaNivel.length > 0 && (
            <>
              <h3 style={{ marginTop: 20, fontSize: 14, fontWeight: 900, color: '#555' }}>
                ✅ Completadas ({completadaNivel.length})
              </h3>
              <div className="quests-lista">
                {completadaNivel.map(q => (
                  <QuestCard key={q.id} quest={q} onResgatar={handleResgatar} loading={loading} itensMap={itensMap} />
                ))}
              </div>
            </>
          )}
        </>
      )}

      {tab === 'campinho' && mostrarCampinho && (
        <>
          {materiaisLista.length > 0 && (
            <div className="materiais-panel">
              <strong>Seus Materiais:</strong>
              <div className="materiais-lista">
                {materiaisLista.map(([mat, qtd]) => (
                  <span key={mat} className="material-badge">
                    {MATERIAL_ICONES[mat] || '📦'} {mat}: {qtd}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className="quests-lista">
            {disponivelCamp.map(q => (
              <QuestCard key={q.id} quest={q} onResgatar={handleResgatar} loading={loading} itensMap={itensMap} />
            ))}
          </div>
          {completadaCamp.length > 0 && (
            <>
              <h3 style={{ marginTop: 20, fontSize: 14, fontWeight: 900, color: '#555' }}>
                ✅ Completadas ({completadaCamp.length})
              </h3>
              <div className="quests-lista">
                {completadaCamp.map(q => (
                  <QuestCard key={q.id} quest={q} onResgatar={handleResgatar} loading={loading} itensMap={itensMap} />
                ))}
              </div>
            </>
          )}
        </>
      )}

      {tab === 'skill' && (
        <div className="pf-section">
          <div className="pf-tasks">
            {skillMissions.length === 0 && <p className="pf-empty">Nenhuma missão de habilidade.</p>}
            {skillMissions.map(s => {
              const pct = Math.min(100, Math.round((s.progresso / s.alvo) * 100))
              return (
                <div key={s.id} className={`pf-task${s.completada ? ' pf-task-done' : ''}`}>
                  <div className="pf-task-info">
                    <strong>{s.icone} {s.nome}</strong>
                    <p style={{ fontSize: 10, color: '#888', margin: '2px 0' }}>{s.descricao}</p>
                    <div className="pf-task-bar"><div className="pf-task-fill" style={{ width: pct + '%' }} /></div>
                    <span className="pf-task-prog">{s.progresso}/{s.alvo} · +{s.recompensa_xp}XP +{s.recompensa_moedas}💎</span>
                  </div>
                  {s.completada && <span>✅</span>}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {tab === 'combinadas' && (
        <div className="pf-section">
          <div className="pf-tasks">
            {combinedMissions.length === 0 && <p className="pf-empty">Nenhuma missão combinada hoje.</p>}
            {combinedMissions.map(m => (
              <div key={m.id} className={`pf-task${m.completada ? ' pf-task-done' : ''}`}>
                <div className="pf-task-info">
                  <strong>{m.icone} {m.nome}</strong>
                  <p style={{ fontSize: 10, color: '#888', margin: '2px 0' }}>{m.descricao}</p>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                    <span className={`cm-obj${m.obj1_progresso >= m.objetivo1_alvo ? ' cm-done' : ''}`}>
                      {m.objetivo1_tipo} {m.obj1_progresso}/{m.objetivo1_alvo}
                    </span>
                    <span className={`cm-obj${m.obj2_progresso >= m.objetivo2_alvo ? ' cm-done' : ''}`}>
                      {m.objetivo2_tipo} {m.obj2_progresso}/{m.objetivo2_alvo}
                    </span>
                    {m.objetivo3_tipo && (
                      <span className={`cm-obj${m.obj3_progresso >= m.objetivo3_alvo ? ' cm-done' : ''}`}>
                        {m.objetivo3_tipo} {m.obj3_progresso}/{m.objetivo3_alvo}
                      </span>
                    )}
                  </div>
                  <span className="pf-task-prog">+{m.recompensa_xp}XP +R${m.recompensa_dinheiro} +{m.recompensa_moedas}💎</span>
                </div>
                {m.completada && <span>✅</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
