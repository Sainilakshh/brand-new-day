import React, { useEffect, useMemo, useRef } from 'react'
import { createRoot } from 'react-dom/client'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing'
import * as THREE from 'three'
import { LineSegments2 } from 'three/addons/lines/LineSegments2.js'
import { LineSegmentsGeometry } from 'three/addons/lines/LineSegmentsGeometry.js'
import { LineMaterial } from 'three/addons/lines/LineMaterial.js'
import './style.css'

const clamp01 = (n) => Math.min(1, Math.max(0, n))
const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t) }
const gate = (x, a, b, feather = .055) => smooth(a - feather, a + feather, x) * (1 - smooth(b - feather, b + feather, x))
const scroll = { p: 0, cursorX: 0, cursorY: 0, reduced: false }
const INK = '#150406', BONE = new THREE.Color('#f2f3f5'), SCARLET = new THREE.Color('#e0202b'), COBALT = new THREE.Color('#2b4fd0')

// This is the shared score: the strands, anchor locations, and camera swing all read it.
const THWIPS = [
  { at: .285, span: .045, side: -1, lead: 25, radius: 6.6, lift: 3 },
  { at: .330, span: .045, side: 1, lead: 23, radius: 6.1, lift: -2 },
  { at: .375, span: .038, side: -1, lead: 20, radius: 5.3, lift: 3.4 },
  { at: .413, span: .035, side: 1, lead: 18, radius: 4.8, lift: -2.6 },
  { at: .448, span: .031, side: -1, lead: 16, radius: 4.2, lift: 2.7 },
  { at: .479, span: .031, side: 1, lead: 14, radius: 3.7, lift: -1.8 }
]

function portraitPlate() {
  const c = document.createElement('canvas'); c.width = 340; c.height = 520
  const x = c.getContext('2d'); x.clearRect(0, 0, c.width, c.height)
  x.fillStyle = '#ad2030'; x.beginPath(); x.ellipse(170, 105, 57, 72, 0, 0, Math.PI * 2); x.fill()
  x.beginPath(); x.moveTo(118, 166); x.quadraticCurveTo(110, 200, 74, 235); x.lineTo(36, 500); x.lineTo(305, 500); x.lineTo(270, 235); x.quadraticCurveTo(230, 199, 221, 166); x.closePath(); x.fill()
  x.fillStyle = 'rgba(255,255,255,.7)'; x.beginPath(); x.ellipse(153, 90, 11, 19, -.4, 0, 6.28); x.fill()
  return { data: x.getImageData(0, 0, c.width, c.height).data, w: c.width, h: c.height }
}

function BeadFigure() {
  const mesh = useRef(); const { data, w, h } = useMemo(portraitPlate, [])
  const { positions, colors } = useMemo(() => {
    const positions = [], colors = []; const rand = THREE.MathUtils.seededRandom
    for (let i = 0; i < 40000; i++) {
      let px, py, at; do { px = Math.floor(rand() * w); py = Math.floor(rand() * h); at = data[(py * w + px) * 4 + 3] } while (at < 40)
      const x = (px / w - .5) * 8.6, y = (1 - py / h) * 14, edge = Math.abs(x) / 4.3
      const z = (rand() - .5) * Math.max(.12, 1.15 * (1 - edge * edge))
      positions.push(x, y, z)
      const shade = .55 + .45 * clamp01(1 - edge * .6 + z * .25); const c = SCARLET.clone().multiplyScalar(shade)
      colors.push(c.r, c.g, c.b)
    }
    return { positions, colors }
  }, [data, w, h])
  useEffect(() => {
    const o = new THREE.Object3D(), c = new THREE.Color()
    positions.forEach((_, i) => { if (i % 3) return; const j = i / 3; o.position.set(positions[i], positions[i + 1], positions[i + 2]); o.rotation.set(Math.random(), Math.random(), 0); o.updateMatrix(); mesh.current.setMatrixAt(j, o.matrix); c.setRGB(colors[i], colors[i + 1], colors[i + 2]); mesh.current.setColorAt(j, c) })
    mesh.current.instanceMatrix.needsUpdate = true; mesh.current.instanceColor.needsUpdate = true
  }, [positions, colors])
  useFrame(() => { const a = gate(scroll.p / .82, 0, .25); const tiltX = scroll.cursorY * .12, tiltY = scroll.cursorX * .12; mesh.current.visible = a > .001; mesh.current.position.set(0, 9 + Math.sin(scroll.p * 10) * .16, 0); mesh.current.rotation.set(tiltX, tiltY, 0); mesh.current.scale.setScalar(a) })
  return <instancedMesh ref={mesh} args={[undefined, undefined, 40000]}><sphereGeometry args={[.075, 8, 6]} /><meshBasicMaterial vertexColors transparent opacity={.98} /></instancedMesh>
}

function Lattice() {
  const ref = useRef(); const lines = useMemo(() => {
    const g = new THREE.BoxGeometry(10, 16, 7, 9, 13, 7); return new THREE.EdgesGeometry(g)
  }, [])
  useFrame(() => { const a = gate(scroll.p / .82, .02, .27); ref.current.visible = a > .002; ref.current.material.opacity = a * .38; ref.current.rotation.y = scroll.p * .5 })
  return <lineSegments ref={ref} geometry={lines}><lineBasicMaterial color="#ff5d64" transparent /></lineSegments>
}

function GridRoom() {
  const refs = [useRef(), useRef(), useRef()]; const geos = useMemo(() => [9, 13.95, 19.8].map(r => new THREE.WireframeGeometry(new THREE.CylinderGeometry(r, r, 170, 36, 18, true))), [])
  useFrame(() => { const a = gate(scroll.p / .82, .16, .62); refs.forEach((r, i) => { r.current.visible = a > .001; r.current.material.opacity = a * .22; r.current.rotation.z += [ .055, -.03, .014 ][i] * .01 }) })
  return <>{geos.map((g, i) => <lineSegments key={i} ref={refs[i]} geometry={g} rotation={[Math.PI / 2, 0, 0]}><lineBasicMaterial color={COBALT} transparent depthWrite={false} /></lineSegments>)}<mesh position={[0, 0, -42]}><boxGeometry args={[17, .025, .025]} /><meshBasicMaterial color={COBALT} transparent opacity={.45} /></mesh></>
}

function spine(s) { return new THREE.Vector3(0, 8 - smooth(.18, .6, s) * 6, 18 - s * 195) }
function Web() {
  const lines = useMemo(() => THWIPS.map(() => { const geo = new LineSegmentsGeometry(); const mat = new LineMaterial({ color: BONE, linewidth: 2.4, transparent: true, opacity: 1, vertexColors: true, blending: THREE.AdditiveBlending, depthWrite: false }); const l = new LineSegments2(geo, mat); l.frustumCulled = false; return l }), [])
  const { size } = useThree(); useEffect(() => { lines.forEach(l => l.material.resolution.set(size.width, size.height)) }, [lines, size])
  useFrame(() => { const s = scroll.p / .82; lines.forEach((line, i) => { const q = THWIPS[i], t = clamp01((s - q.at) / q.span); const active = t < 1 && s > q.at; line.visible = active; if (!active) return; const base = spine(q.at), anchor = base.clone().add(new THREE.Vector3(q.side * q.radius, q.lift, -q.lead)); const start = spine(s); const sag = t < .55 ? .04 : smooth(.55, .8, t) * 2.8; const pts = []; for (let j = 0; j < 18; j++) { const u = j / 17, deploy = t < .12 ? clamp01(t / .12) : 1, v = u * deploy; const p = start.clone().lerp(anchor, v); p.y -= Math.sin(Math.PI * v) * sag + Math.sin(v * 15 - t * 18) * sag * .18; pts.push(p.x, p.y, p.z) } const positions = [], colors = []; for (let j = 0; j < 17; j++) { positions.push(...pts.slice(j * 3, j * 3 + 3), ...pts.slice(j * 3 + 3, j * 3 + 6)); const fire = t < .12 && Math.abs(j / 17 - t / .12) < .15; const c = fire ? SCARLET : BONE; colors.push(c.r, c.g, c.b, c.r, c.g, c.b) } line.geometry.setPositions(positions); line.geometry.setColors(colors); line.material.opacity = 1 - smooth(.8, 1, t) }) })
  return <primitive object={new THREE.Group()} ref={g => { if (g && !g.userData.ready) { lines.forEach(l => g.add(l)); g.userData.ready = true } }} />
}

function CameraRig() {
  const { camera } = useThree(); const v = useMemo(() => new THREE.Vector3(), [])
  useFrame(() => { const s = clamp01(scroll.p / .82), pos = spine(s), look = spine(Math.min(1, s + .035)); let bank = 0; THWIPS.forEach(q => { const u = clamp01((s - (q.at + q.span * .08)) / (q.span * .74)); if (u > 0 && u < 1) { const e = Math.sin(Math.PI * u); const amp = scroll.reduced ? 0 : e; pos.x += q.side * 3.2 * amp; pos.y -= 1.5 * amp; bank += q.side * .15 * amp } }); camera.position.copy(pos); v.copy(look).sub(pos).normalize(); const up = new THREE.Vector3(0, 1, 0).applyAxisAngle(v, bank); camera.up.copy(up); camera.rotation.order = 'YXZ'; camera.lookAt(look) })
  return null
}

function Scene() { return <><color attach="background" args={[INK]} /><fog attach="fog" args={[INK, 20, 135]} /><CameraRig /><BeadFigure /><Lattice /><GridRoom /><Web /><EffectComposer multisampling={0}><Bloom intensity={.55} mipmapBlur luminanceThreshold={1.15} radius={.45} /><Vignette darkness={1} offset={1.3} /><Noise opacity={.09} /></EffectComposer></> }

const words = ['LEAVE', 'BACK-TO-FRONT', 'BRAND NEW DAY', 'LEAVE', 'BACK-TO-FRONT']
function Overlay() { const spans = useRef([]), wipe = useRef(); useEffect(() => { let raf; const tick = () => { const s = scroll.p / .82; spans.current.forEach((el, i) => { if (!el) return; const a = gate(s, .04 + i * .12, .21 + i * .12); el.style.opacity = a; el.style.filter = `blur(${(1-a)*18}px)`; el.style.transform = `translate3d(0,${(1-a)*24}px,0)`; el.style.visibility = a < .01 ? 'hidden' : 'visible' }); wipe.current.style.opacity = smooth(.84, 1, scroll.p); raf = requestAnimationFrame(tick) }; tick(); return () => cancelAnimationFrame(raf) }, []); return <div className="overlay">{words.map((word, i) => <div className={'line l' + i} key={i} ref={e => spans.current[i] = e}>{[...word].map((x, n) => <span key={n}>{x === ' ' ? '\u00a0' : x}</span>)}</div>)}<div className="credit">A SCROLL FILM</div><div className="wipe" ref={wipe} /></div> }
function App() { useEffect(() => { const update = () => { scroll.p = clamp01(window.scrollY / Math.max(1, document.body.scrollHeight - innerHeight)); document.documentElement.style.setProperty('--p', scroll.p) }; const move = e => { scroll.cursorX = (e.clientX / innerWidth - .5); scroll.cursorY = (e.clientY / innerHeight - .5) }; scroll.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches; addEventListener('scroll', update, { passive: true }); addEventListener('mousemove', move); update(); window.__BRAND_NEW_DAY_GATES__ = { gate, scroll }; return () => { removeEventListener('scroll', update); removeEventListener('mousemove', move) } }, []); return <main><div className="stage"><Canvas dpr={innerWidth < 600 ? 1 : 1.5} camera={{ fov: 48, near: .1, far: 300, position: [0, 8, 18] }} gl={{ antialias: false, toneMapping: THREE.ACESFilmicToneMapping }}><Scene /></Canvas><Overlay /></div></main> }
createRoot(document.getElementById('root')).render(<App />)
