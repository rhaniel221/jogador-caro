import React, { useState, useEffect } from 'react'
import { useGame } from '../context/GameContext'
import { useNavigate } from 'react-router-dom'
import API from '../api'
import { fmt } from '../utils'

export default function BoletoModal() {
  const { jogador, jogadorID } = useGame()
  const navigate = useNavigate()
  const [boleto, setBoleto] = useState(null)

  useEffect(() => {
    if (!jogadorID || !jogador || jogador.nivel < 18) return
    API.get('/api/boletos/verificar/' + jogadorID)
      .then(res => {
        if (res.tem_boleto) setBoleto(res)
      })
      .catch(() => {})
  }, [jogadorID, jogador?.nivel])

  if (!boleto) return null

  return (
    <div className="modal-overlay" style={{ zIndex: 8000 }}>
      <div className="boleto-modal">
        <div className="boleto-header">
          <div className="boleto-titulo">BOLETOS CHEGARAM!</div>
          <div className="boleto-sub">
            {boleto.dias_atraso > 0
              ? `${boleto.dias_atraso} dia${boleto.dias_atraso > 1 ? 's' : ''} em atraso! Juros correndo...`
              : 'Suas contas venceram. Va ao banco pagar!'}
          </div>
        </div>

        <div className="boleto-resumo">
          <div className="boleto-resumo-linha">
            <span>Contas do periodo</span>
            <span>R$ {fmt(boleto.valor_base)}</span>
          </div>
          {boleto.juros > 0 && (
            <div className="boleto-resumo-linha boleto-juros">
              <span>Juros ({boleto.dias_atraso}d x 5%)</span>
              <span>+ R$ {fmt(boleto.juros)}</span>
            </div>
          )}
          <div className="boleto-resumo-linha boleto-resumo-total">
            <span>TOTAL</span>
            <span>R$ {fmt(boleto.total)}</span>
          </div>
        </div>

        <button
          className="btn-work btn-verde"
          onClick={() => { setBoleto(null); navigate('/banco') }}
          style={{ width: 'calc(100% - 32px)', margin: '0 16px 16px', fontSize: 16, padding: '14px 0' }}
        >
          Ir ao Banco Pagar
        </button>
      </div>
    </div>
  )
}
