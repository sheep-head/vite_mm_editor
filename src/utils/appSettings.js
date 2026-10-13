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
