import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'

const STORAGE_KEY = 'screen-color-lab-palette'

const starterPalette = [
  { id: 'ink', name: 'Ink', hex: '#111311' },
  { id: 'paper', name: 'Paper', hex: '#F4F0E8' },
  { id: 'signal', name: 'Signal', hex: '#D8FF5E' },
  { id: 'violet', name: 'Violet', hex: '#7C5CFC' },
  { id: 'coral', name: 'Coral', hex: '#FF7A5C' },
  { id: 'sky', name: 'Sky', hex: '#7ADBEA' },
]

function makeId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function normalizeHex(value) {
  if (!value) return null
  const raw = value.trim().replace(/^#/, '')
  if (/^[0-9a-f]{3}$/i.test(raw)) {
    return `#${raw.split('').map((letter) => letter + letter).join('').toUpperCase()}`
  }
  if (/^[0-9a-f]{6}$/i.test(raw)) return `#${raw.toUpperCase()}`
  return null
}

function hexToRgb(hex) {
  const normalized = normalizeHex(hex)
  if (!normalized) return null
  const value = normalized.slice(1)
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  }
}

function getLuminance(hex) {
  const rgb = hexToRgb(hex)
  if (!rgb) return null
  const channels = [rgb.r, rgb.g, rgb.b].map((channel) => {
    const sRgb = channel / 255
    return sRgb <= 0.03928 ? sRgb / 12.92 : ((sRgb + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
}

function getContrastRatio(first, second) {
  const firstLum = getLuminance(first)
  const secondLum = getLuminance(second)
  if (firstLum === null || secondLum === null) return null
  const lighter = Math.max(firstLum, secondLum)
  const darker = Math.min(firstLum, secondLum)
  return (lighter + 0.05) / (darker + 0.05)
}

function getRating(ratio) {
  if (ratio >= 7) return { label: 'AAA', tone: 'aaa', detail: '最嚴格標準' }
  if (ratio >= 4.5) return { label: 'AA', tone: 'aa', detail: '一般文字通過' }
  if (ratio >= 3) return { label: 'Large', tone: 'large', detail: '大字通過' }
  return { label: 'Fail', tone: 'fail', detail: '需要調整' }
}

function readStoredPalette() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : starterPalette
  } catch {
    return starterPalette
  }
}

function App() {
  const [colors, setColors] = useState(readStoredPalette)
  const [importValue, setImportValue] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(colors))
  }, [colors])

  useEffect(() => {
    document.title = 'Screen Color Lab — 色票對比度實驗室'
  }, [])

  const validColors = useMemo(
    () => colors.filter((color) => normalizeHex(color.hex)),
    [colors],
  )

  const checks = useMemo(() => {
    const pairs = []
    for (let firstIndex = 0; firstIndex < validColors.length; firstIndex += 1) {
      for (let secondIndex = firstIndex + 1; secondIndex < validColors.length; secondIndex += 1) {
        const first = validColors[firstIndex]
        const second = validColors[secondIndex]
        const ratio = getContrastRatio(first.hex, second.hex)
        pairs.push({ first, second, ratio, rating: getRating(ratio) })
      }
    }
    return pairs
  }, [validColors])

  const strictPasses = checks.filter((check) => check.ratio >= 4.5).length
  const aaaPasses = checks.filter((check) => check.ratio >= 7).length
  const coverage = checks.length ? Math.round((strictPasses / checks.length) * 100) : 0
  const bestPair = checks.reduce((best, check) => (!best || check.ratio > best.ratio ? check : best), null)
  const previewBackground = normalizeHex(validColors[1]?.hex) || '#F4F0E8'
  const previewForeground = normalizeHex(validColors[0]?.hex) || '#111311'

  function updateColor(id, field, value) {
    setColors((current) => current.map((color) => (color.id === id ? { ...color, [field]: value } : color)))
    setNotice('')
  }

  function addColor() {
    setColors((current) => [
      ...current,
      { id: makeId(), name: `Token ${String(current.length + 1).padStart(2, '0')}`, hex: '#C7F464' },
    ])
    setNotice('已加入一個新的色票。')
  }

  function removeColor(id) {
    setColors((current) => current.filter((color) => color.id !== id))
    setNotice('色票已移除，對比度矩陣已更新。')
  }

  function importPalette() {
    const values = importValue.match(/#?[0-9a-f]{3,6}\b/gi) || []
    const uniqueValues = [...new Set(values.map(normalizeHex).filter(Boolean))]
    if (!uniqueValues.length) {
      setNotice('找不到色票。請貼上像 #111311 或 #D8FF5E 的色碼。')
      return
    }
    setColors(uniqueValues.map((hex, index) => ({ id: makeId(), name: `Token ${String(index + 1).padStart(2, '0')}`, hex })))
    setImportValue('')
    setNotice(`已匯入 ${uniqueValues.length} 個色票，正在檢查所有配對。`)
  }

  function resetPalette() {
    setColors(starterPalette)
    setImportValue('')
    setNotice('已回到示範色票。')
  }

  function exportPalette() {
    const blob = new Blob([JSON.stringify(colors, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'screen-color-lab-palette.json'
    link.click()
    URL.revokeObjectURL(url)
    setNotice('色票已匯出成 JSON。')
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Screen Color Lab 首頁">
          <span className="brand-mark" aria-hidden="true"><i /><i /><i /></span>
          <span>Screen Color Lab</span>
        </a>
        <div className="topbar-meta">
          <span className="local-status"><span className="status-dot" />儲存在你的瀏覽器</span>
          <button className="quiet-button" type="button" onClick={exportPalette}>匯出色票</button>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">Colour system / contrast audit</p>
            <h1>讓每一個顏色，<br /><em>都值得被使用。</em></h1>
            <p className="hero-intro">放入你的網站色票。Screen Color Lab 會把每兩個色票配對，快速找出文字、背景與元件之間的對比度問題。</p>
          </div>
          <div className="hero-readout" aria-label={`${strictPasses} 組配對符合 AA 對比度`}>
            <div className="readout-orbit orbit-one" />
            <div className="readout-orbit orbit-two" />
            <div className="readout-core">
              <strong>{coverage}<small>%</small></strong>
              <span>AA coverage</span>
            </div>
            <span className="readout-tick tick-one">{checks.length} pairs</span>
            <span className="readout-tick tick-two">WCAG 2.2</span>
          </div>
        </section>

        <section className="workspace-grid">
          <aside className="panel palette-panel">
            <div className="panel-heading">
              <div>
                <p className="section-kicker">01 / palette</p>
                <h2>你的色票</h2>
              </div>
              <span className="count-badge">{validColors.length} colors</span>
            </div>

            <div className="color-list">
              {colors.map((color) => {
                const normalized = normalizeHex(color.hex)
                return (
                  <div className="color-row" key={color.id}>
                    <label className="swatch-control" style={{ backgroundColor: normalized || '#2B312D' }}>
                      <span className="sr-only">選擇 {color.name} 顏色</span>
                      <input
                        type="color"
                        value={normalized || '#2B312D'}
                        onChange={(event) => updateColor(color.id, 'hex', event.target.value.toUpperCase())}
                      />
                    </label>
                    <div className="color-fields">
                      <input
                        className="name-input"
                        value={color.name}
                        aria-label={`${color.name} 的名稱`}
                        onChange={(event) => updateColor(color.id, 'name', event.target.value)}
                      />
                      <input
                        className={`hex-input ${!normalized ? 'invalid' : ''}`}
                        value={color.hex}
                        aria-label={`${color.name} 的 HEX 色碼`}
                        onChange={(event) => updateColor(color.id, 'hex', event.target.value)}
                        onBlur={() => normalized && updateColor(color.id, 'hex', normalized)}
                        spellCheck="false"
                      />
                    </div>
                    <button className="remove-button" type="button" onClick={() => removeColor(color.id)} aria-label={`移除 ${color.name}`}>
                      ×
                    </button>
                  </div>
                )
              })}
            </div>

            <button className="add-button" type="button" onClick={addColor}>
              <span>＋</span> 加入色票
            </button>

            <div className="import-box">
              <label htmlFor="import-colors">快速貼上色票</label>
              <textarea
                id="import-colors"
                value={importValue}
                onChange={(event) => setImportValue(event.target.value)}
                placeholder="#111311, #F4F0E8\n#D8FF5E #7C5CFC"
                rows="3"
              />
              <button className="text-button" type="button" onClick={importPalette}>匯入並檢查</button>
            </div>

            {notice && <p className="notice" role="status">{notice}</p>}
          </aside>

          <section className="panel results-panel">
            <div className="panel-heading results-heading">
              <div>
                <p className="section-kicker">02 / audit</p>
                <h2>對比度檢查</h2>
              </div>
              <button className="reset-link" type="button" onClick={resetPalette}>重設示範色票</button>
            </div>

            <div className="summary-strip">
              <div className="summary-score">
                <strong>{strictPasses}<span>/{checks.length}</span></strong>
                <div>
                  <b>組配對通過 AA</b>
                  <small>一般文字建議至少 4.5:1</small>
                </div>
              </div>
              <div className="summary-stat"><span>AAA</span><strong>{aaaPasses}</strong></div>
              <div className="summary-stat"><span>最高對比</span><strong>{bestPair ? `${bestPair.ratio.toFixed(2)}:1` : '—'}</strong></div>
            </div>

            <div className="meter" aria-label={`AA 通過率 ${coverage}%`}>
              <span style={{ width: `${coverage}%` }} />
            </div>

            <div className="matrix-header">
              <div>
                <h3>所有色票組合</h3>
                <p>每一格代表兩個不同色票的實際對比度。</p>
              </div>
              <div className="legend" aria-label="評級說明">
                <span><i className="legend-dot aaa" />AAA</span>
                <span><i className="legend-dot aa" />AA</span>
                <span><i className="legend-dot large" />Large</span>
                <span><i className="legend-dot fail" />Fail</span>
              </div>
            </div>

            {checks.length ? (
              <div className="matrix-wrap">
                <table className="contrast-matrix">
                  <thead>
                    <tr>
                      <th scope="col">色票</th>
                      {validColors.map((color) => <th scope="col" key={color.id}><span className="mini-swatch" style={{ backgroundColor: color.hex }} />{color.name}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {validColors.map((rowColor) => (
                      <tr key={rowColor.id}>
                        <th scope="row"><span className="mini-swatch" style={{ backgroundColor: rowColor.hex }} />{rowColor.name}</th>
                        {validColors.map((columnColor) => {
                          if (rowColor.id === columnColor.id) return <td className="matrix-diagonal" key={columnColor.id}>—</td>
                          const check = checks.find(({ first, second }) => (first.id === rowColor.id && second.id === columnColor.id) || (first.id === columnColor.id && second.id === rowColor.id))
                          return <td key={columnColor.id} className={`matrix-cell ${check.rating.tone}`} title={`${rowColor.name} × ${columnColor.name}: ${check.ratio.toFixed(2)}:1`}><strong>{check.ratio.toFixed(1)}</strong><small>{check.rating.label}</small></td>
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state"><strong>還沒有足夠的色票。</strong><span>至少加入兩個有效的 HEX 色碼，才能開始配對。</span></div>
            )}

            <div className="preview-section">
              <div className="matrix-header preview-heading">
                <div>
                  <h3>放進介面看看</h3>
                  <p>用你目前的色票預覽一個實際元件。</p>
                </div>
                {bestPair && <span className={`rating-pill ${bestPair.rating.tone}`}>最佳 {bestPair.ratio.toFixed(2)}:1</span>}
              </div>
              <div className="ui-preview" style={{ backgroundColor: previewBackground, color: previewForeground }}>
                <div className="preview-window-top"><span /><span /><span /></div>
                <div className="preview-content">
                  <div className="preview-copy"><small>COLOUR SYSTEM</small><h4>Good contrast<br />feels quiet.</h4><p>清楚的層次，讓內容先被看見。</p><button type="button" style={{ backgroundColor: validColors[2]?.hex || '#D8FF5E', color: previewForeground }}>查看色票</button></div>
                  <div className="preview-tiles"><span style={{ backgroundColor: validColors[2]?.hex || '#D8FF5E' }} /><span style={{ backgroundColor: validColors[3]?.hex || '#7C5CFC' }} /><span style={{ backgroundColor: validColors[4]?.hex || '#FF7A5C' }} /></div>
                </div>
              </div>
            </div>
          </section>
        </section>

        <footer className="footer-note"><span>Screen Color Lab</span><span>WCAG contrast ratio · 每次修改都會即時更新</span></footer>
      </main>
    </div>
  )
}

createRoot(document.getElementById('root')).render(<App />)
