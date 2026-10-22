import { ElMessage } from 'element-plus'
import { getCommandSpan, getNavUnit } from './eventDefaults'

/** 模块级剪贴板：地图事件与公共事件之间可互贴 */
let commandClipboard = null

export function hasCommandClipboard() {
  return !!(commandClipboard && commandClipboard.length)
}

export const commandClipboardMethods = {
    sortedUnique(arr) {
      return [...new Set(arr)].filter((i) => i >= 0 && i < this.list.length).sort((a, b) => a - b)
    },
    indicesFromSpan(span) {
      const out = []
      for (let i = span.start; i <= span.end; i++) out.push(i)
      return out
    },
    getMergedRanges() {
      const list = this.list
      const raw = []
      const seen = new Set()
      for (const i of this.sortedUnique(this.selectedIndices)) {
        const span = getCommandSpan(list, i)
        const key = span.start + ':' + span.end
        if (seen.has(key)) continue
        seen.add(key)
        raw.push([span.start, span.end])
      }
      if (!raw.length) return []
      raw.sort((a, b) => a[0] - b[0])
      const merged = [raw[0].slice()]
      for (let k = 1; k < raw.length; k++) {
        const cur = raw[k]
        const last = merged[merged.length - 1]
        if (cur[0] <= last[1] + 1) {
          last[1] = Math.max(last[1], cur[1])
        } else {
          merged.push(cur.slice())
        }
      }
      return merged
    },
    collectCopyCommands() {
      const list = this.list
      const cmds = []
      for (const [a, b] of this.getMergedRanges()) {
        for (let i = a; i <= b; i++) {
          const c = list[i]
          if (c && c.code !== 0) cmds.push(c)
        }
      }
      return cmds
    },
    removeSelectedCmd() {
      if (this.readonly) return
      const list = this.list
      let ranges = this.getMergedRanges()
      if (!ranges.length) return
      const endCount = list.filter((c) => c.code === 0).length
      if (endCount <= 1) {
        const endIdx = list.findIndex((c) => c.code === 0)
        const next = []
        for (const [a, b] of ranges) {
          if (endIdx < 0 || endIdx < a || endIdx > b) {
            next.push([a, b])
            continue
          }
          if (a === b && a === endIdx) continue
          if (endIdx === a) {
            if (a + 1 <= b) next.push([a + 1, b])
            continue
          }
          if (endIdx === b) {
            if (a <= b - 1) next.push([a, b - 1])
            continue
          }
          if (a <= endIdx - 1) next.push([a, endIdx - 1])
          if (endIdx + 1 <= b) next.push([endIdx + 1, b])
        }
        ranges = next
      }
      if (!ranges.length) return
      for (let r = ranges.length - 1; r >= 0; r--) {
        const [a, b] = ranges[r]
        list.splice(a, b - a + 1)
      }
      this.ensureEndCommand()
      const focus = Math.min(ranges[0][0], list.length - 1)
      this.setSingleSelection(Math.max(0, focus))
      this.emitList()
    },
    copySelected() {
      if (!this.canCopy) return
      const cmds = this.collectCopyCommands()
      if (!cmds.length) return
      commandClipboard = JSON.parse(JSON.stringify(cmds))
      this.clipboardTick++
      ElMessage.success('已复制指令')
    },
    cutSelected() {
      if (!this.canCopy) return
      const cmds = this.collectCopyCommands()
      if (!cmds.length) return
      commandClipboard = JSON.parse(JSON.stringify(cmds))
      this.clipboardTick++
      this.removeSelectedCmd()
      ElMessage.success('已剪切指令')
    },
    pasteClipboard() {
      if (!this.canPaste) return
      const cmds = JSON.parse(JSON.stringify(commandClipboard)).filter((c) => c && c.code !== 0)
      if (!cmds.length) return
      this.insertCommands(cmds, this.insertIndex(), false)
    },
    canMoveCmd(dir) {
      if (this.readonly) return false
      const list = this.list
      const unit = getNavUnit(list, this.focusIndex)
      // 仅单行可上下移（续行块/分歧整块禁用）
      if (unit.start !== unit.end) return false
      const sel = this.sortedUnique(this.selectedIndices)
      if (sel.length !== 1 || sel[0] !== unit.start) return false
      const i = unit.start
      if (list[i].code === 0) return false
      const j = i + dir
      if (j < 0 || j >= list.length) return false
      if (list[j].code === 0 && j === list.length - 1) return false
      return true
    },
    moveSelectedCmd(dir) {
      if (!this.canMoveCmd(dir)) return
      const list = this.list
      const i = getNavUnit(list, this.focusIndex).start
      const j = i + dir
      const tmp = list[i]
      list[i] = list[j]
      list[j] = tmp
      this.setSingleSelection(j)
      this.emitList()
    }
}
