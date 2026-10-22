<template>
  <div class="s1">
    <div class="s1-left">
      <db-group-box title="游戏标题">
        <el-input v-model="data.gameTitle" size="small" />
      </db-group-box>

      <db-group-box title="初始队伍">
        <focus-list
          v-model="partyFocus"
          :items="data.partyMembers"
          empty-text="（无成员）"
          @activate="onPartyActivate"
          @remove="removeParty"
          @insert="addParty"
          @contextmenu="onPartyCtx">
          <template #default="{ item }">{{ actorLabel(item) }}</template>
        </focus-list>
      </db-group-box>

      <db-group-box title="载具图像">
        <div v-for="v in vehicles" :key="v.key" class="veh-row">
          <span class="veh-lab">{{ v.label }}</span>
          <canvas :ref="'vehCanvas_' + v.key" class="veh-canvas" width="48" height="48" />
          <el-button size="small" @click="openChar(v.key)">...</el-button>
        </div>
      </db-group-box>

      <db-group-box title="初始位置">
        <div v-for="row in posRows" :key="row.key" class="pos-row">
          <span class="pos-lab">{{ row.label }}</span>
          <picker-input-field :model-value="posLabel(row)" empty-text="无" @pick="openPos(row)" />
        </div>
      </db-group-box>
    </div>

    <div class="s1-mid">
      <db-group-box title="货币单位">
        <el-input v-model="data.currencyUnit" size="small" style="width: 80px" />
      </db-group-box>
      <db-group-box title="窗口颜色">
        <div class="tone-big" :style="toneStyle" title="点击编辑" @click="toneVisible = true" />
      </db-group-box>

      <db-group-box title="标题画面">
        <el-form label-width="72px" size="small" class="title-form">
          <el-form-item label="图像1">
            <picker-input-field :model-value="data.title1Name" @pick="openTitle(1)" />
          </el-form-item>
          <el-form-item label="图像2">
            <picker-input-field :model-value="data.title2Name" @pick="openTitle(2)" />
          </el-form-item>
          <el-form-item label="绘制标题">
            <el-checkbox v-model="data.optDrawTitle" />
          </el-form-item>
          <el-form-item label="指令窗口">
            <picker-input-field :model-value="titleCmdLabel" empty-text="" @pick="titleCmdVisible = true" />
          </el-form-item>
        </el-form>
      </db-group-box>

      <db-group-box title="战斗画面">
        <el-radio-group v-model="data.optSideView">
          <el-radio :value="false">正视图</el-radio>
          <el-radio :value="true">侧面图</el-radio>
        </el-radio-group>
      </db-group-box>
      <db-group-box title="战斗系统">
        <el-radio-group v-model="data.battleSystem">
          <el-radio :value="0">回合制</el-radio>
          <el-radio :value="1">时间制(即时)</el-radio>
          <el-radio :value="2">时间制(等待)</el-radio>
        </el-radio-group>
      </db-group-box>
      <db-group-box title="选项">
        <el-checkbox v-for="o in optionList" :key="o.key" v-model="data[o.key]">{{ o.label }}</el-checkbox>
      </db-group-box>
    </div>

    <div class="s1-right">
      <db-group-box title="音乐" class="audio-box">
        <div class="audio-head">
          <span class="col-type">类型</span>
          <span class="col-file">文件名</span>
        </div>
        <focus-list
          v-model="musicFocus"
          :items="musicRows"
          list-class="audio-list"
          :allow-remove="false"
          :allow-insert="false"
          :get-key="(row) => row.key"
          @activate="(i) => openAudio(musicRows[i])"
          @contextmenu="(p) => onAudioCtx(p, 'music')">
          <template #default="{ item }">
            <div class="audio-row">
              <span class="col-type">{{ item.label }}</span>
              <span class="col-file">{{ musicName(item) || '(无)' }}</span>
            </div>
          </template>
        </focus-list>
      </db-group-box>

      <db-group-box title="音效" class="audio-box se-box">
        <div class="audio-head">
          <span class="col-type">类型</span>
          <span class="col-file">文件名</span>
        </div>
        <focus-list
          v-model="seFocus"
          :items="soundLabels"
          list-class="audio-list se-list"
          :allow-remove="false"
          :allow-insert="false"
          @activate="openSound"
          @contextmenu="(p) => onAudioCtx(p, 'se')">
          <template #default="{ item, index }">
            <div class="audio-row">
              <span class="col-type">{{ item }}</span>
              <span class="col-file">{{ (data.sounds[index] && data.sounds[index].name) || '(无)' }}</span>
            </div>
          </template>
        </focus-list>
      </db-group-box>
    </div>

    <popup-context-menu
      :visible="menu.visible"
      :x="menu.x"
      :y="menu.y"
      @update:visible="(v) => (menu.visible = v)">
      <template #default="{ action }">
        <template v-if="menu.kind === 'party'">
          <li @click="action(() => addParty())">添加</li>
          <li :class="{ disabled: !data.partyMembers.length }" @click="action(() => replaceParty(partyFocus))">更改</li>
          <li :class="{ disabled: !data.partyMembers.length }" @click="action(() => removeParty(partyFocus))">删除</li>
          <li class="sep" />
          <li :class="{ disabled: !canPartyMove(-1) }" @click="action(() => moveParty(-1))">上移</li>
          <li :class="{ disabled: !canPartyMove(1) }" @click="action(() => moveParty(1))">下移</li>
        </template>
        <template v-else>
          <li @click="action(() => editFocusedAudio())">编辑</li>
        </template>
      </template>
    </popup-context-menu>

    <id-name-picker-dialog v-model="actorPicker" type="actor" :model-id="1" @confirm="onActorPick" />
    <character-sheet-picker-dialog
      v-model="charPicker"
      :model-name="charName"
      :model-index="charIndex"
      @confirm="onChar" />
    <audio-file-picker-dialog
      v-model="audioPicker"
      :folder="audioFolder"
      :model-name="audioName"
      :model-volume="audioVolume"
      :model-pitch="audioPitch"
      :model-pan="audioPan"
      @confirm="onAudio" />
    <picture-name-picker-dialog
      v-model="titlePicker"
      folder="titles"
      :model-name="titlePickName"
      dialog-title="选择一个图像"
      allow-none
      :show-folders="true"
      @confirm="onTitlePick" />
    <map-designation-dialog
      v-model="posPicker"
      :map-id="posMapId"
      :x="posX"
      :y="posY"
      :allow-none="posAllowNone"
      @confirm="onPosConfirm" />

    <el-dialog v-model="toneVisible" title="窗口颜色" width="420px" append-to-body :close-on-click-modal="false">
      <div class="tone-edit">
        <div v-for="(lab, i) in ['红', '绿', '蓝', '灰']" :key="lab" class="tone-row">
          <span>{{ lab }}</span>
          <el-slider v-model="data.windowTone[i]" :min="i < 3 ? -255 : 0" :max="255" :show-tooltip="false" />
          <el-input-number v-model="data.windowTone[i]" :min="i < 3 ? -255 : 0" :max="255" size="small" controls-position="right" />
        </div>
        <div class="tone-big" :style="toneStyle" />
      </div>
      <template #footer>
        <el-button type="primary" @click="toneVisible = false">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="titleCmdVisible" title="标题指令窗口" width="360px" append-to-body :close-on-click-modal="false">
      <el-form label-width="72px" size="small" v-if="data.titleCommandWindow">
        <el-form-item label="背景">
          <el-select v-model="data.titleCommandWindow.background" style="width: 100%">
            <el-option :value="0" label="窗口" />
            <el-option :value="1" label="暗淡" />
            <el-option :value="2" label="透明" />
          </el-select>
        </el-form-item>
        <el-form-item label="偏移 X">
          <el-input-number v-model="data.titleCommandWindow.offsetX" controls-position="right" />
        </el-form-item>
        <el-form-item label="偏移 Y">
          <el-input-number v-model="data.titleCommandWindow.offsetY" controls-position="right" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button type="primary" @click="titleCmdVisible = false">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import DataManager from '@/utils/DataManager'
import DbGroupBox from './shared/DbGroupBox.vue'
import PickerInputField from './shared/PickerInputField.vue'
import FocusList from '@/components/shared/FocusList.vue'
import PopupContextMenu from '@/components/shared/PopupContextMenu.vue'
import IdNamePickerDialog from '@/components/map/pickers/IdNamePickerDialog.vue'
import CharacterSheetPickerDialog from '@/components/map/pickers/CharacterSheetPickerDialog.vue'
import AudioFilePickerDialog from '@/components/map/pickers/AudioFilePickerDialog.vue'
import PictureNamePickerDialog from '@/components/map/pickers/PictureNamePickerDialog.vue'
import MapDesignationDialog from '@/components/map/MapDesignationDialog.vue'
import { formatRecordName } from './shared/systemLookups'
import {
  imageAbsPath,
  loadImageFile,
  drawCharacterIndexPreview,
  characterSheetLayout,
} from '@/utils/imgAssets'

const VEHICLES = [
  { key: 'boat', label: '小舟' },
  { key: 'ship', label: '大船' },
  { key: 'airship', label: '飞艇' },
]
const SOUND_LABELS = [
  '光标', '确定', '取消', '蜂鸣', '装备', '保存', '读取', '战斗开始',
  '逃跑', '敌人攻击', '敌人受伤', '敌人消灭', '头目消灭1', '头目消灭2',
  '角色受伤', '角色消灭', '恢复', '未命中', '回避', '魔法回避', '魔法反射',
  '商店', '使用物品', '使用技能',
]

function emptyAudio() {
  return { name: '', volume: 90, pitch: 100, pan: 0 }
}

export default {
  name: 'System1Panel',
  components: {
    DbGroupBox,
    PickerInputField,
    FocusList,
    PopupContextMenu,
    IdNamePickerDialog,
    CharacterSheetPickerDialog,
    AudioFilePickerDialog,
    PictureNamePickerDialog,
    MapDesignationDialog,
  },
  props: { data: { type: Object, required: true } },
  data() {
    return {
      vehicles: VEHICLES,
      soundLabels: SOUND_LABELS,
      partyFocus: 0,
      musicFocus: 0,
      seFocus: 0,
      actorPicker: false,
      actorPickMode: 'add',
      actorPickIndex: -1,
      charPicker: false,
      charKey: 'boat',
      audioPicker: false,
      audioTarget: null,
      titlePicker: false,
      titlePickWhich: 1,
      posPicker: false,
      posTarget: null,
      toneVisible: false,
      titleCmdVisible: false,
      menu: { visible: false, x: 0, y: 0, kind: 'party' },
      optionList: [
        { key: 'optTransparent', label: '开始时处于透明状态' },
        { key: 'optFollowers', label: '显示队员跟随' },
        { key: 'optSlipDeath', label: '允许地形伤害致死' },
        { key: 'optFloorDeath', label: '允许地板伤害致死' },
        { key: 'optDisplayTp', label: '窗口中显示 TP' },
        { key: 'optExtraExp', label: '预备队员获得经验值' },
        { key: 'optKeyItemsNumber', label: '显示重要物品数量' },
        { key: 'optAutosave', label: '启用自动存档' },
      ],
    }
  },
  computed: {
    toneStyle() {
      const t = this.data.windowTone || [0, 0, 0, 0]
      const c = (n) => Math.max(0, Math.min(255, 128 + Number(n || 0) / 2))
      return { background: `rgb(${c(t[0])},${c(t[1])},${c(t[2])})` }
    },
    musicRows() {
      return [
        { label: '标题', key: 'titleBgm', folder: 'bgm' },
        { label: '战斗', key: 'battleBgm', folder: 'bgm' },
        { label: '胜利', key: 'victoryMe', folder: 'me' },
        { label: '失败', key: 'defeatMe', folder: 'me' },
        { label: '游戏结束', key: 'gameoverMe', folder: 'me' },
        { label: '小舟', key: 'boat.bgm', folder: 'bgm' },
        { label: '大船', key: 'ship.bgm', folder: 'bgm' },
        { label: '飞艇', key: 'airship.bgm', folder: 'bgm' },
      ]
    },
    posRows() {
      return [
        { key: 'player', label: '玩家', allowNone: false },
        { key: 'boat', label: '小舟', allowNone: true },
        { key: 'ship', label: '大船', allowNone: true },
        { key: 'airship', label: '飞艇', allowNone: true },
      ]
    },
    titleCmdLabel() {
      const tw = this.data.titleCommandWindow || {}
      const bg = ['窗口', '暗淡', '透明'][tw.background] || '窗口'
      return `${bg} (X+${tw.offsetX || 0}, Y+${tw.offsetY || 0})`
    },
    titlePickName() {
      return this.titlePickWhich === 2 ? this.data.title2Name || '' : this.data.title1Name || ''
    },
    charName() {
      return (this.data[this.charKey] && this.data[this.charKey].characterName) || ''
    },
    charIndex() {
      return (this.data[this.charKey] && this.data[this.charKey].characterIndex) || 0
    },
    audioFolder() {
      return (this.audioTarget && this.audioTarget.folder) || 'se'
    },
    audioObj() {
      return this.readAudioTarget() || emptyAudio()
    },
    audioName() {
      return this.audioObj.name || ''
    },
    audioVolume() {
      return this.audioObj.volume
    },
    audioPitch() {
      return this.audioObj.pitch
    },
    audioPan() {
      return this.audioObj.pan
    },
    posMapId() {
      return (this.posTarget && this.posTarget.mapId) || 0
    },
    posX() {
      return (this.posTarget && this.posTarget.x) || 0
    },
    posY() {
      return (this.posTarget && this.posTarget.y) || 0
    },
    posAllowNone() {
      return !!(this.posTarget && this.posTarget.allowNone)
    },
  },
  watch: {
    data: {
      deep: true,
      handler() {
        this.$nextTick(() => this.paintVehicles())
      },
    },
  },
  mounted() {
    this.$nextTick(() => this.paintVehicles())
  },
  methods: {
    actorLabel(id) {
      return formatRecordName('Actors', id)
    },
    mapName(id) {
      try {
        const infos = DataManager.$loadDataSync('MapInfos', false, false) || []
        const m = infos[id]
        if (m && m.name) return m.name
      } catch (e) {
        /* ignore */
      }
      return id ? `地图${id}` : ''
    },
    posLabel(row) {
      const p = this.readPos(row.key)
      if (!p.mapId) return '无'
      const name = this.mapName(p.mapId) || `地图${p.mapId}`
      return `${name} (${p.x}, ${p.y})`
    },
    readPos(key) {
      if (key === 'player') {
        return {
          mapId: this.data.startMapId || 0,
          x: this.data.startX || 0,
          y: this.data.startY || 0,
        }
      }
      const v = this.data[key] || {}
      return {
        mapId: v.startMapId || 0,
        x: v.startX || 0,
        y: v.startY || 0,
      }
    },
    openPos(row) {
      const p = this.readPos(row.key)
      this.posTarget = { key: row.key, allowNone: !!row.allowNone, ...p }
      this.posPicker = true
    },
    onPosConfirm(payload) {
      const t = this.posTarget
      if (!t || !payload) return
      if (t.key === 'player') {
        this.data.startMapId = payload.mapId || 0
        this.data.startX = payload.x || 0
        this.data.startY = payload.y || 0
      } else {
        const v = this.data[t.key]
        if (!v) return
        v.startMapId = payload.mapId || 0
        v.startX = payload.x || 0
        v.startY = payload.y || 0
      }
    },
    async paintVehicles() {
      for (const v of this.vehicles) {
        const refs = this.$refs['vehCanvas_' + v.key]
        const canvas = Array.isArray(refs) ? refs[0] : refs
        if (!canvas) continue
        const ctx = canvas.getContext('2d')
        ctx.clearRect(0, 0, 48, 48)
        const veh = this.data[v.key]
        const name = (veh && veh.characterName) || ''
        if (!name) {
          ctx.fillStyle = '#e8e8e8'
          ctx.fillRect(0, 0, 48, 48)
          continue
        }
        const abs = imageAbsPath('characters', name)
        const img = await loadImageFile(abs)
        if (!img) continue
        const layout = characterSheetLayout(img, name)
        const idx = (veh && veh.characterIndex) || 0
        const dw = layout.cw
        const dh = layout.ch
        canvas.width = Math.max(1, Math.round(dw))
        canvas.height = Math.max(1, Math.round(dh))
        drawCharacterIndexPreview(ctx, img, name, idx, 0, 0, canvas.width, canvas.height)
      }
    },
    openChar(key) {
      this.charKey = key
      this.charPicker = true
    },
    onChar(payload) {
      const v = this.data[this.charKey]
      if (!v || !payload) return
      v.characterName = payload.name || ''
      v.characterIndex = payload.index || 0
      this.$nextTick(() => this.paintVehicles())
    },
    openTitle(which) {
      this.titlePickWhich = which
      this.titlePicker = true
    },
    onTitlePick(name) {
      if (this.titlePickWhich === 2) this.data.title2Name = name || ''
      else this.data.title1Name = name || ''
    },
    onPartyCtx({ event }) {
      this.menu = { visible: true, x: event.clientX, y: event.clientY, kind: 'party' }
    },
    onPartyActivate(i) {
      if (i < 0 || !(this.data.partyMembers || []).length) this.addParty()
      else this.replaceParty(i)
    },
    addParty() {
      this.actorPickMode = 'add'
      this.actorPicker = true
    },
    replaceParty(i) {
      if (i < 0 || i >= (this.data.partyMembers || []).length) return
      this.actorPickMode = 'replace'
      this.actorPickIndex = i
      this.actorPicker = true
    },
    onActorPick(id) {
      if (!id) return
      if (this.actorPickMode === 'replace' && this.actorPickIndex >= 0) {
        this.data.partyMembers.splice(this.actorPickIndex, 1, id)
        this.partyFocus = this.actorPickIndex
      } else {
        this.data.partyMembers.push(id)
        this.partyFocus = this.data.partyMembers.length - 1
      }
    },
    removeParty(i) {
      if (i < 0 || i >= (this.data.partyMembers || []).length) return
      this.data.partyMembers.splice(i, 1)
      this.partyFocus = Math.min(i, Math.max(0, this.data.partyMembers.length - 1))
    },
    canPartyMove(dir) {
      const j = this.partyFocus + dir
      return this.partyFocus >= 0 && j >= 0 && j < (this.data.partyMembers || []).length
    },
    moveParty(dir) {
      if (!this.canPartyMove(dir)) return
      const i = this.partyFocus
      const j = i + dir
      const arr = this.data.partyMembers
      const [x] = arr.splice(i, 1)
      arr.splice(j, 0, x)
      this.partyFocus = j
    },
    musicName(row) {
      const a = this.audioByKey(row.key)
      return a && a.name
    },
    audioByKey(key) {
      if (key.includes('.')) {
        const [a, b] = key.split('.')
        return this.data[a] && this.data[a][b]
      }
      return this.data[key]
    },
    openAudio(row) {
      if (!this.audioByKey(row.key)) {
        if (row.key.includes('.')) {
          const [a, b] = row.key.split('.')
          this.data[a][b] = emptyAudio()
        } else this.data[row.key] = emptyAudio()
      }
      this.audioTarget = { kind: 'key', key: row.key, folder: row.folder }
      this.audioPicker = true
    },
    openSound(i) {
      while (this.data.sounds.length <= i) this.data.sounds.push(emptyAudio())
      if (!this.data.sounds[i]) this.data.sounds.splice(i, 1, emptyAudio())
      this.audioTarget = { kind: 'sound', index: i, folder: 'se' }
      this.audioPicker = true
    },
    readAudioTarget() {
      const t = this.audioTarget
      if (!t) return null
      if (t.kind === 'sound') return this.data.sounds[t.index]
      return this.audioByKey(t.key)
    },
    onAudio(audio) {
      const cur = this.readAudioTarget()
      if (!cur || !audio) return
      cur.name = audio.name || ''
      cur.volume = audio.volume
      cur.pitch = audio.pitch
      cur.pan = audio.pan
    },
    onAudioCtx({ event }, kind) {
      this.menu = { visible: true, x: event.clientX, y: event.clientY, kind }
    },
    editFocusedAudio() {
      if (this.menu.kind === 'music') this.openAudio(this.musicRows[this.musicFocus])
      else this.openSound(this.seFocus)
    },
  },
}
</script>

<style scoped>
.s1 {
  display: grid;
  grid-template-columns: 1.05fr 1fr 1.15fr;
  gap: 8px;
  align-items: start;
  height: 100%;
  min-height: 0;
}
.s1-left,
.s1-mid,
.s1-right {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
}
.s1-left :deep(.focus-list) {
  min-height: 72px;
  max-height: 160px;
}
.veh-row,
.pos-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  font-size: 12px;
}
.veh-lab,
.pos-lab {
  width: 40px;
  flex-shrink: 0;
}
.veh-canvas {
  width: 48px;
  height: 48px;
  border: 1px solid var(--app-border, #ccc);
  background: #eee;
  image-rendering: pixelated;
}
.pos-row .picker-input-field {
  flex: 1;
  min-width: 0;
}
.title-form :deep(.el-form-item__content) {
  display: block;
  line-height: normal;
}
.tone-big {
  width: 100%;
  height: 72px;
  border: 1px solid #999;
  cursor: pointer;
}
.tone-edit .tone-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.tone-edit .tone-row > span {
  width: 24px;
}
.tone-edit .el-slider {
  flex: 1;
}
.s1-mid :deep(.el-form-item) {
  margin-bottom: 8px;
}
.s1-mid :deep(.el-checkbox) {
  display: flex;
  margin-right: 0;
  margin-bottom: 2px;
}
.audio-box {
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.audio-head,
.audio-row {
  display: flex;
  align-items: center;
  font-size: 12px;
}
.audio-head {
  padding: 4px 8px;
  background: #f0f2f5;
  border: 1px solid var(--app-border, #ddd);
  border-bottom: none;
  font-weight: 600;
}
.audio-list {
  max-height: 180px;
  border-top: none;
}
.se-list {
  max-height: 280px;
}
.col-type {
  width: 88px;
  flex-shrink: 0;
}
.col-file {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.audio-row {
  display: flex;
  align-items: center;
  width: 100%;
  min-width: 0;
}
</style>
