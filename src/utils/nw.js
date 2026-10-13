/**
 * NW.js（node）能力封装
 *
 * index.html 里通过 window.nwRequire = require 把 node 的 require 挂到 window 上，
 * 所以项目内部所有 require('xxx') 统一写成 nwRequire('xxx')。
 * 非 NW.js 环境（例如直接在浏览器里跑 vite dev）下 require 不存在，
 * 这里兜底成 null，保证页面本身还能正常加载。
 */
export const isNw = typeof window !== 'undefined' && typeof window.nwRequire === 'function'

function fallbackRequire(name) {
  throw new Error("nwRequire('" + name + "') 只能在 NW.js 环境下使用")
}

export const nwRequire = isNw ? window.nwRequire : fallbackRequire

export const fs = isNw ? nwRequire('fs') : null
export const path = isNw ? nwRequire('path') : null
export const config = isNw ? nwRequire('config') : null
export const net = isNw ? nwRequire('net') : null

/** 系统剪贴板（NW.js 提供），非 NW.js 环境下为 null */
export const clipboard = (() => {
  if (!isNw) return null
  try {
    const gui = typeof nw !== 'undefined' ? nw : nwRequire('nw.gui')
    return gui && gui.Clipboard ? gui.Clipboard.get() : null
  } catch (e) {
    console.log(e)
    return null
  }
})()
