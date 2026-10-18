<template>
  <el-dialog
    :model-value="modelValue"
    title="变量操作"
    width="520px"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
    @update:model-value="$emit('update:modelValue', $event)">
    <db-group-box title="变量" class="blk">
      <div class="row">
        <el-radio v-model="mode" value="single">单个</el-radio>
        <id-name-field
          v-model="fromId"
          type="variable"
          width="280px"
          :disabled="mode !== 'single'"
          @update:model-value="onSingle" />
      </div>
      <div class="row">
        <el-radio v-model="mode" value="batch">批量</el-radio>
        <el-input-number
          v-model="fromId"
          :min="1"
          :disabled="mode !== 'batch'"
          controls-position="right"
          style="width: 110px" />
        <span class="sep">~</span>
        <el-input-number
          v-model="toId"
          :min="1"
          :disabled="mode !== 'batch'"
          controls-position="right"
          style="width: 110px" />
      </div>
    </db-group-box>

    <db-group-box title="操作" class="blk">
      <el-radio-group v-model="op">
        <el-radio :value="0">代入</el-radio>
        <el-radio :value="1">加法</el-radio>
        <el-radio :value="2">减法</el-radio>
        <el-radio :value="3">乘法</el-radio>
        <el-radio :value="4">除法</el-radio>
        <el-radio :value="5">取模</el-radio>
      </el-radio-group>
    </db-group-box>

    <db-group-box title="操作数" class="blk">
      <div class="row">
        <el-radio v-model="operandType" :value="0">常量</el-radio>
        <el-input-number
          v-model="constValue"
          :disabled="operandType !== 0"
          controls-position="right"
          style="width: 140px" />
      </div>
      <div class="row">
        <el-radio v-model="operandType" :value="1">变量</el-radio>
        <id-name-field
          v-model="varOperandId"
          type="variable"
          width="260px"
          :disabled="operandType !== 1" />
      </div>
      <div class="row">
        <el-radio v-model="operandType" :value="2">随机数</el-radio>
        <el-input-number
          v-model="randMin"
          :disabled="operandType !== 2"
          controls-position="right"
          style="width: 110px" />
        <span class="sep">~</span>
        <el-input-number
          v-model="randMax"
          :disabled="operandType !== 2"
          controls-position="right"
          style="width: 110px" />
      </div>
      <div class="row">
        <el-radio v-model="operandType" :value="3">游戏数据</el-radio>
        <el-input :model-value="gameDataLabel" readonly size="small" style="width: 220px" :disabled="operandType !== 3" />
        <el-button size="small" :disabled="operandType !== 3" @click="gameDataOpen = true">...</el-button>
      </div>
      <div class="row">
        <el-radio v-model="operandType" :value="4">脚本</el-radio>
        <el-input v-model="scriptText" size="small" :disabled="operandType !== 4" style="width: 300px" />
      </div>
    </db-group-box>

    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" @click="ok">确定</el-button>
    </template>

    <el-dialog
      v-model="gameDataOpen"
      title="游戏数据"
      width="440px"
      append-to-body
      destroy-on-close
      :close-on-click-modal="false">
      <div class="gd-list">
        <div class="gd-row">
          <el-radio v-model="gdType" :value="0">物品</el-radio>
          <id-name-field v-model="gdItem" type="item" width="220px" :disabled="gdType !== 0" />
        </div>
        <div class="gd-row">
          <el-radio v-model="gdType" :value="1">武器</el-radio>
          <id-name-field v-model="gdWeapon" type="weapon" width="220px" :disabled="gdType !== 1" />
        </div>
        <div class="gd-row">
          <el-radio v-model="gdType" :value="2">防具</el-radio>
          <id-name-field v-model="gdArmor" type="armor" width="220px" :disabled="gdType !== 2" />
        </div>
        <div class="gd-row">
          <el-radio v-model="gdType" :value="3">角色</el-radio>
          <id-name-field v-model="gdActor" type="actor" width="160px" :disabled="gdType !== 3" />
          <el-select v-model="gdActorParam" :disabled="gdType !== 3" style="width: 120px" size="small">
            <el-option v-for="(lab, i) in actorParamLabels" :key="i" :value="i" :label="lab" />
          </el-select>
        </div>
        <div class="gd-row">
          <el-radio v-model="gdType" :value="4">敌人</el-radio>
          <el-input-number
            v-model="gdEnemy"
            :min="0"
            :disabled="gdType !== 4"
            controls-position="right"
            style="width: 100px" />
          <el-select v-model="gdEnemyParam" :disabled="gdType !== 4" style="width: 120px" size="small">
            <el-option v-for="(lab, i) in enemyParamLabels" :key="i" :value="i" :label="lab" />
          </el-select>
        </div>
        <div class="gd-row">
          <el-radio v-model="gdType" :value="5">人物</el-radio>
          <el-select v-model="gdChar" :disabled="gdType !== 5" style="width: 120px" size="small">
            <el-option :value="-1" label="玩家" />
            <el-option :value="0" label="本事件" />
            <el-option v-for="n in 20" :key="n" :value="n" :label="'事件 ' + n" />
          </el-select>
          <el-select v-model="gdCharParam" :disabled="gdType !== 5" style="width: 120px" size="small">
            <el-option :value="0" label="地图 X" />
            <el-option :value="1" label="地图 Y" />
            <el-option :value="2" label="方向" />
            <el-option :value="3" label="画面 X" />
            <el-option :value="4" label="画面 Y" />
          </el-select>
        </div>
        <div class="gd-row">
          <el-radio v-model="gdType" :value="6">队伍</el-radio>
          <el-input-number
            v-model="gdParty"
            :min="0"
            :disabled="gdType !== 6"
            controls-position="right"
            style="width: 100px" />
          <span class="hint">成员索引</span>
        </div>
        <div class="gd-row">
          <el-radio v-model="gdType" :value="7">其他</el-radio>
          <el-select v-model="gdOther" :disabled="gdType !== 7" style="width: 160px" size="small">
            <el-option v-for="(lab, i) in otherLabels" :key="i" :value="i" :label="lab" />
          </el-select>
        </div>
      </div>
      <template #footer>
        <el-button @click="gameDataOpen = false">取消</el-button>
        <el-button type="primary" @click="applyGameData">确定</el-button>
      </template>
    </el-dialog>
  </el-dialog>
</template>

<script>
import IdNameField from '@/components/database/shared/IdNameField.vue'
import DbGroupBox from '@/components/database/shared/DbGroupBox.vue'
import { formatRecordName, paramLabels } from '@/components/database/shared/systemLookups'

const OTHER_LABELS = [
  '地图编码',
  '队伍人数',
  '金钱',
  '步数',
  '游戏时间',
  '计时器',
  '存档次数',
  '战斗次数',
  '胜利次数',
  '逃跑次数',
]
const ACTOR_BASE = ['等级', '经验值', 'HP', 'MP']
const ENEMY_BASE = ['HP', 'MP']
const CHAR_LABELS = ['地图 X', '地图 Y', '方向', '画面 X', '画面 Y']

export default {
  name: 'Cmd122Variable',
  components: { IdNameField, DbGroupBox },
  props: {
    modelValue: { type: Boolean, default: false },
    command: { type: Object, default: null },
  },
  emits: ['update:modelValue', 'confirm'],
  data() {
    return {
      mode: 'single',
      fromId: 1,
      toId: 1,
      op: 0,
      operandType: 0,
      constValue: 0,
      varOperandId: 1,
      randMin: 0,
      randMax: 0,
      scriptText: '',
      gdType: 0,
      gdP1: 1,
      gdP2: 0,
      gdItem: 1,
      gdWeapon: 1,
      gdArmor: 1,
      gdActor: 1,
      gdActorParam: 0,
      gdEnemy: 0,
      gdEnemyParam: 0,
      gdChar: -1,
      gdCharParam: 0,
      gdParty: 0,
      gdOther: 0,
      gameDataOpen: false,
      otherLabels: OTHER_LABELS,
    }
  },
  computed: {
    actorParamLabels() {
      return ACTOR_BASE.concat(paramLabels())
    },
    enemyParamLabels() {
      return ENEMY_BASE.concat(paramLabels())
    },
    gameDataLabel() {
      return this.describeGameData(this.gdType, this.gdP1, this.gdP2)
    },
  },
  watch: {
    modelValue: {
      immediate: true,
      handler(v) {
        if (!v) return
        const p = (this.command && this.command.parameters) || [1, 1, 0, 0, 0, 0, 0]
        this.fromId = p[0] || 1
        this.toId = p[1] || this.fromId
        this.op = p[2] || 0
        this.operandType = p[3] || 0
        this.mode = this.fromId === this.toId ? 'single' : 'batch'
        this.constValue = 0
        this.varOperandId = 1
        this.randMin = 0
        this.randMax = 0
        this.scriptText = ''
        this.gdType = 0
        this.gdP1 = 1
        this.gdP2 = 0
        if (this.operandType === 0) this.constValue = p[4] || 0
        else if (this.operandType === 1) this.varOperandId = p[4] || 1
        else if (this.operandType === 2) {
          this.randMin = p[4] || 0
          this.randMax = p[5] || 0
        } else if (this.operandType === 3) {
          this.gdType = p[4] || 0
          this.gdP1 = p[5] != null ? p[5] : 0
          this.gdP2 = p[6] != null ? p[6] : 0
          this.syncGameDataFields()
        } else if (this.operandType === 4) {
          this.scriptText = p[4] != null ? String(p[4]) : ''
        }
      },
    },
  },
  methods: {
    onSingle(id) {
      this.fromId = id
      this.toId = id
    },
    syncGameDataFields() {
      const t = this.gdType
      if (t === 0) this.gdItem = this.gdP1 || 1
      else if (t === 1) this.gdWeapon = this.gdP1 || 1
      else if (t === 2) this.gdArmor = this.gdP1 || 1
      else if (t === 3) {
        this.gdActor = this.gdP1 || 1
        this.gdActorParam = this.gdP2 || 0
      } else if (t === 4) {
        this.gdEnemy = this.gdP1 || 0
        this.gdEnemyParam = this.gdP2 || 0
      } else if (t === 5) {
        this.gdChar = this.gdP1 != null ? this.gdP1 : -1
        this.gdCharParam = this.gdP2 || 0
      } else if (t === 6) this.gdParty = this.gdP1 || 0
      else if (t === 7) this.gdOther = this.gdP1 || 0
    },
    applyGameData() {
      const t = this.gdType
      let p1 = 0
      let p2 = 0
      if (t === 0) p1 = this.gdItem
      else if (t === 1) p1 = this.gdWeapon
      else if (t === 2) p1 = this.gdArmor
      else if (t === 3) {
        p1 = this.gdActor
        p2 = this.gdActorParam
      } else if (t === 4) {
        p1 = this.gdEnemy
        p2 = this.gdEnemyParam
      } else if (t === 5) {
        p1 = this.gdChar
        p2 = this.gdCharParam
      } else if (t === 6) p1 = this.gdParty
      else if (t === 7) p1 = this.gdOther
      this.gdType = t
      this.gdP1 = p1
      this.gdP2 = p2
      this.gameDataOpen = false
    },
    describeGameData(type, p1, p2) {
      if (type === 0) return formatRecordName('Items', p1)
      if (type === 1) return formatRecordName('Weapons', p1)
      if (type === 2) return formatRecordName('Armors', p1)
      if (type === 3) {
        const a = formatRecordName('Actors', p1)
        const lab = this.actorParamLabels[p2] || String(p2)
        return `${a} ${lab}`
      }
      if (type === 4) {
        const lab = this.enemyParamLabels[p2] || String(p2)
        return `敌人#${p1} ${lab}`
      }
      if (type === 5) {
        const who = p1 === -1 ? '玩家' : p1 === 0 ? '本事件' : `事件 ${p1}`
        return `${who} ${CHAR_LABELS[p2] || p2}`
      }
      if (type === 6) return `队伍成员#${p1}`
      if (type === 7) return OTHER_LABELS[p1] || String(p1)
      return ''
    },
    ok() {
      let a = Math.max(1, Number(this.fromId) || 1)
      let b = Math.max(1, Number(this.toId) || a)
      if (this.mode === 'single') b = a
      if (a > b) {
        const t = a
        a = b
        b = t
      }
      const ot = this.operandType
      let parameters
      if (ot === 0) parameters = [a, b, this.op, 0, this.constValue, 0]
      else if (ot === 1) parameters = [a, b, this.op, 1, this.varOperandId, 0]
      else if (ot === 2) parameters = [a, b, this.op, 2, this.randMin, this.randMax]
      else if (ot === 3) parameters = [a, b, this.op, 3, this.gdType, this.gdP1, this.gdP2]
      else parameters = [a, b, this.op, 4, this.scriptText, 0]
      this.$emit('confirm', [
        {
          code: 122,
          indent: (this.command && this.command.indent) || 0,
          parameters,
        },
      ])
      this.$emit('update:modelValue', false)
    },
  },
}
</script>

<style scoped>
.blk {
  margin-bottom: 10px;
}
.row,
.gd-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
  flex-wrap: wrap;
}
.sep {
  margin: 0 2px;
}
.hint {
  color: var(--app-muted, #888);
  font-size: 12px;
}
.gd-list {
  max-height: 420px;
  overflow: auto;
}
</style>
