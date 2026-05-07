import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useGame } from '../context/GameContext'
import { fmt, gerarDescricaoItem } from '../utils'

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

  // Tipo: dialogo generico
  if (activeDialog.tipo === 'dialogo') {
    return (
      <div className="jc-overlay" onClick={fecharDialogo}>
        <div className="jc-dialog-card" onClick={e => e.stopPropagation()}>
          <div className="jc-dialog-icon">{activeDialog.icone || '💬'}</div>
          <p className="jc-dialog-text">{activeDialog.texto}</p>
          <button className="jc-btn jc-btn-primary" style={{ width: '100%', minHeight: 42 }} onClick={fecharDialogo}>Entendi</button>
        </div>
      </div>
    )
  }

  return null
}
