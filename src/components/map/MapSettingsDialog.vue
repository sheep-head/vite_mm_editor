<template>
  <el-dialog
    :model-value="modelValue"
    :title="dialogTitle"
    width="920px"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
    @update:model-value="$emit('update:modelValue', $event)">
    <div v-if="form" class="map-set">
      <div class="map-set-main">
        <db-group-box title="基本设置">
          <div class="pair">
            <label class="fld">
              <span>名称</span>
              <el-input v-model="form.name" size="small" />
            </label>
            <label class="fld">
              <span>显示名称</span>
              <el-input v-model="form.displayName" size="small" />
            </label>
          </div>
          <label class="fld">
            <span>图块</span>
            <el-select v-model="form.tilesetId" size="small" filterable>
              <el-option
                v-for="t in tilesets"
                :key="t.id"
                :label="tilesetLabel(t)"
                :value="t.id" />
            </el-select>
          </label>
          <div class="pair">
            <label class="fld">
              <span>宽</span>
              <el-input-number v-model="form.width" size="small" :min="1" :max="256" controls-position="right" />
            </label>
            <label class="fld">
              <span>高</span>
              <el-input-number v-model="form.height" size="small" :min="1" :max="256" controls-position="right" />
            </label>
          </div>
          <div class="pair">
            <label class="fld">
              <span>循环类型</span>
              <el-select v-model="form.scrollType" size="small">
                <el-option :value="0" label="无循环" />
                <el-option :value="1" label="纵向循环" />
                <el-option :value="2" label="横向循环" />
                <el-option :value="3" label="双向循环" />
              </el-select>
            </label>
            <label class="fld">
              <span>遇敌步数</span>
              <el-input-number v-model="form.encounterStep" size="small" :min="1" :max="999" controls-position="right" />
            </label>
          </div>
          <div class="file-line">
            <el-checkbox v-model="form.autoplayBgm">自动切换背景音乐</el-checkbox>
            <el-input :model-value="form.bgm.name" size="small" readonly :disabled="!form.autoplayBgm" />
            <el-button size="small" :disabled="!form.autoplayBgm" @click="audioTarget = 'bgm'">...</el-button>
          </div>
          <div class="file-line">
            <el-checkbox v-model="form.autoplayBgs">自动切换背景声</el-checkbox>
            <el-input :model-value="form.bgs.name" size="small" readonly :disabled="!form.autoplayBgs" />
            <el-button size="small" :disabled="!form.autoplayBgs" @click="audioTarget = 'bgs'">...</el-button>
          </div>
          <div class="file-line">
            <el-checkbox v-model="form.specifyBattleback">指定战斗背景图像</el-checkbox>
            <el-input :model-value="battlebackLabel" size="small" readonly :disabled="!form.specifyBattleback" />
            <el-button size="small" :disabled="!form.specifyBattleback" @click="openBattleback">...</el-button>
            <el-checkbox v-model="form.disableDashing" class="dash">禁止跑步</el-checkbox>
          </div>
        </db-group-box>
        <div class="map-set-sub">
          <db-group-box title="远景" class="sub-box">
            <div class="file-line">
              <span class="k">图像</span>
              <el-input :model-value="form.parallaxName" size="small" readonly />
              <el-button size="small" @click="openImage('parallaxes', '远景', 'parallaxName')">...</el-button>
            </div>
            <div class="loop-line">
              <el-checkbox v-model="form.parallaxLoopX">横向循环</el-checkbox>
              <span>滚动</span>
              <el-input-number
                v-model="form.parallaxSx"
                size="small"
                :disabled="!form.parallaxLoopX"
                controls-position="right" />
            </div>
            <div class="loop-line">
              <el-checkbox v-model="form.parallaxLoopY">纵向循环</el-checkbox>
              <span>滚动</span>
              <el-input-number
                v-model="form.parallaxSy"
                size="small"
                :disabled="!form.parallaxLoopY"
                controls-position="right" />
            </div>
            <el-checkbox v-model="form.parallaxShow">在编辑器中显示</el-checkbox>
          </db-group-box>
          <db-group-box title="备注" class="sub-box note-box">
            <el-input v-model="form.note" type="textarea" resize="none" />
          </db-group-box>
        </div>
      </div>
      <db-group-box title="遇敌" class="enc-box">
        <div
          ref="encTable"
          class="enc-table"
          tabindex="0"
          @keydown="onEncKeydown"
          @contextmenu.prevent="onEncMenu($event, -1)">
          <div class="enc-head">
            <span>敌群</span>
            <span>权重</span>
            <span>范围</span>
          </div>
          <div ref="encBody" class="enc-body">
            <div
              v-for="(row, i) in encRows"
              :key="i"
              class="enc-row"
              :class="{ on: encIndex === i }"
              @click="selectEnc(i)"
              @dblclick="activateEnc(i)"
              @contextmenu.prevent.stop="onEncMenu($event, i)">
              <span>{{ troopLabel(row) }}</span>
              <span>{{ row ? row.weight : '' }}</span>
              <span>{{ regionLabel(row) }}</span>
            </div>
          </div>
        </div>
      </db-group-box>
    </div>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" @click="confirm">确定</el-button>
    </template>

    <audio-file-picker-dialog
      :model-value="!!audioTarget"
      :folder="audioTarget || 'bgm'"
      :dialog-title="audioTarget === 'bgs' ? '播放背景声' : '播放背景音乐'"
      :model-name="audioModel.name"
      :model-volume="audioModel.volume"
      :model-pitch="audioModel.pitch"
      :model-pan="audioModel.pan"
      @update:model-value="onAudioVisible"
      @confirm="onAudioConfirm" />

    <picture-name-picker-dialog
      v-model="imgPick.open"
      :folder="imgPick.folder"
      :dialog-title="imgPick.title"
      :model-name="imgPick.name"
      allow-none
      @confirm="onImageConfirm" />

    <el-dialog
      v-model="bbOpen"
      title="战斗背景"
      width="420px"
      append-to-body
      :close-on-click-modal="false">
      <div class="file-line">
        <span class="k">下层</span>
        <el-input :model-value="bb1" size="small" readonly />
        <el-button size="small" @click="openImage('battlebacks1', '战斗背景下层', 'bb1')">...</el-button>
      </div>
      <div class="file-line">
        <span class="k">上层</span>
        <el-input :model-value="bb2" size="small" readonly />
        <el-button size="small" @click="openImage('battlebacks2', '战斗背景上层', 'bb2')">...</el-button>
      </div>
      <template #footer>
        <el-button @click="bbOpen = false">取消</el-button>
        <el-button type="primary" @click="applyBattleback">确定</el-button>
      </template>
    </el-dialog>

    <encounter-edit-dialog
      v-model="encDialog"
      :encounter="encDraft"
      @confirm="onEncounterConfirm" />

    <teleport to="body">
      <ul
        v-show="encMenu.visible"
        ref="encMenuEl"
        class="contextmenu enc-ctx"
        :style="{ left: encMenu.x + 'px', top: encMenu.y + 'px' }"
        @mousedown.stop
        @contextmenu.prevent>
        <li @click="menuNew">新建</li>
        <li :class="{ disabled: !encSelected }" @click="menuEdit">编辑</li>
        <li :class="{ disabled: !encSelected }" @click="menuCopy">复制</li>
        <li :class="{ disabled: !encSelected }" @click="menuCut">剪切</li>
        <li :class="{ disabled: !encClipboard }" @click="menuPaste">粘贴</li>
        <li :class="{ disabled: !encSelected }" @click="removeEncounter">删除</li>
      </ul>
    </teleport>
  </el-dialog>
</template>

<script>
import DataManager from '@/utils/DataManager'
import DbGroupBox from '@/components/database/shared/DbGroupBox.vue'
import AudioFilePickerDialog from '@/components/map/pickers/AudioFilePickerDialog.vue'
import PictureNamePickerDialog from '@/components/map/pickers/PictureNamePickerDialog.vue'
import EncounterEditDialog from '@/components/map/EncounterEditDialog.vue'
import { formatRecordName } from '@/components/database/shared/systemLookups'

let encClipboard = null

function audioOf(src, volume) {
  const a = src || {}
  return {
    name: a.name || '',
    volume: Number.isFinite(a.volume) ? a.volume : volume,
    pitch: Number.isFinite(a.pitch) ? a.pitch : 100,
    pan: Number.isFinite(a.pan) ? a.pan : 0,
  }
}

function blankForm() {
  return {
    name: '',
    displayName: '',
    tilesetId: 1,
    width: 17,
    height: 13,
    scrollType: 0,
    encounterStep: 30,
    autoplayBgm: false,
    autoplayBgs: false,
    bgm: audioOf(null, 90),
    bgs: audioOf(null, 90),
    specifyBattleback: false,
    battleback1Name: '',
    battleback2Name: '',
    disableDashing: false,
    parallaxName: '',
    parallaxLoopX: false,
    parallaxLoopY: false,
    parallaxSx: 0,
    parallaxSy: 0,
    parallaxShow: true,
    note: '',
    encounterList: [],
  }
}

export function formFromMap(info, map) {
  const m = map || {}
  const form = blankForm()
  form.name = (info && info.name) || ''
  form.displayName = m.displayName || ''
  form.tilesetId = m.tilesetId || 1
  form.width = m.width || 17
  form.height = m.height || 13
  form.scrollType = m.scrollType || 0
  form.encounterStep = m.encounterStep || 30
  form.autoplayBgm = !!m.autoplayBgm
  form.autoplayBgs = !!m.autoplayBgs
  form.bgm = audioOf(m.bgm, 90)
  form.bgs = audioOf(m.bgs, 90)
  form.specifyBattleback = !!m.specifyBattleback
  form.battleback1Name = m.battleback1Name || ''
  form.battleback2Name = m.battleback2Name || ''
  form.disableDashing = !!m.disableDashing
  form.parallaxName = m.parallaxName || ''
  form.parallaxLoopX = !!m.parallaxLoopX
  form.parallaxLoopY = !!m.parallaxLoopY
  form.parallaxSx = m.parallaxSx || 0
  form.parallaxSy = m.parallaxSy || 0
  form.parallaxShow = m.parallaxShow !== false
  form.note = m.note || ''
  form.encounterList = (m.encounterList || []).filter((e) => e && e.troopId).map((e) => ({
    troopId: e.troopId,
    weight: e.weight || 1,
    regionSet: Array.isArray(e.regionSet) ? e.regionSet.slice() : [],
  }))
  return form
}

export default {
  name: 'MapSettingsDialog',
  components: {
    DbGroupBox,
    AudioFilePickerDialog,
    PictureNamePickerDialog,
    EncounterEditDialog,
  },
  props: {
    modelValue: { type: Boolean, default: false },
    mode: { type: String, default: 'edit' },
    mapId: { type: Number, default: 0 },
    mapInfo: { type: Object, default: null },
    mapData: { type: Object, default: null },
  },
  emits: ['update:modelValue', 'confirm'],
  data() {
    return {
      form: null,
      tilesets: [],
      audioTarget: '',
      imgPick: { open: false, folder: 'parallaxes', title: '', name: '', target: '' },
      bbOpen: false,
      bb1: '',
      bb2: '',
      encIndex: -1,
      encDialog: false,
      encDraft: null,
      encEditIndex: -1,
      encMenu: { visible: false, x: 0, y: 0 },
      encClipboard: null,
    }
  },
  computed: {
    dialogTitle() {
      if (this.mode === 'create') return '新建地图'
      const id = String(this.mapId || 0).padStart(3, '0')
      return `ID:${id} - 地图设置`
    },
    audioModel() {
      if (!this.form || !this.audioTarget) return audioOf(null, 90)
      return this.form[this.audioTarget] || audioOf(null, 90)
    },
    battlebackLabel() {
      if (!this.form) return ''
      return this.form.battleback1Name || this.form.battleback2Name || ''
    },
    encRows() {
      const list = (this.form && this.form.encounterList) || []
      return list.concat([null])
    },
    encSelected() {
      const list = (this.form && this.form.encounterList) || []
      return this.encIndex >= 0 && !!list[this.encIndex]
    },
  },
  watch: {
    modelValue: {
      immediate: true,
      handler(v) {
        if (!v) {
          this.closeEncMenu()
          return
        }
        this.loadTilesets()
        this.form = this.mode === 'create' ? blankForm() : formFromMap(this.mapInfo, this.mapData)
        this.encIndex = 0
        this.encClipboard = encClipboard
        this.closeEncMenu()
        this.$nextTick(() => {
          if (this.$refs.encTable) this.$refs.encTable.focus()
        })
      },
    },
  },
  created() {
    this._onEncMenuAway = () => this.closeEncMenu()
  },
  beforeUnmount() {
    this.closeEncMenu()
  },
  methods: {
    loadTilesets() {
      let arr = []
      try {
        arr = DataManager.$loadDataSync('Tilesets', false, false) || []
      } catch (e) {
        arr = []
      }
      this.tilesets = arr
        .map((t, i) => (t ? { id: t.id || i, name: t.name || '' } : null))
        .filter(Boolean)
    },
    tilesetLabel(t) {
      return `${String(t.id).padStart(4, '0')} ${t.name || ''}`
    },
    troopLabel(row) {
      if (!row || !row.troopId) return ''
      return formatRecordName('Troops', row.troopId, '')
    },
    regionLabel(row) {
      if (!row) return ''
      const set = row.regionSet || []
      if (!set.length) return '整个地图'
      return set.join(',')
    },
    onAudioVisible(v) {
      if (!v) this.audioTarget = ''
    },
    onAudioConfirm(a) {
      if (!this.form || !this.audioTarget) return
      this.form[this.audioTarget] = audioOf(a, 90)
      this.audioTarget = ''
    },
    openImage(folder, title, target) {
      let name = ''
      if (target === 'bb1') name = this.bb1
      else if (target === 'bb2') name = this.bb2
      else if (this.form) name = this.form[target] || ''
      this.imgPick = { open: true, folder, title, name, target }
    },
    onImageConfirm(name) {
      const target = this.imgPick.target
      if (target === 'bb1') this.bb1 = name || ''
      else if (target === 'bb2') this.bb2 = name || ''
      else if (this.form && target) this.form[target] = name || ''
    },
    openBattleback() {
      this.bb1 = this.form.battleback1Name || ''
      this.bb2 = this.form.battleback2Name || ''
      this.bbOpen = true
    },
    applyBattleback() {
      this.form.battleback1Name = this.bb1 || ''
      this.form.battleback2Name = this.bb2 || ''
      this.bbOpen = false
    },
    selectEnc(i) {
      this.encIndex = i
      if (this.$refs.encTable) this.$refs.encTable.focus()
    },
    activateEnc(i) {
      this.encIndex = i
      const list = (this.form && this.form.encounterList) || []
      this.openEncounter(i < list.length ? i : -1)
    },
    onEncKeydown(e) {
      const list = (this.form && this.form.encounterList) || []
      const max = list.length
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        this.encIndex = this.encIndex <= 0 ? 0 : this.encIndex - 1
        this.scrollEncIntoView()
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        this.encIndex = this.encIndex < 0 ? 0 : Math.min(max, this.encIndex + 1)
        this.scrollEncIntoView()
        return
      }
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        this.activateEnc(this.encIndex < 0 ? max : this.encIndex)
        return
      }
      if (e.key === 'Delete') {
        e.preventDefault()
        this.removeEncounter()
      }
    },
    scrollEncIntoView() {
      this.$nextTick(() => {
        const body = this.$refs.encBody
        const row = body && body.children[this.encIndex]
        if (row && row.scrollIntoView) row.scrollIntoView({ block: 'nearest' })
      })
    },
    onEncMenu(e, index) {
      const max = ((this.form && this.form.encounterList) || []).length
      this.encIndex = index < 0 ? max : index
      this.encMenu = { visible: true, x: e.clientX, y: e.clientY }
      this.$nextTick(() => {
        const el = this.$refs.encMenuEl
        if (!el) return
        const h = el.offsetHeight || 0
        const w = el.offsetWidth || 0
        const pad = 4
        let x = e.clientX
        let y = e.clientY
        if (y + h > window.innerHeight - pad) y = e.clientY - h
        if (y < pad) y = pad
        if (x + w > window.innerWidth - pad) x = window.innerWidth - w - pad
        if (x < pad) x = pad
        this.encMenu.x = x
        this.encMenu.y = y
      })
      window.addEventListener('mousedown', this._onEncMenuAway)
    },
    closeEncMenu() {
      if (this.encMenu) this.encMenu.visible = false
      if (this._onEncMenuAway) window.removeEventListener('mousedown', this._onEncMenuAway)
    },
    menuNew() {
      this.closeEncMenu()
      this.openEncounter(-1)
    },
    menuEdit() {
      if (!this.encSelected) return
      this.closeEncMenu()
      this.openEncounter(this.encIndex)
    },
    menuCopy() {
      if (!this.encSelected) return
      encClipboard = JSON.parse(JSON.stringify(this.form.encounterList[this.encIndex]))
      this.encClipboard = encClipboard
      this.closeEncMenu()
    },
    menuCut() {
      if (!this.encSelected) return
      this.menuCopy()
      this.removeEncounter()
    },
    menuPaste() {
      if (!encClipboard || !this.form) return
      const row = JSON.parse(JSON.stringify(encClipboard))
      const list = this.form.encounterList
      const at = this.encIndex >= 0 && this.encIndex < list.length ? this.encIndex + 1 : list.length
      list.splice(at, 0, row)
      this.encIndex = at
      this.closeEncMenu()
    },
    openEncounter(index) {
      this.encEditIndex = index
      const row = index >= 0 ? this.form.encounterList[index] : null
      this.encDraft = row
        ? JSON.parse(JSON.stringify(row))
        : { troopId: 1, weight: 5, regionSet: [] }
      this.encDialog = true
    },
    onEncounterConfirm(row) {
      const list = this.form.encounterList
      if (this.encEditIndex >= 0 && list[this.encEditIndex]) {
        list.splice(this.encEditIndex, 1, row)
        this.encIndex = this.encEditIndex
      } else {
        list.push(row)
        this.encIndex = list.length - 1
      }
    },
    removeEncounter() {
      const list = this.form && this.form.encounterList
      if (list && list[this.encIndex]) list.splice(this.encIndex, 1)
      if (list && this.encIndex > list.length) this.encIndex = list.length
      this.closeEncMenu()
    },
    confirm() {
      if (!this.form) return
      const form = JSON.parse(JSON.stringify(this.form))
      form.name = String(form.name || '').trim()
      this.$emit('confirm', form)
    },
  },
}
</script>

<style scoped>
.map-set {
  display: flex;
  gap: 10px;
  align-items: stretch;
}
.map-set-main {
  flex: 1.35;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.map-set-sub {
  display: flex;
  gap: 10px;
  min-height: 210px;
}
.sub-box {
  flex: 1;
  min-width: 0;
}
.note-box :deep(.db-group-body),
.note-box :deep(.el-textarea),
.note-box :deep(.el-textarea__inner) {
  height: 100%;
}
.note-box :deep(.db-group-body) {
  display: flex;
}
.note-box :deep(.el-textarea__inner) {
  min-height: 150px;
}
.enc-box {
  flex: 1;
  min-width: 280px;
  display: flex;
  flex-direction: column;
}
.enc-box :deep(.db-group-body) {
  flex: 1;
  min-height: 0;
  display: flex;
}
.pair {
  display: flex;
  gap: 8px;
}
.fld {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: 8px;
  min-width: 0;
  font-size: 12px;
}
.fld :deep(.el-select),
.fld :deep(.el-input-number) {
  width: 100%;
}
.file-line,
.loop-line {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}
.file-line .el-input {
  flex: 1;
}
.file-line .el-checkbox {
  flex: 0 0 auto;
  margin-right: 0;
  white-space: nowrap;
}
.file-line .k,
.loop-line span {
  flex: 0 0 48px;
  font-size: 12px;
}
.dash {
  flex: 0 0 auto !important;
  margin-left: 4px;
}
.loop-line .el-input-number {
  width: 90px;
}
.enc-table {
  flex: 1;
  min-height: 360px;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--app-border, #dcdfe6);
  outline: none;
  font-size: 12px;
}
.enc-head,
.enc-row {
  display: grid;
  grid-template-columns: 1.4fr 64px 72px;
  height: 26px;
  box-sizing: border-box;
}
.enc-head {
  background: var(--app-surface-2, #eef1f6);
  font-weight: 600;
}
.enc-head span,
.enc-row span {
  height: 26px;
  line-height: 26px;
  padding: 0 6px;
  box-sizing: border-box;
  border-right: 1px solid var(--app-border, #e4e7ed);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.enc-body {
  flex: 1;
  overflow: auto;
}
.enc-row:nth-child(even) {
  background: #f4f7fb;
}
.enc-row.on {
  background: #2a5db0;
  color: #fff;
}
.enc-row {
  cursor: default;
}
</style>

<style>
.enc-ctx {
  position: fixed;
  z-index: 5000;
}
.enc-ctx li.disabled {
  opacity: 0.4;
  pointer-events: none;
  cursor: default;
}
</style>
