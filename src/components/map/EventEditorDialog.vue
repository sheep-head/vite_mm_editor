<template>
  <el-dialog
    :model-value="modelValue"
    :title="dialogTitle"
    width="920px"
    top="6vh"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
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
      <div class="ev-meta">
        <el-form inline size="small" label-width="48px" :disabled="isRefMode">
          <el-form-item label="ID">
            <span class="ev-id">{{ draft.id }}</span>
          </el-form-item>
          <el-form-item label="名称">
            <el-input v-model="draft.name" style="width: 200px" :disabled="isRefMode" />
          </el-form-item>
          <el-form-item label="备注">
            <el-input v-model="draft.note" style="width: 280px" :disabled="isRefMode" />
          </el-form-item>
        </el-form>
      </div>

      <div class="ev-main">
        <aside class="ev-pages">
          <div class="ev-pages-title">事件页</div>
          <el-scrollbar class="ev-pages-scroll">
            <button
              v-for="(page, idx) in draft.pages"
              :key="idx"
              type="button"
              class="ev-page-item"
              :class="{ active: pageIndex === idx }"
              @click="pageIndex = idx">
              {{ idx + 1 }}
            </button>
          </el-scrollbar>
          <div v-if="!isRefMode" class="ev-pages-actions">
            <el-button size="small" @click="addPage">新建</el-button>
            <el-button size="small" :disabled="draft.pages.length <= 1" @click="copyPage">复制</el-button>
            <el-button size="small" :disabled="draft.pages.length <= 1" @click="removePage">删除</el-button>
            <el-button size="small" :disabled="pageIndex <= 0" @click="movePage(-1)">上移</el-button>
            <el-button size="small" :disabled="pageIndex >= draft.pages.length - 1" @click="movePage(1)">下移</el-button>
          </div>
        </aside>

        <section v-if="currentPage" class="ev-page-edit">
          <el-tabs v-model="tab">
            <el-tab-pane label="条件 / 图像 / 触发" name="main">
              <div class="ev-cols">
                <div class="ev-col">
                  <div class="ev-section-title">出现条件</div>
                  <el-form size="small" label-width="72px" :disabled="isRefMode">
                    <el-form-item>
                      <el-checkbox v-model="currentPage.conditions.switch1Valid">开关</el-checkbox>
                      <el-input-number
                        v-model="currentPage.conditions.switch1Id"
                        :min="1"
                        :disabled="!currentPage.conditions.switch1Valid"
                        size="small"
                        controls-position="right" />
                    </el-form-item>
                    <el-form-item>
                      <el-checkbox v-model="currentPage.conditions.switch2Valid">开关</el-checkbox>
                      <el-input-number
                        v-model="currentPage.conditions.switch2Id"
                        :min="1"
                        :disabled="!currentPage.conditions.switch2Valid"
                        size="small"
                        controls-position="right" />
                    </el-form-item>
                    <el-form-item>
                      <el-checkbox v-model="currentPage.conditions.variableValid">变量</el-checkbox>
                      <el-input-number
                        v-model="currentPage.conditions.variableId"
                        :min="1"
                        :disabled="!currentPage.conditions.variableValid"
                        size="small"
                        controls-position="right" />
                      ≥
                      <el-input-number
                        v-model="currentPage.conditions.variableValue"
                        :disabled="!currentPage.conditions.variableValid"
                        size="small"
                        controls-position="right" />
                    </el-form-item>
                    <el-form-item>
                      <el-checkbox v-model="currentPage.conditions.selfSwitchValid">独立开关</el-checkbox>
                      <el-select
                        v-model="currentPage.conditions.selfSwitchCh"
                        :disabled="!currentPage.conditions.selfSwitchValid"
                        style="width: 72px">
                        <el-option v-for="ch in ['A', 'B', 'C', 'D']" :key="ch" :label="ch" :value="ch" />
                      </el-select>
                    </el-form-item>
                    <el-form-item>
                      <el-checkbox v-model="currentPage.conditions.itemValid">物品</el-checkbox>
                      <el-input-number
                        v-model="currentPage.conditions.itemId"
                        :min="1"
                        :disabled="!currentPage.conditions.itemValid"
                        size="small"
                        controls-position="right" />
                    </el-form-item>
                    <el-form-item>
                      <el-checkbox v-model="currentPage.conditions.actorValid">角色</el-checkbox>
                      <el-input-number
                        v-model="currentPage.conditions.actorId"
                        :min="1"
                        :disabled="!currentPage.conditions.actorValid"
                        size="small"
                        controls-position="right" />
                    </el-form-item>
                  </el-form>
                </div>

                <div class="ev-col">
                  <div class="ev-section-title">图像</div>
                  <el-form size="small" label-width="72px" :disabled="isRefMode">
                    <el-form-item label="文件">
                      <el-input v-model="currentPage.image.characterName" placeholder="img/characters 文件名" />
                    </el-form-item>
                    <el-form-item label="索引">
                      <el-input-number v-model="currentPage.image.characterIndex" :min="0" :max="7" size="small" />
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
                      <el-input-number v-model="currentPage.image.pattern" :min="0" :max="2" size="small" />
                    </el-form-item>
                  </el-form>

                  <div class="ev-section-title">选项</div>
                  <el-form size="small" label-width="72px" :disabled="isRefMode">
                    <el-form-item label="优先级">
                      <el-select v-model="currentPage.priorityType" style="width: 140px">
                        <el-option
                          v-for="o in priorityOptions"
                          :key="o.value"
                          :label="o.label"
                          :value="o.value" />
                      </el-select>
                    </el-form-item>
                    <el-form-item label="触发">
                      <el-select v-model="currentPage.trigger" style="width: 140px">
                        <el-option
                          v-for="o in triggerOptions"
                          :key="o.value"
                          :label="o.label"
                          :value="o.value" />
                      </el-select>
                    </el-form-item>
                    <el-form-item>
                      <el-checkbox v-model="currentPage.walkAnime">步行动画</el-checkbox>
                      <el-checkbox v-model="currentPage.stepAnime">踏步动画</el-checkbox>
                      <el-checkbox v-model="currentPage.directionFix">固定朝向</el-checkbox>
                      <el-checkbox v-model="currentPage.through">穿透</el-checkbox>
                    </el-form-item>
                  </el-form>
                </div>
              </div>
            </el-tab-pane>

            <el-tab-pane label="执行内容" name="list">
              <el-scrollbar class="ev-cmd-scroll">
                <div
                  v-for="(cmd, i) in currentPage.list"
                  :key="i"
                  class="ev-cmd-line"
                  :class="{ end: cmd.code === 0 }">
                  {{ formatCommandLine(cmd) }}
                </div>
              </el-scrollbar>
              <el-collapse v-if="!isRefMode" class="ev-json">
                <el-collapse-item title="高级：本页 list JSON" name="json">
                  <el-input
                    v-model="listJson"
                    type="textarea"
                    :rows="10"
                    @blur="applyListJson" />
                  <p v-if="listJsonError" class="ev-json-err">{{ listJsonError }}</p>
                </el-collapse-item>
              </el-collapse>
            </el-tab-pane>
          </el-tabs>
        </section>
      </div>
    </div>

    <template #footer>
      <el-button @click="onVisible(false)">{{ isRefMode ? '关闭' : '取消' }}</el-button>
      <el-button v-if="!isRefMode" type="primary" @click="confirm">确定</el-button>
    </template>
  </el-dialog>
</template>

<script>
import {
  createEmptyPage,
  formatCommandLine,
  TRIGGER_OPTIONS,
  PRIORITY_OPTIONS,
} from './eventDefaults'

export default {
  name: 'EventEditorDialog',
  props: {
    modelValue: { type: Boolean, default: false },
    event: { type: Object, default: null },
    /** { mapId, refId } 只读引用模式 */
    refMode: { type: Object, default: null },
  },
  emits: ['update:modelValue', 'confirm', 'jump-to-ref'],
  data() {
    return {
      draft: null,
      pageIndex: 0,
      tab: 'main',
      listJson: '',
      listJsonError: '',
      triggerOptions: TRIGGER_OPTIONS,
      priorityOptions: PRIORITY_OPTIONS,
    }
  },
  computed: {
    isRefMode() {
      return !!(this.refMode && this.refMode.refId)
    },
    dialogTitle() {
      if (!this.draft) return '事件编辑'
      if (this.isRefMode) {
        return `引用事件 · Map${String(this.refMode.mapId).padStart(3, '0')} EV${String(this.refMode.refId).padStart(3, '0')}`
      }
      return `事件编辑 · EV${String(this.draft.id).padStart(3, '0')}`
    },
    currentPage() {
      if (!this.draft || !this.draft.pages) return null
      return this.draft.pages[this.pageIndex] || null
    },
  },
  watch: {
    modelValue(v) {
      if (v) this.resetDraft()
    },
    pageIndex() {
      this.syncListJson()
    },
    'currentPage.list': {
      deep: true,
      handler() {
        if (this.tab === 'list') this.syncListJson()
      },
    },
    tab(v) {
      if (v === 'list') this.syncListJson()
    },
  },
  methods: {
    formatCommandLine,
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
      this.tab = 'main'
      this.listJsonError = ''
      this.syncListJson()
    },
    syncListJson() {
      if (!this.currentPage) {
        this.listJson = '[]'
        return
      }
      this.listJson = JSON.stringify(this.currentPage.list || [], null, 2)
      this.listJsonError = ''
    },
    applyListJson() {
      if (!this.currentPage) return
      try {
        const parsed = JSON.parse(this.listJson)
        if (!Array.isArray(parsed)) throw new Error('必须是数组')
        this.currentPage.list = parsed
        this.listJsonError = ''
      } catch (e) {
        this.listJsonError = 'JSON 无效: ' + e.message
      }
    },
    addPage() {
      this.draft.pages.push(createEmptyPage())
      this.pageIndex = this.draft.pages.length - 1
    },
    copyPage() {
      const page = JSON.parse(JSON.stringify(this.currentPage))
      this.draft.pages.splice(this.pageIndex + 1, 0, page)
      this.pageIndex += 1
    },
    removePage() {
      if (this.draft.pages.length <= 1) return
      this.draft.pages.splice(this.pageIndex, 1)
      if (this.pageIndex >= this.draft.pages.length) {
        this.pageIndex = this.draft.pages.length - 1
      }
    },
    movePage(dir) {
      const to = this.pageIndex + dir
      if (to < 0 || to >= this.draft.pages.length) return
      const arr = this.draft.pages
      const tmp = arr[this.pageIndex]
      arr[this.pageIndex] = arr[to]
      arr[to] = tmp
      this.pageIndex = to
    },
    onVisible(v) {
      this.$emit('update:modelValue', v)
    },
    confirm() {
      if (this.isRefMode) return
      if (this.tab === 'list') this.applyListJson()
      if (this.listJsonError) return
      this.$emit('confirm', JSON.parse(JSON.stringify(this.draft)))
      this.$emit('update:modelValue', false)
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
  margin-bottom: 4px;
  font-size: 13px;
  color: #b88230;
  background: rgba(230, 162, 60, 0.12);
  border: 1px solid rgba(230, 162, 60, 0.45);
  border-radius: 4px;
}
.ev-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 480px;
}
.ev-id {
  font-family: monospace;
  min-width: 32px;
  display: inline-block;
}
.ev-main {
  display: flex;
  gap: 12px;
  min-height: 420px;
}
.ev-pages {
  width: 88px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--app-border);
  border-radius: 4px;
  overflow: hidden;
}
.ev-pages-title {
  padding: 6px;
  font-size: 12px;
  font-weight: 600;
  text-align: center;
  border-bottom: 1px solid var(--app-border);
  background: var(--app-surface-2);
}
.ev-pages-scroll {
  flex: 1;
  min-height: 200px;
}
.ev-page-item {
  display: block;
  width: 100%;
  height: 32px;
  border: none;
  border-bottom: 1px solid var(--app-border);
  background: transparent;
  cursor: pointer;
  color: var(--app-text);
}
.ev-page-item.active {
  background: var(--app-hover-bg);
  color: var(--app-active-color);
  font-weight: 600;
}
.ev-pages-actions {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 6px;
  border-top: 1px solid var(--app-border);
}
.ev-page-edit {
  flex: 1;
  min-width: 0;
}
.ev-cols {
  display: flex;
  gap: 16px;
}
.ev-col {
  flex: 1;
  min-width: 0;
}
.ev-section-title {
  font-size: 13px;
  font-weight: 600;
  margin: 0 0 8px;
  color: var(--app-text-muted);
}
.ev-cmd-scroll {
  height: 280px;
  border: 1px solid var(--app-border);
  border-radius: 4px;
  background: var(--app-surface-2);
  margin-bottom: 8px;
}
.ev-cmd-line {
  font-family: Consolas, 'Courier New', monospace;
  font-size: 12px;
  padding: 2px 8px;
  white-space: pre;
}
.ev-cmd-line.end {
  opacity: 0.55;
}
.ev-json-err {
  color: #f56c6c;
  font-size: 12px;
  margin: 4px 0 0;
}
</style>
