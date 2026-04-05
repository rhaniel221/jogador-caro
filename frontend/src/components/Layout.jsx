import React from 'react'
import Header from './Header'
import Nav from './Nav'

export default function Layout({ children }) {
  return (
    <div className="game-container">
      <Header />
      <Nav />
      <main className="content">
        {children}
      </main>
    </div>
  )
}
