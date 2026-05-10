import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useGame } from '../context/GameContext'
import { fmt, gerarDescricaoItem } from '../utils'

// Tenta extrair "Nome: 'fala' — narração" ou variações com aspas " "
function parseDialogo(texto) {
  if (!texto) return { fala: null, narracao: [] }
  const match = texto.match(/^([A-ZÀ-ÚÇ][^:]{0,24}):\s*['"“”‘’](.+?)['"“”‘’](?:\s*[—–-]\s*(.*))?$/u)
  if (match) {
    const [, nome, fala, resto] = match
    return { fala: { nome: nome.trim(), texto: fala.trim() }, narracao: splitNarracao(resto || '') }
  }
  return { fala: null, narracao: splitNarracao(texto) }
}

function splitNarracao(text) {
  const t = (text || '').trim()
  if (!t) return []
  if (/\s[—–]\s/.test(t)) return t.split(/\s[—–]\s/).map(s => s.trim()).filter(Boolean)
  const partes = t.split(/(?<=[.!?])\s+(?=[A-ZÀ-Ú0-9"“])/u).map(s => s.trim()).filter(Boolean)
  return partes.length ? partes : [t]
}

export default function DialogoOverlay() {
  const { activeDialog, fecharDialogo } = useGame()
  const navigate = useNavigate()

  if (!activeDialog) return null

  // Tipo: novo_capitulo
  if (activeDialog.tipo === 'novo_capitulo') {
    return (
      <div className="jc-overlay">
        <div className="jc-capitulo-card">
          <div className="jc-capitulo-glow" />
          <div className="jc-capitulo-badge">NOVO CAPITULO DESBLOQUEADO</div>
          <div className="jc-capitulo-fase">FASE {activeDialog.fase}</div>
          <div className="jc-capitulo-titulo">
            <span style={{ fontSize: 32 }}>{activeDialog.icone}</span>
            {activeDialog.titulo}
          </div>
          {activeDialog.arte && (
            <img
              src={activeDialog.arte}
              alt={activeDialog.titulo}
              className="jc-capitulo-arte"
              onError={e => { e.target.style.display = 'none' }}
            />
          )}
          {activeDialog.desbloqueio && (
            <div className="jc-capitulo-desbloqueio">{activeDialog.desbloqueio}</div>
          )}
          <button className="jc-btn jc-btn-primary" style={{ width: '100%', marginTop: 14, minHeight: 44 }} onClick={fecharDialogo}>
            Vamos la!
          </button>
        </div>
      </div>
    )
  }

  // Tipo: falta_item
  if (activeDialog.tipo === 'falta_item') {
    const item = activeDialog.item
    return (
      <div className="jc-overlay">
        <div className="jc-dialog-card">
          <div className="jc-dialog-icon" style={{ fontSize: 48 }}>{item?.icone || '❓'}</div>
          <h3 className="jc-dialog-title">Item Necessario</h3>
          <div style={{ fontSize: 16, fontWeight: 900, color: '#f1c76a', marginBottom: 4 }}>{item?.nome || 'Item desconhecido'}</div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 8 }}>{gerarDescricaoItem(item)}</div>
          <div style={{ fontSize: 18, fontWeight: 900, color: '#22c55e', marginBottom: 16 }}>R$ {fmt(item?.preco || 0)}</div>
          <div style={{ display: 'flex', gap: 8, width: '100%' }}>
            <button className="jc-btn jc-btn-secondary" style={{ flex: 1, minHeight: 40 }} onClick={fecharDialogo}>Fechar</button>
            <button className="jc-btn jc-btn-primary" style={{ flex: 1, minHeight: 40 }} onClick={() => { fecharDialogo(); navigate('/loja?item=' + (item?.id || '')) }}>
              Ir para Loja
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Tipo: dialogo generico — cutscene cinematográfica
  if (activeDialog.tipo === 'dialogo') {
    return <DialogoCutscene dialog={activeDialog} onClose={fecharDialogo} />
  }

  return null
}

function DialogoCutscene({ dialog, onClose }) {
  const { fala, narracao } = parseDialogo(dialog.texto)
  const blocos = []
  if (fala) blocos.push({ tipo: 'fala', ...fala })
  narracao.forEach(t => blocos.push({ tipo: 'narracao', texto: t }))

  const [revelados, setRevelados] = useState(1)
  const pronto = revelados >= blocos.length

  useEffect(() => {
    if (pronto) return
    const t = setTimeout(() => setRevelados(n => n + 1), 850)
    return () => clearTimeout(t)
  }, [revelados, pronto])

  function handleClose(e) {
    e?.stopPropagation?.()
    if (!pronto) {
      // Primeiro toque revela tudo de uma vez (skip)
      setRevelados(blocos.length)
      return
    }
    onClose()
  }

  return (
    <div className="jc-overlay" onClick={handleClose}>
      <div className="jc-cutscene-card" onClick={e => e.stopPropagation()}>
        <div className="jc-cutscene-glow" />
        <div className="jc-cutscene-corner jc-cutscene-corner--tl" />
        <div className="jc-cutscene-corner jc-cutscene-corner--tr" />
        <div className="jc-cutscene-corner jc-cutscene-corner--bl" />
        <div className="jc-cutscene-corner jc-cutscene-corner--br" />

        <div className="jc-cutscene-orb">
          <div className="jc-cutscene-orb-ring" />
          <div className="jc-cutscene-orb-ring jc-cutscene-orb-ring--2" />
          <span className="jc-cutscene-icon">{dialog.icone || '💬'}</span>
        </div>

        <div className="jc-cutscene-body">
          {blocos.slice(0, revelados).map((b, i) => (
            b.tipo === 'fala' ? (
              <div key={i} className="jc-cutscene-fala">
                <div className="jc-cutscene-speaker">{b.nome}</div>
                <div className="jc-cutscene-quote">
                  <span className="jc-cutscene-quote-mark">“</span>
                  {b.texto}
                  <span className="jc-cutscene-quote-mark jc-cutscene-quote-mark--end">”</span>
                </div>
              </div>
            ) : (
              <p key={i} className="jc-cutscene-narracao">{b.texto}</p>
            )
          ))}
        </div>

        {pronto ? (
          <button className="jc-cutscene-btn" onClick={handleClose}>
            Continuar <span className="jc-cutscene-btn-arrow">→</span>
          </button>
        ) : (
          <div className="jc-cutscene-skip" onClick={handleClose}>toque para avançar</div>
        )}
      </div>
    </div>
  )
}
