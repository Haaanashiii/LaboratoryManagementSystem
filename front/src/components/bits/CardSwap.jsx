import React, {
  Children,
  cloneElement,
  forwardRef,
  isValidElement,
  useEffect,
  useMemo,
  useRef,
} from 'react'
import gsap from 'gsap'
import './bits.css'

export const Card = forwardRef(({ className = '', style, children }, ref) => (
  <div ref={ref} className={`cs-card ${className}`} style={style}>
    {children}
  </div>
))
Card.displayName = 'Card'

const makeSlot = (i, distX, distY, total) => ({
  x: i * distX,
  y: -i * distY,
  z: -i * distX * 1.5,
  zIndex: total - i,
})

const placeNow = (el, slot, skew) =>
  gsap.set(el, {
    x: slot.x,
    y: slot.y,
    z: slot.z,
    xPercent: -50,
    yPercent: -50,
    skewY: skew,
    transformOrigin: 'center center',
    zIndex: slot.zIndex,
    force3D: true,
  })

const CardSwap = ({
  width = 360,
  height = 260,
  cardDistance = 55,
  verticalDistance = 60,
  delay = 4500,
  pauseOnHover = true,
  onCardClick,
  skewAmount = 5,
  easing = 'elastic',
  children,
}) => {
  const config = useMemo(() => {
    if (easing === 'elastic') {
      return {
        ease: 'elastic.out(0.6, 0.9)',
        durDrop: 0.55,
        durMove: 0.6,
        durReturn: 0.75,
        promoteOverlap: 0.6,
        returnDelay: 0.28,
      }
    }
    return {
      ease: 'power2.inOut',
      durDrop: 0.5,
      durMove: 0.5,
      durReturn: 0.5,
      promoteOverlap: 0.5,
      returnDelay: 0.15,
    }
  }, [easing])

  const containerRef = useRef(null)
  const order = useRef([])
  const intervalRef = useRef(null)
  const tlRef = useRef(null)

  const rawChildren = Children.toArray(children).filter(isValidElement)
  const refs = useMemo(() => rawChildren.map(() => React.createRef()), [rawChildren.length])
  const rendered = rawChildren.map((child, i) => cloneElement(child, { key: i, ref: refs[i] }))

  useEffect(() => {
    const container = containerRef.current
    if (!container || refs.length === 0) return

    order.current = refs.map((_, i) => i)
    refs.forEach((r, i) => {
      const slot = makeSlot(i, cardDistance, verticalDistance, refs.length)
      placeNow(r.current, slot, i === 0 ? skewAmount : 0)
    })

    const swap = () => {
      if (order.current.length < 2) return
      const [front, ...rest] = order.current
      const elFront = refs[front].current
      const tl = gsap.timeline()
      tlRef.current = tl

      tl.to(elFront, { y: '+=500', duration: config.durDrop, ease: config.ease })
      tl.addLabel('promote', `-=${config.durDrop * config.promoteOverlap}`)

      rest.forEach((idx, i) => {
        const el = refs[idx].current
        const slot = makeSlot(i, cardDistance, verticalDistance, refs.length)
        tl.set(el, { zIndex: slot.zIndex }, 'promote')
        tl.to(el, { x: slot.x, y: slot.y, z: slot.z, duration: config.durMove, ease: config.ease }, 'promote')
      })

      const backSlot = makeSlot(refs.length - 1, cardDistance, verticalDistance, refs.length)
      tl.addLabel('return', `promote+=${config.durMove * config.returnDelay}`)
      tl.call(() => { gsap.set(elFront, { zIndex: backSlot.zIndex }) }, undefined, 'return')
      tl.to(
        elFront,
        { x: backSlot.x, y: backSlot.y, z: backSlot.z, duration: config.durReturn, ease: config.ease },
        'return'
      )
      tl.call(() => { order.current = [...rest, front] })
    }

    swap()
    intervalRef.current = window.setInterval(swap, delay)

    if (pauseOnHover) {
      const pause = () => { tlRef.current?.pause(); clearInterval(intervalRef.current) }
      const resume = () => { tlRef.current?.play(); intervalRef.current = window.setInterval(swap, delay) }
      container.addEventListener('mouseenter', pause)
      container.addEventListener('mouseleave', resume)
      return () => {
        clearInterval(intervalRef.current)
        tlRef.current?.kill()
        container.removeEventListener('mouseenter', pause)
        container.removeEventListener('mouseleave', resume)
      }
    }

    return () => {
      clearInterval(intervalRef.current)
      tlRef.current?.kill()
    }
  }, [cardDistance, verticalDistance, delay, config, skewAmount])

  return (
    <div
      ref={containerRef}
      className="cs-container"
      style={{ width, height }}
      onClick={onCardClick ? e => {
        const idx = order.current[0]
        onCardClick(idx)
      } : undefined}
    >
      {rendered}
    </div>
  )
}

export default CardSwap
