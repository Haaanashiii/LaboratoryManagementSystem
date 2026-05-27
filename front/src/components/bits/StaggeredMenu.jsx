import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { gsap } from 'gsap'
import './bits.css'

const StaggeredMenu = ({
  items = [],
  accentColor = '#3B82F6',
  menuButtonColor = '#E2E8F0',
  openMenuButtonColor = '#E2E8F0',
  colors = ['rgba(26, 26, 40, 0.92)', 'rgba(17, 17, 28, 0.96)'],
  logoContent = null,
  displayItemNumbering = true,
  closeOnClickAway = true,
  onMenuOpen,
  onMenuClose,
}) => {
  const [open, setOpen] = useState(false)
  const openRef = useRef(false)
  const busyRef = useRef(false)

  const panelRef = useRef(null)
  const preLayersRef = useRef(null)
  const preLayerElsRef = useRef([])
  const toggleBtnRef = useRef(null)
  const iconRef = useRef(null)
  const plusHRef = useRef(null)
  const plusVRef = useRef(null)
  const itemLabelRefs = useRef([])
  const numElRefs = useRef([])
  const openTlRef = useRef(null)
  const closeTweenRef = useRef(null)

  // Initialize: set all animated elements off-screen
  useLayoutEffect(() => {
    const panel = panelRef.current
    if (!panel) return
    gsap.set(panel, { xPercent: 100 })
    preLayerElsRef.current.forEach(el => el && gsap.set(el, { xPercent: 100 }))
    gsap.set(itemLabelRefs.current.filter(Boolean), { yPercent: 140, rotate: 10 })
    if (displayItemNumbering) {
      gsap.set(numElRefs.current.filter(Boolean), { '--sm-num-opacity': 0 })
    }
  }, [displayItemNumbering])

  const buildOpenTimeline = useCallback(() => {
    const panel = panelRef.current
    const layers = preLayerElsRef.current.filter(Boolean)
    if (!panel) return null

    openTlRef.current?.kill()
    closeTweenRef.current?.kill()
    closeTweenRef.current = null

    const itemEls = itemLabelRefs.current.filter(Boolean)
    const numberEls = numElRefs.current.filter(Boolean)

    gsap.set(itemEls, { yPercent: 140, rotate: 10 })
    if (displayItemNumbering) gsap.set(numberEls, { '--sm-num-opacity': 0 })

    const layerStates = layers.map(el => ({ el, start: Number(gsap.getProperty(el, 'xPercent')) }))
    const panelStart = Number(gsap.getProperty(panel, 'xPercent'))

    const tl = gsap.timeline({ paused: true })

    layerStates.forEach(({ el, start }, i) => {
      tl.fromTo(el, { xPercent: start }, { xPercent: 0, duration: 0.5, ease: 'power4.out' }, i * 0.07)
    })

    const lastLayerTime = layerStates.length ? (layerStates.length - 1) * 0.07 : 0
    const panelInsertTime = lastLayerTime + (layerStates.length ? 0.08 : 0)
    const panelDuration = 0.65

    tl.fromTo(panel, { xPercent: panelStart }, { xPercent: 0, duration: panelDuration, ease: 'power4.out' }, panelInsertTime)

    if (itemEls.length) {
      const itemsStart = panelInsertTime + panelDuration * 0.15
      tl.to(
        itemEls,
        { yPercent: 0, rotate: 0, duration: 1, ease: 'power4.out', stagger: { each: 0.09, from: 'start' } },
        itemsStart
      )
    }

    if (displayItemNumbering && numberEls.length) {
      tl.to(numberEls, { '--sm-num-opacity': 1, duration: 0.5, stagger: 0.09 }, '-=0.6')
    }

    openTlRef.current = tl
    return tl
  }, [displayItemNumbering])

  const playOpen = useCallback(() => {
    const tl = buildOpenTimeline()
    if (!tl) return
    tl.play(0)
    tl.eventCallback('onComplete', () => { busyRef.current = false })
  }, [buildOpenTimeline])

  const playClose = useCallback(() => {
    openTlRef.current?.kill()
    const panel = panelRef.current
    const layers = preLayerElsRef.current.filter(Boolean)
    if (!panel) return

    const itemEls = itemLabelRefs.current.filter(Boolean)
    const numberEls = numElRefs.current.filter(Boolean)

    const tl = gsap.timeline({
      onComplete: () => {
        busyRef.current = false
        gsap.set(itemEls, { yPercent: 140, rotate: 10 })
        if (displayItemNumbering) gsap.set(numberEls, { '--sm-num-opacity': 0 })
      },
    })
    closeTweenRef.current = tl

    if (itemEls.length) tl.to(itemEls, { yPercent: 140, rotate: 10, duration: 0.35, ease: 'power3.in', stagger: 0.05 })
    if (displayItemNumbering && numberEls.length) tl.to(numberEls, { '--sm-num-opacity': 0, duration: 0.2, stagger: 0.04 }, 0)

    tl.to(panel, { xPercent: 100, duration: 0.6, ease: 'power3.in' }, itemEls.length ? '-=0.1' : 0)
    ;[...layers].reverse().forEach((el, i) => {
      tl.to(el, { xPercent: 100, duration: 0.45, ease: 'power3.in' }, `-=${0.42 - i * 0.03}`)
    })
  }, [displayItemNumbering])

  const animateIcon = useCallback(opening => {
    if (!iconRef.current) return
    if (opening) {
      gsap.to(plusHRef.current, { rotate: 45, duration: 0.5, ease: 'power4.out' })
      gsap.to(plusVRef.current, { rotate: 45, opacity: 0, duration: 0.3, ease: 'power4.out' })
    } else {
      gsap.to(plusHRef.current, { rotate: 0, duration: 0.35, ease: 'power3.inOut' })
      gsap.to(plusVRef.current, { rotate: 0, opacity: 1, duration: 0.35, ease: 'power3.inOut' })
    }
  }, [])

  const openMenu = useCallback(() => {
    if (busyRef.current || openRef.current) return
    busyRef.current = true
    openRef.current = true
    setOpen(true)
    onMenuOpen?.()
    playOpen()
    animateIcon(true)
    gsap.to(toggleBtnRef.current, { color: openMenuButtonColor, delay: 0.18, duration: 0.3, ease: 'power2.out' })
  }, [playOpen, animateIcon, openMenuButtonColor, onMenuOpen])

  const closeMenu = useCallback(() => {
    if (!openRef.current) return
    openRef.current = false
    setOpen(false)
    onMenuClose?.()
    busyRef.current = true
    playClose()
    animateIcon(false)
    gsap.to(toggleBtnRef.current, { color: menuButtonColor, duration: 0.3, ease: 'power2.out' })
  }, [playClose, animateIcon, menuButtonColor, onMenuClose])

  const toggleMenu = useCallback(() => {
    if (openRef.current) closeMenu()
    else openMenu()
  }, [openMenu, closeMenu])

  useEffect(() => {
    if (!closeOnClickAway || !open) return
    const handler = e => {
      if (panelRef.current && !panelRef.current.contains(e.target) && toggleBtnRef.current && !toggleBtnRef.current.contains(e.target)) {
        closeMenu()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [closeOnClickAway, open, closeMenu])

  // Set initial button color
  useEffect(() => {
    if (toggleBtnRef.current) gsap.set(toggleBtnRef.current, { color: menuButtonColor })
  }, [menuButtonColor])

  const layerColors = colors.length >= 2 ? colors.slice(0, 2) : ['rgba(17,17,28,0.94)', 'rgba(26,26,40,0.97)']

  return (
    <div
      className="sm-wrapper sm-fixed"
      style={{ '--sm-accent': accentColor }}
      data-open={open || undefined}
    >
      {/* Stagger underlay layers */}
      <div ref={preLayersRef} className="sm-prelayers" aria-hidden="true">
        {layerColors.map((c, i) => (
          <div
            key={i}
            className="sm-prelayer"
            ref={el => (preLayerElsRef.current[i] = el)}
            style={{ background: c }}
          />
        ))}
      </div>

      {/* Header: logo + toggle */}
      <header className="sm-header" aria-label="Mobile navigation header">
        <div aria-label="Logo">{logoContent}</div>
        <button
          ref={toggleBtnRef}
          className="sm-toggle"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          aria-controls="sm-panel"
          onClick={toggleMenu}
          type="button"
        >
          <span style={{ fontSize: '0.8rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', marginRight: '6px' }}>
            {open ? 'Close' : 'Menu'}
          </span>
          <span ref={iconRef} className="sm-icon" aria-hidden="true" style={{ width: 18, height: 18 }}>
            <span ref={plusHRef} className="sm-icon-line" style={{ width: 18 }} />
            <span ref={plusVRef} className="sm-icon-line sm-icon-line-v" style={{ height: 18 }} />
          </span>
        </button>
      </header>

      {/* Menu panel */}
      <aside id="sm-panel" ref={panelRef} className="sm-panel" aria-hidden={!open}>
        <div className="sm-panel-inner">
          <ul className="sm-panel-list" role="list" data-numbering={displayItemNumbering || undefined}>
            {items.map((item, idx) => (
              <li key={item.label + idx} className="sm-item-wrap">
                <a
                  className="sm-item-link"
                  href={item.href || '#'}
                  aria-label={item.label}
                  onClick={e => {
                    e.preventDefault()
                    item.onClick?.()
                    closeMenu()
                  }}
                >
                  <span
                    className="sm-item-label"
                    ref={el => (itemLabelRefs.current[idx] = el)}
                  >
                    {item.label}
                  </span>
                  {displayItemNumbering && (
                    <span className="sm-item-num" ref={el => (numElRefs.current[idx] = el)}>
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                  )}
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div className="sm-footer">
          <span style={{ fontSize: '0.75rem', color: '#475569', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            Equimon
          </span>
          <span style={{ fontSize: '0.7rem', color: '#2A2A3A' }}>
            Lab Management System
          </span>
        </div>
      </aside>
    </div>
  )
}

export default StaggeredMenu
