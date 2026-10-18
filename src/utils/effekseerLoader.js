/**
 * 加载 EffekseerForWebGL（优先工程 js/libs，其次 public/effekseer）
 */
import { workRoot, toFileUrl } from '@/utils/imgAssets'
import { fs, path, isNw } from '@/utils/nw'

let loadPromise = null

function scriptUrlCandidates() {
  const list = []
  try {
    if (isNw && fs && path) {
      const root = workRoot()
      if (root) {
        const js = path.join(root, 'js', 'libs', 'effekseer.min.js')
        if (fs.existsSync(js)) list.push(toFileUrl(js))
      }
    }
  } catch (e) {
    /* ignore */
  }
  // Vite public
  const base = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL) || '/'
  list.push(`${base}effekseer/effekseer.min.js`.replace(/\/+/g, '/').replace(':/', '://'))
  list.push('/effekseer/effekseer.min.js')
  return list
}

function wasmUrlCandidates() {
  const list = []
  try {
    if (isNw && fs && path) {
      const root = workRoot()
      if (root) {
        const w = path.join(root, 'js', 'libs', 'effekseer.wasm')
        if (fs.existsSync(w)) list.push(toFileUrl(w))
      }
    }
  } catch (e) {
    /* ignore */
  }
  const base = (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.BASE_URL) || '/'
  list.push(`${base}effekseer/effekseer.wasm`.replace(/\/+/g, '/').replace(':/', '://'))
  list.push('/effekseer/effekseer.wasm')
  return list
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && window.effekseer) {
      resolve(window.effekseer)
      return
    }
    const s = document.createElement('script')
    s.src = src
    s.async = true
    s.onload = () => {
      if (window.effekseer) resolve(window.effekseer)
      else reject(new Error('effekseer global missing after load'))
    }
    s.onerror = () => reject(new Error('failed to load ' + src))
    document.head.appendChild(s)
  })
}

/**
 * @returns {Promise<{ effekseer: any, wasmUrl: string } | null>}
 */
export async function ensureEffekseer() {
  if (loadPromise) return loadPromise
  loadPromise = (async () => {
    const scripts = scriptUrlCandidates()
    const wasms = wasmUrlCandidates()
    let lastErr = null
    for (let i = 0; i < scripts.length; i++) {
      try {
        const effekseer = await loadScript(scripts[i])
        const wasmUrl = wasms[Math.min(i, wasms.length - 1)] || wasms[0]
        return { effekseer, wasmUrl }
      } catch (e) {
        lastErr = e
      }
    }
    console.warn('[effekseerLoader]', lastErr)
    return null
  })()
  return loadPromise
}

export function hasWorkspaceEffekseer() {
  try {
    if (!isNw || !fs || !path) return false
    const root = workRoot()
    if (!root) return false
    return (
      fs.existsSync(path.join(root, 'js', 'libs', 'effekseer.min.js')) &&
      fs.existsSync(path.join(root, 'js', 'libs', 'effekseer.wasm'))
    )
  } catch (e) {
    return false
  }
}
