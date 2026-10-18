<template>
  <div class="s1">
    <div class="s1-left">
      <db-group-box title="基本">
        <el-form label-width="88px" size="small">
          <el-form-item label="游戏标题">
            <el-input v-model="data.gameTitle" />
          </el-form-item>
          <el-form-item label="货币单位">
            <el-input v-model="data.currencyUnit" style="width: 80px" />
          </el-form-item>
          <el-form-item label="窗口颜色">
            <span class="tone" :style="toneStyle" />
            <el-input-number v-model="data.windowTone[0]" :controls="false" class="tone-n" />
            <el-input-number v-model="data.windowTone[1]" :controls="false" class="tone-n" />
            <el-input-number v-model="data.windowTone[2]" :controls="false" class="tone-n" />
            <el-input-number v-model="data.windowTone[3]" :controls="false" class="tone-n" />
          </el-form-item>
        </el-form>
      </db-group-box>
      <db-group-box title="初始队伍">
        <ul class="party">
          <li v-for="(id, i) in data.partyMembers" :key="i">
            {{ actorLabel(id) }}
            <el-button link type="danger" @click="data.partyMembers.splice(i, 1)">删除</el-button>
          </li>
        </ul>
        <el-button size="small" @click="actorPicker = true">添加成员…</el-button>
      </db-group-box>
      <db-group-box title="载具图像">
        <div v-for="v in vehicles" :key="v.key" class="veh-row">
          <span>{{ v.label }}</span>
          <span class="veh-name">{{ data[v.key].characterName || '(无)' }}:{{ data[v.key].characterIndex }}</span>
          <el-button size="small" @click="openChar(v.key)">...</el-button>
        </div>
      </db-group-box>
      <db-group-box title="初始位置">
        <div class="pos-row">
          <span>玩家</span>
          <el-input-number v-model="data.startMapId" :min="0" :controls="false" class="tone-n" />
          <el-input-number v-model="data.startX" :controls="false" class="tone-n" />
          <el-input-number v-model="data.startY" :controls="false" class="tone-n" />
        </div>
        <div v-for="v in vehicles" :key="'p' + v.key" class="pos-row">
          <span>{{ v.label }}</span>
          <el-input-number v-model="data[v.key].startMapId" :min="0" :controls="false" class="tone-n" />
          <el-input-number v-model="data[v.key].startX" :controls="false" class="tone-n" />
          <el-input-number v-model="data[v.key].startY" :controls="false" class="tone-n" />
        </div>
      </db-group-box>
    </div>
    <div class="s1-mid">
      <db-group-box title="标题画面">
        <el-form label-width="88px" size="small">
          <el-form-item label="背景 1">
            <el-input v-model="data.title1Name" />
          </el-form-item>
          <el-form-item label="背景 2">
            <el-input v-model="data.title2Name" />
          </el-form-item>
          <el-form-item label="绘制标题">
            <el-switch v-model="data.optDrawTitle" />
          </el-form-item>
          <el-form-item label="指令窗口">
            <el-select v-model="data.titleCommandWindow" style="width: 120px">
              <el-option :value="0" label="左侧" />
              <el-option :value="1" label="居中" />
              <el-option :value="2" label="右侧" />
            </el-select>
          </el-form-item>
        </el-form>
      </db-group-box>
      <db-group-box title="战斗画面">
        <el-radio-group v-model="data.optSideView">
          <el-radio :value="false">正视图</el-radio>
          <el-radio :value="true">侧视图</el-radio>
        </el-radio-group>
      </db-group-box>
      <db-group-box title="战斗系统">
        <el-radio-group v-model="data.battleSystem">
          <el-radio :value="0">回合制</el-radio>
          <el-radio :value="1">时间进度(活动)</el-radio>
          <el-radio :value="2">时间进度(等待)</el-radio>
        </el-radio-group>
      </db-group-box>
      <db-group-box title="选项">
        <el-checkbox v-for="o in optionList" :key="o.key" v-model="data[o.key]">{{ o.label }}</el-checkbox>
      </db-group-box>
    </div>
    <div class="s1-right">
      <db-group-box title="音乐">
        <div v-for="row in musicRows" :key="row.key" class="audio-row">
          <span>{{ row.label }}</span>
          <span class="audio-name">{{ musicName(row) || '(无)' }}</span>
          <el-button size="small" @click="openAudio(row)">...</el-button>
        </div>
      </db-group-box>
      <db-group-box title="音效">
        <el-scrollbar max-height="280px">
          <div v-for="(label, i) in soundLabels" :key="i" class="audio-row">
            <span>{{ label }}</span>
            <span class="audio-name">{{ (data.sounds[i] && data.sounds[i].name) || '(无)' }}</span>
            <el-button size="small" @click="openSound(i)">...</el-button>
          </div>
        </el-scrollbar>
      </db-group-box>
    </div>
    <id-name-picker-dialog v-model="actorPicker" type="actor" :model-id="1" @confirm="addActor" />
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
  </div>
</template>

<script>
import DbGroupBox from './shared/DbGroupBox.vue'
import IdNamePickerDialog from '@/components/map/pickers/IdNamePickerDialog.vue'
import CharacterSheetPickerDialog from '@/components/map/pickers/CharacterSheetPickerDialog.vue'
import AudioFilePickerDialog from '@/components/map/pickers/AudioFilePickerDialog.vue'
import { formatRecordName } from './shared/systemLookups'

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
  components: { DbGroupBox, IdNamePickerDialog, CharacterSheetPickerDialog, AudioFilePickerDialog },
  props: { data: { type: Object, required: true } },
  data() {
    return {
      vehicles: VEHICLES,
      soundLabels: SOUND_LABELS,
      actorPicker: false,
      charPicker: false,
      charKey: 'boat',
      audioPicker: false,
      audioTarget: null,
      optionList: [
        { key: 'optFollowers', label: '队员跟随' },
        { key: 'optSlipDeath', label: '允许滑倒死亡' },
        { key: 'optFloorDeath', label: '允许地板伤害死亡' },
        { key: 'optDisplayTp', label: '显示 TP' },
        { key: 'optExtraExp', label: '预备成员获得经验' },
        { key: 'optTransparent', label: '初始透明' },
        { key: 'optAutosave', label: '自动保存' },
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
  },
  methods: {
    actorLabel(id) {
      return formatRecordName('Actors', id)
    },
    addActor(id) {
      if (!id) return
      this.data.partyMembers.push(id)
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
  },
}
</script>

<style scoped>
.s1 {
  display: grid;
  grid-template-columns: 1.1fr 1fr 1fr;
  gap: 8px;
  align-items: start;
}
.s1-left, .s1-mid, .s1-right {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.tone {
  display: inline-block;
  width: 36px;
  height: 18px;
  border: 1px solid #999;
  margin-right: 6px;
  vertical-align: middle;
}
.tone-n {
  width: 64px;
  margin-right: 4px;
}
.party {
  list-style: none;
  margin: 0 0 6px;
  padding: 0;
  min-height: 48px;
}
.party li {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  padding: 2px 0;
}
.veh-row, .pos-row, .audio-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
  font-size: 12px;
}
.veh-name, .audio-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.s1-mid :deep(.el-checkbox) {
  display: flex;
  margin-right: 0;
}
</style>
