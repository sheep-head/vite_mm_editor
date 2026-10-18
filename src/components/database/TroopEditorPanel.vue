<template>
  <div v-if="modelValue" class="troop-ed">
    <db-group-box title="基本设置">
      <div class="name-row">
        <span class="lab">名称</span>
        <el-input v-model="modelValue.name" size="small" style="width: 220px" />
        <el-button size="small" @click="autoName">自动生成名称</el-button>
        <el-button size="small" @click="onBattleBack">更改战斗背景…</el-button>
        <el-button size="small" @click="onBattleTest">战斗测试…</el-button>
      </div>
      <div class="members-row">
        <canvas
          ref="stage"
          width="520"
          height="280"
          class="stage"
          @mousedown="onStageDown"
          @mousemove="onStageMove"
          @mouseup="onStageUp"
          @mouseleave="onStageUp" />
        <div class="member-btns">
          <el-button size="small" :disabled="enemyPick < 0" @click="addMember">&lt;&lt; 添加</el-button>
          <el-button size="small" :disabled="memberSel < 0" @click="removeMember">删除 &gt;</el-button>
          <el-button size="small" @click="clearMembers">清空</el-button>
          <el-button size="small" @click="alignMembers">排列</el-button>
        </div>
        <div class="enemy-list">
          <el-input v-model="enemyQuery" size="small" clearable placeholder="搜索敌人" class="mb" />
          <el-scrollbar max-height="240px">
            <div
              v-for="e in filteredEnemies"
              :key="e.id"
              class="enemy-item"
              :class="{ active: enemyPick === e.id }"
              @click="enemyPick = e.id">
              {{ pad(e.id) }} {{ e.name || '(空)' }}
            </div>
          </el-scrollbar>
        </div>
      </div>
    </db-group-box>

    <db-group-box title="战斗事件" class="mt">
      <div class="pages-row">
        <div class="page-btns">
          <el-button size="small" @click="newPage">新建事件页</el-button>
          <el-button size="small" @click="copyPage">复制事件页</el-button>
          <el-button size="small" @click="pastePage">粘贴事件页</el-button>
          <el-button size="small" :disabled="pages.length <= 1" @click="deletePage">删除事件页</el-button>
          <el-button size="small" @click="clearPage">清空事件页</el-button>
        </div>
        <div class="page-main">
          <el-tabs v-model="pageTab" type="card" size="small">
            <el-tab-pane
              v-for="(p, i) in pages"
              :key="i"
              :label="String(i + 1)"
              :name="String(i)" />
          </el-tabs>
          <el-form v-if="currentPage" size="small" label-width="56px" inline class="cond-form">
            <el-form-item label="条件">
              <el-select :model-value="condMode" style="width: 140px" @update:model-value="applyCondMode">
                <el-option value="none" label="不执行" />
                <el-option value="turn" label="回合" />
                <el-option value="turnEnd" label="回合结束" />
                <el-option value="enemyHp" label="敌人 HP" />
                <el-option value="actorHp" label="角色 HP" />
                <el-option value="switch" label="开关" />
              </el-select>
            </el-form-item>
            <template v-if="condMode === 'turn'">
              <el-form-item label="a">
                <el-input-number v-model="currentPage.conditions.turnA" :min="0" controls-position="right" />
              </el-form-item>
              <el-form-item label="b">
                <el-input-number v-model="currentPage.conditions.turnB" :min="0" controls-position="right" />
              </el-form-item>
            </template>
            <template v-else-if="condMode === 'enemyHp'">
              <el-form-item label="敌序号">
                <el-input-number v-model="currentPage.conditions.enemyIndex" :min="0" controls-position="right" />
              </el-form-item>
              <el-form-item label="HP%">
                <el-input-number v-model="currentPage.conditions.enemyHp" :min="0" :max="100" controls-position="right" />
              </el-form-item>
            </template>
            <template v-else-if="condMode === 'actorHp'">
              <el-form-item label="角色">
                <id-name-field v-model="currentPage.conditions.actorId" type="actor" width="140px" />
              </el-form-item>
              <el-form-item label="HP%">
                <el-input-number v-model="currentPage.conditions.actorHp" :min="0" :max="100" controls-position="right" />
              </el-form-item>
            </template>
            <template v-else-if="condMode === 'switch'">
              <el-form-item label="开关">
                <el-input-number v-model="currentPage.conditions.switchId" :min="1" controls-position="right" />
              </el-form-item>
            </template>
            <el-form-item label="间隔">
              <el-select v-model="currentPage.span" style="width: 100px">
                <el-option v-for="o in spanOpts" :key="o.value" :label="o.label" :value="o.value" />
              </el-select>
            </el-form-item>
          </el-form>
          <event-command-list-editor
            v-if="currentPage"
            v-model="currentPage.list"
            class="troop-cmds" />
        </div>
      </div>
    </db-group-box>
  </div>
</template>

<script>
import DbGroupBox from './shared/DbGroupBox.vue'
import IdNameField from './shared/IdNameField.vue'
import EventCommandListEditor from '@/components/map/EventCommandListEditor.vue'
import { loadDataArray, formatRecordName } from './shared/systemLookups'
import { TROOP_SPAN_OPTIONS } from './shared/rpgDbConstants'
import { normalizeTroop } from './shared/dbDefaults'
import { markRaw } from 'vue'
import { resolveBattlerAbsPath, loadImageFile } from '@/utils/imgAssets'

function emptyConditions() {
  return {
    actorHp: 50,
    actorId: 1,
    actorValid: false,
    enemyHp: 50,
    enemyIndex: 0,
    enemyValid: false,
    switchId: 1,
    switchValid: false,
    turnA: 0,
    turnB: 0,
    turnEnding: false,
    turnValid: false,
  }
}

export default {
  name: 'TroopEditorPanel',
  components: { DbGroupBox, IdNameField, EventCommandListEditor },
  props: {
    modelValue: { type: Object, default: null },
  },
  data() {
    return {
      enemyQuery: '',
      enemyPick: -1,
      memberSel: -1,
      pageTab: '0',
      pageClipboard: null,
      dragging: false,
      dragOffX: 0,
      dragOffY: 0,
      _battlerCache: {},
    }
  },
  computed: {
    pages() {
      return (this.modelValue && this.modelValue.pages) || []
    },
    currentPage() {
      const i = parseInt(this.pageTab, 10) || 0
      return this.pages[i] || null
    },
    spanOpts() {
      return TROOP_SPAN_OPTIONS
    },
    filteredEnemies() {
      const arr = loadDataArray('Enemies').filter((e) => e && e.id > 0)
      const q = (this.enemyQuery || '').trim().toLowerCase()
      if (!q) return arr
      return arr.filter(
        (e) => String(e.id).includes(q) || String(e.name || '').toLowerCase().includes(q)
      )
    },
    condMode() {
      const c = this.currentPage && this.currentPage.conditions
      if (!c) return 'none'
      if (c.turnEnding) return 'turnEnd'
      if (c.turnValid) return 'turn'
      if (c.enemyValid) return 'enemyHp'
      if (c.actorValid) return 'actorHp'
      if (c.switchValid) return 'switch'
      return 'none'
    },
  },
  watch: {
    modelValue: {
      immediate: true,
      handler(v) {
        if (v) normalizeTroop(v)
        this.pageTab = '0'
        this.memberSel = -1
        this.$nextTick(() => this.paintStage())
      },
    },
    'modelValue.members': {
      deep: true,
      handler() {
        this.paintStage()
      },
    },
    pageTab() {
      /* sync */
    },
  },
  methods: {
    pad(id) {
      return String(id).padStart(4, '0')
    },
    onBattleBack() {
      this.$message.info('标准 Troops 数据无战斗背景字段（背景属战斗测试/地图）')
    },
    onBattleTest() {
      this.$message.warning('战斗测试暂未实现')
    },
    autoName() {
      const names = (this.modelValue.members || []).map((m) => {
        const n = formatRecordName('Enemies', m.enemyId, '')
        return n.replace(/^\d+\s*/, '') || '?'
      })
      this.modelValue.name = names.length ? names.join('&') : ''
    },
    addMember() {
      if (this.enemyPick < 0) return
      if (!Array.isArray(this.modelValue.members)) this.modelValue.members = []
      const n = this.modelValue.members.length
      this.modelValue.members.push({
        enemyId: this.enemyPick,
        x: 80 + (n % 4) * 100,
        y: 200 + Math.floor(n / 4) * 40,
        hidden: false,
      })
      this.memberSel = this.modelValue.members.length - 1
      this.paintStage()
    },
    removeMember() {
      if (this.memberSel < 0) return
      this.modelValue.members.splice(this.memberSel, 1)
      this.memberSel = -1
      this.paintStage()
    },
    clearMembers() {
      if (!window.confirm('清空全部成员？')) return
      this.modelValue.members = []
      this.memberSel = -1
      this.paintStage()
    },
    alignMembers() {
      const list = this.modelValue.members || []
      if (!list.length) return
      const canvas = this.$refs.stage
      const w = canvas ? canvas.width : 520
      const step = w / (list.length + 1)
      list.forEach((m, i) => {
        m.x = Math.round(step * (i + 1))
        m.y = 220
      })
      this.paintStage()
    },
    async ensureBattler(name) {
      if (!name) return null
      if (this._battlerCache[name]) return this._battlerCache[name]
      const loaded = await loadImageFile(resolveBattlerAbsPath(name, 'enemies'))
      const img = loaded ? markRaw(loaded) : null
      this._battlerCache[name] = img
      return img
    },
    async paintStage() {
      const canvas = this.$refs.stage
      if (!canvas || !this.modelValue) return
      const ctx = canvas.getContext('2d')
      ctx.fillStyle = '#111'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      const members = this.modelValue.members || []
      for (let i = 0; i < members.length; i++) {
        const m = members[i]
        const enemies = loadDataArray('Enemies')
        const rec = enemies[m.enemyId]
        const name = (rec && rec.battlerName) || ''
        const img = await this.ensureBattler(name)
        if (img) {
          const scale = Math.min(1, 120 / img.height)
          const dw = img.width * scale
          const dh = img.height * scale
          ctx.globalAlpha = m.hidden ? 0.35 : 1
          ctx.drawImage(img, m.x - dw / 2, m.y - dh, dw, dh)
          ctx.globalAlpha = 1
        } else {
          ctx.fillStyle = '#666'
          ctx.fillRect(m.x - 20, m.y - 40, 40, 40)
        }
        if (i === this.memberSel) {
          ctx.strokeStyle = '#4ea1ff'
          ctx.lineWidth = 2
          ctx.strokeRect(m.x - 30, m.y - 60, 60, 70)
        }
      }
    },
    hitMember(x, y) {
      const members = this.modelValue.members || []
      for (let i = members.length - 1; i >= 0; i--) {
        const m = members[i]
        if (Math.abs(x - m.x) < 40 && y < m.y && y > m.y - 80) return i
      }
      return -1
    },
    onStageDown(e) {
      const canvas = this.$refs.stage
      const rect = canvas.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * canvas.width
      const y = ((e.clientY - rect.top) / rect.height) * canvas.height
      const i = this.hitMember(x, y)
      this.memberSel = i
      if (i >= 0) {
        this.dragging = true
        this.dragOffX = x - this.modelValue.members[i].x
        this.dragOffY = y - this.modelValue.members[i].y
      }
      this.paintStage()
    },
    onStageMove(e) {
      if (!this.dragging || this.memberSel < 0) return
      const canvas = this.$refs.stage
      const rect = canvas.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * canvas.width
      const y = ((e.clientY - rect.top) / rect.height) * canvas.height
      const m = this.modelValue.members[this.memberSel]
      m.x = Math.round(x - this.dragOffX)
      m.y = Math.round(y - this.dragOffY)
      this.paintStage()
    },
    onStageUp() {
      this.dragging = false
    },
    newPage() {
      this.modelValue.pages.push({
        conditions: emptyConditions(),
        list: [{ code: 0, indent: 0, parameters: [] }],
        span: 0,
      })
      this.pageTab = String(this.modelValue.pages.length - 1)
    },
    copyPage() {
      if (!this.currentPage) return
      this.pageClipboard = JSON.parse(JSON.stringify(this.currentPage))
      this.$message.success('已复制事件页')
    },
    pastePage() {
      if (!this.pageClipboard) {
        this.$message.warning('剪贴板为空')
        return
      }
      this.modelValue.pages.push(JSON.parse(JSON.stringify(this.pageClipboard)))
      this.pageTab = String(this.modelValue.pages.length - 1)
    },
    deletePage() {
      if (this.pages.length <= 1) return
      const i = parseInt(this.pageTab, 10) || 0
      this.modelValue.pages.splice(i, 1)
      this.pageTab = String(Math.max(0, i - 1))
    },
    clearPage() {
      if (!this.currentPage) return
      this.currentPage.list = [{ code: 0, indent: 0, parameters: [] }]
      this.currentPage.conditions = emptyConditions()
      this.currentPage.span = 0
    },
    applyCondMode(mode) {
      const c = this.currentPage.conditions
      c.turnValid = false
      c.turnEnding = false
      c.enemyValid = false
      c.actorValid = false
      c.switchValid = false
      if (mode === 'turn') c.turnValid = true
      else if (mode === 'turnEnd') c.turnEnding = true
      else if (mode === 'enemyHp') c.enemyValid = true
      else if (mode === 'actorHp') c.actorValid = true
      else if (mode === 'switch') c.switchValid = true
    },
  },
}
</script>

<style scoped>
.troop-ed {
  width: 100%;
  max-width: 1100px;
}
.name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}
.lab {
  font-size: 12px;
}
.members-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: flex-start;
}
.stage {
  border: 1px solid var(--app-border);
  background: #111;
  cursor: crosshair;
  flex-shrink: 0;
}
.member-btns {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100px;
}
.enemy-list {
  width: 180px;
  border: 1px solid var(--app-border);
  padding: 6px;
  background: var(--app-surface, #fff);
}
.enemy-item {
  padding: 3px 6px;
  font-size: 12px;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.enemy-item.active {
  background: var(--el-color-primary-light-7, #c6e2ff);
}
.mb {
  margin-bottom: 6px;
}
.mt {
  margin-top: 12px;
}
.pages-row {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}
.page-btns {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 120px;
  flex-shrink: 0;
}
.page-main {
  flex: 1;
  min-width: 0;
}
.cond-form {
  margin-bottom: 6px;
}
.troop-cmds {
  min-height: 240px;
}
.troop-cmds :deep(.ev-cmd-list) {
  max-height: 36vh;
}
</style>
