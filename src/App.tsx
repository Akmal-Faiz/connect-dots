import { useState, useRef, useCallback, useEffect } from 'react'
import './App.css'

// ── Types ────────────────────────────────────────────────────────────────────
type NodeId =
  | 'l0' | 'l1' | 'l2' | 'l3'
  | 'r0' | 'r1' | 'r2' | 'r3'
  | 'bl0' | 'bl1' | 'bl2' | 'bl3'
  | 'br0' | 'br1' | 'br2' | 'br3'

interface Connection { from: NodeId; to: NodeId }

// ── Puzzle data ───────────────────────────────────────────────────────────────
const LEFT_ITEMS = [
  { id: 'l0' as NodeId, label: 'Batteries',    emoji: '🔋' },
  { id: 'l1' as NodeId, label: 'Glass Bottle', emoji: '🍾' },
  { id: 'l2' as NodeId, label: 'Juice Box',  emoji: '🧃' },
  { id: 'l3' as NodeId, label: 'Plastic Cup',  emoji: '🥤' },
]

const BINS = [
  { label: 'E-Waste',  emoji: '⚡', color: '#7c3aed', bg: '#f5f3ff', border: '#c4b5fd' },
  { label: 'Glass',    emoji: '🍶', color: '#059669', bg: '#f0fdf4', border: '#6ee7b7' },
  { label: 'Plastic',  emoji: '🧴', color: '#ea580c', bg: '#fff7ed', border: '#fdba74' },
  { label: 'Paper',    emoji: '📄', color: '#2563eb', bg: '#eff6ff', border: '#93c5fd' },
]

const RIGHT_ITEMS = [
  { id: 'r0' as NodeId, label: 'Glass Jars',      emoji: '🫙' },
  { id: 'r1' as NodeId, label: 'Paper Bag',       emoji: '🛍️' },
  { id: 'r2' as NodeId, label: 'Phone & Mouse',   emoji: '📱' },
  { id: 'r3' as NodeId, label: 'Newspapers',  emoji: '📰' },
]

// Correct: each item → its bin dot
const CORRECT: Connection[] = [
  { from: 'l0', to: 'bl0' }, // Batteries → E-waste
  { from: 'l1', to: 'bl1' }, // Glass Straws → Glass
  { from: 'l2', to: 'bl3' }, // Milk Carton → Paper
  { from: 'l3', to: 'bl2' }, // Plastic Cup → Plastic
  { from: 'r0', to: 'br1' }, // Glass Jars → Glass
  { from: 'r1', to: 'br2' }, // Paper Bag (plastic) → Plastic
  { from: 'r2', to: 'br0' }, // Phone & Mouse → E-waste
  { from: 'r3', to: 'br3' }, // Newspapers → Paper
]

// ── Layout: % of puzzle container (width × height) ────────────────────────────
//  Left item dots at x=18%,  Bin-left dots at x=37%,
//  Bin-right dots at x=63%,  Right item dots at x=82%
//  Rows at y = 16, 36, 56, 76 (%)
const ROWS = [16, 36, 56, 76]

type Pos = { x: number; y: number }

function pos(x: number, rowIdx: number): Pos { return { x, y: ROWS[rowIdx] } }

const NODE_POS: Record<NodeId, Pos> = {
  l0: pos(18, 0), l1: pos(18, 1), l2: pos(18, 2), l3: pos(18, 3),
  bl0: pos(37, 0), bl1: pos(37, 1), bl2: pos(37, 2), bl3: pos(37, 3),
  br0: pos(63, 0), br1: pos(63, 1), br2: pos(63, 2), br3: pos(63, 3),
  r0: pos(82, 0), r1: pos(82, 1), r2: pos(82, 2), r3: pos(82, 3),
}

function canConnect(a: NodeId, b: NodeId): boolean {
  const li = (s: string) => s.startsWith('l')
  const ri = (s: string) => s.startsWith('r')
  const bl = (s: string) => s.startsWith('bl')
  const br = (s: string) => s.startsWith('br')
  return (li(a) && bl(b)) || (bl(a) && li(b)) || (ri(a) && br(b)) || (br(a) && ri(b))
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function App() {
  const [connections, setConnections] = useState<Connection[]>([])
  const [pending, setPending] = useState<NodeId | null>(null)
  const [eraseMode, setEraseMode] = useState(false)
  const [modal, setModal] = useState<{ open: boolean; correct: boolean } | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setModal(null) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const handleNodeClick = useCallback((id: NodeId) => {
    if (eraseMode) return

    if (!pending) {
      setConnections(c => c.filter(x => x.from !== id && x.to !== id))
      setPending(id)
      return
    }
    if (pending === id) { setPending(null); return }

    if (!canConnect(pending, id)) {
      setConnections(c => c.filter(x => x.from !== id && x.to !== id))
      setPending(id)
      return
    }

    const [from, to] = (pending.startsWith('bl') || pending.startsWith('br'))
      ? [id, pending] : [pending, id]

    setConnections(c => {
      const filtered = c.filter(x => x.from !== from && x.to !== to)
      return [...filtered, { from: from as NodeId, to: to as NodeId }]
    })
    setPending(null)
  }, [pending, eraseMode])

  const eraseConnection = useCallback((conn: Connection) => {
    if (!eraseMode) return
    setConnections(c => c.filter(x => x.from !== conn.from || x.to !== conn.to))
  }, [eraseMode])

  const handleCheck = () => {
    const correct =
      connections.length === 8 &&
      CORRECT.every(exp => connections.some(c => c.from === exp.from && c.to === exp.to))
    setModal({ open: true, correct })
  }

  const handleClear = () => { setConnections([]); setPending(null) }

  const toggleErase = () => { setEraseMode(e => !e); setPending(null) }

  return (
    <div className="page">
      <header className="page-header">
        <h1>♻️ Sort It Clean!</h1>
        <p>Connect each item to the correct recycling bin.</p>
      </header>

      {/* ── Puzzle ── */}
      <div className="puzzle" ref={containerRef}>

        {/* SVG lines */}
        <svg className="puzzle-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
          {connections.map((conn, i) => {
            const a = NODE_POS[conn.from]
            const b = NODE_POS[conn.to]
            return (
              <g key={i} style={{ cursor: eraseMode ? 'pointer' : 'default' }}
                onClick={() => eraseConnection(conn)}>
                {/* wide transparent hit area */}
                <line x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                  stroke="transparent" strokeWidth={5} />
                <line x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                  stroke="#1e293b" strokeWidth={1.8} strokeLinecap="round" />
              </g>
            )
          })}
        </svg>

        {/* Left items */}
        {LEFT_ITEMS.map((item, i) => (
          <div key={item.id} className="item item-left"
            style={{ top: `${ROWS[i]}%`, left: '2%' }}>
            <div className="item-card">
              <span className="item-emoji">{item.emoji}</span>
              <span className="item-label">{item.label}</span>
            </div>
          </div>
        ))}

        {/* Left item dots */}
        {LEFT_ITEMS.map((item, i) => (
          <button key={`ld${i}`}
            className={`dot ${pending === item.id ? 'dot-pending' : ''} ${eraseMode ? 'dot-erase' : ''}`}
            style={{ top: `${ROWS[i]}%`, left: `${NODE_POS[item.id].x}%` }}
            onClick={() => handleNodeClick(item.id)}
            aria-label={`Connect ${item.label}`}
          />
        ))}

        {/* Bins */}
        {BINS.map((bin, i) => (
          <div key={i} className="bin-wrapper"
            style={{ top: `${ROWS[i]}%`, left: '50%' }}>
            <div className="bin-card"
              style={{ borderColor: bin.border, background: bin.bg, color: bin.color }}>
              <span className="bin-emoji">{bin.emoji}</span>
              <span className="bin-label">{bin.label}</span>
            </div>
          </div>
        ))}

        {/* Bin left dots */}
        {BINS.map((_, i) => (
          <button key={`bl${i}`}
            className={`dot dot-bin ${pending === `bl${i}` ? 'dot-pending' : ''} ${eraseMode ? 'dot-erase' : ''}`}
            style={{ top: `${ROWS[i]}%`, left: `${NODE_POS[`bl${i}` as NodeId].x}%` }}
            onClick={() => handleNodeClick(`bl${i}` as NodeId)}
            aria-label={`${BINS[i].label} left connection`}
          />
        ))}

        {/* Bin right dots */}
        {BINS.map((_, i) => (
          <button key={`br${i}`}
            className={`dot dot-bin ${pending === `br${i}` ? 'dot-pending' : ''} ${eraseMode ? 'dot-erase' : ''}`}
            style={{ top: `${ROWS[i]}%`, left: `${NODE_POS[`br${i}` as NodeId].x}%` }}
            onClick={() => handleNodeClick(`br${i}` as NodeId)}
            aria-label={`${BINS[i].label} right connection`}
          />
        ))}

        {/* Right item dots */}
        {RIGHT_ITEMS.map((item, i) => (
          <button key={`rd${i}`}
            className={`dot ${pending === item.id ? 'dot-pending' : ''} ${eraseMode ? 'dot-erase' : ''}`}
            style={{ top: `${ROWS[i]}%`, left: `${NODE_POS[item.id].x}%` }}
            onClick={() => handleNodeClick(item.id)}
            aria-label={`Connect ${item.label}`}
          />
        ))}

        {/* Right items */}
        {RIGHT_ITEMS.map((item, i) => (
          <div key={item.id} className="item item-right"
            style={{ top: `${ROWS[i]}%`, right: '2%' }}>
            <div className="item-card item-card-right">
              <span className="item-emoji">{item.emoji}</span>
              <span className="item-label">{item.label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Controls ── */}
      <div className="controls">
        <button
          className={`btn btn-erase ${eraseMode ? 'active' : ''}`}
          onClick={toggleErase}
        >
          {eraseMode ? '✏️ Drawing Mode' : '🧹 Erase a Line'}
        </button>
        <button className="btn btn-clear" onClick={handleClear}>🗑 Clear All</button>
        <button className="btn btn-check" onClick={handleCheck}>✅ Check Answer</button>
      </div>

      {pending && !eraseMode && (
        <p className="hint">Now click a bin dot to finish the line — or click the same dot to cancel.</p>
      )}
      {eraseMode && (
        <p className="hint hint-erase">Click any line to erase it. Press the button again to go back to drawing.</p>
      )}

      {/* ── Modal ── */}
      {modal && (
        <div className="modal-backdrop" onClick={() => setModal(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-icon">{modal.correct ? '🎉' : '😅'}</div>
            <h2 className="modal-title">
              {modal.correct ? 'Correct! Great job!' : 'Not quite right…'}
            </h2>
            <p className="modal-body">
              {modal.correct
                ? 'You sorted all the recyclables into the right bins. Bloobin is happy!'
                : connections.length < 8
                  ? `You have ${connections.length} of 8 connections. Try to fill them all!`
                  : 'Some items are in the wrong bin. Give it another try!'}
            </p>
            <button className="btn btn-check" onClick={() => setModal(null)}>Close</button>
          </div>
        </div>
      )}
    </div>
  )
}
