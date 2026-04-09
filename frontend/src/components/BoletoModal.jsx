import React, { useState, useEffect } from 'react'
import { useGame } from '../context/GameContext'
import { useNavigate } from 'react-router-dom'
import API from '../api'
import { fmt } from '../utils'

export default function BoletoModal() {
  const { jogador, jogadorID } = useGame()
  const navigate = useNavigate()
  const [boleto, setBoleto] = useState(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!jogadorID || !jogador || jogador.nivel < 18) return
    // Checa se já dispensou nesta sessão
    const key = 'boleto_dismissed_' + jogadorID
    if (sessionStorage.getItem(key)) return

    API.get('/api/boletos/verificar/' + jogadorID)
      .then(res => {
        if (res.tem_boleto) setBoleto(res)
      })
      .catch(() => {})
  }, [jogadorID, jogador?.nivel])

  function irAoBanco() {
    const key = 'boleto_dismissed_' + jogadorID
    sessionStorage.setItem(key, '1')
    setBoleto(null)
    setDismissed(true)
    navigate('/banco')
  }

  function dispensar() {
    const key = 'boleto_dismissed_' + jogadorID
    sessionStorage.setItem(key, '1')
    setBoleto(null)
    setDismissed(true)
  }

  if (!boleto || dismissed) return null

  return (
    <div className="boleto-notif">
      <div className="boleto-notif-icon">📄</div>
      <div className="boleto-notif-body">
        <div className="boleto-notif-titulo">Boletos pendentes!</div>
        <div className="boleto-notif-valor">
          R$ {fmt(boleto.total)}
          {boleto.juros > 0 && <span className="boleto-notif-juros"> (+R${fmt(boleto.juros)} juros)</span>}
        </div>
      </div>
      <div className="boleto-notif-actions">
        <button className="btn-work btn-verde btn-small" onClick={irAoBanco}>Pagar</button>
        <button className="boleto-notif-fechar" onClick={dispensar}>✕</button>
      </div>
    </div>
  )
}
