import React, { useState, useEffect } from 'react'
import { useGame } from '../context/GameContext'
import API from '../api'
import { fmt } from '../utils'

export default function BoletoModal() {
  const { jogador, jogadorID, setJogador, mostrarNotificacao } = useGame()
  const [boleto, setBoleto] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!jogadorID || !jogador || jogador.nivel < 18) return
    API.get('/api/boletos/verificar/' + jogadorID)
      .then(res => {
        if (res.tem_boleto) setBoleto(res)
      })
      .catch(() => {})
  }, [jogadorID, jogador?.nivel])

  async function pagar() {
    setLoading(true)
    try {
      const res = await API.post('/api/boletos/pagar', { jogador_id: jogadorID })
      if (res.sucesso) {
        setJogador(res.jogador)
        mostrarNotificacao(res.mensagem, 'sucesso')
        setBoleto(null)
      } else {
        mostrarNotificacao(res.mensagem, 'erro')
      }
    } catch {
      mostrarNotificacao('Erro de conexao', 'erro')
    }
    setLoading(false)
  }

  if (!boleto) return null

  return (
    <div className="modal-overlay" style={{ zIndex: 8000 }}>
      <div className="boleto-modal">
        <div className="boleto-header">
          <div className="boleto-titulo">BOLETOS CHEGARAM!</div>
          <div className="boleto-sub">Suas contas do mes venceram. Pague para continuar!</div>
        </div>

        <div className="boleto-recibo">
          <div className="boleto-recibo-header">
            <span>RECIBO DE PAGAMENTO</span>
            <span>Nivel {boleto.nivel}</span>
          </div>
          <div className="boleto-linha boleto-linha-header">
            <span>Descricao</span>
            <span>Valor</span>
          </div>
          {(boleto.itens || []).map((item, i) => (
            <div key={i} className="boleto-linha">
              <span>{item.icone} {item.nome}</span>
              <span>R$ {fmt(item.valor)}</span>
            </div>
          ))}
          <div className="boleto-linha boleto-total">
            <span>TOTAL</span>
            <span>R$ {fmt(boleto.total)}</span>
          </div>
        </div>

        <div className="boleto-saldo">
          Na mao: R$ {fmt(jogador?.dinheiro_mao || 0)} | Banco: R$ {fmt(jogador?.dinheiro_banco || 0)}
        </div>

        <button
          className="btn-work btn-verde"
          onClick={pagar}
          disabled={loading}
          style={{ width: '100%', fontSize: 16, padding: '14px 0' }}
        >
          {loading ? 'Pagando...' : `Pagar R$ ${fmt(boleto.total)}`}
        </button>
      </div>
    </div>
  )
}
