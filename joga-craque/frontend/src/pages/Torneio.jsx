import React from 'react'

export default function Torneio() {
  return (
    <>
      <h2 className="page-title">🏆 TORNEIO</h2>
      <div style={{
        textAlign: 'center',
        padding: '60px 20px',
        background: 'var(--card-bg)',
        border: 'var(--borda)',
        borderRadius: 'var(--radius)',
        boxShadow: 'var(--sombra)',
        marginTop: 16,
      }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>🚧</div>
        <h3 style={{ fontFamily: 'var(--font-titulo)', fontSize: 24, color: 'var(--preto)', marginBottom: 8 }}>
          EM CONSTRUÇÃO
        </h3>
        <p style={{ fontSize: 14, fontWeight: 700, color: '#556' }}>
          O modo Torneio está sendo preparado. Em breve você poderá competir!
        </p>
      </div>
    </>
  )
}
