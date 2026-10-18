<template>
  <el-dialog
    :model-value="modelValue"
    :title="dialogTitle"
    width="1180px"
    :before-close="onBeforeClose"
    top="4vh"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    class="event-editor-dialog"
    @update:model-value="onVisible">
    <div v-if="draft" class="ev-body" :class="{ 'is-ref': isRefMode }">
      <div v-if="isRefMode" class="ev-ref-banner">
        <span>
          这是引用事件（Map{{ String(refMode.mapId).padStart(3, '0') }} / EV{{
            String(refMode.refId).padStart(3, '0')
          }}）
        </span>
        <el-button size="small" type="primary" @click="$emit('jump-to-ref')">
          跳转到模板事件
        </el-button>
      </div>

      <div class="ev-top">
        <el-form inline size="small" label-width="48px" :disabled="isRefMode" class="ev-meta">
          <el-form-item label="名称">
            <el-input v-model="draft.name" style="width: 120px" />
          </el-form-item>
          <el-form-item label="备注">
            <el-input v-model="draft.note" style="width: 140px" />
          </el-form-item>
        </el-form>
        <div v-if="!isRefMode" class="ev-page-ops">
          <el-button size="small" @click="addPage">新建事件页</el-button>
          <el-button size="small" @click="copyPage">复制事件页</el-button>
          <el-button size="small" :disabled="!pageClipboard" @click="pastePage">粘贴事件页</el-button>
          <el-button size="small" :disabled="draft.pages.length <= 1" @click="removePage">删除事件页</el-button>
          <el-button size="small" @click="clearPage">清空事件页</el-button>
        </div>
      </div>

      <div class="ev-page-tabs">
        <button
          v-for="(page, idx) in draft.pages"
          :key="idx"
          type="button"
          class="ev-page-tab"
          :class="{ active: pageIndex === idx }"
          @click="pageIndex = idx">
          {{ idx + 1 }}
        </button>
      </div>

      <div v-if="currentPage" class="ev-main">
        <aside class="ev-left">
          <fieldset class="ev-box">
            <legend>出现条件</legend>
            <el-form size="small" label-width="0" :disabled="isRefMode" class="ev-cond">
              <div class="ev-cond-row">
                <el-checkbox v-model="currentPage.conditions.switch1Valid">开关</el-checkbox>
                <id-name-field
                  v-model="currentPage.conditions.switch1Id"
                  type="switch"
                  width="160px"
                  :disabled="!currentPage.conditions.switch1Valid" />
              </div>
              <div class="ev-cond-row">
                <el-checkbox v-model="currentPage.conditions.switch2Valid">开关</el-checkbox>
                <id-name-field
                  v-model="currentPage.conditions.switch2Id"
                  type="switch"
                  width="160px"
                  :disabled="!currentPage.conditions.switch2Valid" />
              </div>
              <div class="ev-cond-row">
                <el-checkbox v-model="currentPage.conditions.variableValid">变量</el-checkbox>
                <id-name-field
                  v-model="currentPage.conditions.variableId"
                  type="variable"
                  width="160px"
                  :disabled="!currentPage.conditions.variableValid" />
                <span>≥</span>
                <el-input-number
                  v-model="currentPage.conditions.variableValue"
                  :disabled="!currentPage.conditions.variableValid"
                  controls-position="right"
                  size="small" />
              </div>
              <div class="ev-cond-row">
                <el-checkbox v-model="currentPage.conditions.selfSwitchValid">独立开关</el-checkbox>
                <el-select
                  v-model="currentPage.conditions.selfSwitchCh"
                  :disabled="!currentPage.conditions.selfSwitchValid"
                  style="width: 72px">
                  <el-option v-for="ch in ['A', 'B', 'C', 'D']" :key="ch" :label="ch" :value="ch" />
                </el-select>
              </div>
              <div class="ev-cond-row">
                <el-checkbox v-model="currentPage.conditions.itemValid">物品</el-checkbox>
                <el-input-number
                  v-model="currentPage.conditions.itemId"
                  :min="1"
                  :disabled="!currentPage.conditions.itemValid"
                  controls-position="right"
                  size="small" />
                <el-button
                  size="small"
                  :disabled="!currentPage.conditions.itemValid"
                  @click="openPicker('item', 'itemId')">
                  ...
                </el-button>
              </div>
              <div class="ev-cond-row">
                <el-checkbox v-model="currentPage.conditions.actorValid">角色</el-checkbox>
                <el-input-number
                  v-model="currentPage.conditions.actorId"
                  :min="1"
                  :disabled="!currentPage.conditions.actorValid"
                  controls-position="right"
                  size="small" />
                <el-button
                  size="small"
                  :disabled="!currentPage.conditions.actorValid"
                  @click="openPicker('actor', 'actorId')">
                  ...
                </el-button>
              </div>
            </el-form>
          </fieldset>

          <fieldset class="ev-box ev-image-box">
            <legend>图像</legend>
            <div class="ev-char-preview" title="点击编辑图像" @click="!isRefMode && openCharacterPicker()">
              <canvas ref="charCanvas" width="96" height="96" />
            </div>
          </fieldset>

          <fieldset class="ev-box">
            <legend>自主移动</legend>
            <el-form size="small" label-width="72px" :disabled="isRefMode">
              <el-form-item label="类型">
                <el-select v-model="currentPage.moveType" style="width: 120px">
                  <el-option v-for="o in moveTypeOptions" :key="o.value" :label="o.label" :value="o.value" />
                </el-select>
                <el-button
                  size="small"
                  :disabled="currentPage.moveType !== 3"
                  class="ml"
                  @click="openMoveRoute">
                  路线...
                </el-button>
              </el-form-item>
              <el-form-item label="移动速度">
                <el-select v-model="currentPage.moveSpeed" style="width: 140px">
                  <el-option v-for="o in moveSpeedOptions" :key="o.value" :label="o.label" :value="o.value" />
                </el-select>
              </el-form-item>
              <el-form-item label="移动频率">
                <el-select v-model="currentPage.moveFrequency" style="width: 140px">
                  <el-option v-for="o in moveFreqOptions" :key="o.value" :label="o.label" :value="o.value" />
                </el-select>
              </el-form-item>
            </el-form>
          </fieldset>

          <fieldset class="ev-box">
            <legend>选项</legend>
            <el-checkbox v-model="currentPage.walkAnime" :disabled="isRefMode">步行动画</el-checkbox>
            <el-checkbox v-model="currentPage.stepAnime" :disabled="isRefMode">踏步动画</el-checkbox>
            <el-checkbox v-model="currentPage.directionFix" :disabled="isRefMode">固定朝向</el-checkbox>
            <el-checkbox v-model="currentPage.through" :disabled="isRefMode">穿透</el-checkbox>
          </fieldset>

          <el-form size="small" label-width="72px" :disabled="isRefMode" class="ev-pri">
            <el-form-item label="优先级">
              <el-select v-model="currentPage.priorityType" style="width: 140px">
                <el-option v-for="o in priorityOptions" :key="o.value" :label="o.label" :value="o.value" />
              </el-select>
            </el-form-item>
            <el-form-item label="触发条件">
              <el-select v-model="currentPage.trigger" style="width: 140px">
                <el-option v-for="o in triggerOptions" :key="o.value" :label="o.label" :value="o.value" />
              </el-select>
            </el-form-item>
          </el-form>
        </aside>

        <section class="ev-right">
          <event-command-list-editor
            v-if="currentPage"
            v-model="currentPage.list"
            :readonly="isRefMode" />
        </section>
      </div>
    </div>

    <template #footer>
      <el-button @click="onCancel">{{ isRefMode ? '关闭' : '取消' }}</el-button>
      <el-button v-if="!isRefMode" @click="apply">应用</el-button>
      <el-button v-if="!isRefMode" type="primary" @click="confirm">确定</el-button>
    </template>

    <move-route-editor
      v-model="moveRouteVisible"
      :show-target="false"
      :show-wait="false"
      :route="currentPage && currentPage.moveRoute"
      @confirm="onMoveRouteConfirm" />

    <id-name-picker-dialog
      v-model="pickerVisible"
      :type="pickerType"
      :model-id="pickerModelId"
      @confirm="onPickerConfirm" />

    <character-sheet-picker-dialog
      v-model="charPickerVisible"
      pick-frame
      :model-name="currentPage && currentPage.image ? currentPage.image.characterName : ''"
      :model-index="currentPage && currentPage.image ? currentPage.image.characterIndex : 0"
      :model-pattern="currentPage && currentPage.image ? currentPage.image.pattern : 1"
      :model-direction="currentPage && currentPage.image ? currentPage.image.direction : 2"
      :model-tile-id="currentPage && currentPage.image ? currentPage.image.tileId : 0"
      @confirm="onCharacterPicked" />

    <el-dialog
      v-model="imageEditVisible"
      title="图像选项"
      width="360px"
      append-to-body
      :close-on-click-modal="false"
      @closed="paintCharPreview">
      <el-form v-if="currentPage" size="small" label-width="72px">
        <el-form-item label="方向">
          <el-select v-model="currentPage.image.direction" style="width: 100px">
            <el-option :value="2" label="下" />
            <el-option :value="4" label="左" />
            <el-option :value="6" label="右" />
            <el-option :value="8" label="上" />
          </el-select>
        </el-form-item>
        <el-form-item label="图案">
          <el-input-number v-model="currentPage.image.pattern" :min="0" :max="2" />
        </el-form-item>
        <el-form-item>
          <el-button size="small" @click="charPickerVisible = true">更换行走图…</el-button>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button type="primary" @click="imageEditVisible = false">完成</el-button>
      </template>
    </el-dialog>
  </el-dialog>
</template>

<script>
import { ElMessage, ElMessageBox } from 'element-plus'
import DataManager from '@/utils/DataManager'
import { fs, path, isNw } from '@/utils/nw'
import { isBigCharacter, imageAbsPath, loadImageFile, tileIdToCell, TILE_PX } from '@/utils/imgAssets'
import {
  createEmptyPage,
  TRIGGER_OPTIONS,
  PRIORITY_OPTIONS,
  MOVE_TYPE_OPTIONS,
  MOVE_SPEED_OPTIONS,
  MOVE_FREQ_OPTIONS,
} from './eventDefaults'
import IdNamePickerDialog from './pickers/IdNamePickerDialog.vue'
import IdNameField from '@/components/database/shared/IdNameField.vue'
import CharacterSheetPickerDialog from './pickers/CharacterSheetPickerDialog.vue'
import EventCommandListEditor from './EventCommandListEditor.vue'
import MoveRouteEditor from './MoveRouteEditor.vue'

export default {
  name: 'EventEditorDialog',
  components: {
    IdNamePickerDialog,
    IdNameField,
    CharacterSheetPickerDialog,
    EventCommandListEditor,
    MoveRouteEditor,
  },
  props: {
    modelValue: { type: Boolean, default: false },
    event: { type: Object, default: null },
    refMode: { type: Object, default: null },
  },
  emits: ['update:modelValue', 'confirm', 'apply', 'jump-to-ref'],
  data() {
    return {
      draft: null,
      pageIndex: 0,
      pageClipboard: null,
      triggerOptions: TRIGGER_OPTIONS,
      priorityOptions: PRIORITY_OPTIONS,
      moveTypeOptions: MOVE_TYPE_OPTIONS,
      moveSpeedOptions: MOVE_SPEED_OPTIONS,
      moveFreqOptions: MOVE_FREQ_OPTIONS,
      pickerVisible: false,
      pickerType: 'switch',
      pickerField: '',
      imageEditVisible: false,
      charPickerVisible: false,
      moveRouteVisible: false,
      _charImg: null,
    }
  },
  computed: {
    isRefMode() {
      return !!(this.refMode && this.refMode.refId)
    },
    dialogTitle() {
      if (!this.draft) return '事件编辑器'
      if (this.isRefMode) {
        return `引用事件 · Map${String(this.refMode.mapId).padStart(3, '0')} EV${String(this.refMode.refId).padStart(3, '0')}`
      }
      return `ID:${String(this.draft.id).padStart(3, '0')} - 事件编辑器`
    },
    currentPage() {
      if (!this.draft || !this.draft.pages) return null
      return this.draft.pages[this.pageIndex] || null
    },
    pickerModelId() {
      if (!this.currentPage || !this.pickerField) return 1
      return this.currentPage.conditions[this.pickerField] || 1
    },
    workRoot() {
      try {
        return DataManager.$config && DataManager.$config.workSpace
      } catch (e) {
        return ''
      }
    },
  },
  watch: {
    modelValue(v) {
      if (v) this.resetDraft()
    },
    pageIndex() {
      this.$nextTick(() => this.paintCharPreview())
    },
    'currentPage.image': {
      deep: true,
      handler() {
        this.paintCharPreview()
      },
    },
  },
  methods: {
    resetDraft() {
      if (!this.event) {
        this.draft = null
        return
      }
      this.draft = JSON.parse(JSON.stringify(this.event))
      if (!Array.isArray(this.draft.pages) || !this.draft.pages.length) {
        this.draft.pages = [createEmptyPage()]
      }
      this.pageIndex = 0
      this._snapshot = JSON.stringify(this.draft)
      this._closing = false
      this.$nextTick(() => this.paintCharPreview())
    },
    addPage() {
      this.draft.pages.push(createEmptyPage())
      this.pageIndex = this.draft.pages.length - 1
    },
    copyPage() {
      this.pageClipboard = JSON.parse(JSON.stringify(this.currentPage))
      ElMessage.success('已复制事件页')
    },
    pastePage() {
      if (!this.pageClipboard) return
      this.draft.pages.splice(this.pageIndex + 1, 0, JSON.parse(JSON.stringify(this.pageClipboard)))
      this.pageIndex += 1
    },
    removePage() {
      if (this.draft.pages.length <= 1) return
      this.draft.pages.splice(this.pageIndex, 1)
      if (this.pageIndex >= this.draft.pages.length) this.pageIndex = this.draft.pages.length - 1
    },
    clearPage() {
      if (!window.confirm('清空当前事件页？')) return
      this.draft.pages[this.pageIndex] = createEmptyPage()
      this.paintCharPreview()
    },
    openPicker(type, field) {
      this.pickerType = type
      this.pickerField = field
      this.pickerVisible = true
    },
    onPickerConfirm(id) {
      if (this.currentPage && this.pickerField) {
        this.currentPage.conditions[this.pickerField] = id
      }
    },
    openCharacterPicker() {
      this.charPickerVisible = true
    },
    openMoveRoute() {
      if (!this.currentPage || this.currentPage.moveType !== 3 || this.isRefMode) return
      if (!this.currentPage.moveRoute) {
        this.currentPage.moveRoute = {
          list: [{ code: 0, parameters: [] }],
          repeat: true,
          skippable: false,
          wait: false,
        }
      }
      this.moveRouteVisible = true
    },
    onMoveRouteConfirm({ route }) {
      if (!this.currentPage || !route) return
      this.currentPage.moveRoute = route
    },
    onCharacterPicked({ name, index, pattern, direction, tileId }) {
      if (!this.currentPage || !this.currentPage.image) return
      const image = this.currentPage.image
      if (tileId > 0) {
        image.tileId = tileId
        image.characterName = ''
        image.characterIndex = 0
      } else {
        image.tileId = 0
        image.characterName = name || ''
        image.characterIndex = index || 0
        if (pattern != null) image.pattern = pattern
        if (direction != null) image.direction = direction
      }
      this.$nextTick(() => this.paintCharPreview())
    },
    isDirty() {
      if (!this.draft || this.isRefMode) return false
      return JSON.stringify(this.draft) !== this._snapshot
    },
    tryDismiss() {
      if (!this.isDirty()) return Promise.resolve(true)
      const ui = this.$store.getters.editorUi || {}
      if (ui.confirmDiscardEvent === false) return Promise.resolve(true)
      return ElMessageBox.confirm('放弃对这个事件的修改？', '事件编辑器', {
        confirmButtonText: '放弃',
        cancelButtonText: '继续编辑',
        type: 'warning',
      }).then(() => true).catch(() => false)
    },
    onBeforeClose(done) {
      this.tryDismiss().then((ok) => {
        if (ok) done()
      })
    },
    async onCancel() {
      if (await this.tryDismiss()) this.$emit('update:modelValue', false)
    },
    async paintCharPreview() {
      const canvas = this.$refs.charCanvas
      if (!canvas || !this.currentPage) return
      const ctx = canvas.getContext('2d')
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      // checkerboard
      const s = 8
      for (let y = 0; y < canvas.height; y += s) {
        for (let x = 0; x < canvas.width; x += s) {
          ctx.fillStyle = (x / s + y / s) % 2 === 0 ? '#ccc' : '#fff'
          ctx.fillRect(x, y, s, s)
        }
      }
      const imgData = this.currentPage.image
      if (imgData && imgData.tileId > 0) {
        await this.paintTilePreview(ctx, canvas, imgData.tileId)
        return
      }
      const name = imgData && imgData.characterName
      if (!name || !isNw || !fs || !path || !this.workRoot) return
      const file = path.join(this.workRoot, 'img', 'characters', name + '.png')
      if (!fs.existsSync(file)) return
      const img = await this.loadImage(file)
      if (!img) return
      const big = isBigCharacter(name)
      const cw = big ? img.width / 3 : img.width / 12
      const ch = big ? img.height / 4 : img.height / 8
      const index = imgData.characterIndex || 0
      const pattern = typeof imgData.pattern === 'number' ? imgData.pattern : 1
      const direction = imgData.direction || 2
      const col = big ? pattern : (index % 4) * 3 + pattern
      const row = big ? (direction - 2) / 2 : Math.floor(index / 4) * 4 + (direction - 2) / 2
      const sx = col * cw
      const sy = row * ch
      const scale = Math.min(canvas.width / cw, canvas.height / ch)
      const dw = cw * scale
      const dh = ch * scale
      ctx.drawImage(img, sx, sy, cw, ch, (canvas.width - dw) / 2, canvas.height - dh, dw, dh)
    },
    async paintTilePreview(ctx, canvas, tileId) {
      const mapId = this.$store.getters.selectedMapId
      if (!mapId) return
      const map = DataManager.$loadDataSync(`Map${String(mapId).padStart(3, '0')}`, false, false)
      const tilesets = DataManager.$loadDataSync('Tilesets', false, false) || []
      const ts = map && tilesets[map.tilesetId]
      const names = (ts && ts.tilesetNames) || []
      const set = tileId >= 768 ? 8 : tileId >= 512 ? 7 : tileId >= 256 ? 6 : 5
      const fileName = names[set]
      if (!fileName) return
      const img = await loadImageFile(imageAbsPath('tilesets', fileName))
      if (!img) return
      const cell = tileIdToCell(tileId)
      const sx = cell.col * TILE_PX
      const sy = cell.row * TILE_PX
      const scale = Math.min(canvas.width / TILE_PX, canvas.height / TILE_PX)
      const dw = TILE_PX * scale
      const dh = TILE_PX * scale
      ctx.drawImage(img, sx, sy, TILE_PX, TILE_PX, (canvas.width - dw) / 2, canvas.height - dh, dw, dh)
    },
    loadImage(file) {
      return new Promise((resolve) => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = () => {
          try {
            img.src = 'file:///' + file.replace(/\\/g, '/')
            img.onload = () => resolve(img)
            img.onerror = () => resolve(null)
          } catch (e) {
            resolve(null)
          }
        }
        img.src = file
      })
    },
    onVisible(v) {
      this.$emit('update:modelValue', v)
    },
    emitDraft(close) {
      if (this.isRefMode) return
      const payload = JSON.parse(JSON.stringify(this.draft))
      if (close) {
        this.$emit('confirm', payload)
        this.$emit('update:modelValue', false)
      } else {
        this.$emit('apply', payload)
      }
    },
    apply() {
      this.emitDraft(false)
      this._snapshot = JSON.stringify(this.draft)
    },
    confirm() {
      this.emitDraft(true)
    },
  },
}
</script>

<style scoped>
.ev-ref-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 12px;
  margin-bottom: 6px;
  font-size: 13px;
  color: #b88230;
  background: rgba(230, 162, 60, 0.12);
  border: 1px solid rgba(230, 162, 60, 0.45);
  border-radius: 4px;
}
.ev-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-height: 520px;
}
.ev-top {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 8px;
  min-width: 0;
}
.ev-meta {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  margin-bottom: 0;
}
.ev-meta :deep(.el-form-item) {
  margin-bottom: 0;
  margin-right: 8px;
}
.ev-page-ops {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}
.ev-page-ops :deep(.el-button) {
  padding: 5px 8px;
}
.ev-page-tabs {
  display: flex;
  gap: 2px;
  border-bottom: 1px solid var(--app-border);
}
.ev-page-tab {
  min-width: 36px;
  height: 28px;
  border: 1px solid var(--app-border);
  border-bottom: none;
  background: var(--app-surface-2);
  cursor: pointer;
  color: var(--app-text);
}
.ev-page-tab.active {
  background: var(--app-surface);
  color: var(--app-active-color);
  font-weight: 600;
}
.ev-main {
  display: flex;
  gap: 12px;
  min-height: 440px;
}
.ev-left {
  width: 300px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 62vh;
  overflow: auto;
}
.ev-right {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}
.ev-box {
  margin: 0;
  padding: 6px 8px 8px;
  border: 1px solid var(--app-border);
  border-radius: 4px;
}
.ev-box legend {
  padding: 0 4px;
  font-size: 12px;
  font-weight: 600;
  color: var(--app-text-muted);
}
.ev-cond-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  margin-bottom: 4px;
}
.ev-char-preview {
  width: 96px;
  height: 96px;
  margin: 0 auto;
  border: 1px solid var(--app-border);
  cursor: pointer;
}
.ev-image-box {
  text-align: center;
}
.ml {
  margin-left: 6px;
}
.ev-pri {
  padding: 0 4px;
}
</style>
