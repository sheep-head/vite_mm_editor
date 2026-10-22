<template>
  <div class="ev-cmd-editor" :class="{ 'is-readonly': readonly }">
    <div v-if="showTitle" class="ev-cmd-title">执行内容</div>
    <div
      ref="listEl"
      class="ev-cmd-list"
      :class="{ 'is-selectable': commandTextSelectable }"
      tabindex="0"
      @dblclick="onListDblClick"
      @keydown="onCmdListKeydown"
      @contextmenu="onContextMenu"
      @scroll="closeMenu">
      <div
        v-for="row in displayRows"
        :key="row.i"
        class="ev-cmd-line"
        :class="lineClasses(row)"
        :data-index="row.i"
        @click="onLineClick(row.i, $event)">
        <template v-if="!row.empty">
          <span class="ev-indent">{{ indentText(row.cmd) }}</span>
          <span class="ev-mark">{{ partsOf(row.i).mark }}</span>
          <span v-if="partsOf(row.i).pad" class="ev-script-pad">{{ partsOf(row.i).pad }}</span>
          <span v-if="partsOf(row.i).label" class="ev-label">{{ partsOf(row.i).label }}</span>
          <span class="ev-body">{{ partsOf(row.i).body }}</span>
          <span v-if="partsOf(row.i).note" class="ev-note">{{ partsOf(row.i).note }}</span>
        </template>
        <span v-else class="ev-empty">&nbsp;</span>
      </div>
    </div>
    <div v-if="!readonly && showJson && showCommandJson" class="ev-json-bar">
      <el-button size="small" @click="openJson">JSON…</el-button>
    </div>
    <el-dialog v-model="jsonVisible" title="执行内容 JSON" width="720px" append-to-body :close-on-click-modal="false">
      <div class="ev-json-tree">
        <json-tree-view :data="list" />
      </div>
      <el-input v-model="listJson" type="textarea" :rows="12" />
      <p v-if="listJsonError" class="ev-json-err">{{ listJsonError }}</p>
      <template #footer>
        <el-button @click="jsonVisible = false">取消</el-button>
        <el-button type="primary" @click="applyListJsonAndClose">确定</el-button>
      </template>
    </el-dialog>

    <popup-context-menu
      :visible="menu.visible"
      :x="menu.x"
      :y="menu.y"
      @update:visible="(v) => (menu.visible = v)">
      <template #default="{ action }">
        <li :class="{ disabled: !canEditCmd }" @click="action(onListDblClick)">编辑</li>
        <li :class="{ disabled: readonly }" @click="action(openInsert)">插入</li>
        <li :class="{ disabled: !canCopy }" @click="action(copySelected)">复制</li>
        <li :class="{ disabled: !canCopy }" @click="action(cutSelected)">剪切</li>
        <li :class="{ disabled: !canPaste }" @click="action(pasteClipboard)">粘贴</li>
        <li class="sep" />
        <li :class="{ disabled: !canMoveCmd(-1) }" @click="action(() => moveSelectedCmd(-1))">上移</li>
        <li :class="{ disabled: !canMoveCmd(1) }" @click="action(() => moveSelectedCmd(1))">下移</li>
        <li :class="{ disabled: !canDelete }" @click="action(removeSelectedCmd)">删除</li>
      </template>
    </popup-context-menu>

    <event-command-select-dialog v-model="cmdSelectVisible" @select="onCatalogSelect" />
    <param-dialog-host
      v-model="paramVisible"
      :entry="paramEntry"
      :command="paramCommand"
      :command-list="list"
      @confirm="onParamConfirm" />
  </div>
</template>

<script>
import { ElMessage } from 'element-plus'
import {
  formatCommandParts,
  getCommandSpan,
  getNavUnit,
  listNavStarts,
  countReplaceSpan,
  CONT_MAP,
} from './eventDefaults'
import { mapGetters } from 'vuex'
import EventCommandSelectDialog from './EventCommandSelectDialog.vue'
import ParamDialogHost from './ParamDialogHost.vue'
import { findCatalogEntry } from './eventCommandCatalog'
import JsonTreeView from './JsonTreeView.vue'
import PopupContextMenu from '@/components/shared/PopupContextMenu.vue'

/** 模块级剪贴板：地图事件与公共事件之间可互贴 */
let commandClipboard = null
const MIN_VISIBLE_ROWS = 24

export default {
  name: 'EventCommandListEditor',
  components: { EventCommandSelectDialog, ParamDialogHost, JsonTreeView, PopupContextMenu },
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
      jsonVisible: false,
      _partsCache: null,
    }
  },
  computed: {
    ...mapGetters(['editorUi']),
    commandTextSelectable() {
      return !!(this.editorUi && this.editorUi.commandTextSelectable)
    },
    showCommandJson() {
      return !this.editorUi || this.editorUi.showCommandJson !== false
    },
    list() {
      return Array.isArray(this.modelValue) ? this.modelValue : []
    },
    displayRows() {
      const list = this.list
      const n = Math.max(list.length, MIN_VISIBLE_ROWS)
      const rows = []
      for (let i = 0; i < n; i++) {
        if (i < list.length) rows.push({ i, cmd: list[i], empty: false })
        else rows.push({ i, cmd: null, empty: true })
      }
      return rows
    },
    canCopy() {
      if (this.readonly) return false
      return this.collectCopyCommands().length > 0
    },
    canEditCmd() {
      if (this.readonly) return false
      const list = this.list
      if (!list || !list.length) return false
      const unit = getNavUnit(list, this.focusIndex)
      const cmd = list[unit.start]
      return !!(cmd && cmd.code !== 0)
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
  },
  watch: {
    modelValue: {
      deep: true,
      immediate: true,
      handler() {
        this._partsCache = null
        this.syncListJson()
        this.clampSelection()
      },
    },
    focusIndex() {
      this.$nextTick(() => this.scrollFocusIntoView())
    },
    paramVisible(v, was) {
      if (was && !v) {
        // 参数窗叠在指令选择窗之上：取消时保持选择窗打开；确认时在 onParamConfirm 里一并关闭
        this.paramFromInsert = false
        this._paramConfirmed = false
      }
    },
  },
  methods: {
    ensurePartsCache() {
      if (this._partsCache && this._partsCache.length === this.list.length) return this._partsCache
      const cache = []
      let prevColor = 'info'
      for (let i = 0; i < this.list.length; i++) {
        const parts = formatCommandParts(this.list[i], prevColor)
        cache.push(parts)
        if (parts.code !== 0) prevColor = parts.color || prevColor
      }
      this._partsCache = cache
      return cache
    },
    partsOf(i) {
      const cache = this.ensurePartsCache()
      return cache[i] || formatCommandParts(this.list[i])
    },
    indentText(cmd) {
      return '　'.repeat((cmd && cmd.indent) || 0)
    },
    lineClasses(row) {
      const i = row.i
      if (row.empty) {
        return {
          empty: true,
          zebra: i % 2 === 1,
          selected: false,
          focus: false,
        }
      }
      const parts = this.partsOf(i)
      return {
        ['kind-' + parts.kind]: true,
        ['color-' + (parts.color || 'info')]: true,
        zebra: i % 2 === 1,
        end: row.cmd && row.cmd.code === 0,
        selected: this.isSelected(i),
        focus: this.focusIndex === i,
      }
    },
    emitList() {
      this._partsCache = null
      this.$emit('update:modelValue', this.list)
      this.syncListJson()
    },
    syncListJson() {
      this.listJson = JSON.stringify(this.list || [], null, 2)
      this.listJsonError = ''
    },
    openJson() {
      this.syncListJson()
      this.jsonVisible = true
    },
    applyListJson() {
      try {
        const parsed = JSON.parse(this.listJson)
        if (!Array.isArray(parsed)) throw new Error('必须是数组')
        this.$emit('update:modelValue', parsed)
        this.listJsonError = ''
        return true
      } catch (e) {
        this.listJsonError = 'JSON 无效: ' + e.message
        return false
      }
    },
    applyListJsonAndClose() {
      if (this.applyListJson()) this.jsonVisible = false
    },
    isSelected(i) {
      return this.selectedIndices.includes(i)
    },
    sortedUnique(arr) {
      return [...new Set(arr)].filter((i) => i >= 0 && i < this.list.length).sort((a, b) => a - b)
    },
    indicesFromSpan(span) {
      const out = []
      for (let i = span.start; i <= span.end; i++) out.push(i)
      return out
    },
    setSelectionToSpan(span, focusAt) {
      this.selectedIndices = this.indicesFromSpan(span)
      this.focusIndex = focusAt != null ? focusAt : span.start
      this.anchorIndex = span.start
      this.focusList()
    },
    setSingleSelection(i) {
      if (!this.list.length) {
        this.selectedIndices = []
        this.focusIndex = 0
        this.anchorIndex = 0
        return
      }
      const span = getCommandSpan(this.list, i)
      this.setSelectionToSpan(span, i)
    },
    selectRange(from, to) {
      const aSpan = getCommandSpan(this.list, from)
      const bSpan = getCommandSpan(this.list, to)
      const a = Math.min(aSpan.start, bSpan.start)
      const b = Math.max(aSpan.end, bSpan.end)
      const indices = []
      for (let i = a; i <= b; i++) indices.push(i)
      this.selectedIndices = this.sortedUnique(indices)
      this.focusIndex = to
      this.focusList()
    },
    toggleSelection(i) {
      const span = getCommandSpan(this.list, i)
      const set = new Set(this.selectedIndices)
      const allIn = this.indicesFromSpan(span).every((x) => set.has(x))
      if (allIn) {
        this.indicesFromSpan(span).forEach((x) => set.delete(x))
      } else {
        this.indicesFromSpan(span).forEach((x) => set.add(x))
      }
      this.selectedIndices = this.sortedUnique([...set])
      this.focusIndex = i
      if (!this.selectedIndices.length && this.list.length) {
        this.setSelectionToSpan(span, i)
        return
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
        this.setSingleSelection(0)
        return
      }
      this.focusIndex = Math.max(0, Math.min(this.focusIndex, max))
      this.anchorIndex = Math.max(0, Math.min(this.anchorIndex, max))
    },
    onLineClick(i, e) {
      this.focusList()
      if (i >= this.list.length) {
        // 空白行：选中末尾结束指令
        const end = this.list.length - 1
        if (end >= 0) this.setSingleSelection(end)
        return
      }
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
      this.menu = { visible: true, x: e.clientX, y: e.clientY }
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
    moveFocusByNav(dir, extend) {
      const starts = listNavStarts(this.list)
      if (!starts.length) return
      const unit = getNavUnit(this.list, this.focusIndex)
      let idx = starts.indexOf(unit.start)
      if (idx < 0) {
        idx = starts.findIndex((s) => s >= unit.start)
        if (idx < 0) idx = starts.length - 1
      }
      const nextIdx = Math.max(0, Math.min(starts.length - 1, idx + dir))
      const nextStart = starts[nextIdx]
      if (extend) {
        this.selectRange(this.anchorIndex, nextStart)
      } else {
        this.setSingleSelection(nextStart)
      }
    },
    onCmdListKeydown(e) {
      if (this.isTypingTarget(e)) return
      const extend = e.shiftKey
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        this.moveFocusByNav(-1, extend)
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        this.moveFocusByNav(1, extend)
        return
      }
      if (e.key === 'Home') {
        e.preventDefault()
        const starts = listNavStarts(this.list)
        if (!starts.length) return
        if (extend) this.selectRange(this.anchorIndex, starts[0])
        else this.setSingleSelection(starts[0])
        return
      }
      if (e.key === 'End') {
        e.preventDefault()
        const starts = listNavStarts(this.list)
        if (!starts.length) return
        const last = starts[starts.length - 1]
        if (extend) this.selectRange(this.anchorIndex, last)
        else this.setSingleSelection(last)
        return
      }
      const ctrl = e.ctrlKey || e.metaKey
      if (ctrl && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault()
        this.selectAll()
        return
      }
      if (this.readonly) return
      if (e.key === 'Enter' || e.key === ' ') {
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
      const span = getCommandSpan(list, this.focusIndex)
      let i = span.start
      const head = list[i]
      // 分歧整块时编辑 111
      if (head && (head.code === 111 || head.code === 112)) {
        i = span.start
      } else {
        i = getNavUnit(list, this.focusIndex).start
      }
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
          // 编辑只替换头+续行，不整块清掉分歧内容
          this.paramReplaceCount = countReplaceSpan(list, i)
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
        const cont = CONT_MAP[cmd.code]
        const extra = []
        for (let j = i + 1; j < list.length && list[j].code === cont; j++) {
          extra.push((list[j].parameters && list[j].parameters[0]) || '')
        }
        return { ...cmd, parameters: [...(cmd.parameters || [])], _extraLines: extra }
      }
      if (cmd.code === 111) {
        return {
          ...cmd,
          parameters: [...(cmd.parameters || [])],
          _hasElse: this.branchHasElse(list, i),
        }
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
      return countReplaceSpan(list, i)
    },
    /** 选区按 getCommandSpan 扩并合并 */
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
        // 指令选择窗保持打开，参数窗叠在上面
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
    branchHasElse(list, headIndex) {
      const head = list[headIndex]
      if (!head) return false
      const indent = head.indent || 0
      const end = this.findBranchEnd(list, headIndex)
      if (end < 0) return false
      for (let i = headIndex + 1; i < end; i++) {
        if ((list[i].indent || 0) === indent && list[i].code === 411) return true
      }
      return false
    },
    findBranchEnd(list, headIndex) {
      const head = list[headIndex]
      if (!head) return -1
      const indent = head.indent || 0
      let depth = 0
      for (let i = headIndex + 1; i < list.length; i++) {
        const c = list[i]
        if ((c.indent || 0) < indent) return -1
        if ((c.indent || 0) !== indent) continue
        if (c.code === 111) depth++
        else if (c.code === 412) {
          if (depth === 0) return i
          depth--
        }
      }
      return -1
    },
    syncElseBranch(headIndex, want) {
      const list = this.list
      const head = list[headIndex]
      if (!head || head.code !== 111) return
      const indent = head.indent || 0
      const end = this.findBranchEnd(list, headIndex)
      if (end < 0) return
      let elseAt = -1
      for (let i = headIndex + 1; i < end; i++) {
        if ((list[i].indent || 0) === indent && list[i].code === 411) {
          elseAt = i
          break
        }
      }
      if (want && elseAt < 0) {
        list.splice(end, 0,
          { code: 411, indent, parameters: [] },
          { code: 0, indent: indent + 1, parameters: [] })
        this.emitList()
      } else if (!want && elseAt >= 0) {
        list.splice(elseAt, end - elseAt)
        this.emitList()
      }
    },
    onParamConfirm(commands) {
      this._paramConfirmed = true
      let cmds = commands || []
      let elseBranch
      if (this.paramReplace && cmds[0] && cmds[0].code === 111 && cmds[0].elseBranch != null) {
        elseBranch = !!cmds[0].elseBranch
        const c = cmds[0]
        cmds = [{ code: 111, indent: c.indent, parameters: c.parameters }]
      }
      const headAt = this.paramInsertIndex
      this.insertCommands(cmds, headAt, this.paramReplace, this.paramReplaceCount)
      if (elseBranch != null) this.syncElseBranch(headAt, elseBranch)
      this.paramVisible = false
      this.cmdSelectVisible = false
      this.paramFromInsert = false
    },
    insertIndex() {
      const list = this.list
      const span = getCommandSpan(list, this.focusIndex)
      let i = span.start
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
      this.setSingleSelection(idx)
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
  background: #fff;
  outline: none;
  user-select: none;
}
.ev-cmd-list.is-selectable {
  user-select: text;
}
.ev-json-bar {
  margin-top: 6px;
}
.ev-cmd-list:focus {
  border-color: #2a5db0;
}
.ev-cmd-line {
  font-family: 'Microsoft YaHei UI', 'Segoe UI', sans-serif;
  font-size: 13px;
  padding: 1px 8px;
  white-space: pre;
  cursor: default;
  color: #222;
  line-height: 1.45;
}
.ev-cmd-line.zebra {
  background: #f0f5fa;
}
.ev-cmd-line.empty {
  min-height: 1.45em;
  color: transparent;
}
.ev-mark {
  display: inline-block;
  width: 1.2em;
  text-align: center;
  flex-shrink: 0;
}
/* 按指令选择窗分类整组同色 */
.ev-cmd-line.color-info,
.ev-cmd-line.color-info .ev-mark,
.ev-cmd-line.color-info .ev-label,
.ev-cmd-line.color-info .ev-body { color: #1a6b3c; }
.ev-cmd-line.color-progress,
.ev-cmd-line.color-progress .ev-mark,
.ev-cmd-line.color-progress .ev-label,
.ev-cmd-line.color-progress .ev-body { color: #c0392b; }
.ev-cmd-line.color-flow,
.ev-cmd-line.color-flow .ev-mark,
.ev-cmd-line.color-flow .ev-label,
.ev-cmd-line.color-flow .ev-body { color: #2a5db0; }
.ev-cmd-line.color-party,
.ev-cmd-line.color-party .ev-mark,
.ev-cmd-line.color-party .ev-label,
.ev-cmd-line.color-party .ev-body { color: #0d7377; }
.ev-cmd-line.color-actor,
.ev-cmd-line.color-actor .ev-mark,
.ev-cmd-line.color-actor .ev-label,
.ev-cmd-line.color-actor .ev-body { color: #e67e22; }
.ev-cmd-line.color-move,
.ev-cmd-line.color-move .ev-mark,
.ev-cmd-line.color-move .ev-label,
.ev-cmd-line.color-move .ev-body { color: #8b3a2a; }
.ev-cmd-line.color-character,
.ev-cmd-line.color-character .ev-mark,
.ev-cmd-line.color-character .ev-label,
.ev-cmd-line.color-character .ev-body { color: #a0522d; }
.ev-cmd-line.color-picture,
.ev-cmd-line.color-picture .ev-mark,
.ev-cmd-line.color-picture .ev-label,
.ev-cmd-line.color-picture .ev-body { color: #7a3e9d; }
.ev-cmd-line.color-screen,
.ev-cmd-line.color-screen .ev-mark,
.ev-cmd-line.color-screen .ev-label,
.ev-cmd-line.color-screen .ev-body { color: #006d77; }
.ev-cmd-line.color-audio,
.ev-cmd-line.color-audio .ev-mark,
.ev-cmd-line.color-audio .ev-label,
.ev-cmd-line.color-audio .ev-body { color: #9c2d70; }
.ev-cmd-line.color-scene,
.ev-cmd-line.color-scene .ev-mark,
.ev-cmd-line.color-scene .ev-label,
.ev-cmd-line.color-scene .ev-body { color: #3d5a80; }
.ev-cmd-line.color-system,
.ev-cmd-line.color-system .ev-mark,
.ev-cmd-line.color-system .ev-label,
.ev-cmd-line.color-system .ev-body { color: #c2185b; }
.ev-cmd-line.color-map,
.ev-cmd-line.color-map .ev-mark,
.ev-cmd-line.color-map .ev-label,
.ev-cmd-line.color-map .ev-body { color: #2b6e4f; }
.ev-cmd-line.color-battle,
.ev-cmd-line.color-battle .ev-mark,
.ev-cmd-line.color-battle .ev-label,
.ev-cmd-line.color-battle .ev-body { color: #9b2226; }
.ev-cmd-line.color-script .ev-mark,
.ev-cmd-line.color-script .ev-label { color: #7b2d8e; }
.ev-cmd-line.color-script .ev-body { color: #6b7280; }
.ev-script-pad {
  visibility: hidden;
  white-space: pre;
}
.ev-cmd-line.color-comment,
.ev-cmd-line.color-comment .ev-mark,
.ev-cmd-line.color-comment .ev-label,
.ev-cmd-line.color-comment .ev-body { color: #6a994e; }
.ev-cmd-line.color-end,
.ev-cmd-line.color-end .ev-mark { color: #888; }
.ev-note {
  color: #909399;
}
.ev-cmd-line.selected .ev-body,
.ev-cmd-line.selected[class*='color-'],
.ev-cmd-line.selected[class*='color-'] .ev-mark,
.ev-cmd-line.selected[class*='color-'] .ev-label,
.ev-cmd-line.selected[class*='color-'] .ev-body {
  background: #2a5db0;
  color: #fff !important;
}
.ev-cmd-line.focus:not(.selected) {
  box-shadow: inset 2px 0 0 #2a5db0;
}
.ev-json {
  margin-top: 6px;
}
.ev-json-tree {
  max-height: 220px;
  overflow: auto;
  border: 1px solid var(--app-border, #ddd);
  padding: 6px;
  margin-bottom: 8px;
  background: #fafafa;
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
