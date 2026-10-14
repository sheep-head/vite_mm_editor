<template>
  <div class="db-panel">
    <aside class="db-list">
      <el-input
        v-model="searchWord"
        size="small"
        clearable
        placeholder="搜索 ID / 名称"
        class="db-search" />
      <el-scrollbar class="db-list-scroll">
        <ul>
          <li
            v-for="item in visibleList"
            :key="item.id"
            :class="{ active: current && current.id === item.id }"
            @click="selectItem(item)">
            {{ item.id }}:{{ item.name || '(空)' }}
          </li>
        </ul>
      </el-scrollbar>
    </aside>
    <main class="db-form" v-if="current && current.id">
      <el-form label-width="88px" size="small" @submit.prevent>
        <el-form-item
          v-for="field in fields"
          :key="field.key"
          :label="field.label">
          <el-input
            v-if="field.type === 'text' || !field.type"
            v-model="current[field.key]"
            :type="field.inputType || 'text'" />
          <el-input-number
            v-else-if="field.type === 'number'"
            v-model="current[field.key]"
            :controls="false"
            class="db-num" />
          <el-switch
            v-else-if="field.type === 'boolean'"
            v-model="current[field.key]" />
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
        </el-form-item>
      </el-form>
    </main>
    <main class="db-form db-empty" v-else>请选择左侧条目</main>
  </div>
</template>

<script>
import DataManager from '@/utils/DataManager'

export default {
  name: 'DatabaseArrayPanel',
  props: {
    fileName: { type: String, required: true },
    fields: { type: Array, default: () => [] },
    /** 父级在切换 Tab / 关闭前可询问 */
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
    }
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
  beforeUnmount() {
    this.clearWatch()
  },
  methods: {
    clearWatch() {
      if (this._watchStop) {
        this._watchStop()
        this._watchStop = null
      }
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
      // 深拷贝，避免直接改缓存引用
      this.dataList = JSON.parse(JSON.stringify(raw))
      this.dirty = false
      const first = this.dataList.find((x) => x && x.id > 0)
      this.selectItem(first || null, false)
    },
    selectItem(item, markDirtyWatch = true) {
      this.clearWatch()
      this.current = item
      this.jsonErrors = {}
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
    /** @returns {boolean} */
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
</style>
