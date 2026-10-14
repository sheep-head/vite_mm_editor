<template>
  <el-dialog
    :model-value="modelValue"
    :title="dialogTitle"
    width="980px"
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
            <el-input v-model="draft.name" style="width: 160px" />
          </el-form-item>
          <el-form-item label="备注">
            <el-input v-model="draft.note" style="width: 220px" />
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
                <el-input-number
                  v-model="currentPage.conditions.switch1Id"
                  :min="1"
                  :disabled="!currentPage.conditions.switch1Valid"
                  controls-position="right"
                  size="small" />
                <el-button
                  size="small"
                  :disabled="!currentPage.conditions.switch1Valid"
                  @click="openPicker('switch', 'switch1Id')">
                  ...
                </el-button>
              </div>
              <div class="ev-cond-row">
                <el-checkbox v-model="currentPage.conditions.switch2Valid">开关</el-checkbox>
                <el-input-number
                  v-model="currentPage.conditions.switch2Id"
                  :min="1"
                  :disabled="!currentPage.conditions.switch2Valid"
                  controls-position="right"
                  size="small" />
                <el-button
                  size="small"
                  :disabled="!currentPage.conditions.switch2Valid"
                  @click="openPicker('switch', 'switch2Id')">
                  ...
                </el-button>
              </div>
              <div class="ev-cond-row">
                <el-checkbox v-model="currentPage.conditions.variableValid">变量</el-checkbox>
                <el-input-number
                  v-model="currentPage.conditions.variableId"
                  :min="1"
                  :disabled="!currentPage.conditions.variableValid"
                  controls-position="right"
                  size="small" />
                <el-button
                  size="small"
                  :disabled="!currentPage.conditions.variableValid"
                  @click="openPicker('variable', 'variableId')">
                  ...
                </el-button>
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
            <div class="ev-char-preview" title="点击编辑图像" @click="!isRefMode && (imageEditVisible = true)">
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
                <el-button size="small" :disabled="currentPage.moveType !== 3" class="ml">路线...</el-button>
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
      <el-button @click="onVisible(false)">{{ isRefMode ? '关闭' : '取消' }}</el-button>
      <el-button v-if="!isRefMode" @click="apply">应用</el-button>
      <el-button v-if="!isRefMode" type="primary" @click="confirm">确定</el-button>
    </template>

    <id-name-picker-dialog
      v-model="pickerVisible"
      :type="pickerType"
      :model-id="pickerModelId"
      @confirm="onPickerConfirm" />

    <el-dialog
      v-model="imageEditVisible"
      title="图像"
      width="400px"
      append-to-body
      :close-on-click-modal="false"
      @closed="paintCharPreview">
      <el-form v-if="currentPage" size="small" label-width="72px">
        <el-form-item label="文件">
          <el-input v-model="currentPage.image.characterName" placeholder="img/characters 文件名" />
        </el-form-item>
        <el-form-item label="索引">
          <el-input-number v-model="currentPage.image.characterIndex" :min="0" :max="7" />
        </el-form-item>
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
      </el-form>
      <template #footer>
        <el-button type="primary" @click="imageEditVisible = false">完成</el-button>
      </template>
    </el-dialog>
  </el-dialog>
</template>

<script>
import { ElMessage } from 'element-plus'
import DataManager from '@/utils/DataManager'
import { fs, path, isNw } from '@/utils/nw'
import {
  createEmptyPage,
  TRIGGER_OPTIONS,
  PRIORITY_OPTIONS,
  MOVE_TYPE_OPTIONS,
  MOVE_SPEED_OPTIONS,
  MOVE_FREQ_OPTIONS,
} from './eventDefaults'
import IdNamePickerDialog from './pickers/IdNamePickerDialog.vue'
import EventCommandListEditor from './EventCommandListEditor.vue'

export default {
  name: 'EventEditorDialog',
  components: { IdNamePickerDialog, EventCommandListEditor },
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
      const name = imgData && imgData.characterName
      if (!name || !isNw || !fs || !path || !this.workRoot) return
      const file = path.join(this.workRoot, 'img', 'characters', name + '.png')
      if (!fs.existsSync(file)) return
      const img = await this.loadImage(file)
      if (!img) return
      const big = name.startsWith('$') || name.startsWith('!$')
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
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.ev-page-ops {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
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
