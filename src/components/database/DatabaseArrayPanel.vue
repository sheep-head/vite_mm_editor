<template>
  <div class="db-panel">
    <aside class="db-list">
      <el-input
        v-model="searchWord"
        size="small"
        clearable
        placeholder="搜索 ID / 名称"
        class="db-search" />
      <el-scrollbar class="db-list-scroll" @scroll="closeListMenu">
        <ul>
          <li
            v-for="item in visibleList"
            :key="item.id"
            tabindex="0"
            data-editor-list-item
            :class="{ active: current && current.id === item.id }"
            @click="onListClick(item, $event)"
            @contextmenu.prevent.stop="onListCtx(item, $event)">
            {{ padId(item.id) }}:{{ item.name || '(空)' }}
          </li>
        </ul>
      </el-scrollbar>
      <div class="db-list-foot">
        <el-button size="small" class="max-btn" @click="changeMax">更改最大值…</el-button>
      </div>
    </aside>

    <popup-context-menu v-model:visible="listMenu.visible" :x="listMenu.x" :y="listMenu.y">
      <template #default="{ action }">
        <li @click="action(() => $clearItem())">清空</li>
        <li @click="action(() => $onCopy())">复制</li>
        <li @click="action(() => $onPaste())">粘贴</li>
      </template>
    </popup-context-menu>

    <main class="db-form" v-if="current && current.id">
      <actor-editor-panel v-if="editor === 'actors'" v-model="current" />
      <class-editor-panel v-else-if="editor === 'classes'" v-model="current" />
      <skill-editor-panel v-else-if="editor === 'skills'" v-model="current" />
      <item-editor-panel v-else-if="editor === 'items'" v-model="current" />
      <weapon-editor-panel v-else-if="editor === 'weapons'" v-model="current" />
      <armor-editor-panel v-else-if="editor === 'armors'" v-model="current" />
      <enemy-editor-panel v-else-if="editor === 'enemies'" v-model="current" />
      <troop-editor-panel v-else-if="editor === 'troops'" v-model="current" />
      <state-editor-panel v-else-if="editor === 'states'" v-model="current" />
      <animation-editor-panel v-else-if="editor === 'animations'" v-model="current" />
      <tileset-editor-panel v-else-if="editor === 'tilesets'" v-model="current" />
      <common-event-editor-panel v-else-if="editor === 'commonEvents'" v-model="current" />
      <template v-else>
        <el-form label-width="88px" size="small" @submit.prevent>
          <el-form-item
            v-for="field in fields"
            :key="field.key"
            :label="field.label"
            :class="{
              'db-cmd-list-item':
                field.type === 'eventCommandList' || field.type === 'animationEditor',
            }">
            <el-input
              v-if="field.type === 'text' || !field.type"
              v-model="current[field.key]"
              :type="field.inputType || 'text'" />
            <el-input-number
              v-else-if="field.type === 'number'"
              v-model="current[field.key]"
              :controls="false"
              class="db-num" />
            <el-switch v-else-if="field.type === 'boolean'" v-model="current[field.key]" />
            <el-input
              v-else-if="field.type === 'textarea'"
              v-model="current[field.key]"
              type="textarea"
              :rows="field.rows || 3" />
            <el-input
              v-else-if="field.type === 'json'"
              :model-value="jsonText(field.key)"
              type="textarea"
              :rows="field.rows || 8"
              @update:model-value="(v) => setJson(field.key, v)" />
            <event-command-list-editor
              v-else-if="field.type === 'eventCommandList'"
              v-model="current[field.key]"
              :show-title="false"
              class="db-cmd-list" />
            <div v-else-if="field.type === 'characterSheet'" class="db-sheet-field">
              <el-input v-model="current[field.key]" style="width: 140px" />
              <el-input-number
                v-if="field.indexKey"
                v-model="current[field.indexKey]"
                :min="0"
                :max="7"
                :controls="false"
                class="db-num-sm" />
              <el-button size="small" @click="openSheetPicker(field)">选择…</el-button>
            </div>
            <div v-else-if="field.type === 'faceSheet'" class="db-sheet-field">
              <el-input v-model="current[field.key]" style="width: 140px" />
              <el-input-number
                v-if="field.indexKey"
                v-model="current[field.indexKey]"
                :min="0"
                :max="7"
                :controls="false"
                class="db-num-sm" />
              <el-button size="small" @click="openSheetPicker(field)">选择…</el-button>
            </div>
            <div v-else-if="field.type === 'battlerImage'" class="db-sheet-field">
              <el-input v-model="current[field.key]" style="width: 160px" />
              <el-button size="small" @click="openSheetPicker(field)">选择…</el-button>
            </div>
            <animation-editor-panel
              v-else-if="field.type === 'animationEditor'"
              v-model="current"
              class="db-anim-editor" />
          </el-form-item>
        </el-form>

        <character-sheet-picker-dialog
          v-model="charPickerVisible"
          :model-name="pickerName"
          :model-index="pickerIndex"
          @confirm="onCharPicked" />
        <face-sheet-picker-dialog
          v-model="facePickerVisible"
          :model-name="pickerName"
          :model-index="pickerIndex"
          @confirm="onFacePicked" />
        <battler-picker-dialog
          v-model="battlerPickerVisible"
          :folder="battlerFolder"
          :model-name="pickerName"
          :model-hue="pickerHue"
          :show-hue="battlerShowHue"
          @confirm="onBattlerPicked" />
      </template>
    </main>
    <main class="db-form db-empty" v-else>请选择左侧条目</main>
  </div>
</template>

<script>
import DataManager from '@/utils/DataManager'
import ShortcutManager from '@/utils/ShortcutManager'
import EventCommandListEditor from '@/components/map/EventCommandListEditor.vue'
import CharacterSheetPickerDialog from '@/components/map/pickers/CharacterSheetPickerDialog.vue'
import FaceSheetPickerDialog from '@/components/map/pickers/FaceSheetPickerDialog.vue'
import BattlerPickerDialog from '@/components/map/pickers/BattlerPickerDialog.vue'
import PopupContextMenu from '@/components/shared/PopupContextMenu.vue'
import AnimationEditorPanel from './AnimationEditorPanel.vue'
import ActorEditorPanel from './ActorEditorPanel.vue'
import ClassEditorPanel from './ClassEditorPanel.vue'
import SkillEditorPanel from './SkillEditorPanel.vue'
import ItemEditorPanel from './ItemEditorPanel.vue'
import WeaponEditorPanel from './WeaponEditorPanel.vue'
import ArmorEditorPanel from './ArmorEditorPanel.vue'
import EnemyEditorPanel from './EnemyEditorPanel.vue'
import TroopEditorPanel from './TroopEditorPanel.vue'
import StateEditorPanel from './StateEditorPanel.vue'
import TilesetEditorPanel from './TilesetEditorPanel.vue'
import CommonEventEditorPanel from './CommonEventEditorPanel.vue'
import { defaultByFileName, normalizeByEditor } from './shared/dbDefaults'

export default {
  name: 'DatabaseArrayPanel',
  components: {
    EventCommandListEditor,
    CharacterSheetPickerDialog,
    FaceSheetPickerDialog,
    BattlerPickerDialog,
    PopupContextMenu,
    AnimationEditorPanel,
    ActorEditorPanel,
    ClassEditorPanel,
    SkillEditorPanel,
    ItemEditorPanel,
    WeaponEditorPanel,
    ArmorEditorPanel,
    EnemyEditorPanel,
    TroopEditorPanel,
    StateEditorPanel,
    TilesetEditorPanel,
    CommonEventEditorPanel,
  },
  props: {
    fileName: { type: String, required: true },
    fields: { type: Array, default: () => [] },
    /** actors | classes | … | animations | '' */
    editor: { type: String, default: '' },
    active: { type: Boolean, default: true },
  },
  emits: ['dirty-change'],
  data() {
    return {
      dataList: [],
      current: null,
      searchWord: '',
      dirty: false,
      jsonErrors: {},
      _watchStop: null,
      charPickerVisible: false,
      facePickerVisible: false,
      battlerPickerVisible: false,
      pickerField: null,
      pickerName: '',
      pickerIndex: 0,
      pickerHue: 0,
      battlerFolder: 'enemies',
      battlerShowHue: true,
      listMenu: { visible: false, x: 0, y: 0 },
    }
  },
  beforeCreate() {
    ShortcutManager.install(this)
  },
  beforeUnmount() {
    ShortcutManager.uninstall(this)
    this.clearWatch()
  },
  computed: {
    visibleList() {
      const q = String(this.searchWord || '').trim().toLowerCase()
      return (this.dataList || []).filter((item) => {
        if (!item || !(item.id > 0)) return false
        if (!q) return true
        return (
          String(item.id).includes(q) ||
          String(item.name || '').toLowerCase().includes(q)
        )
      })
    },
  },
  watch: {
    fileName: {
      immediate: true,
      handler() {
        this.load()
      },
    },
    dirty(v) {
      this.$emit('dirty-change', v)
    },
  },
  methods: {
    padId(id) {
      return String(id).padStart(4, '0')
    },
    clearWatch() {
      if (this._watchStop) {
        this._watchStop()
        this._watchStop = null
      }
    },
    closeListMenu() {
      this.listMenu.visible = false
    },
    onListClick(item, e) {
      this.selectItem(item)
      if (e && e.currentTarget && e.currentTarget.focus) e.currentTarget.focus()
    },
    onListCtx(item, e) {
      this.selectItem(item)
      if (e && e.currentTarget && e.currentTarget.focus) e.currentTarget.focus()
      this.listMenu = { visible: true, x: e.clientX, y: e.clientY }
    },
    visibleIndexOfCurrent() {
      if (!this.current) return -1
      return this.visibleList.findIndex((x) => x && x.id === this.current.id)
    },
    $prevItem() {
      const i = this.visibleIndexOfCurrent()
      if (i > 0) this.selectItem(this.visibleList[i - 1])
    },
    $nextItem() {
      const i = this.visibleIndexOfCurrent()
      if (i >= 0 && i < this.visibleList.length - 1) this.selectItem(this.visibleList[i + 1])
    },
    $clearItem() {
      if (!this.current || !(this.current.id > 0)) return
      const id = this.current.id
      const blank = defaultByFileName(this.fileName, id)
      const idx = this.dataList.findIndex((x) => x && x.id === id)
      if (idx < 0) return
      this.dataList.splice(idx, 1, blank)
      this.dirty = true
      this.selectItem(this.dataList[idx], true)
    },
    $onDelete() {
      this.$clearItem()
    },
    $onCopy() {
      if (!this.current || !(this.current.id > 0)) return
      this.$clipboard.set(
        JSON.stringify({ dataType: this.fileName, data: this.current }),
      )
      this.$message.success('复制成功')
    },
    $onPaste() {
      try {
        const text = this.$clipboard.get()
        if (!text || !this.current || !(this.current.id > 0)) return
        const item = JSON.parse(text)
        if (item.dataType !== this.fileName) {
          this.$message.error('粘贴失败,粘贴内容与当前内容类型不匹配')
          return
        }
        if (!(item.data && item.data.id > 0)) return
        const id = this.current.id
        const idx = this.dataList.findIndex((x) => x && x.id === id)
        if (idx < 0) return
        const next = JSON.parse(JSON.stringify(item.data))
        next.id = id
        this.dataList.splice(idx, 1, next)
        this.dirty = true
        this.selectItem(this.dataList[idx], true)
        this.$message.success('粘贴成功')
      } catch (e) {
        console.log(e)
        this.$message.error('粘贴失败,无法解析粘贴内容')
      }
    },
    $onSave() {
      this.save()
    },
    load() {
      this.clearWatch()
      const raw = DataManager.$loadDataSync(this.fileName, false, false)
      if (!Array.isArray(raw)) {
        this.dataList = []
        this.current = null
        this.dirty = false
        this.$message.error(`${this.fileName} 加载失败或不是数组`)
        return
      }
      this.dataList = JSON.parse(JSON.stringify(raw))
      this.dirty = false
      const first = this.dataList.find((x) => x && x.id > 0)
      this.selectItem(first || null, false)
    },
    selectItem(item, markDirtyWatch = true) {
      this.clearWatch()
      this.current = item
      this.jsonErrors = {}
      this.normalizeCommandLists(item)
      if (item && this.editor) normalizeByEditor(this.editor, item)
      if (item && markDirtyWatch) {
        this._watchStop = this.$watch(
          'current',
          () => {
            this.dirty = true
          },
          { deep: true }
        )
      }
    },
    normalizeCommandLists(item) {
      if (!item) return
      for (const field of this.fields || []) {
        if (field.type !== 'eventCommandList') continue
        if (!Array.isArray(item[field.key])) {
          item[field.key] = [{ code: 0, indent: 0, parameters: [] }]
        }
      }
    },
    changeMax() {
      const curMax = Math.max(0, (this.dataList || []).length - 1)
      const input = window.prompt('更改最大值（有效条目数，不含 index 0）', String(curMax))
      if (input == null) return
      const next = parseInt(input, 10)
      if (!Number.isFinite(next) || next < 1) {
        this.$message.warning('请输入 ≥ 1 的整数')
        return
      }
      if (next === curMax) return
      if (next < curMax) {
        if (!window.confirm(`将删除 ID ${next + 1}～${curMax} 的条目，继续？`)) return
        this.dataList.length = next + 1
      } else {
        while (this.dataList.length <= next) {
          const id = this.dataList.length
          this.dataList.push(defaultByFileName(this.fileName, id))
        }
      }
      // ensure index 0 is null
      if (this.dataList[0] != null) this.dataList[0] = null
      this.dirty = true
      const keep = this.current && this.current.id <= next ? this.current : this.dataList.find((x) => x && x.id > 0)
      this.selectItem(keep || null, true)
      this.$message.success(`最大值已设为 ${next}`)
    },
    jsonText(key) {
      try {
        return JSON.stringify(this.current[key], null, 2)
      } catch (e) {
        return ''
      }
    },
    setJson(key, text) {
      try {
        this.current[key] = JSON.parse(text)
        delete this.jsonErrors[key]
        this.dirty = true
      } catch (e) {
        this.jsonErrors[key] = e.message
        this.$message.warning(`${key} JSON 无效，未写入`)
      }
    },
    openSheetPicker(field) {
      if (!this.current || !field) return
      this.pickerField = field
      this.pickerName = this.current[field.key] || ''
      this.pickerIndex = field.indexKey ? this.current[field.indexKey] || 0 : 0
      this.pickerHue = field.hueKey ? this.current[field.hueKey] || 0 : 0
      if (field.type === 'characterSheet') this.charPickerVisible = true
      else if (field.type === 'faceSheet') this.facePickerVisible = true
      else if (field.type === 'battlerImage') {
        this.battlerFolder = field.folder || 'enemies'
        this.battlerShowHue = field.showHue !== false
        this.battlerPickerVisible = true
      }
    },
    onCharPicked({ name, index }) {
      if (!this.current || !this.pickerField) return
      this.current[this.pickerField.key] = name || ''
      if (this.pickerField.indexKey) this.current[this.pickerField.indexKey] = index || 0
      this.dirty = true
    },
    onFacePicked({ name, index }) {
      if (!this.current || !this.pickerField) return
      this.current[this.pickerField.key] = name || ''
      if (this.pickerField.indexKey) this.current[this.pickerField.indexKey] = index || 0
      this.dirty = true
    },
    onBattlerPicked({ name, hue }) {
      if (!this.current || !this.pickerField) return
      this.current[this.pickerField.key] = name || ''
      if (this.pickerField.hueKey) this.current[this.pickerField.hueKey] = hue || 0
      this.dirty = true
    },
    save() {
      if (Object.keys(this.jsonErrors).length) {
        this.$message.error('存在无效 JSON，请先修正')
        return false
      }
      const ok = DataManager.$saveDataSync(this.fileName, this.dataList)
      if (ok) {
        this.dirty = false
        this.$message.success(`${this.fileName} 已保存`)
      } else {
        this.$message.error(`${this.fileName} 保存失败`)
      }
      return ok
    },
    isDirty() {
      return this.dirty
    },
    reload() {
      this.load()
    },
  },
}
</script>

<style scoped>
.db-panel {
  display: flex;
  height: 100%;
  min-height: 0;
}
.db-list {
  width: 220px;
  flex-shrink: 0;
  border-right: 1px solid var(--app-border);
  display: flex;
  flex-direction: column;
  background: var(--app-surface-2);
}
.db-search {
  padding: 8px;
  flex-shrink: 0;
}
.db-list-scroll {
  flex: 1;
  min-height: 0;
}
.db-list-foot {
  padding: 8px;
  border-top: 1px solid var(--app-border);
  flex-shrink: 0;
}
.max-btn {
  width: 100%;
}
.db-list ul {
  list-style: none;
  margin: 0;
  padding: 0 0 8px;
}
.db-list li {
  padding: 4px 10px;
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.db-list li:hover {
  background: var(--app-hover-bg);
}
.db-list li.active {
  color: var(--app-active-color);
  background: var(--app-hover-bg);
}
.db-form {
  flex: 1;
  min-width: 0;
  padding: 12px 16px;
  overflow: auto;
}
.db-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--app-text-muted);
}
.db-num {
  width: 160px;
}
.db-cmd-list-item {
  display: block;
}
.db-cmd-list-item :deep(.el-form-item__content) {
  display: block;
  width: 100%;
}
.db-cmd-list {
  width: 100%;
  min-height: 360px;
}
.db-cmd-list :deep(.ev-cmd-list) {
  max-height: 52vh;
}
.db-sheet-field {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}
.db-num-sm {
  width: 72px;
}
.db-anim-editor {
  width: 100%;
}
</style>
