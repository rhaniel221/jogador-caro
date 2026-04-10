import React, { useState, useEffect, useCallback } from 'react'
import { useGame } from '../context/GameContext'
import API from '../api'

const CATEGORIAS = ['Iniciante', 'Intermediário', 'Avançado', 'Elite', 'Lendário', 'Mito']

function formatRestante(segs) {
  if (segs <= 0) return 'pronto'
  const h = Math.floor(segs / 3600)
  const m = Math.floor((segs % 3600) / 60)
  const s = segs % 60
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s.toString().padStart(2, '0')}s`
  return `${s}s`
}

function StatBadge({ label, value, color }) {
  if (!value) return null
  return (
    <span className="treino-bonus-badge" style={{ background: color }}>
      +{value} {label}
    </span>
  )
}

function TreinoCard({ treino, agora, loading, onTreinar, jogador }) {
  const proximoEm = treino.proximo_em || 0
  const restante = proximoEm > 0 ? proximoEm - agora : 0
  const onCooldown = restante > 0
  const nivelOK = treino.nivel_ok
  const energiaOK = jogador && jogador.energia >= treino.custo_energia
  const disponivel = nivelOK && !onCooldown && energiaOK
  const isLoading = loading === treino.id

  return (
    <div
      className="treino-card"
      style={{
        opacity: nivelOK ? 1 : 0.55,
        background: '#fff',
        border: '2px solid #d4d8d0',
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
        display: 'flex',
        gap: 12,
        alignItems: 'center'
      }}
    >
      <div style={{ fontSize: 36 }}>{treino.icone}</div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <h3 style={{ margin: '0 0 4px 0', fontSize: 16, color: '#1a3a1a' }}>
          {treino.nome}
        </h3>
        <p style={{ margin: '0 0 6px 0', fontSize: 12, color: '#5a5a5a' }}>
          {treino.descricao}
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 6 }}>
          <StatBadge label="Força" value={treino.bonus_forca} color="#e63946" />
          <StatBadge label="Velocidade" value={treino.bonus_velocidade} color="#1d72c2" />
          <StatBadge label="Habilidade" value={treino.bonus_habilidade} color="#9c27b0" />
        </div>

        <div style={{ fontSize: 11, color: '#666' }}>
          ⚡ {treino.custo_energia} energia • ⏱ cooldown {Math.floor(treino.cooldown_minutos / 60) > 0 ? `${Math.floor(treino.cooldown_minutos / 60)}h${treino.cooldown_minutos % 60 > 0 ? ` ${treino.cooldown_minutos % 60}m` : ''}` : `${treino.cooldown_minutos}m`}
          {treino.vezes_feito > 0 && <> • feito {treino.vezes_feito}x</>}
        </div>
      </div>

      <div style={{ minWidth: 110, textAlign: 'center' }}>
        {!nivelOK ? (
          <div style={{ fontSize: 12, color: '#999' }}>🔒 Nível {treino.nivel_min}</div>
        ) : onCooldown ? (
          <div style={{ fontSize: 12, color: '#c47a00', fontWeight: 700 }}>
            ⏳ {formatRestante(restante)}
          </div>
        ) : !energiaOK ? (
          <div style={{ fontSize: 12, color: '#c44', fontWeight: 700 }}>
            sem energia
          </div>
        ) : (
          <button
            className="btn-work"
            disabled={isLoading || !disponivel}
            onClick={() => onTreinar(treino.id)}
            style={{ width: '100%' }}
          >
            {isLoading ? '...' : 'TREINAR'}
          </button>
        )}
      </div>
    </div>
  )
}

export default function Treino() {
  const { jogador, setJogador, jogadorID, mostrarNotificacao } = useGame()
  const [treinos, setTreinos] = useState([])
  const [categoriaAtiva, setCategoriaAtiva] = useState('Iniciante')
  const [loading, setLoading] = useState(null)
  const [agora, setAgora] = useState(Math.floor(Date.now() / 1000))

  // tick timer pro cooldown
  useEffect(() => {
    const id = setInterval(() => setAgora(Math.floor(Date.now() / 1000)), 1000)
    return () => clearInterval(id)
  }, [])

  const carregar = useCallback(async () => {
    if (!jogadorID) return
    try {
      const dados = await API.get('/api/treinos/' + jogadorID)
      setTreinos(dados || [])
    } catch (e) {}
  }, [jogadorID])

  useEffect(() => {
    carregar()
  }, [carregar])

  // Auto-seleciona a maior categoria disponível pro nível do jogador
  useEffect(() => {
    if (!jogador || !treinos.length) return
    const disponiveis = CATEGORIAS.filter(cat =>
      treinos.some(t => t.categoria === cat && t.nivel_ok)
    )
    if (disponiveis.length > 0) {
      setCategoriaAtiva(disponiveis[disponiveis.length - 1])
    }
  }, [jogador, treinos])

  async function handleTreinar(treinoID) {
    if (!jogador || loading) return
    setLoading(treinoID)
    try {
      const res = await API.post('/api/treinar', {
        jogador_id: jogadorID,
        treino_id: treinoID
      })
      if (res.sucesso) {
        setJogador(res.jogador)
        mostrarNotificacao(res.mensagem, 'sucesso')
        await carregar()
      } else {
        mostrarNotificacao(res.mensagem || 'Não foi possível treinar', 'erro')
        if (res.proximo_em) await carregar()
      }
    } catch (e) {
      mostrarNotificacao('Erro ao treinar', 'erro')
    } finally {
      setLoading(null)
    }
  }

  if (!jogador) {
    return <div style={{ padding: 20, textAlign: 'center' }}>Carregando…</div>
  }

  const treinosFiltrados = treinos.filter(t => t.categoria === categoriaAtiva)
  const categoriasDisponiveis = CATEGORIAS.filter(cat =>
    treinos.some(t => t.categoria === cat)
  )

  // Cooldown global: pega o proximo_em de qualquer treino (todos têm o mesmo)
  const globalCooldown = treinos.length > 0 ? treinos[0].proximo_em || 0 : 0
  const globalRestante = globalCooldown > 0 ? globalCooldown - agora : 0

  return (
    <div className="page-treino" style={{ padding: 12, maxWidth: 760, margin: '0 auto' }}>
      <div style={{
        background: 'linear-gradient(135deg, #1a3a1a 0%, #2d5a2d 100%)',
        color: '#fff',
        padding: '14px 16px',
        borderRadius: 12,
        marginBottom: 14
      }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>🏋️ TREINO</h1>
        <p style={{ margin: '4px 0 0 0', fontSize: 12, opacity: 0.9 }}>
          Cada treino dá bônus de atributo. Ao treinar, todos os treinos entram em cooldown — escolha bem! Treinos fortes travam por mais tempo. Sua build é sua estratégia.
        </p>
      </div>

      <div style={{
        display: 'flex',
        gap: 6,
        background: '#fff',
        padding: 10,
        borderRadius: 12,
        marginBottom: 12,
        justifyContent: 'space-around',
        border: '2px solid #d4d8d0'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: '#888' }}>FORÇA</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#e63946' }}>{jogador.forca}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: '#888' }}>VELOCIDADE</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#1d72c2' }}>{jogador.velocidade}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: '#888' }}>HABILIDADE</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#9c27b0' }}>{jogador.habilidade}</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: '#888' }}>ENERGIA</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: '#f5a623' }}>{jogador.energia}/{jogador.energia_max}</div>
        </div>
      </div>

      <div style={{
        display: 'flex',
        gap: 6,
        marginBottom: 12,
        overflowX: 'auto',
        paddingBottom: 4
      }}>
        {categoriasDisponiveis.map(cat => {
          const ativo = cat === categoriaAtiva
          const algumDisponivel = treinos.some(t => t.categoria === cat && t.nivel_ok)
          return (
            <button
              key={cat}
              onClick={() => setCategoriaAtiva(cat)}
              style={{
                background: ativo ? '#1a3a1a' : (algumDisponivel ? '#fff' : '#eee'),
                color: ativo ? '#fff' : (algumDisponivel ? '#1a3a1a' : '#999'),
                border: '2px solid ' + (ativo ? '#1a3a1a' : '#d4d8d0'),
                borderRadius: 20,
                padding: '6px 14px',
                fontWeight: 700,
                fontSize: 12,
                whiteSpace: 'nowrap',
                cursor: 'pointer'
              }}
            >
              {cat} {!algumDisponivel && '🔒'}
            </button>
          )
        })}
      </div>

      {globalRestante > 0 && (
        <div style={{
          background: '#fff8e1', border: '2px solid #f5a623', borderRadius: 12,
          padding: '10px 14px', marginBottom: 12, textAlign: 'center',
          fontWeight: 700, fontSize: 14, color: '#8a6d00'
        }}>
          ⏳ Cooldown global: <span style={{ color: '#c47a00' }}>{formatRestante(globalRestante)}</span>
        </div>
      )}

      <div>
        {treinosFiltrados.length === 0 && (
          <div style={{ textAlign: 'center', color: '#888', padding: 20 }}>
            Nenhum treino nesta categoria.
          </div>
        )}
        {treinosFiltrados.map(t => (
          <TreinoCard
            key={t.id}
            treino={t}
            agora={agora}
            loading={loading}
            onTreinar={handleTreinar}
            jogador={jogador}
          />
        ))}
      </div>

      <div style={{
        marginTop: 12,
        padding: 12,
        background: '#fffbe6',
        border: '1px dashed #d4b800',
        borderRadius: 10,
        fontSize: 12,
        color: '#5a4a00'
      }}>
        💡 <strong>Dica:</strong> Subir de nível não dá mais atributos — só treinando!
        Cada categoria tem opções diferentes: especialize ou faça híbridos. Quem treina mais ao longo do dia ganha vantagem real sobre os outros. A escolha do estilo é sua.
      </div>
    </div>
  )
}
