/**
 * MZ/MV 图像资源：列目录、加载、切格（行走图 / 脸图 / 动画图）
 */
import DataManager from '@/utils/DataManager'
import { fs, path, isNw } from '@/utils/nw'

export const IMAGE_EXT = ['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp']

export function workRoot() {
  try {
    return (DataManager.$config && DataManager.$config.workSpace) || ''
  } catch (e) {
    return ''
  }
}

/** 无扩展名的文件名列表（扫 img/{folder}） */
export function listImageNames(folder) {
  const out = []
  try {
    if (!isNw || !fs || !path) return out
    const root = workRoot()
    if (!root) return out
    const dir = path.join(root, 'img', folder)
    if (!fs.existsSync(dir)) return out
    fs.readdirSync(dir).forEach((name) => {
      const ext = path.extname(name).toLowerCase()
      if (!IMAGE_EXT.includes(ext)) return
      const abs = path.join(dir, name)
      try {
        if (!fs.statSync(abs).isFile()) return
      } catch (e) {
        return
      }
      out.push(path.basename(name, ext))
    })
    out.sort((a, b) => a.localeCompare(b, 'zh-CN'))
  } catch (e) {
    console.error(e)
  }
  return out
}

/** effects 目录下 .efkefc 名（无扩展名） */
export function listEffectNames() {
  const out = []
  try {
    if (!isNw || !fs || !path) return out
    const root = workRoot()
    if (!root) return out
    const dir = path.join(root, 'effects')
    if (!fs.existsSync(dir)) return out
    fs.readdirSync(dir).forEach((name) => {
      if (!name.toLowerCase().endsWith('.efkefc')) return
      const abs = path.join(dir, name)
      try {
        if (!fs.statSync(abs).isFile()) return
      } catch (e) {
        return
      }
      out.push(path.basename(name, '.efkefc'))
    })
    out.sort((a, b) => a.localeCompare(b, 'zh-CN'))
  } catch (e) {
    console.error(e)
  }
  return out
}

export function imageAbsPath(folder, name) {
  if (!name || !isNw || !path) return ''
  const root = workRoot()
  if (!root) return ''
  const base = path.join(root, 'img', folder, name)
  for (const ext of IMAGE_EXT) {
    const p = base + ext
    if (fs && fs.existsSync(p)) return p
  }
  // 已带扩展名
  if (fs && fs.existsSync(base)) return base
  return base + '.png'
}

/** 敌人战斗图目录候选：本工程常把 battler 放在 sv_enemies */
export function battlerFolderCandidates(preferredFolder = 'enemies') {
  const pref = preferredFolder || 'enemies'
  if (pref === 'sv_actors') return ['sv_actors']
  if (pref === 'sv_enemies') return ['sv_enemies', 'enemies']
  if (pref === 'enemies') return ['enemies', 'sv_enemies']
  return [pref]
}

/** 解析战斗图绝对路径（多目录回退）；找不到时返回 preferred 下的默认 png 路径 */
export function resolveBattlerAbsPath(name, preferredFolder = 'enemies') {
  if (!name || !isNw || !path || !fs) return ''
  const folders = battlerFolderCandidates(preferredFolder)
  for (const folder of folders) {
    const abs = imageAbsPath(folder, name)
    if (abs && fs.existsSync(abs)) return abs
  }
  return imageAbsPath(folders[0], name)
}

/** 合并候选目录下的战斗图文件名（去重） */
export function listBattlerNames(preferredFolder = 'enemies') {
  const set = new Set()
  for (const folder of battlerFolderCandidates(preferredFolder)) {
    listImageNames(folder).forEach((n) => set.add(n))
  }
  return Array.from(set).sort((a, b) => a.localeCompare(b, 'zh-CN'))
}

export function effectAbsPath(name) {
  if (!name || !isNw || !path) return ''
  const root = workRoot()
  if (!root) return ''
  return path.join(root, 'effects', name.endsWith('.efkefc') ? name : name + '.efkefc')
}

export function toFileUrl(absPath) {
  if (!absPath) return ''
  const normalized = String(absPath).replace(/\\/g, '/')
  if (normalized.startsWith('file:')) return normalized
  return 'file:///' + normalized.replace(/^\/+/, '')
}

export function loadImageFile(absOrUrl) {
  return new Promise((resolve) => {
    if (!absOrUrl) {
      resolve(null)
      return
    }
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => {
      const url = toFileUrl(absOrUrl)
      const img2 = new Image()
      img2.onload = () => resolve(img2)
      img2.onerror = () => resolve(null)
      img2.src = url
    }
    img.src = absOrUrl.startsWith('file:') || absOrUrl.startsWith('http') ? absOrUrl : toFileUrl(absOrUrl)
  })
}

/** 文件名开头连续 !/$ 前缀（与 ImageManager 一致） */
export function characterNameSign(name) {
  const m = String(name || '').match(/^[!$]+/)
  return m ? m[0] : ''
}

/** 运行时大角色：前缀含 $（整张 3×4） */
export function isBigCharacter(name) {
  return characterNameSign(name).includes('$')
}

/** 物体：前缀含 !（不画半身草丛） */
export function isObjectCharacter(name) {
  return characterNameSign(name).includes('!')
}

/**
 * 行走图布局（与 ImageManager 一致）：
 * - 前缀含 $（$ / !$ / $!）：大角色，整张一人，3 列帧 × 4 行方向，index=0
 * - 否则：普通 8 人表（4×2 个角色，每人 3×4 帧）
 * ! 不改变切格，只表示物体角色（草丛不遮下半身）
 */
export function characterSheetLayout(img, name) {
  if (!img) {
    return { mode: 'big', big: true, object: false, cols: 1, rows: 1, cw: 48, ch: 48, maxIndex: 0 }
  }
  const sign = characterNameSign(name)
  const big = sign.includes('$')
  const object = sign.includes('!')
  if (big) {
    return {
      mode: 'big',
      big: true,
      object,
      cols: 1,
      rows: 1,
      cw: img.width / 3,
      ch: img.height / 4,
      maxIndex: 0,
    }
  }
  return {
    mode: 'normal',
    big: false,
    object,
    cols: 4,
    rows: 2,
    cw: img.width / 12,
    ch: img.height / 8,
    maxIndex: 7,
  }
}

/** 脸图：仅标准 576×288（4×2×144）才切格；否则整张单脸 */
export function faceSheetLayout(img, name) {
  void name
  if (!img) return { single: true, cols: 1, rows: 1, cw: 144, ch: 144, maxIndex: 0 }
  const standard = img.width === 576 && img.height === 288
  if (!standard) {
    return { single: true, cols: 1, rows: 1, cw: img.width, ch: img.height, maxIndex: 0 }
  }
  return {
    single: false,
    cols: 4,
    rows: 2,
    cw: 144,
    ch: 144,
    maxIndex: 7,
  }
}

/** MV 动画图：cell = 图高，列 = floor(宽/高) */
export function animationSheetLayout(img) {
  if (!img || !img.height) return { cell: 192, cols: 1, rows: 1 }
  const cell = img.height
  const cols = Math.max(1, Math.floor(img.width / cell))
  const rows = Math.max(1, Math.floor(img.height / cell))
  return { cell, cols, rows }
}

export function drawCharacterIndexPreview(ctx, img, name, index, dx, dy, dw, dh) {
  if (!ctx || !img) return
  const layout = characterSheetLayout(img, name)
  const idx = Math.max(0, Math.min(index || 0, layout.maxIndex))
  const pattern = 1
  const direction = 2
  const col = layout.big ? pattern : (idx % 4) * 3 + pattern
  const row = layout.big ? (direction - 2) / 2 : Math.floor(idx / 4) * 4 + (direction - 2) / 2
  const sx = col * layout.cw
  const sy = row * layout.ch
  ctx.drawImage(img, sx, sy, layout.cw, layout.ch, dx, dy, dw, dh)
}

export function drawFaceIndexPreview(ctx, img, name, index, dx, dy, dw, dh) {
  if (!ctx || !img) return
  const layout = faceSheetLayout(img, name)
  const idx = Math.max(0, Math.min(index || 0, layout.maxIndex))
  const col = idx % layout.cols
  const row = Math.floor(idx / layout.cols)
  const sx = col * layout.cw
  const sy = row * layout.ch
  ctx.drawImage(img, sx, sy, layout.cw, layout.ch, dx, dy, dw, dh)
}

/** 将 canvas 尺寸设为图在 max 框内的 contain 尺寸（小图不强制铺满） */
export function fitCanvasToImage(canvas, img, maxW = 480, maxH = 480) {
  if (!canvas || !img) return { scale: 1, dw: 0, dh: 0 }
  const scale = Math.min(maxW / img.width, maxH / img.height, 1)
  const dw = Math.max(1, Math.round(img.width * scale))
  const dh = Math.max(1, Math.round(img.height * scale))
  canvas.width = dw
  canvas.height = dh
  return { scale, dw, dh }
}

function fillChecker(ctx, w, h, s = 8) {
  for (let y = 0; y < h; y += s) {
    for (let x = 0; x < w; x += s) {
      ctx.fillStyle = (x / s + y / s) % 2 === 0 ? '#ccc' : '#fff'
      ctx.fillRect(x, y, s, s)
    }
  }
}

/** 大图某一帧 ↔ 事件图像的图案 / 朝向。行：下左右上，列：图案 0–2 */
export function frameFromPatternDirection(pattern, direction) {
  const col = Math.max(0, Math.min(2, Number(pattern) || 0))
  const row = Math.max(0, Math.min(3, ((Number(direction) || 2) - 2) / 2))
  return row * 3 + col
}

export function patternDirectionFromFrame(frame) {
  const idx = Math.max(0, Math.min(11, Number(frame) || 0))
  const col = idx % 3
  const row = Math.floor(idx / 3)
  return { pattern: col, direction: 2 + row * 2, index: 0 }
}

/** 事件页选图：普通表 12×8 单格，大图 3×4 单格 */
export function cellFromCharacter(big, index, pattern, direction) {
  const p = Math.max(0, Math.min(2, Number(pattern) || 0))
  const rowIn = Math.max(0, Math.min(3, ((Number(direction) || 2) - 2) / 2))
  if (big) return rowIn * 3 + p
  const idx = Math.max(0, Math.min(7, Number(index) || 0))
  const c = (idx % 4) * 3 + p
  const r = Math.floor(idx / 4) * 4 + rowIn
  return r * 12 + c
}

export function characterFromCell(big, cell) {
  if (big) return patternDirectionFromFrame(cell)
  const n = Math.max(0, Math.min(95, Number(cell) || 0))
  const c = n % 12
  const r = Math.floor(n / 12)
  return {
    index: Math.floor(c / 3) + Math.floor(r / 4) * 4,
    pattern: c % 3,
    direction: 2 + (r % 4) * 2,
  }
}

export const TILE_SET_BASE = { B: 0, C: 256, D: 512, E: 768 }
export const TILE_PX = 48

export function tileSetOfId(tileId) {
  const id = Number(tileId) || 0
  if (id >= 768 && id < 1024) return 'E'
  if (id >= 512 && id < 768) return 'D'
  if (id >= 256 && id < 512) return 'C'
  if (id > 0 && id < 256) return 'B'
  return ''
}

export function tileIdToCell(tileId) {
  const local = ((Number(tileId) || 0) % 256 + 256) % 256
  const block = Math.floor(local / 128)
  const inBlock = local % 128
  return { col: block * 8 + (inBlock % 8), row: Math.floor(inBlock / 8) }
}

export function tileIdFromCell(set, col, row) {
  const base = TILE_SET_BASE[set] || 0
  const c = Math.max(0, col)
  const r = Math.max(0, row)
  const block = c >= 8 ? 128 : 0
  return base + block + r * 8 + (c % 8)
}

function applyPickStroke(ctx, options) {
  ctx.strokeStyle = (options && options.stroke) || 'rgba(42,93,176,1)'
  ctx.lineWidth = (options && options.lineWidth) || 3
}

/**
 * 绘制行走图并高亮。
 * selectFrame：事件页按单帧（普通 12×8，大图 3×4）。
 * 否则大图整张一块；普通图按 8 人块高亮。
 */
export function paintCharacterSheet(canvas, img, name, selectedIndex, maxW = 480, maxH = 480, options = {}) {
  if (!canvas || !img) return
  const ctx = canvas.getContext('2d')
  const layout = characterSheetLayout(img, name)
  const { scale, dw, dh } = fitCanvasToImage(canvas, img, maxW, maxH)
  fillChecker(ctx, dw, dh)
  ctx.drawImage(img, 0, 0, dw, dh)
  applyPickStroke(ctx, options)
  if (options.selectFrame) {
    const cols = layout.big ? 3 : 12
    const rows = layout.big ? 4 : 8
    const max = cols * rows - 1
    const idx = Math.max(0, Math.min(selectedIndex || 0, max))
    const c = idx % cols
    const r = Math.floor(idx / cols)
    ctx.strokeRect(c * layout.cw * scale, r * layout.ch * scale, layout.cw * scale, layout.ch * scale)
    return
  }
  if (layout.mode === 'big' || layout.maxIndex === 0) {
    ctx.strokeRect(1, 1, dw - 2, dh - 2)
    return
  }
  if (selectedIndex < 0) return
  const idx = Math.max(0, Math.min(selectedIndex, layout.maxIndex))
  const c = idx % 4
  const r = Math.floor(idx / 4)
  const gw = layout.cw * 3 * scale
  const gh = layout.ch * 4 * scale
  ctx.strokeRect(c * gw, r * gh, gw, gh)
}

export function paintTileSheet(canvas, img, col, row, maxW = 480, maxH = 480, options = {}) {
  if (!canvas || !img) return { cols: 1, rows: 1 }
  const ctx = canvas.getContext('2d')
  const { scale, dw, dh } = fitCanvasToImage(canvas, img, maxW, maxH)
  fillChecker(ctx, dw, dh)
  ctx.drawImage(img, 0, 0, dw, dh)
  const cols = Math.max(1, Math.floor(img.width / TILE_PX))
  const rows = Math.max(1, Math.floor(img.height / TILE_PX))
  const c = Math.max(0, Math.min(col || 0, cols - 1))
  const r = Math.max(0, Math.min(row || 0, rows - 1))
  applyPickStroke(ctx, options)
  ctx.strokeRect(c * TILE_PX * scale, r * TILE_PX * scale, TILE_PX * scale, TILE_PX * scale)
  return { cols, rows }
}

export function paintFaceSheet(canvas, img, name, selectedIndex, maxW = 480, maxH = 320) {
  if (!canvas || !img) return
  const ctx = canvas.getContext('2d')
  const layout = faceSheetLayout(img, name)
  const { scale, dw, dh } = fitCanvasToImage(canvas, img, maxW, maxH)
  fillChecker(ctx, dw, dh)
  ctx.drawImage(img, 0, 0, dw, dh)
  // 单格脸图：$ 前缀，整张即一张脸
  if (layout.single || layout.maxIndex === 0) {
    ctx.strokeStyle = '#2a5db0'
    ctx.lineWidth = 2
    ctx.strokeRect(1, 1, dw - 2, dh - 2)
    return
  }
  if (selectedIndex >= 0) {
    const idx = Math.max(0, Math.min(selectedIndex, layout.maxIndex))
    const c = idx % layout.cols
    const r = Math.floor(idx / layout.cols)
    const gw = layout.cw * scale
    const gh = layout.ch * scale
    ctx.strokeStyle = '#2a5db0'
    ctx.lineWidth = 2
    ctx.strokeRect(c * gw, r * gh, gw, gh)
  }
}

export function hitCharacterIndex(img, name, canvas, clientX, clientY, options = {}) {
  if (!canvas || !img) return 0
  const layout = characterSheetLayout(img, name)
  const rect = canvas.getBoundingClientRect()
  const x = ((clientX - rect.left) / rect.width) * canvas.width
  const y = ((clientY - rect.top) / rect.height) * canvas.height
  const scale = canvas.width / img.width
  if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) return -1
  if (options.selectFrame) {
    const cols = layout.big ? 3 : 12
    const rows = layout.big ? 4 : 8
    const c = Math.min(cols - 1, Math.max(0, Math.floor(x / (layout.cw * scale))))
    const r = Math.min(rows - 1, Math.max(0, Math.floor(y / (layout.ch * scale))))
    return r * cols + c
  }
  if (layout.mode === 'big' || layout.maxIndex === 0) return 0
  const gw = layout.cw * 3 * scale
  const gh = layout.ch * 4 * scale
  const c = Math.min(3, Math.floor(x / gw))
  const r = Math.min(1, Math.floor(y / gh))
  return r * 4 + c
}

export function hitTileCell(img, canvas, clientX, clientY) {
  if (!canvas || !img) return { col: 0, row: 0 }
  const rect = canvas.getBoundingClientRect()
  const x = ((clientX - rect.left) / rect.width) * canvas.width
  const y = ((clientY - rect.top) / rect.height) * canvas.height
  const scale = canvas.width / img.width
  const cols = Math.max(1, Math.floor(img.width / TILE_PX))
  const rows = Math.max(1, Math.floor(img.height / TILE_PX))
  const cell = TILE_PX * scale
  if (x < 0 || y < 0) return { col: 0, row: 0 }
  return {
    col: Math.min(cols - 1, Math.max(0, Math.floor(x / cell))),
    row: Math.min(rows - 1, Math.max(0, Math.floor(y / cell))),
  }
}

export function hitFaceIndex(img, name, canvas, clientX, clientY) {
  if (!canvas || !img) return 0
  const layout = faceSheetLayout(img, name)
  if (layout.single || layout.maxIndex === 0) return 0
  const rect = canvas.getBoundingClientRect()
  const x = ((clientX - rect.left) / rect.width) * canvas.width
  const y = ((clientY - rect.top) / rect.height) * canvas.height
  const scale = canvas.width / img.width
  if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) return -1
  const c = Math.min(layout.cols - 1, Math.floor(x / (layout.cw * scale)))
  const r = Math.min(layout.rows - 1, Math.floor(y / (layout.ch * scale)))
  return r * layout.cols + c
}
