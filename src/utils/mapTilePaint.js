/**
 * 轻量地图图块绘制（供预览用，与 MapViewer 算法对齐）
 */
import {
  FLOOR_AUTOTILE_TABLE,
  WALL_AUTOTILE_TABLE,
  WATERFALL_AUTOTILE_TABLE,
  isVisibleTile,
  isAutotile,
  isTileA1,
  isTileA2,
  isTileA3,
  isTileA4,
  isTileA5,
  getAutotileKind,
  getAutotileShape,
} from '@/components/map/mapAutotile'
import DataManager from '@/utils/DataManager'
import { fs, path, isNw } from '@/utils/nw'

export const TILE = 48

export function readMapData(map, x, y, z) {
  if (!map) return 0
  const { width, height, data } = map
  if (x >= 0 && x < width && y >= 0 && y < height) {
    return data[(z * height + y) * width + x] || 0
  }
  return 0
}

export function loadImageFile(abs) {
  const raw = String(abs)
  const fileUrl = 'file:///' + raw.replace(/\\/g, '/')
  const trySrc = (src) =>
    new Promise((resolve) => {
      const img = new Image()
      img.onload = () => resolve(img)
      img.onerror = () => resolve(null)
      img.src = src
    })
  return trySrc(raw).then((img) => img || trySrc(fileUrl))
}

export function workRoot() {
  try {
    return (DataManager.$config && DataManager.$config.workSpace) || ''
  } catch (e) {
    return ''
  }
}

export async function loadTilesetBundle(tilesetId) {
  const root = workRoot()
  const tilesets = DataManager.$loadDataSync('Tilesets', false, false) || []
  const tileset = tilesets[tilesetId] || null
  const images = {}
  if (!tileset || !isNw || !fs || !path || !root) {
    return { tileset, images, flags: (tileset && tileset.flags) || [] }
  }
  const imgPath = path.join(root, 'img', 'tilesets')
  for (const name of tileset.tilesetNames || []) {
    if (!name || images[name]) continue
    const file = path.join(imgPath, name + '.png')
    if (!fs.existsSync(file)) continue
    const img = await loadImageFile(file)
    if (img) images[name] = img
  }
  return { tileset, images, flags: tileset.flags || [] }
}

function drawNormalTile(ctx, tileId, dx, dy, tileset, images, tw, th) {
  if (!tileset) return
  let setNumber = 0
  if (isTileA5(tileId)) setNumber = 4
  else setNumber = 5 + Math.floor(tileId / 256)
  const sx = ((Math.floor(tileId / 128) % 2) * 8 + (tileId % 8)) * TILE
  const sy = (Math.floor((tileId % 256) / 8) % 16) * TILE
  const tilesetName = tileset.tilesetNames[setNumber]
  if (!tilesetName) return
  const img = images[tilesetName]
  if (!img || !img.complete) return
  if (sx >= 0 && sy >= 0 && sx + TILE <= img.width && sy + TILE <= img.height) {
    ctx.drawImage(img, sx, sy, TILE, TILE, dx, dy, tw, th)
  }
}

function drawAutotile(ctx, tileId, dx, dy, tileset, images, tw, th) {
  if (!tileset) return
  let autotileTable = FLOOR_AUTOTILE_TABLE
  const kind = getAutotileKind(tileId)
  const shape = getAutotileShape(tileId)
  const tx = kind % 8
  const ty = Math.floor(kind / 8)
  let bx = 0
  let by = 0
  let setNumber = 0

  if (isTileA1(tileId)) {
    setNumber = 0
    if (kind === 0) {
      bx = 0
      by = 0
    } else if (kind === 1) {
      bx = 0
      by = 3
    } else if (kind === 2) {
      bx = 6
      by = 0
    } else if (kind === 3) {
      bx = 6
      by = 3
    } else {
      bx = Math.floor(tx / 4) * 8
      by = ty * 6 + (Math.floor(tx / 2) % 2) * 3
      if (kind % 2 !== 0) {
        bx += 6
        autotileTable = WATERFALL_AUTOTILE_TABLE
      }
    }
  } else if (isTileA2(tileId)) {
    setNumber = 1
    bx = tx * 2
    by = (ty - 2) * 3
  } else if (isTileA3(tileId)) {
    setNumber = 2
    bx = tx * 2
    by = (ty - 6) * 2
    autotileTable = WALL_AUTOTILE_TABLE
  } else if (isTileA4(tileId)) {
    setNumber = 3
    bx = tx * 2
    by = Math.floor((ty - 10) * 2.5 + (ty % 2 === 1 ? 0.5 : 0))
    if (ty % 2 === 1) autotileTable = WALL_AUTOTILE_TABLE
  }

  const table = autotileTable[shape]
  const tilesetName = tileset.tilesetNames[setNumber]
  if (!tilesetName) return
  const source = images[tilesetName]
  if (!table || !source || !source.complete) return
  const sw = TILE / 2
  const sh = TILE / 2
  const dw = tw / 2
  const dh = th / 2
  for (let i = 0; i < 4; i++) {
    const qsx = table[i][0]
    const qsy = table[i][1]
    const sx1 = (bx * 2 + qsx) * sw
    const sy1 = (by * 2 + qsy) * sh
    const dx1 = dx + (i % 2) * dw
    const dy1 = dy + Math.floor(i / 2) * dh
    if (sx1 >= 0 && sy1 >= 0 && sx1 + sw <= source.width && sy1 + sh <= source.height) {
      ctx.drawImage(source, sx1, sy1, sw, sh, dx1, dy1, dw, dh)
    }
  }
}

export function drawTile(ctx, tileId, dx, dy, tileset, images, tw = TILE, th = TILE) {
  if (!isVisibleTile(tileId)) return
  if (isAutotile(tileId)) drawAutotile(ctx, tileId, dx, dy, tileset, images, tw, th)
  else drawNormalTile(ctx, tileId, dx, dy, tileset, images, tw, th)
}

export function paintMapCell(ctx, map, mx, my, tileset, images, tw = TILE, th = TILE, dx, dy) {
  if (dx == null) dx = mx * tw
  if (dy == null) dy = my * th
  for (let z = 0; z < 4; z++) {
    const tid = readMapData(map, mx, my, z)
    if (!tid) continue
    drawTile(ctx, tid, dx, dy, tileset, images, tw, th)
  }
  const bits = readMapData(map, mx, my, 4) & 0x0f
  if (bits) {
    ctx.save()
    ctx.globalAlpha = 0.5
    ctx.fillStyle = '#000'
    const w1 = tw / 2
    const h1 = th / 2
    for (let i = 0; i < 4; i++) {
      if (bits & (1 << i)) {
        ctx.fillRect(dx + (i % 2) * w1, dy + Math.floor(i / 2) * h1, w1, h1)
      }
    }
    ctx.restore()
  }
}

/** 离屏缓存单边上限，避免大地图把进程撑崩 */
const CACHE_MAX_EDGE = 4096

export async function paintMapToCanvas(map, tileset, images, onProgress, targetCanvas) {
  const width = Math.max(1, map.width || 0)
  const height = Math.max(1, map.height || 0)
  const fullW = width * TILE
  const fullH = height * TILE
  let canvas = targetCanvas
  let tw
  let th
  if (canvas) {
    // 固定画布：只清空，绝不改 width/height（改尺寸等于销毁重建）
    const fit = Math.min(TILE, Math.floor(canvas.width / width), Math.floor(canvas.height / height))
    tw = Math.max(1, fit)
    th = tw
  } else {
    const scale = Math.min(1, CACHE_MAX_EDGE / fullW, CACHE_MAX_EDGE / fullH)
    tw = Math.max(1, Math.round(TILE * scale))
    th = tw
    canvas = document.createElement('canvas')
    canvas.width = width * tw
    canvas.height = height * th
  }
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  canvas._fitTw = tw
  canvas._fitTh = th
  canvas._fitUsedW = width * tw
  canvas._fitUsedH = height * th
  const batch = Math.max(4, Math.min(24, Math.ceil(1200 / width)))
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      paintMapCell(ctx, map, x, y, tileset, images, tw, th)
    }
    if (onProgress && ((y + 1) % batch === 0 || y === height - 1)) {
      const cont = await onProgress(y + 1, height)
      if (cont === false) {
        if (!targetCanvas) {
          canvas.width = 1
          canvas.height = 1
        }
        return canvas
      }
    }
  }
  return canvas
}

/** 简易通行：四方向均阻挡则不可走 */
export function canPass(map, flags, x, y, through) {
  if (through) return true
  if (!map || !map.data) return false
  const tx = x | 0
  const ty = y | 0
  if (tx < 0 || ty < 0 || tx >= map.width || ty >= map.height) return false
  if (!flags || !flags.length) return true
  const t0 = readMapData(map, tx, ty, 0)
  const t1 = readMapData(map, tx, ty, 1)
  const t2 = readMapData(map, tx, ty, 2)
  const t3 = readMapData(map, tx, ty, 3)
  const f = (flags[t0] || 0) | (flags[t1] || 0) | (flags[t2] || 0) | (flags[t3] || 0)
  return (f & 0x0f) !== 0x0f
}

/** 与 MapViewer 一致：白框内缘 */
export function eventInnerBox(x, y, tw = TILE, th = TILE) {
  const pad = 6
  return {
    x: x + pad,
    y: y + pad,
    w: Math.max(1, tw - pad * 2),
    h: Math.max(1, th - pad * 2),
  }
}

export function drawEventFill(ctx, x, y, fillColor, tw = TILE, th = TILE) {
  const pad = 3
  ctx.save()
  ctx.fillStyle = fillColor || 'rgba(0,0,0,0.3)'
  ctx.fillRect(x + pad, y + pad, tw - pad * 2, th - pad * 2)
  ctx.restore()
}

export function drawEventFrame(ctx, x, y, tw = TILE, th = TILE) {
  const pad = 2
  ctx.save()
  ctx.lineWidth = 1
  ctx.strokeStyle = '#ffffff'
  ctx.strokeRect(x + pad + 0.5, y + pad + 0.5, tw - pad * 2 - 1, th - pad * 2 - 1)
  ctx.restore()
}

/**
 * 与 MapViewer.drawCharacterFrame 对齐
 * options: { frameBox, originalSize, largeFit: 'fit'|'center' }
 * @returns {boolean} 是否画成功
 */
export function drawCharacterSimple(ctx, img, image, dx, dy, tw = TILE, th = TILE, options = null) {
  if (!img || !img.complete || !image) return false
  const name = image.characterName || ''
  if (!name || image.tileId) return false
  const big = name.startsWith('$') || name.startsWith('!$')
  const cw = big ? img.width / 3 : img.width / 12
  const ch = big ? img.height / 4 : img.height / 8
  if (!(cw >= 1 && ch >= 1)) return false
  const index = image.characterIndex || 0
  const pattern = typeof image.pattern === 'number' ? image.pattern : 1
  const direction = image.direction || 2
  const col = big ? pattern : (index % 4) * 3 + pattern
  const row = big ? (direction - 2) / 2 : Math.floor(index / 4) * 4 + (direction - 2) / 2
  const sx = col * cw
  const sy = row * ch
  if (!(sx >= 0 && sy >= 0 && sx + cw <= img.width + 0.01 && sy + ch <= img.height + 0.01)) return false
  const opts = options || {}
  try {
    if (opts.originalSize) {
      const ox = dx + (tw - cw) / 2
      const oy = dy + th - ch
      ctx.drawImage(img, sx, sy, cw, ch, ox, oy, cw, ch)
      return true
    }
    const box = opts.frameBox || { x: dx, y: dy, w: tw, h: th }
    const fit = opts.largeFit === 'fit'
    ctx.save()
    ctx.beginPath()
    ctx.rect(box.x, box.y, box.w, box.h)
    ctx.clip()
    if (fit) {
      const scale = Math.min(box.w / cw, box.h / ch, 1)
      const dw = cw * scale
      const dh = ch * scale
      const ox = box.x + (box.w - dw) / 2
      const oy = box.y + box.h - dh
      ctx.drawImage(img, sx, sy, cw, ch, ox, oy, dw, dh)
    } else {
      const sw = Math.min(cw, box.w)
      const sh = Math.min(ch, box.h)
      const ssx = sx + (cw - sw) / 2
      const ssy = sy + (ch - sh) / 2
      const ox = box.x + (box.w - sw) / 2
      const oy = box.y + (box.h - sh) / 2
      ctx.drawImage(img, ssx, ssy, sw, sh, ox, oy, sw, sh)
    }
    ctx.restore()
    return true
  } catch (e) {
    return false
  }
}

/** 预览用：填充 + 行走图/占位字 + 白框 */
export function drawMapEventMarker(ctx, event, charImg, style) {
  if (!event) return
  const x = event.x * TILE
  const y = event.y * TILE
  const fill = (style && style.fillColor) || 'rgba(0,0,0,0.3)'
  const largeFit = (style && style.largeFit) || 'center'
  const originalSize = !!(style && style.originalSize)
  drawEventFill(ctx, x, y, fill)
  const page = event.pages && event.pages[0]
  const image = page && page.image
  let drew = false
  if (image && image.characterName && charImg) {
    drew = drawCharacterSimple(ctx, charImg, image, x, y, TILE, TILE, {
      frameBox: eventInnerBox(x, y),
      largeFit,
      originalSize,
    })
  }
  if (!drew) {
    ctx.save()
    ctx.font = '12px Arial'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = 'white'
    ctx.strokeStyle = 'black'
    ctx.lineWidth = 2
    const text = `EV${String(event.id).padStart(3, '0')}`
    const tx = x + TILE / 2
    const ty = y + TILE / 2
    ctx.strokeText(text, tx, ty)
    ctx.fillText(text, tx, ty)
    ctx.restore()
  }
  drawEventFrame(ctx, x, y)
}

export async function loadCharacterImage(name) {
  try {
    if (!name || typeof name !== 'string' || !isNw || !fs || !path) return null
    const root = workRoot()
    if (!root) return null
    const file = path.join(root, 'img', 'characters', name + '.png')
    if (!fs.existsSync(file)) return null
    return loadImageFile(file)
  } catch (e) {
    return null
  }
}
