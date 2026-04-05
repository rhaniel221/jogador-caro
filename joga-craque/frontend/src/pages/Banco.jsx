import React, { useState } from 'react'
import { useGame } from '../context/GameContext'
import API from '../api'
import { fmt } from '../utils'

export default function Banco() {
  const { jogador, setJogador, jogadorID, mostrarNotificacao } = useGame()
  const [valDep, setValDep] = useState('')
  const [valSac, setValSac] = useState('')

  async function depositar() {
    const valor = parseInt(valDep)
    if (!valor || valor <= 0) { mostrarNotificacao('Digite um valor válido!', 'erro'); return }
    try {
      const res = await API.post('/api/depositar', { jogador_id: jogadorID, valor })
      if (res.sucesso) { setJogador(res.jogador); setValDep(''); mostrarNotificacao(res.mensagem, 'sucesso') }
      else mostrarNotificacao(res.mensagem, 'erro')
    } catch (e) { mostrarNotificacao('Erro ao depositar.', 'erro') }
  }

  async function sacar() {
    const valor = parseInt(valSac)
    if (!valor || valor <= 0) { mostrarNotificacao('Digite um valor válido!', 'erro'); return }
    try {
      const res = await API.post('/api/sacar', { jogador_id: jogadorID, valor })
      if (res.sucesso) { setJogador(res.jogador); setValSac(''); mostrarNotificacao(res.mensagem, 'sucesso') }
      else mostrarNotificacao(res.mensagem, 'erro')
    } catch (e) { mostrarNotificacao('Erro ao sacar.', 'erro') }
  }

  if (!jogador) return null

  return (
    <>
      <h2 className="page-title">🏦 BANCO</h2>
      <p className="subtitle">Guarde seu dinheiro com segurança. Taxa de 10% no depósito. Dinheiro no banco fica seguro de roubos!</p>

      <div className="bank-container" data-tutorial="banco-area">
        <div className="bank-balances">
          <div className="bank-balance-item">
            <h3>💵 Na Mão</h3>
            <div className="bank-balance-value mao">R$ {fmt(jogador.dinheiro_mao)}</div>
            <small style={{ color: '#5a7a4a', fontSize: '10px' }}>Pode ser roubado em combates</small>
          </div>
          <div className="bank-balance-item" style={{ borderLeft: '1px solid #1a2214', borderRight: '1px solid #1a2214', padding: '0 40px' }}>
            <h3>🏦 No Banco</h3>
            <div className="bank-balance-value conta">R$ {fmt(jogador.dinheiro_banco)}</div>
            <small style={{ color: '#5a7a4a', fontSize: '10px' }}>Seguro! Não pode ser roubado</small>
          </div>
          <div className="bank-balance-item">
            <h3>💰 Total</h3>
            <div className="bank-balance-value" style={{ color: '#ffd700' }}>R$ {fmt(jogador.dinheiro_mao + jogador.dinheiro_banco)}</div>
            <small style={{ color: '#5a7a4a', fontSize: '10px' }}>Patrimônio total</small>
          </div>
        </div>

        <div className="bank-actions">
          <div className="bank-action">
            <h4>💳 Depositar</h4>
            <p style={{ fontSize: '11px', color: '#5a7a4a', marginBottom: '12px' }}>Taxa de 10% sobre o valor depositado.</p>
            <input
              type="number"
              placeholder="Valor a depositar..."
              value={valDep}
              onChange={e => setValDep(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && depositar()}
            />
            <button className="btn-work btn-verde" style={{ width: '100%' }} onClick={depositar}>
              Depositar
            </button>
          </div>
          <div className="bank-action">
            <h4>💸 Sacar</h4>
            <p style={{ fontSize: '11px', color: '#5a7a4a', marginBottom: '12px' }}>Saque sem taxas.</p>
            <input
              type="number"
              placeholder="Valor a sacar..."
              value={valSac}
              onChange={e => setValSac(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sacar()}
            />
            <button className="btn-work btn-azul" style={{ width: '100%' }} onClick={sacar}>
              Sacar
            </button>
          </div>
        </div>
      </div>

      <div className="section-box" style={{ marginTop: '15px' }}>
        <h3>💡 Dicas</h3>
        <div style={{ fontSize: '12px', color: '#5a7a4a', lineHeight: 1.8 }}>
          <p>• O banco cobra 10% de taxa no depósito para cobrir serviços financeiros.</p>
          <p>• O saque não tem taxas — seu dinheiro está sempre disponível.</p>
          <p>• Dinheiro no banco NÃO pode ser roubado em combates no estádio.</p>
          <p>• Guarde o máximo possível se estiver sendo atacado com frequência!</p>
        </div>
      </div>
    </>
  )
}
