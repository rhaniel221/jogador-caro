import React, { useState, useEffect } from 'react'
import { useGame } from '../context/GameContext'
import API from '../api'
import { fmt } from '../utils'

export default function Banco() {
  const { jogador, setJogador, jogadorID, mostrarNotificacao } = useGame()
  const [valDep, setValDep] = useState('')
  const [valSac, setValSac] = useState('')
  const [boleto, setBoleto] = useState(null)
  const [historico, setHistorico] = useState([])
  const [totalPagos, setTotalPagos] = useState(0)
  const [loadingBoleto, setLoadingBoleto] = useState(false)
  const [cdb, setCdb] = useState(null)
  const [valCdb, setValCdb] = useState('')
  const [loadingCdb, setLoadingCdb] = useState(false)

  function carregarBoletos() {
    if (!jogadorID || !jogador || jogador.nivel < 18) return
    API.get('/api/boletos/verificar/' + jogadorID).then(res => {
      if (res && res.tem_boleto) setBoleto(res)
      else setBoleto(null)
    }).catch(() => setBoleto(null))
    API.get('/api/boletos/historico/' + jogadorID).then(res => {
      setHistorico((res && res.historico) || [])
      setTotalPagos((res && res.total_pagos) || 0)
    }).catch(() => {})
  }

  function carregarCDB() {
    if (!jogadorID) return
    API.get('/api/cdb/' + jogadorID).then(res => setCdb(res)).catch(() => setCdb(null))
  }

  useEffect(() => {
    carregarBoletos()
    carregarCDB()
  }, [jogadorID, jogador?.nivel])

  // Atualiza rendimentos do CDB a cada 30s
  useEffect(() => {
    if (!jogadorID) return
    const t = setInterval(carregarCDB, 30000)
    return () => clearInterval(t)
  }, [jogadorID])

  async function depositar() {
    const valor = parseInt(valDep)
    if (!valor || valor <= 0) { mostrarNotificacao('Digite um valor valido!', 'erro'); return }
    try {
      const res = await API.post('/api/depositar', { jogador_id: jogadorID, valor })
      if (res.sucesso) { setJogador(res.jogador); setValDep(''); mostrarNotificacao(res.mensagem, 'sucesso') }
      else mostrarNotificacao(res.mensagem, 'erro')
    } catch (e) { mostrarNotificacao('Erro ao depositar.', 'erro') }
  }

  async function sacar() {
    const valor = parseInt(valSac)
    if (!valor || valor <= 0) { mostrarNotificacao('Digite um valor valido!', 'erro'); return }
    try {
      const res = await API.post('/api/sacar', { jogador_id: jogadorID, valor })
      if (res.sucesso) { setJogador(res.jogador); setValSac(''); mostrarNotificacao(res.mensagem, 'sucesso') }
      else mostrarNotificacao(res.mensagem, 'erro')
    } catch (e) { mostrarNotificacao('Erro ao sacar.', 'erro') }
  }

  async function pagarBoleto() {
    setLoadingBoleto(true)
    try {
      const res = await API.post('/api/boletos/pagar', { jogador_id: jogadorID })
      if (res.sucesso) {
        setJogador(res.jogador)
        mostrarNotificacao(res.mensagem, 'sucesso')
        setBoleto(null)
        carregarBoletos()
      } else {
        mostrarNotificacao(res.mensagem, 'erro')
      }
    } catch {
      mostrarNotificacao('Erro ao pagar boleto.', 'erro')
    }
    setLoadingBoleto(false)
  }

  async function investirCDB() {
    const valor = parseInt(valCdb)
    if (!valor || valor < 1000) { mostrarNotificacao('Minimo R$ 1.000 para investir!', 'erro'); return }
    setLoadingCdb(true)
    try {
      const res = await API.post('/api/cdb/investir', { jogador_id: jogadorID, valor })
      if (res.sucesso) {
        setJogador(res.jogador)
        mostrarNotificacao(res.mensagem, 'sucesso')
        setValCdb('')
        carregarCDB()
      } else {
        mostrarNotificacao(res.mensagem, 'erro')
      }
    } catch { mostrarNotificacao('Erro ao investir.', 'erro') }
    setLoadingCdb(false)
  }

  async function resgatarCDB(investimentoID) {
    setLoadingCdb(true)
    try {
      const res = await API.post('/api/cdb/resgatar', { jogador_id: jogadorID, investimento_id: investimentoID })
      if (res.sucesso) {
        setJogador(res.jogador)
        mostrarNotificacao(res.mensagem, res.rendimento > 0 ? 'sucesso' : 'erro')
        carregarCDB()
      } else {
        mostrarNotificacao(res.mensagem, 'erro')
      }
    } catch { mostrarNotificacao('Erro ao resgatar.', 'erro') }
    setLoadingCdb(false)
  }

  if (!jogador) return null

  return (
    <>
      <h2 className="page-title">🏦 BANCO</h2>
      <p className="subtitle">Guarde seu dinheiro com seguranca. Taxa de 10% no deposito. Dinheiro no banco fica seguro de roubos!</p>

      <div className="bank-container" data-tutorial="banco-area">
        <div className="bank-balances">
          <div className="bank-balance-item">
            <h3>💵 Na Mao</h3>
            <div className="bank-balance-value mao">R$ {fmt(jogador.dinheiro_mao)}</div>
            <small style={{ color: '#5a7a4a', fontSize: '10px' }}>Pode ser roubado em combates</small>
          </div>
          <div className="bank-balance-item">
            <h3>🏦 No Banco</h3>
            <div className="bank-balance-value conta">R$ {fmt(jogador.dinheiro_banco)}</div>
            <small style={{ color: '#5a7a4a', fontSize: '10px' }}>Seguro! Nao pode ser roubado</small>
          </div>
          <div className="bank-balance-item">
            <h3>💰 Total</h3>
            <div className="bank-balance-value" style={{ color: 'var(--verde)' }}>R$ {fmt(jogador.dinheiro_mao + jogador.dinheiro_banco)}</div>
            <small style={{ color: '#5a7a4a', fontSize: '10px' }}>Patrimonio total</small>
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

      {/* === BOLETO PENDENTE === */}
      {boleto && (
        <div className="boleto-banco-section">
          <div className="boleto-banco-header">
            <h3>📄 BOLETO PENDENTE</h3>
            {boleto.dias_atraso > 0 && (
              <span className="boleto-atraso-badge">
                {boleto.dias_atraso} dia{boleto.dias_atraso > 1 ? 's' : ''} em atraso!
              </span>
            )}
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
            {boleto.juros > 0 && (
              <div className="boleto-linha boleto-juros">
                <span>📈 Juros de atraso ({boleto.dias_atraso}d x 5%)</span>
                <span>+ R$ {fmt(boleto.juros)}</span>
              </div>
            )}
            <div className="boleto-linha boleto-total">
              <span>TOTAL A PAGAR</span>
              <span>R$ {fmt(boleto.total)}</span>
            </div>
          </div>

          {boleto.dias_atraso > 0 && (
            <div className="boleto-aviso-juros">
              Juros de 5% ao dia! Pague logo para evitar mais cobranças.
            </div>
          )}

          <button
            className="btn-work btn-verde"
            style={{ width: '100%', fontSize: 16, padding: '14px 0' }}
            onClick={pagarBoleto}
            disabled={loadingBoleto}
          >
            {loadingBoleto ? 'Pagando...' : `Pagar R$ ${fmt(boleto.total)}`}
          </button>
        </div>
      )}

      {/* === CDB INVESTIMENTOS === */}
      <div className="section-box" style={{ marginTop: 15 }}>
        <h3>📈 CDB — INVESTIMENTO</h3>
        <p style={{ fontSize: 12, fontWeight: 700, color: '#556', marginBottom: 12 }}>
          Rende 2% a cada 6h (8% ao dia!). Minimo R$ 1.000. Resgate apos 12h para lucrar.
        </p>

        <div className="cdb-investir-row">
          <input
            type="number"
            placeholder="Valor a investir..."
            value={valCdb}
            onChange={e => setValCdb(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && investirCDB()}
            className="cdb-input"
          />
          <button className="btn-work btn-verde" onClick={investirCDB} disabled={loadingCdb}>
            {loadingCdb ? '...' : 'Investir'}
          </button>
        </div>

        {cdb && cdb.total_investido > 0 && (
          <div className="cdb-resumo">
            <div className="cdb-resumo-item">
              <span>Investido</span>
              <strong>R$ {fmt(cdb.total_investido)}</strong>
            </div>
            <div className="cdb-resumo-item cdb-lucro">
              <span>Rendimento</span>
              <strong>+ R$ {fmt(cdb.total_rendimento)}</strong>
            </div>
          </div>
        )}

        {cdb && cdb.investimentos && cdb.investimentos.length > 0 ? (
          <div className="cdb-lista">
            {cdb.investimentos.map(inv => (
              <div key={inv.id} className="cdb-card">
                <div className="cdb-card-info">
                  <div className="cdb-card-valor">R$ {fmt(inv.valor)}</div>
                  <div className="cdb-card-detalhe">
                    {inv.horas_ativas}h ativo · +R$ {fmt(inv.rendimento)} lucro
                  </div>
                  <div className="cdb-card-detalhe">
                    Resgate: <strong>R$ {fmt(inv.total_resgate)}</strong>
                  </div>
                </div>
                <div className="cdb-card-action">
                  {inv.pode_resgatar ? (
                    <button className="btn-work btn-verde btn-small" onClick={() => resgatarCDB(inv.id)} disabled={loadingCdb}>
                      Resgatar
                    </button>
                  ) : (
                    <span className="cdb-card-aguarde">Min 12h</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p style={{ fontSize: 12, color: '#888', padding: '8px 0' }}>Nenhum investimento ativo. Invista acima!</p>
        )}
      </div>

      {/* === HISTORICO DE BOLETOS === */}
      {jogador.nivel >= 18 && (
        <div className="section-box" style={{ marginTop: 15 }}>
          <h3>📋 Historico de Boletos {totalPagos > 0 && <span style={{ fontSize: 12, color: '#888', fontWeight: 700 }}>({totalPagos} pagos)</span>}</h3>

          {historico.length === 0 ? (
            <p style={{ fontSize: 12, color: '#888', padding: '10px 0' }}>
              {boleto ? 'Nenhum boleto pago ainda. Pague o boleto pendente acima!' : 'Nenhum boleto registrado ainda.'}
            </p>
          ) : (
            <div className="boleto-hist-lista">
              {historico.map((h, i) => (
                <div key={i} className={`boleto-hist-item${h.juros > 0 ? ' boleto-hist-juros' : ''}`}>
                  <div className="boleto-hist-data">{h.pago_em}</div>
                  <div className="boleto-hist-valores">
                    <span>R$ {fmt(h.valor_total)}</span>
                    {h.juros > 0 && (
                      <span className="boleto-hist-juros-tag">
                        +R${fmt(h.juros)} juros ({h.dias_atraso}d)
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="section-box" style={{ marginTop: '15px' }}>
        <h3>💡 Dicas</h3>
        <div style={{ fontSize: '12px', color: '#5a7a4a', lineHeight: 1.8 }}>
          <p>• O banco cobra 10% de taxa no deposito para cobrir servicos financeiros.</p>
          <p>• O saque nao tem taxas — seu dinheiro esta sempre disponivel.</p>
          <p>• Dinheiro no banco NAO pode ser roubado em combates no estadio.</p>
          <p>• Guarde o maximo possivel se estiver sendo atacado com frequencia!</p>
          <p>• CDB rende 2% a cada 6 horas (8% ao dia!) — investimento minimo R$ 1.000.</p>
          <p>• Resgate CDB apos 12h para garantir o lucro. Antes disso recebe so o valor investido.</p>
          <p>• Maximo 5 investimentos CDB ativos ao mesmo tempo.</p>
          {jogador.nivel >= 18 && (
            <>
              <p>• A cada 2 dias chegam boletos (aluguel, energia, agua, internet, condominio).</p>
              <p>• Boletos em atraso geram juros de 5% ao dia! Pague em dia.</p>
            </>
          )}
        </div>
      </div>
    </>
  )
}
