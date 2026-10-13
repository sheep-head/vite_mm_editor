/**
 * 精灵轮廓算法（与 SpiritCompanion.js buildOutlineBitmap 对齐）
 */

export function parseOutlineColor(color) {
  if (typeof color === 'string') {
    let s = color.trim()
    if (s[0] === '#') s = s.slice(1)
    if (s.length === 3) {
      s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2]
    }
    if (s.length === 6 && /^[0-9a-fA-F]+$/.test(s)) {
      return {
        r: parseInt(s.slice(0, 2), 16),
        g: parseInt(s.slice(2, 4), 16),
        b: parseInt(s.slice(4, 6), 16),
      }
    }
  }
  if (Array.isArray(color) && color.length >= 3) {
    return {
      r: Number(color[0]) || 0,
      g: Number(color[1]) || 0,
      b: Number(color[2]) || 0,
    }
  }
  return { r: 255, g: 215, b: 64 }
}

export function rgbToHex(r, g, b) {
  const h = (n) => Math.max(0, Math.min(255, Number(n) || 0)).toString(16).padStart(2, '0')
  return `#${h(r)}${h(g)}${h(b)}`
}

export function normalizeOutlineColor(color) {
  const { r, g, b } = parseOutlineColor(color)
  return rgbToHex(r, g, b)
}

function dilateMask(mask, w, h) {
  const out = new Array(w * h)
  for (let i = 0; i < w * h; i++) out[i] = false
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let on = false
      for (let dy = -1; dy <= 1 && !on; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx
          const ny = y + dy
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue
          if (mask[ny * w + nx]) {
            on = true
            break
          }
        }
      }
      out[y * w + x] = on
    }
  }
  return out
}

function erodeMask(mask, w, h) {
  const out = new Array(w * h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let ok = true
      for (let dy = -1; dy <= 1 && ok; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx
          const ny = y + dy
          if (nx < 0 || ny < 0 || nx >= w || ny >= h || !mask[ny * w + nx]) {
            ok = false
            break
          }
        }
      }
      out[y * w + x] = ok
    }
  }
  return out
}

/**
 * 从 HTMLImageElement 某帧生成轮廓 canvas
 * @returns {{ canvas: HTMLCanvasElement, pad: number, width: number, height: number } | null}
 */
export function buildOutlineCanvas(img, sx, sy, fw, fh, outlineOpts) {
  if (!img || fw < 1 || fh < 1) return null
  const ol = outlineOpts || {}
  if (ol.enabled === false) return null

  let expand = Number(ol.expand) || 0
  const alphaThr = ol.alphaThreshold != null ? Number(ol.alphaThreshold) : 8
  const outOpacity = ol.opacity != null ? Number(ol.opacity) : 200
  const { r, g, b } = parseOutlineColor(ol.color)

  let pad = Math.max(1, Math.abs(expand))
  if (expand === 0) pad = 1
  const w = fw + pad * 2
  const h = fh + pad * 2

  const tmp = document.createElement('canvas')
  tmp.width = fw
  tmp.height = fh
  const tctx = tmp.getContext('2d')
  tctx.clearRect(0, 0, fw, fh)
  tctx.drawImage(img, sx, sy, fw, fh, 0, 0, fw, fh)
  const frame = tctx.getImageData(0, 0, fw, fh)
  const fd = frame.data

  const mask = new Array(w * h)
  for (let i = 0; i < w * h; i++) mask[i] = false
  for (let y = 0; y < fh; y++) {
    for (let x = 0; x < fw; x++) {
      const a = fd[(y * fw + x) * 4 + 3]
      if (a > alphaThr) mask[(y + pad) * w + (x + pad)] = true
    }
  }

  let solid = mask
  if (expand > 0) {
    for (let k = 0; k < expand; k++) solid = dilateMask(solid, w, h)
  } else if (expand < 0) {
    for (let k = 0; k < -expand; k++) solid = erodeMask(solid, w, h)
  }

  let ring
  if (expand >= 0) {
    if (expand === 0) {
      const d1 = dilateMask(solid, w, h)
      ring = new Array(w * h)
      for (let i = 0; i < w * h; i++) ring[i] = d1[i] && !solid[i]
    } else {
      const core = mask
      ring = new Array(w * h)
      for (let i = 0; i < w * h; i++) ring[i] = solid[i] && !core[i]
    }
  } else {
    ring = new Array(w * h)
    for (let i = 0; i < w * h; i++) ring[i] = mask[i] && !solid[i]
  }

  const out = document.createElement('canvas')
  out.width = w
  out.height = h
  const octx = out.getContext('2d')
  const imgData = octx.createImageData(w, h)
  const data = imgData.data
  for (let i = 0; i < w * h; i++) {
    if (!ring[i]) continue
    const p = i * 4
    data[p] = r
    data[p + 1] = g
    data[p + 2] = b
    data[p + 3] = outOpacity
  }
  octx.putImageData(imgData, 0, 0)
  return { canvas: out, pad, width: w, height: h }
}
