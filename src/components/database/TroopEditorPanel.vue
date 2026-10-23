<template>
  <div v-if="modelValue" class="troop-ed" tabindex="0" @keydown="onPanelKeyDown">
    <db-group-box title="基本设置">
      <div class="name-row">
        <span class="lab">名称</span>
        <el-input v-model="modelValue.name" size="small" style="width: 220px" />
        <el-button size="small" @click="autoName">自动生成名称</el-button>
        <el-button size="small" @click="onBattleBack">更改战斗背景…</el-button>
        <el-button size="small" @click="onBattleTest">战斗测试…</el-button>
        <el-checkbox v-model="showMemberTable" size="small" class="show-tbl">显示成员列表</el-checkbox>
      </div>
      <div class="members-row">
        <canvas
          ref="stage"
          :width="stageW"
          :height="canvasH"
          class="stage"
          tabindex="0"
          @mousedown="onStageDown"
          @mousemove="onStageMove"
          @mouseup="onStageUp"
          @mouseleave="onStageUp"
          @contextmenu.prevent="onStageContextMenu" />
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

      <div v-if="showMemberTable" class="member-table-wrap">
        <el-table
          ref="memberTable"
          :data="memberRows"
          size="small"
          max-height="220"
          highlight-current-row
          row-key="index"
          @row-click="onTableRowClick"
          @row-contextmenu="onTableRowContextMenu">
          <el-table-column label="序号" width="64" align="center">
            <template #default="{ row }">{{ String(row.index + 1).padStart(2, '0') }}</template>
          </el-table-column>
          <el-table-column label="名字" min-width="120" show-overflow-tooltip>
            <template #default="{ row }">{{ row.name }}</template>
          </el-table-column>
          <el-table-column label="X" width="100">
            <template #default="{ row }">
              <el-input-number
                :model-value="row.member.x"
                size="small"
                :controls="false"
                :min="0"
                :max="stageW"
                style="width: 80px"
                @update:model-value="(v) => onTableCoord(row.index, 'x', v)"
                @click.stop />
            </template>
          </el-table-column>
          <el-table-column label="Y" width="100">
            <template #default="{ row }">
              <el-input-number
                :model-value="row.member.y"
                size="small"
                :controls="false"
                :min="0"
                :max="stageH"
                style="width: 80px"
                @update:model-value="(v) => onTableCoord(row.index, 'y', v)"
                @click.stop />
            </template>
          </el-table-column>
          <el-table-column label="中途出现" width="90" align="center">
            <template #default="{ row }">
              <el-checkbox
                :model-value="!!row.member.hidden"
                @update:model-value="(v) => setMemberHidden(row.index, v)"
                @click.stop />
            </template>
          </el-table-column>
          <el-table-column label="操作" width="80" align="center">
            <template #default="{ row }">
              <el-button link type="danger" size="small" @click.stop="removeMemberAt(row.index)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
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

    <popup-context-menu
      menu-class="troop-member-ctx"
      :visible="memberMenu.visible"
      :x="memberMenu.x"
      :y="memberMenu.y"
      @update:visible="(v) => (memberMenu.visible = v)">
      <template #default="{ action }">
        <li :class="{ disabled: memberSel < 0 }" @click="action(toggleSelectedHidden)">
          <span>{{ selectedHidden ? '✓ 中途出现' : '中途出现' }}</span>
          <span class="sc">H</span>
        </li>
        <li class="sep" />
        <li :class="{ disabled: memberSel < 0 }" @click="action(removeMember)">
          <span>删除</span><span class="sc">Del</span>
        </li>
      </template>
    </popup-context-menu>
  </div>
</template>

<script>
import DbGroupBox from './shared/DbGroupBox.vue'
import IdNameField from './shared/IdNameField.vue'
import EventCommandListEditor from '@/components/map/EventCommandListEditor.vue'
import PopupContextMenu from '@/components/shared/PopupContextMenu.vue'
import { loadDataArray, formatRecordName, loadSystem } from './shared/systemLookups'
import { TROOP_SPAN_OPTIONS } from './shared/rpgDbConstants'
import { normalizeTroop } from './shared/dbDefaults'
import { markRaw } from 'vue'
import { resolveBattlerAbsPath, loadImageFile } from '@/utils/imgAssets'

const DEFAULT_STAGE_W = 816
const DEFAULT_STAGE_H = 624
/** MZ 敌群可放置高度 = 画面高 − 状态栏占位 */
const STAGE_STATUS_UI = 180
/** 画布底部额外显示边距（不可放置） */
const STAGE_PAD_BOTTOM = 20
const SNAP_PX = 4

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
  components: { DbGroupBox, IdNameField, EventCommandListEditor, PopupContextMenu },
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
      showMemberTable: false,
      memberMenu: { visible: false, x: 0, y: 0 },
      guideX: null,
      guideY: null,
      _battlerCache: {},
      _memberBounds: [],
      _paintRaf: 0,
      _preloadToken: 0,
    }
  },
  computed: {
    stageW() {
      const adv = loadSystem().advanced || {}
      const w = Number(adv.screenWidth) || 0
      return w > 0 ? w : DEFAULT_STAGE_W
    },
    /** 可放置高度（脚底 y 上限） */
    stageH() {
      const adv = loadSystem().advanced || {}
      const h = Number(adv.screenHeight) || 0
      const full = h > 0 ? h : DEFAULT_STAGE_H
      return Math.max(120, full - STAGE_STATUS_UI)
    },
    /** 画布显示高度 = 可放置区 + 底部边距 */
    canvasH() {
      return this.stageH + STAGE_PAD_BOTTOM
    },
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
    memberRows() {
      const members = (this.modelValue && this.modelValue.members) || []
      const enemies = loadDataArray('Enemies')
      return members.map((m, index) => {
        const rec = enemies[m.enemyId]
        return {
          index,
          member: m,
          name: (rec && rec.name) || '(空)',
        }
      })
    },
    selectedHidden() {
      const m = this.selectedMember()
      return !!(m && m.hidden)
    },
  },
  watch: {
    modelValue: {
      immediate: true,
      handler(v) {
        if (v) normalizeTroop(v)
        this.pageTab = '0'
        this.memberSel = -1
        this.guideX = null
        this.guideY = null
        this.$nextTick(() => {
          this.preloadBattlers().then(() => this.paintStageSync())
        })
      },
    },
    'modelValue.members': {
      deep: true,
      handler() {
        if (this.dragging) return
        this.preloadBattlers().then(() => this.schedulePaint())
      },
    },
    memberSel(i) {
      this.syncTableCurrentRow(i)
      this.schedulePaint()
    },
    showMemberTable(v) {
      if (v) this.$nextTick(() => this.syncTableCurrentRow(this.memberSel))
    },
  },
  mounted() {
    this._onDocKeyDown = (e) => this.onDocKeyDown(e)
    window.addEventListener('keydown', this._onDocKeyDown, true)
  },
  beforeUnmount() {
    if (this._onDocKeyDown) {
      window.removeEventListener('keydown', this._onDocKeyDown, true)
      this._onDocKeyDown = null
    }
    if (this._paintRaf) {
      cancelAnimationFrame(this._paintRaf)
      this._paintRaf = 0
    }
  },
  methods: {
    pad(id) {
      return String(id).padStart(4, '0')
    },
    /** 脚底坐标限制在舞台内：x∈[0,stageW]，y∈[0,stageH] */
    clampPos(x, y) {
      const cx = Math.max(0, Math.min(this.stageW, Math.round(Number(x) || 0)))
      const cy = Math.max(0, Math.min(this.stageH, Math.round(Number(y) || 0)))
      return { x: cx, y: cy }
    },
    setMemberPos(m, x, y) {
      if (!m) return
      const p = this.clampPos(x, y)
      m.x = p.x
      m.y = p.y
    },
    onTableCoord(index, axis, value) {
      const list = this.modelValue.members || []
      const m = list[index]
      if (!m) return
      if (axis === 'x') this.setMemberPos(m, value, m.y)
      else this.setMemberPos(m, m.x, value)
      this.schedulePaint()
    },
    selectedMember() {
      const list = (this.modelValue && this.modelValue.members) || []
      if (this.memberSel < 0 || this.memberSel >= list.length) return null
      return list[this.memberSel]
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
      const baseY = Math.max(40, this.stageH - 20)
      const pos = this.clampPos(80 + (n % 4) * 100, baseY - Math.floor(n / 4) * 48)
      this.modelValue.members.push({
        enemyId: this.enemyPick,
        x: pos.x,
        y: pos.y,
        hidden: false,
      })
      this.selectMember(this.modelValue.members.length - 1)
      this.preloadBattlers().then(() => this.schedulePaint())
    },
    removeMember() {
      this.removeMemberAt(this.memberSel)
    },
    removeMemberAt(index) {
      if (index < 0) return
      const list = this.modelValue.members || []
      if (index >= list.length) return
      list.splice(index, 1)
      if (this.memberSel === index) this.memberSel = -1
      else if (this.memberSel > index) this.memberSel -= 1
      this.memberMenu.visible = false
      this.schedulePaint()
    },
    clearMembers() {
      if (!window.confirm('清空全部成员？')) return
      this.modelValue.members = []
      this.memberSel = -1
      this.schedulePaint()
    },
    alignMembers() {
      const list = this.modelValue.members || []
      if (!list.length) return
      const w = this.stageW
      const step = w / (list.length + 1)
      const y = Math.max(40, this.stageH - 20)
      list.forEach((m, i) => {
        this.setMemberPos(m, step * (i + 1), y)
      })
      this.schedulePaint()
    },
    selectMember(i) {
      this.memberSel = i
      this.$refs.stage && this.$refs.stage.focus?.()
    },
    setMemberHidden(index, hidden) {
      const list = this.modelValue.members || []
      if (index < 0 || index >= list.length) return
      list[index].hidden = !!hidden
      this.schedulePaint()
    },
    toggleSelectedHidden() {
      const m = this.selectedMember()
      if (!m) return
      m.hidden = !m.hidden
      this.schedulePaint()
    },
    syncTableCurrentRow(i) {
      if (!this.showMemberTable) return
      const table = this.$refs.memberTable
      if (!table) return
      this.$nextTick(() => {
        if (i < 0) {
          table.setCurrentRow?.(null)
          return
        }
        const row = this.memberRows[i]
        if (row) {
          table.setCurrentRow?.(row)
          // 滚入视口
          const wrap = table.$el && table.$el.querySelector('.el-table__body-wrapper')
          const tr = wrap && wrap.querySelectorAll('tbody tr')[i]
          if (tr && typeof tr.scrollIntoView === 'function') {
            tr.scrollIntoView({ block: 'nearest' })
          }
        }
      })
    },
    onTableRowClick(row) {
      this.selectMember(row.index)
    },
    onTableRowContextMenu(row, _col, e) {
      e.preventDefault()
      this.selectMember(row.index)
      this.memberMenu = { visible: true, x: e.clientX, y: e.clientY }
    },
    async ensureBattler(name) {
      if (!name) return null
      if (this._battlerCache[name] !== undefined) return this._battlerCache[name]
      const loaded = await loadImageFile(resolveBattlerAbsPath(name, 'enemies'))
      const img = loaded ? markRaw(loaded) : null
      this._battlerCache[name] = img
      return img
    },
    async preloadBattlers() {
      const token = ++this._preloadToken
      const members = (this.modelValue && this.modelValue.members) || []
      const enemies = loadDataArray('Enemies')
      const names = new Set()
      for (const m of members) {
        const rec = enemies[m.enemyId]
        const name = (rec && rec.battlerName) || ''
        if (name) names.add(name)
      }
      await Promise.all([...names].map((n) => this.ensureBattler(n)))
      if (token !== this._preloadToken) return
    },
    schedulePaint() {
      if (this._paintRaf) return
      this._paintRaf = requestAnimationFrame(() => {
        this._paintRaf = 0
        this.paintStageSync()
      })
    },
    paintStageSync() {
      const canvas = this.$refs.stage
      if (!canvas || !this.modelValue) return
      const fieldH = this.stageH
      const padH = this.canvasH
      if (canvas.width !== this.stageW) canvas.width = this.stageW
      if (canvas.height !== padH) canvas.height = padH
      const ctx = canvas.getContext('2d')
      const w = canvas.width
      const h = canvas.height
      ctx.fillStyle = '#111'
      ctx.fillRect(0, 0, w, fieldH)
      // 底部不可放置边距
      ctx.fillStyle = '#1a1a1a'
      ctx.fillRect(0, fieldH, w, h - fieldH)

      // 底边中线参考（可放置区底边 = 中间最底部）
      ctx.strokeStyle = 'rgba(255,255,255,0.18)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(w / 2, 0)
      ctx.lineTo(w / 2, fieldH)
      ctx.moveTo(0, fieldH - 0.5)
      ctx.lineTo(w, fieldH - 0.5)
      ctx.stroke()
      // 原点十字（可放置区底边中点）
      const ox = w / 2
      const oy = fieldH
      ctx.strokeStyle = 'rgba(255,200,80,0.55)'
      ctx.beginPath()
      ctx.moveTo(ox - 10, oy)
      ctx.lineTo(ox + 10, oy)
      ctx.moveTo(ox, oy - 10)
      ctx.lineTo(ox, oy)
      ctx.stroke()

      const members = this.modelValue.members || []
      const enemies = loadDataArray('Enemies')
      const bounds = []
      for (let i = 0; i < members.length; i++) {
        const m = members[i]
        const rec = enemies[m.enemyId]
        const name = (rec && rec.battlerName) || ''
        const img = name ? this._battlerCache[name] : null
        let bx
        let by
        let bw
        let bh
        if (img) {
          bw = img.width
          bh = img.height
          bx = m.x - bw / 2
          by = m.y - bh
          ctx.globalAlpha = m.hidden ? 0.35 : 1
          ctx.drawImage(img, bx, by, bw, bh)
          ctx.globalAlpha = 1
        } else {
          bw = 40
          bh = 40
          bx = m.x - 20
          by = m.y - 40
          ctx.fillStyle = '#666'
          ctx.fillRect(bx, by, bw, bh)
        }
        bounds[i] = { x: bx, y: by, w: bw, h: bh }
        if (i === this.memberSel) {
          ctx.strokeStyle = '#4ea1ff'
          ctx.lineWidth = 2
          ctx.strokeRect(bx - 2, by - 2, bw + 4, bh + 4)
        }
      }
      this._memberBounds = bounds

      // 对齐辅助线（仅画在可放置区内）
      if (this.guideX != null) {
        ctx.strokeStyle = 'rgba(255, 80, 80, 0.85)'
        ctx.lineWidth = 1
        ctx.setLineDash([4, 4])
        ctx.beginPath()
        ctx.moveTo(this.guideX + 0.5, 0)
        ctx.lineTo(this.guideX + 0.5, fieldH)
        ctx.stroke()
        ctx.setLineDash([])
      }
      if (this.guideY != null) {
        ctx.strokeStyle = 'rgba(80, 180, 255, 0.85)'
        ctx.lineWidth = 1
        ctx.setLineDash([4, 4])
        ctx.beginPath()
        ctx.moveTo(0, this.guideY + 0.5)
        ctx.lineTo(w, this.guideY + 0.5)
        ctx.stroke()
        ctx.setLineDash([])
      }
    },
    hitMember(x, y) {
      const bounds = this._memberBounds || []
      for (let i = bounds.length - 1; i >= 0; i--) {
        const b = bounds[i]
        if (!b) continue
        if (x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) return i
      }
      return -1
    },
    canvasPoint(e) {
      const canvas = this.$refs.stage
      const rect = canvas.getBoundingClientRect()
      return {
        x: ((e.clientX - rect.left) / rect.width) * canvas.width,
        y: ((e.clientY - rect.top) / rect.height) * canvas.height,
      }
    },
    applySnap(nx, ny, selfIndex) {
      const members = this.modelValue.members || []
      let gx = null
      let gy = null
      let x = nx
      let y = ny
      for (let i = 0; i < members.length; i++) {
        if (i === selfIndex) continue
        const o = members[i]
        if (Math.abs(nx - o.x) <= SNAP_PX) {
          x = o.x
          gx = o.x
        }
        if (Math.abs(ny - o.y) <= SNAP_PX) {
          y = o.y
          gy = o.y
        }
      }
      const clamped = this.clampPos(x, y)
      // 吸附点在界外时不画辅助线
      this.guideX = gx != null && gx === clamped.x ? gx : null
      this.guideY = gy != null && gy === clamped.y ? gy : null
      return clamped
    },
    onStageDown(e) {
      if (e.button !== 0) return
      this.memberMenu.visible = false
      this.$refs.stage && this.$refs.stage.focus?.()
      const { x, y } = this.canvasPoint(e)
      const i = this.hitMember(x, y)
      this.memberSel = i
      if (i >= 0) {
        this.dragging = true
        this.dragOffX = x - this.modelValue.members[i].x
        this.dragOffY = y - this.modelValue.members[i].y
      } else {
        this.guideX = null
        this.guideY = null
      }
      this.schedulePaint()
    },
    onStageMove(e) {
      if (!this.dragging || this.memberSel < 0) return
      const { x, y } = this.canvasPoint(e)
      const m = this.modelValue.members[this.memberSel]
      const rawX = Math.round(x - this.dragOffX)
      const rawY = Math.round(y - this.dragOffY)
      const snapped = this.applySnap(rawX, rawY, this.memberSel)
      m.x = snapped.x
      m.y = snapped.y
      this.schedulePaint()
    },
    onStageUp() {
      if (!this.dragging) return
      this.dragging = false
      this.guideX = null
      this.guideY = null
      this.schedulePaint()
    },
    onStageContextMenu(e) {
      const { x, y } = this.canvasPoint(e)
      const i = this.hitMember(x, y)
      if (i >= 0) this.memberSel = i
      if (this.memberSel < 0) return
      this.memberMenu = { visible: true, x: e.clientX, y: e.clientY }
      this.schedulePaint()
    },
    nudgeSelected(dx, dy) {
      const m = this.selectedMember()
      if (!m) return
      m.x = Math.round(Number(m.x) || 0) + dx
      m.y = Math.round(Number(m.y) || 0) + dy
      this.schedulePaint()
    },
    isTypingTarget(el) {
      if (!el) return false
      const tag = (el.tagName || '').toLowerCase()
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return true
      if (el.isContentEditable) return true
      return !!(el.closest && el.closest('input, textarea, select, [contenteditable="true"]'))
    },
    onPanelKeyDown() {
      /* 焦点在面板时由 onDocKeyDown 统一处理 */
    },
    onDocKeyDown(e) {
      if (!this.modelValue) return
      if (this.isTypingTarget(e.target)) return
      // 仅当焦点在本面板内时响应
      const root = this.$el
      if (!root || !root.contains(document.activeElement)) {
        // 允许 canvas 已失焦但仍点过本面板的情况：若菜单打开也响应
        if (!this.memberMenu.visible) return
      }
      const step = e.shiftKey ? 10 : 1
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        this.nudgeSelected(-step, 0)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        this.nudgeSelected(step, 0)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        this.nudgeSelected(0, -step)
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        this.nudgeSelected(0, step)
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (this.memberSel < 0) return
        e.preventDefault()
        this.removeMember()
      } else if (e.key === ' ' || e.key === 'h' || e.key === 'H') {
        if (this.memberSel < 0) return
        e.preventDefault()
        this.toggleSelectedHidden()
      }
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
  outline: none;
}
.name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}
.show-tbl {
  margin-left: 8px;
}
.lab {
  font-size: 12px;
}
.members-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: flex-start;
  overflow-x: auto;
}
.stage {
  border: 1px solid var(--app-border);
  background: #111;
  cursor: crosshair;
  flex-shrink: 0;
  outline: none;
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
.member-table-wrap {
  margin-top: 10px;
  max-width: 816px;
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

<style>
.popup-context-menu.troop-member-ctx {
  display: flex;
  flex-direction: column;
}
.popup-context-menu.troop-member-ctx li {
  display: flex;
  justify-content: space-between;
  gap: 24px;
}
.popup-context-menu.troop-member-ctx .sc {
  color: #909399;
  font-size: 12px;
}
</style>
