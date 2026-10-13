import { fs, path } from './nw'

/**
 * 判断目录是否为合法工作空间。
 * 后续改标准只改这一处即可。
 *
 * @param {string} dirPath 本地绝对路径
 * @returns {{ ok: boolean, missing: string[] }}
 */
export function isValidWorkspace(dirPath) {
  const missing = []
  if (!dirPath || !fs || !path) {
    return { ok: false, missing: ['(无效路径或非 NW.js 环境)'] }
  }
  if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
    return { ok: false, missing: ['(目录不存在)'] }
  }

  // 当前标准：根目录须同时存在这些项
  const required = ['audio', 'js', 'img', 'index.html']

  for (const name of required) {
    const full = path.join(dirPath, name)
    if (!fs.existsSync(full)) {
      missing.push(name)
    }
  }
  return { ok: missing.length === 0, missing }
}
