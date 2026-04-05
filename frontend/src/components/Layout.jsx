import React, { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import Header from './Header'
import Nav from './Nav'

export default function Layout({ children }) {
  const location = useLocation()
  const [transitioning, setTransitioning] = useState(false)
  const [displayChildren, setDisplayChildren] = useState(children)
  const prevPath = useRef(location.pathname)

  useEffect(() => {
    if (location.pathname !== prevPath.current) {
      setTransitioning(true)
      const timer = setTimeout(() => {
        setDisplayChildren(children)
        setTransitioning(false)
        prevPath.current = location.pathname
      }, 150)
      return () => clearTimeout(timer)
    } else {
      setDisplayChildren(children)
    }
  }, [location.pathname, children])

  return (
    <div className="game-container">
      <Header />
      <Nav />
      <main className={`content page-transition${transitioning ? ' page-exit' : ' page-enter'}`}>
        {displayChildren}
      </main>
    </div>
  )
}
