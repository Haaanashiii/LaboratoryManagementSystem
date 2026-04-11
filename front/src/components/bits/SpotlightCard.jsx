import { useRef } from 'react'
import './bits.css'

const SpotlightCard = ({
  children,
  className = '',
  spotlightColor = 'rgba(59, 130, 246, 0.12)',
}) => {
  const divRef = useRef(null)

  const handleMouseMove = e => {
    const rect = divRef.current.getBoundingClientRect()
    divRef.current.style.setProperty('--mouse-x', `${e.clientX - rect.left}px`)
    divRef.current.style.setProperty('--mouse-y', `${e.clientY - rect.top}px`)
    divRef.current.style.setProperty('--spotlight-color', spotlightColor)
  }

  return (
    <div ref={divRef} onMouseMove={handleMouseMove} className={`card-spotlight ${className}`}>
      {children}
    </div>
  )
}

export default SpotlightCard
