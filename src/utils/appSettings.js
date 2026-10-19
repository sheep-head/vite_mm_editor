/**
 * 应用设置：跟随 NW package.json.name 的 nw.App.dataPath
 * Windows 约等于 %LOCALAPPDATA%\rmmz-game\settings.json
 */
import { isNw, nwRequire, fs, path, config } from './nw'
import { isValidWorkspace } from './workspaceValidate'

function getGui() {
  if (!isNw) return null
  try {
    return typeof nw !== 'undefined' ? nw : nwRequire('nw.gui')
  } catch (e) {
    return null
  }
}

export function getDataPath() {
  const gui = getGui()
  if (!gui || !gui.App || !gui.App.dataPath) return null
  return gui.App.dataPath
}

export function getSettingsPath() {
  const dir = getDataPath()
  if (!dir || !path) return null
  return path.join(dir, 'settings.json')
}

export function loadSettings() {
  const p = getSettingsPath()
  if (!p || !fs || !fs.existsSync(p)) return {}
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8')) || {}
  } catch (e) {
    console.log(e)
    return {}
  }
}

export function saveSettings(partial) {
  const dir = getDataPath()
  const p = getSettingsPath()
  if (!dir || !p || !fs) return false
  try {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    const next = { ...loadSettings(), ...partial }
    fs.writeFileSync(p, JSON.stringify(next, null, 2), 'utf8')
    return true
  } catch (e) {
    console.log(e)
    return false
  }
}

export const DEFAULT_EDITOR_UI = {
  charPickColor: 'rgba(42,93,176,1)',
  charPickWidth: 3,
  scrollTrack: 'rgba(40,40,40,0.55)',
  scrollThumb: 'rgba(200,200,200,0.95)',
  scrollSize: 14,
  commandTextSelectable: false,
  showCommandJson: true,
  confirmDiscardEvent: true,
  gridColor: 'rgba(255,255,255,0.25)',
  gridWidth: 1,
  /** 地图外框（整图边界，非满网格） */
  mapEdgeVisible: true,
  mapEdgeColor: 'rgba(255,80,80,0.85)',
  focusRingMode: 'untilAction',
  focusRingSeconds: 2,
  /** 事件白框内部底色 */
  eventFillColor: 'rgba(0,0,0,0.3)',
  /** center 取帧正中；fit 整帧缩小到白框内 */
  eventLargeFit: 'center',
  /**
   * 地图整图缓存是否分批异步绘制。
   * 关闭（默认）= 同步画完，换图不易叠内存；开启 = 不卡界面但大地图换图可能更不稳。
   */
  asyncMapLoad: false,
  /** 空/透明 → 棋盘格；否则铺纯色（不随地图滚动） */
  mapEmptyColor: '',
  blockedMapIds: [],
  /** dataPath 下的文件名，空为无 */
  mapBgSkin: '',
  /** 背景皮肤不透明度 0–1 */
  mapBgSkinOpacity: 1,
  dbBgSkin: '',
  dbBgSkinOpacity: 1,
  /** 测试游戏：启动命令（如 Game.exe 或 nw .） */
  playtestCommand: '',
  /** 测试游戏工作目录；空则用当前工作空间 */
  playtestCwd: '',
}

/** 空白底是否使用棋盘格（未设色或完全透明） */
export function isMapEmptyCheckerboard(color) {
  const c = String(color || '').trim()
  if (!c) return true
  const m = c.match(/rgba?\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+(?:\s*,\s*([\d.]+))?\s*\)/i)
  if (m && m[1] != null && Number(m[1]) === 0) return true
  if (/^#?[0-9a-f]{8}$/i.test(c.replace('#', '')) && c.slice(-2).toLowerCase() === '00') return true
  return false
}

export function getMapBgSkinPath(fileName) {
  const dir = getDataPath()
  if (!dir || !path || !fileName) return null
  return path.join(dir, fileName)
}

export function applyEditorUiCss(ui) {
  if (typeof document === 'undefined') return
  const s = document.documentElement.style
  const size = Math.max(8, Number(ui && ui.scrollSize) || 14)
  s.setProperty('--map-scroll-size', size + 'px')
  s.setProperty('--map-scroll-track', (ui && ui.scrollTrack) || DEFAULT_EDITOR_UI.scrollTrack)
  s.setProperty('--map-scroll-thumb', (ui && ui.scrollThumb) || DEFAULT_EDITOR_UI.scrollThumb)
}

export function saveWorkspace(workSpace) {
  return saveSettings({ workSpace })
}

/** 运行时写入 config.workSpace（NW require('config') 得到的是可变对象） */
export function setRuntimeWorkspace(workSpace) {
  if (config && typeof config === 'object') {
    config.workSpace = workSpace
  }
}

/**
 * 启动时解析：settings 里有合法路径则注入并返回，否则返回 null
 */
export function resolveWorkspace() {
  if (!isNw) return null
  const { workSpace } = loadSettings()
  if (!workSpace) return null
  const { ok } = isValidWorkspace(workSpace)
  if (!ok) return null
  setRuntimeWorkspace(workSpace)
  return workSpace
}

/** 当前是否已配置可用工作空间 */
export function getCurrentWorkspace() {
  if (config && config.workSpace && isValidWorkspace(config.workSpace).ok) {
    return config.workSpace
  }
  return resolveWorkspace()
}

export function hasValidWorkspace() {
  return !!getCurrentWorkspace()
}

/**
 * 选定工作空间：校验 → 落盘 → 注入 runtime
 * @returns {{ ok: boolean, missing?: string[], workSpace?: string }}
 */
export function applyWorkspace(dirPath) {
  const result = isValidWorkspace(dirPath)
  if (!result.ok) {
    return result
  }
  setRuntimeWorkspace(dirPath)
  saveWorkspace(dirPath)
  return { ok: true, workSpace: dirPath }
}
