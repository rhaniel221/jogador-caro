import React from 'react'
import { useNavigate } from 'react-router-dom'
import { useGame } from '../context/GameContext'
import { fmt, gerarDescricaoItem } from '../utils'

export default function DialogoOverlay() {
  const { activeDialog, fecharDialogo } = useGame()
  const navigate = useNavigate()

  if (!activeDialog) return null

  // Tipo: novo_capitulo — animação espetacular de novo capítulo
  if (activeDialog.tipo === 'novo_capitulo') {
    return (
      <div className="dialogo-overlay capitulo-overlay">
        <div className="capitulo-box">
          <div className="capitulo-stars">✨</div>
          <div className="capitulo-label">NOVO CAPÍTULO DESBLOQUEADO</div>
          <div className="capitulo-fase">FASE {activeDialog.fase}</div>
          <div className="capitulo-titulo">
            <span className="capitulo-fase-icone">{activeDialog.icone}</span>
            {activeDialog.titulo}
          </div>
          {activeDialog.arte && (
            <img
              src={activeDialog.arte}
              alt={activeDialog.titulo}
              className="capitulo-arte"
              onError={e => { e.target.style.display = 'none' }}
            />
          )}
          <div className="capitulo-desbloqueio">{activeDialog.desbloqueio}</div>
          <button className="btn-work btn-verde capitulo-btn" onClick={fecharDialogo}>
            Vamos lá!
          </button>
        </div>
      </div>
    )
  }

  // Tipo: falta_item
  if (activeDialog.tipo === 'falta_item') {
    const item = activeDialog.item
    return (
      <div className="dialogo-overlay">
        <div className="dialogo-box falta-item-box">
          <div className="fi-icone">{item?.icone || '❓'}</div>
          <h3 className="fi-titulo">Item Necessário</h3>
          <div className="fi-nome">{item?.nome || 'Item desconhecido'}</div>
          <div className="fi-desc">{gerarDescricaoItem(item)}</div>
          <div className="fi-preco">R$ {fmt(item?.preco || 0)}</div>
          <div className="fi-botoes">
            <button className="btn-work" onClick={fecharDialogo}>Fechar</button>
            <button
              className="btn-work btn-verde"
              onClick={() => { fecharDialogo(); navigate('/loja?item=' + (item?.id || '')) }}
            >
              🛒 Ir para Loja
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Tipo: dialogo genérico
  if (activeDialog.tipo === 'dialogo') {
    return (
      <div className="dialogo-overlay" onClick={fecharDialogo}>
        <div className="dialogo-box" onClick={e => e.stopPropagation()}>
          <span className="dialogo-icone">{activeDialog.icone || '💬'}</span>
          <p className="dialogo-texto">{activeDialog.texto}</p>
          <button className="btn-work btn-verde" onClick={fecharDialogo}>OK</button>
        </div>
      </div>
    )
  }

  return null
}
