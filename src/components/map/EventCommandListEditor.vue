<template>
  <div class="ev-cmd-editor" :class="{ 'is-readonly': readonly }">
    <div v-if="showTitle" class="ev-cmd-title">执行内容</div>
    <div
      ref="listEl"
      class="ev-cmd-list"
      tabindex="0"
      @dblclick="onListDblClick"
      @keydown="onCmdListKeydown"
      @contextmenu="onContextMenu"
      @scroll="closeMenu">
      <div
        v-for="(cmd, i) in list"
        :key="i"
        class="ev-cmd-line"
        :class="{ end: cmd.code === 0, selected: isSelected(i), focus: focusIndex === i }"
        :data-index="i"
        @click="onLineClick(i, $event)">
        {{ formatCommandLine(cmd) }}
      </div>
    </div>
    <el-collapse v-if="!readonly && showJson" class="ev-json">
      <el-collapse-item title="高级：list JSON" name="json">
        <el-input v-model="listJson" type="textarea" :rows="8" @blur="applyListJson" />
        <p v-if="listJsonError" class="ev-json-err">{{ listJsonError }}</p>
      </el-collapse-item>
    </el-collapse>

    <teleport to="body">
      <ul
        v-show="menu.visible"
        class="contextmenu ev-cmd-ctx"
        :style="menuStyle"
        @contextmenu.prevent>
        <li :class="{ disabled: readonly }" @click="menuAction(openInsert)">插入</li>
        <li :class="{ disabled: !canCopy }" @click="menuAction(copySelected)">复制</li>
        <li :class="{ disabled: !canCopy }" @click="menuAction(cutSelected)">剪切</li>
        <li :class="{ disabled: !canPaste }" @click="menuAction(pasteClipboard)">粘贴</li>
        <li class="ev-cmd-ctx-sep" />
        <li :class="{ disabled: !canMoveCmd(-1) }" @click="menuAction(() => moveSelectedCmd(-1))">上移</li>
        <li :class="{ disabled: !canMoveCmd(1) }" @click="menuAction(() => moveSelectedCmd(1))">下移</li>
        <li :class="{ disabled: !canDelete }" @click="menuAction(removeSelectedCmd)">删除</li>
      </ul>
    </teleport>

    <event-command-select-dialog v-model="cmdSelectVisible" @select="onCatalogSelect" />
    <param-dialog-host
      v-model="paramVisible"
      :entry="paramEntry"
      :command="paramCommand"
      @confirm="onParamConfirm" />
  </div>
</template>

<script>
import { ElMessage } from 'element-plus'
import { formatCommandLine } from './eventDefaults'
import EventCommandSelectDialog from './EventCommandSelectDialog.vue'
import ParamDialogHost from './ParamDialogHost.vue'
import { findCatalogEntry } from './eventCommandCatalog'

/** 模块级剪贴板：地图事件与公共事件之间可互贴 */
let commandClipboard = null

const CONT_MAP = { 101: 401, 105: 405, 108: 408, 355: 655, 302: 605 }

export default {
  name: 'EventCommandListEditor',
  components: { EventCommandSelectDialog, ParamDialogHost },
  props: {
    modelValue: { type: Array, default: () => [] },
    readonly: { type: Boolean, default: false },
    showTitle: { type: Boolean, default: true },
    showJson: { type: Boolean, default: true },
  },
  emits: ['update:modelValue'],
  data() {
    return {
      selectedIndices: [0],
      focusIndex: 0,
      anchorIndex: 0,
      listJson: '',
      listJsonError: '',
      cmdSelectVisible: false,
      paramVisible: false,
      paramEntry: null,
      paramCommand: null,
      paramInsertIndex: -1,
      paramReplace: false,
      paramReplaceCount: 1,
      paramFromInsert: false,
      _paramConfirmed: false,
      clipboardTick: 0,
      menu: { visible: false, x: 0, y: 0 },
    }
  },
  computed: {
    list() {
      return Array.isArray(this.modelValue) ? this.modelValue : []
    },
    menuStyle() {
      return {
        position: 'fixed',
        left: this.menu.x + 'px',
        top: this.menu.y + 'px',
        zIndex: 4000,
      }
    },
    canCopy() {
      if (this.readonly) return false
      return this.collectCopyCommands().length > 0
    },
    canDelete() {
      if (this.readonly) return false
      const list = this.list
      const ranges = this.getMergedRanges()
      if (!ranges.length) return false
      const endCount = list.filter((c) => c.code === 0).length
      if (endCount > 1) return true
      const endIdx = list.findIndex((c) => c.code === 0)
      return ranges.some(([a, b]) => {
        for (let i = a; i <= b; i++) {
          if (i !== endIdx) return true
        }
        return false
      })
    },
    canPaste() {
      this.clipboardTick
      return !this.readonly && !!(commandClipboard && commandClipboard.length)
    },
    isSingleSelect() {
      return this.selectedIndices.length === 1
    },
  },
  watch: {
    modelValue: {
      deep: true,
      immediate: true,
      handler() {
        this.syncListJson()
        this.clampSelection()
      },
    },
    focusIndex() {
      this.$nextTick(() => this.scrollFocusIntoView())
    },
    paramVisible(v, was) {
      if (was && !v) {
        if (this.paramFromInsert && !this._paramConfirmed) {
          this.cmdSelectVisible = true
        }
        this.paramFromInsert = false
        this._paramConfirmed = false
      }
    },
  },
  mounted() {
    document.addEventListener('mousedown', this.onDocMouseDown, true)
    window.addEventListener('blur', this.closeMenu)
  },
  beforeUnmount() {
    document.removeEventListener('mousedown', this.onDocMouseDown, true)
    window.removeEventListener('blur', this.closeMenu)
  },
  methods: {
    formatCommandLine,
    emitList() {
      this.$emit('update:modelValue', this.list)
      this.syncListJson()
    },
    syncListJson() {
      this.listJson = JSON.stringify(this.list || [], null, 2)
      this.listJsonError = ''
    },
    applyListJson() {
      try {
        const parsed = JSON.parse(this.listJson)
        if (!Array.isArray(parsed)) throw new Error('必须是数组')
        this.$emit('update:modelValue', parsed)
        this.listJsonError = ''
      } catch (e) {
        this.listJsonError = 'JSON 无效: ' + e.message
      }
    },
    isSelected(i) {
      return this.selectedIndices.includes(i)
    },
    sortedUnique(arr) {
      return [...new Set(arr)].filter((i) => i >= 0 && i < this.list.length).sort((a, b) => a - b)
    },
    setSingleSelection(i) {
      const idx = Math.max(0, Math.min(i, Math.max(0, this.list.length - 1)))
      this.selectedIndices = this.list.length ? [idx] : []
      this.focusIndex = idx
      this.anchorIndex = idx
      this.focusList()
    },
    selectRange(from, to) {
      const a = Math.min(from, to)
      const b = Math.max(from, to)
      const indices = []
      for (let i = a; i <= b; i++) indices.push(i)
      this.selectedIndices = this.sortedUnique(indices)
      this.focusIndex = Math.max(0, Math.min(to, Math.max(0, this.list.length - 1)))
      this.focusList()
    },
    toggleSelection(i) {
      const set = new Set(this.selectedIndices)
      if (set.has(i)) set.delete(i)
      else set.add(i)
      this.selectedIndices = this.sortedUnique([...set])
      this.focusIndex = i
      if (!this.selectedIndices.length && this.list.length) {
        this.selectedIndices = [i]
      }
      this.focusList()
    },
    selectAll() {
      if (!this.list.length) return
      this.selectedIndices = this.list.map((_, i) => i)
      this.focusIndex = this.list.length - 1
      this.focusList()
    },
    clampSelection() {
      const max = this.list.length - 1
      if (max < 0) {
        this.selectedIndices = []
        this.focusIndex = 0
        this.anchorIndex = 0
        return
      }
      this.selectedIndices = this.sortedUnique(this.selectedIndices)
      if (!this.selectedIndices.length) {
        this.selectedIndices = [0]
      }
      this.focusIndex = Math.max(0, Math.min(this.focusIndex, max))
      this.anchorIndex = Math.max(0, Math.min(this.anchorIndex, max))
    },
    onLineClick(i, e) {
      if (e.shiftKey) {
        this.selectRange(this.anchorIndex, i)
      } else if (e.ctrlKey || e.metaKey) {
        this.toggleSelection(i)
      } else {
        this.setSingleSelection(i)
      }
    },
    focusList() {
      const el = this.$refs.listEl
      if (el && typeof el.focus === 'function') el.focus()
    },
    scrollFocusIntoView() {
      const root = this.$refs.listEl
      if (!root) return
      const line = root.querySelector('.ev-cmd-line.focus') || root.querySelector('.ev-cmd-line.selected')
      if (line && line.scrollIntoView) {
        line.scrollIntoView({ block: 'nearest' })
      }
    },
    closeMenu() {
      this.menu.visible = false
    },
    onDocMouseDown(e) {
      if (!this.menu.visible) return
      const t = e.target
      if (t && t.closest && t.closest('.ev-cmd-ctx')) return
      this.closeMenu()
    },
    onContextMenu(e) {
      e.preventDefault()
      const line = e.target && e.target.closest ? e.target.closest('.ev-cmd-line') : null
      if (line) {
        const i = Number(line.dataset.index)
        if (!Number.isNaN(i) && !this.isSelected(i)) {
          this.setSingleSelection(i)
        } else if (!Number.isNaN(i)) {
          this.focusIndex = i
          this.focusList()
        }
      }
      if (this.readonly) return
      const pad = 8
      const mw = 140
      const mh = 220
      let x = e.clientX
      let y = e.clientY
      if (x + mw > window.innerWidth - pad) x = window.innerWidth - mw - pad
      if (y + mh > window.innerHeight - pad) y = window.innerHeight - mh - pad
      this.menu = { visible: true, x, y }
    },
    menuAction(fn) {
      if (typeof fn === 'function') fn()
      this.closeMenu()
    },
    openInsert() {
      if (this.readonly) return
      this.closeMenu()
      this.cmdSelectVisible = true
    },
    isTypingTarget(e) {
      const t = e.target
      if (!t) return false
      const tag = (t.tagName || '').toLowerCase()
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return true
      if (t.isContentEditable) return true
      return false
    },
    moveFocus(next, extend) {
      const max = Math.max(0, this.list.length - 1)
      const i = Math.max(0, Math.min(next, max))
      if (extend) {
        this.selectRange(this.anchorIndex, i)
      } else {
        this.setSingleSelection(i)
      }
    },
    onCmdListKeydown(e) {
      if (this.isTypingTarget(e)) return
      const max = this.list.length - 1
      const extend = e.shiftKey
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        this.moveFocus(this.focusIndex - 1, extend)
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        this.moveFocus(this.focusIndex + 1, extend)
        return
      }
      if (e.key === 'Home') {
        e.preventDefault()
        this.moveFocus(0, extend)
        return
      }
      if (e.key === 'End') {
        e.preventDefault()
        this.moveFocus(max, extend)
        return
      }
      const ctrl = e.ctrlKey || e.metaKey
      if (ctrl && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault()
        this.selectAll()
        return
      }
      if (this.readonly) return
      if (e.key === 'Enter') {
        e.preventDefault()
        this.onListDblClick()
        return
      }
      if (e.key === 'Insert') {
        e.preventDefault()
        this.openInsert()
        return
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault()
        this.removeSelectedCmd()
        return
      }
      if (ctrl && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault()
        this.copySelected()
        return
      }
      if (ctrl && (e.key === 'x' || e.key === 'X')) {
        e.preventDefault()
        this.cutSelected()
        return
      }
      if (ctrl && (e.key === 'v' || e.key === 'V')) {
        e.preventDefault()
        this.pasteClipboard()
      }
    },
    onListDblClick() {
      if (this.readonly) return
      this.closeMenu()
      const list = this.list
      const i = this.focusIndex
      const cmd = list[i]
      if (cmd && cmd.code !== 0) {
        let entry = findCatalogEntry(cmd.code)
        if (cmd.code === 342) {
          const len = (cmd.parameters || []).length
          entry = findCatalogEntry(342, len === 4 ? 3 : 1) || entry
        }
        if (entry && entry.paramKey) {
          this.paramFromInsert = false
          this.paramEntry = entry
          this.paramCommand = this.buildParamCommand(list, i)
          this.paramReplace = true
          this.paramInsertIndex = i
          this.paramReplaceCount = this.countReplaceSpan(list, i)
          this.paramVisible = true
        } else {
          this.cmdSelectVisible = true
        }
      } else {
        this.cmdSelectVisible = true
      }
    },
    buildParamCommand(list, i) {
      const cmd = list[i]
      if (!cmd) return null
      if (cmd.code === 101 || cmd.code === 105 || cmd.code === 355) {
        const cont = cmd.code === 101 ? 401 : cmd.code === 105 ? 405 : 655
        const extra = []
        for (let j = i + 1; j < list.length && list[j].code === cont; j++) {
          extra.push((list[j].parameters && list[j].parameters[0]) || '')
        }
        return { ...cmd, parameters: [...(cmd.parameters || [])], _extraLines: extra }
      }
      if (cmd.code === 302) {
        const extraGoods = []
        for (let j = i + 1; j < list.length && list[j].code === 605; j++) {
          const gp = list[j].parameters || []
          extraGoods.push({
            type: gp[0] || 0,
            id: gp[1] || 1,
            priceType: gp[2] || 0,
            price: gp[3] || 0,
          })
        }
        return { ...cmd, parameters: [...(cmd.parameters || [])], _extraGoods: extraGoods }
      }
      return cmd
    },
    countReplaceSpan(list, i) {
      const cmd = list[i]
      if (!cmd) return 1
      const cont = CONT_MAP[cmd.code]
      if (cont != null) {
        let n = 1
        for (let j = i + 1; j < list.length && list[j].code === cont; j++) n++
        return n
      }
      return 1
    },
    /** 将选中下标扩成续行区间并合并 */
    getMergedRanges() {
      const list = this.list
      const raw = []
      for (const i of this.sortedUnique(this.selectedIndices)) {
        if (i < 0 || i >= list.length) continue
        const n = this.countReplaceSpan(list, i)
        raw.push([i, i + n - 1])
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
    onCatalogSelect(entry) {
      const insertAt = this.insertIndex()
      if (entry.needsDialog && entry.paramKey) {
        this.paramFromInsert = true
        this._paramConfirmed = false
        this.paramEntry = entry
        this.paramCommand = { code: entry.code, indent: 0, parameters: [] }
        this.paramReplace = false
        this.paramInsertIndex = insertAt
        this.paramReplaceCount = 1
        this.cmdSelectVisible = false
        this.paramVisible = true
        return
      }
      const cmds = entry.createDefault()
      if (entry.needsDialog && !entry.paramKey) {
        ElMessage.info('该指令参数编辑尚未实现，已插入默认值，可用高级 JSON 修改')
      }
      this.insertCommands(cmds, insertAt, false)
      this.cmdSelectVisible = false
    },
    onParamConfirm(commands) {
      this._paramConfirmed = true
      this.insertCommands(commands, this.paramInsertIndex, this.paramReplace, this.paramReplaceCount)
      this.cmdSelectVisible = false
      this.paramFromInsert = false
    },
    insertIndex() {
      const list = this.list
      let i = this.focusIndex
      if (i < 0 || i >= list.length) i = Math.max(0, list.length - 1)
      return i
    },
    insertCommands(commands, at, replace, replaceCount = 1) {
      if (!commands || !commands.length) return
      this.ensureListArray()
      const list = this.list
      const idx = list.length ? Math.max(0, Math.min(at, list.length - 1)) : 0
      if (replace) {
        const n = Math.max(1, replaceCount || 1)
        list.splice(idx, n, ...commands)
      } else {
        list.splice(idx, 0, ...commands)
      }
      this.ensureEndCommand()
      const end = idx + commands.length - 1
      this.selectedIndices = []
      for (let i = idx; i <= end && i < list.length; i++) {
        if (list[i].code !== 0) this.selectedIndices.push(i)
      }
      if (!this.selectedIndices.length) this.selectedIndices = [idx]
      this.focusIndex = this.selectedIndices[0]
      this.anchorIndex = this.focusIndex
      this.emitList()
    },
    ensureListArray() {
      if (!Array.isArray(this.modelValue)) {
        this.$emit('update:modelValue', [])
      }
    },
    ensureEndCommand() {
      const list = this.list
      if (!list.length || list[list.length - 1].code !== 0) {
        list.push({ code: 0, indent: 0, parameters: [] })
      }
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
      if (this.readonly || !this.isSingleSelect) return false
      const list = this.list
      const i = this.focusIndex
      if (i < 0 || i >= list.length) return false
      if (list[i].code === 0) return false
      const j = i + dir
      if (j < 0 || j >= list.length) return false
      if (list[j].code === 0 && j === list.length - 1) return false
      return true
    },
    moveSelectedCmd(dir) {
      if (!this.canMoveCmd(dir)) return
      const list = this.list
      const i = this.focusIndex
      const j = i + dir
      const tmp = list[i]
      list[i] = list[j]
      list[j] = tmp
      this.setSingleSelection(j)
      this.emitList()
    },
  },
}
</script>

<style scoped>
.ev-cmd-editor {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.ev-cmd-title {
  font-size: 13px;
  font-weight: 600;
  margin-bottom: 4px;
  color: var(--app-text-muted);
}
.ev-cmd-list {
  flex: 1;
  min-height: 280px;
  max-height: 48vh;
  overflow: auto;
  border: 1px solid var(--app-border);
  border-radius: 4px;
  background: var(--app-surface-2);
  outline: none;
}
.ev-cmd-list:focus {
  border-color: var(--el-color-primary, #409eff);
}
.ev-cmd-line {
  font-family: Consolas, 'Courier New', monospace;
  font-size: 12px;
  padding: 2px 8px;
  white-space: pre;
  cursor: default;
  color: #2d8a3e;
}
.ev-cmd-line.end {
  opacity: 0.55;
  color: var(--app-text-muted);
}
.ev-cmd-line.selected {
  background: var(--el-color-primary-light-7, #c6e2ff);
  color: var(--app-text);
}
.ev-cmd-line.focus {
  box-shadow: inset 2px 0 0 var(--el-color-primary, #409eff);
}
.ev-json {
  margin-top: 6px;
}
.ev-json-err {
  color: #f56c6c;
  font-size: 12px;
  margin: 4px 0 0;
}
.is-readonly .ev-cmd-list {
  opacity: 0.85;
}
</style>

<style>
/* teleport 菜单：沿用全局 .contextmenu，补 disabled */
.ev-cmd-ctx li.disabled {
  opacity: 0.4;
  pointer-events: none;
  cursor: default;
}
.ev-cmd-ctx li.ev-cmd-ctx-sep {
  height: 1px;
  margin: 4px 8px;
  padding: 0;
  background: var(--app-border, #444);
  cursor: default;
  pointer-events: none;
}
.ev-cmd-ctx li.ev-cmd-ctx-sep:hover {
  background: var(--app-border, #444);
}
</style>
