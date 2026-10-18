<template>
  <el-dialog
    :model-value="modelValue"
    title="分支条件"
    width="560px"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
    @update:model-value="$emit('update:modelValue', $event)">
    <el-radio-group v-model="page" size="small" class="page-tabs">
      <el-radio-button :value="1">1</el-radio-button>
      <el-radio-button :value="2">2</el-radio-button>
      <el-radio-button :value="3">3</el-radio-button>
      <el-radio-button :value="4">4</el-radio-button>
    </el-radio-group>

    <div v-show="page === 1" class="page">
      <div class="cond-row">
        <el-radio v-model="kind" :value="0" size="small">开关</el-radio>
        <id-name-field v-model="switchId" type="switch" :disabled="kind !== 0" width="220px" />
        <span>为</span>
        <el-select v-model="switchOn" size="small" :disabled="kind !== 0" style="width: 88px">
          <el-option :value="0" label="ON" />
          <el-option :value="1" label="OFF" />
        </el-select>
      </div>
      <div class="cond-row">
        <el-radio v-model="kind" :value="1" size="small">变量</el-radio>
        <id-name-field v-model="varId" type="variable" :disabled="kind !== 1" width="180px" />
        <el-select v-model="varOp" size="small" :disabled="kind !== 1" style="width: 72px">
          <el-option v-for="(lab, i) in cmpLabels" :key="i" :value="i" :label="lab" />
        </el-select>
      </div>
      <div class="cond-sub">
        <el-radio v-model="varOperandType" :value="0" size="small" :disabled="kind !== 1">常量</el-radio>
        <el-input-number
          v-model="varConst"
          size="small"
          :disabled="kind !== 1 || varOperandType !== 0"
          controls-position="right" />
      </div>
      <div class="cond-sub">
        <el-radio v-model="varOperandType" :value="1" size="small" :disabled="kind !== 1">变量</el-radio>
        <id-name-field v-model="varOperandId" type="variable" :disabled="kind !== 1 || varOperandType !== 1" width="180px" />
      </div>
      <div class="cond-row">
        <el-radio v-model="kind" :value="2" size="small">独立开关</el-radio>
        <el-select v-model="selfSwitch" size="small" :disabled="kind !== 2" style="width: 72px">
          <el-option v-for="c in ['A','B','C','D']" :key="c" :value="c" :label="c" />
        </el-select>
        <span>为</span>
        <el-select v-model="selfOn" size="small" :disabled="kind !== 2" style="width: 88px">
          <el-option :value="0" label="ON" />
          <el-option :value="1" label="OFF" />
        </el-select>
      </div>
      <div class="cond-row">
        <el-radio v-model="kind" :value="3" size="small">计时器</el-radio>
        <el-select v-model="timerOp" size="small" :disabled="kind !== 3" style="width: 72px">
          <el-option :value="0" label="≥" />
          <el-option :value="1" label="≤" />
        </el-select>
        <el-input-number
          v-model="timerSec"
          size="small"
          :min="0"
          :disabled="kind !== 3"
          controls-position="right" />
        <span>秒</span>
      </div>
    </div>

    <div v-show="page === 2" class="page">
      <div class="cond-row">
        <el-radio v-model="kind" :value="4" size="small">角色</el-radio>
        <id-name-field v-model="actorId" type="actor" :disabled="kind !== 4" width="220px" />
      </div>
      <div class="cond-sub"><el-radio v-model="actorType" :value="0" size="small" :disabled="kind !== 4">在队伍中</el-radio></div>
      <div class="cond-sub">
        <el-radio v-model="actorType" :value="1" size="small" :disabled="kind !== 4">名称</el-radio>
        <el-input v-model="actorName" size="small" :disabled="kind !== 4 || actorType !== 1" style="width: 180px" />
      </div>
      <div class="cond-sub">
        <el-radio v-model="actorType" :value="2" size="small" :disabled="kind !== 4">职业</el-radio>
        <id-name-field v-model="actorClassId" type="class" :disabled="kind !== 4 || actorType !== 2" width="180px" />
      </div>
      <div class="cond-sub">
        <el-radio v-model="actorType" :value="3" size="small" :disabled="kind !== 4">技能</el-radio>
        <id-name-field v-model="actorSkillId" type="skill" :disabled="kind !== 4 || actorType !== 3" width="180px" />
      </div>
      <div class="cond-sub">
        <el-radio v-model="actorType" :value="4" size="small" :disabled="kind !== 4">武器</el-radio>
        <id-name-field v-model="actorWeaponId" type="weapon" :disabled="kind !== 4 || actorType !== 4" width="180px" />
      </div>
      <div class="cond-sub">
        <el-radio v-model="actorType" :value="5" size="small" :disabled="kind !== 4">防具</el-radio>
        <id-name-field v-model="actorArmorId" type="armor" :disabled="kind !== 4 || actorType !== 5" width="180px" />
      </div>
      <div class="cond-sub">
        <el-radio v-model="actorType" :value="6" size="small" :disabled="kind !== 4">状态</el-radio>
        <id-name-field v-model="actorStateId" type="state" :disabled="kind !== 4 || actorType !== 6" width="180px" />
      </div>
    </div>

    <div v-show="page === 3" class="page">
      <div class="cond-row">
        <el-radio v-model="kind" :value="5" size="small">敌人</el-radio>
        <el-input-number
          v-model="enemyIndex"
          size="small"
          :min="0"
          :disabled="kind !== 5"
          controls-position="right" />
      </div>
      <div class="cond-sub"><el-radio v-model="enemyType" :value="0" size="small" :disabled="kind !== 5">已经出现</el-radio></div>
      <div class="cond-sub">
        <el-radio v-model="enemyType" :value="1" size="small" :disabled="kind !== 5">状态</el-radio>
        <id-name-field v-model="enemyStateId" type="state" :disabled="kind !== 5 || enemyType !== 1" width="180px" />
      </div>
      <div class="cond-row">
        <el-radio v-model="kind" :value="6" size="small">人物</el-radio>
        <el-select v-model="charId" size="small" :disabled="kind !== 6" style="width: 140px">
          <el-option :value="-1" label="玩家" />
          <el-option :value="0" label="本事件" />
          <el-option v-for="n in 10" :key="n" :value="n" :label="'事件 ' + n" />
        </el-select>
        <span>朝向</span>
        <el-select v-model="charDir" size="small" :disabled="kind !== 6" style="width: 88px">
          <el-option :value="2" label="下" />
          <el-option :value="4" label="左" />
          <el-option :value="6" label="右" />
          <el-option :value="8" label="上" />
        </el-select>
      </div>
      <div class="cond-row">
        <el-radio v-model="kind" :value="13" size="small">载具</el-radio>
        <el-select v-model="vehicleType" size="small" :disabled="kind !== 13" style="width: 120px">
          <el-option :value="0" label="小舟" />
          <el-option :value="1" label="大船" />
          <el-option :value="2" label="飞空艇" />
        </el-select>
        <span>正被乘坐</span>
      </div>
    </div>

    <div v-show="page === 4" class="page">
      <div class="cond-row">
        <el-radio v-model="kind" :value="7" size="small">金币</el-radio>
        <el-select v-model="goldOp" size="small" :disabled="kind !== 7" style="width: 72px">
          <el-option v-for="(lab, i) in cmpLabels" :key="'g'+i" :value="i" :label="lab" />
        </el-select>
        <el-input-number
          v-model="goldValue"
          size="small"
          :min="0"
          :disabled="kind !== 7"
          controls-position="right" />
      </div>
      <div class="cond-row">
        <el-radio v-model="kind" :value="8" size="small">物品</el-radio>
        <id-name-field v-model="itemId" type="item" :disabled="kind !== 8" width="220px" />
      </div>
      <div class="cond-row">
        <el-radio v-model="kind" :value="9" size="small">武器</el-radio>
        <id-name-field v-model="weaponId" type="weapon" :disabled="kind !== 9" width="220px" />
      </div>
      <div class="cond-sub">
        <el-checkbox v-model="weaponInclude" size="small" :disabled="kind !== 9">包括装备</el-checkbox>
      </div>
      <div class="cond-row">
        <el-radio v-model="kind" :value="10" size="small">防具</el-radio>
        <id-name-field v-model="armorId" type="armor" :disabled="kind !== 10" width="220px" />
      </div>
      <div class="cond-sub">
        <el-checkbox v-model="armorInclude" size="small" :disabled="kind !== 10">包括装备</el-checkbox>
      </div>
      <div class="cond-row">
        <el-radio v-model="kind" :value="11" size="small">按键</el-radio>
        <el-select v-model="buttonId" size="small" :disabled="kind !== 11" style="width: 140px">
          <el-option v-for="(lab, i) in buttonNames" :key="i" :value="i" :label="lab" />
        </el-select>
      </div>
      <div class="cond-row">
        <el-radio v-model="kind" :value="12" size="small">脚本</el-radio>
        <el-input v-model="script" size="small" :disabled="kind !== 12" style="width: 320px" />
      </div>
    </div>

    <el-checkbox v-model="elseBranch" size="small" class="else-check">创建条件不满足时的分支</el-checkbox>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" @click="ok">确定</el-button>
    </template>
  </el-dialog>
</template>

<script>
import IdNameField from '@/components/database/shared/IdNameField.vue'

const PAGE_OF = { 0: 1, 1: 1, 2: 1, 3: 1, 4: 2, 5: 3, 6: 3, 13: 3, 7: 4, 8: 4, 9: 4, 10: 4, 11: 4, 12: 4 }

export default {
  name: 'Cmd111Branch',
  components: { IdNameField },
  props: {
    modelValue: { type: Boolean, default: false },
    command: { type: Object, default: null },
  },
  emits: ['update:modelValue', 'confirm'],
  data() {
    return {
      page: 1,
      kind: 0,
      elseBranch: true,
      cmpLabels: ['=', '≥', '≤', '>', '<', '≠'],
      buttonNames: ['确定', '取消', 'Shift', '下', '左', '右', '上', 'PageUp', 'PageDown'],
      switchId: 1,
      switchOn: 0,
      varId: 1,
      varOp: 0,
      varOperandType: 0,
      varConst: 0,
      varOperandId: 1,
      selfSwitch: 'A',
      selfOn: 0,
      timerOp: 0,
      timerSec: 0,
      actorId: 1,
      actorType: 0,
      actorName: '',
      actorClassId: 1,
      actorSkillId: 1,
      actorWeaponId: 1,
      actorArmorId: 1,
      actorStateId: 1,
      enemyIndex: 0,
      enemyType: 0,
      enemyStateId: 1,
      charId: -1,
      charDir: 2,
      vehicleType: 0,
      goldOp: 0,
      goldValue: 0,
      itemId: 1,
      weaponId: 1,
      weaponInclude: false,
      armorId: 1,
      armorInclude: false,
      buttonId: 0,
      script: '',
    }
  },
  watch: {
    modelValue: {
      immediate: true,
      handler(v) {
        if (!v) return
        this.loadFrom((this.command && this.command.parameters) || [])
        this.elseBranch = this.command && this.command._hasElse != null ? !!this.command._hasElse : true
      },
    },
    kind(k) {
      this.page = PAGE_OF[k] || 1
    },
  },
  methods: {
    loadFrom(p) {
      const kind = p[0] != null ? p[0] : 0
      this.kind = kind
      this.page = PAGE_OF[kind] || 1
      if (kind === 0) {
        this.switchId = p[1] || 1
        this.switchOn = p[2] === 1 ? 1 : 0
      } else if (kind === 1) {
        this.varId = p[1] || 1
        this.varOp = p[2] || 0
        if (p.length >= 5) {
          this.varOperandType = p[3] === 1 ? 1 : 0
          if (this.varOperandType === 1) this.varOperandId = p[4] || 1
          else this.varConst = p[4] || 0
        } else {
          this.varOperandType = 0
          this.varConst = p[3] || 0
        }
      } else if (kind === 2) {
        this.selfSwitch = p[1] || 'A'
        this.selfOn = p[2] === 1 ? 1 : 0
      } else if (kind === 3) {
        this.timerOp = p[1] === 1 ? 1 : 0
        this.timerSec = p[2] || 0
      } else if (kind === 4) {
        this.actorId = p[1] || 1
        this.actorType = p[2] || 0
        if (this.actorType === 1) this.actorName = p[3] || ''
        else if (this.actorType === 2) this.actorClassId = p[3] || 1
        else if (this.actorType === 3) this.actorSkillId = p[3] || 1
        else if (this.actorType === 4) this.actorWeaponId = p[3] || 1
        else if (this.actorType === 5) this.actorArmorId = p[3] || 1
        else if (this.actorType === 6) this.actorStateId = p[3] || 1
      } else if (kind === 5) {
        this.enemyIndex = p[1] || 0
        this.enemyType = p[2] === 1 ? 1 : 0
        this.enemyStateId = p[3] || 1
      } else if (kind === 6) {
        this.charId = p[1] != null ? p[1] : -1
        this.charDir = p[2] || 2
      } else if (kind === 7) {
        this.goldOp = p[1] || 0
        this.goldValue = p[2] || 0
      } else if (kind === 8) this.itemId = p[1] || 1
      else if (kind === 9) {
        this.weaponId = p[1] || 1
        this.weaponInclude = !!p[2]
      } else if (kind === 10) {
        this.armorId = p[1] || 1
        this.armorInclude = !!p[2]
      } else if (kind === 11) this.buttonId = p[1] || 0
      else if (kind === 12) this.script = p[1] != null ? String(p[1]) : ''
      else if (kind === 13) this.vehicleType = p[1] || 0
    },
    buildParameters() {
      const k = this.kind
      if (k === 0) return [0, this.switchId, this.switchOn]
      if (k === 1) {
        const operand = this.varOperandType === 1 ? this.varOperandId : this.varConst
        return [1, this.varId, this.varOp, this.varOperandType, operand]
      }
      if (k === 2) return [2, this.selfSwitch, this.selfOn]
      if (k === 3) return [3, this.timerOp, this.timerSec]
      if (k === 4) {
        const extra = [0, this.actorName, this.actorClassId, this.actorSkillId, this.actorWeaponId, this.actorArmorId, this.actorStateId]
        const third = this.actorType === 0 ? 0 : extra[this.actorType]
        return this.actorType === 0 ? [4, this.actorId, 0] : [4, this.actorId, this.actorType, third]
      }
      if (k === 5) return this.enemyType === 1
        ? [5, this.enemyIndex, 1, this.enemyStateId]
        : [5, this.enemyIndex, 0]
      if (k === 6) return [6, this.charId, this.charDir]
      if (k === 7) return [7, this.goldOp, this.goldValue]
      if (k === 8) return [8, this.itemId]
      if (k === 9) return [9, this.weaponId, this.weaponInclude]
      if (k === 10) return [10, this.armorId, this.armorInclude]
      if (k === 11) return [11, this.buttonId]
      if (k === 12) return [12, this.script]
      if (k === 13) return [13, this.vehicleType]
      return [0, 1, 0]
    },
    ok() {
      const indent = (this.command && this.command.indent) || 0
      const parameters = this.buildParameters()
      const editing = this.command && Array.isArray(this.command.parameters) && this.command.parameters.length > 0
      const head = { code: 111, indent, parameters }
      if (editing) {
        this.$emit('confirm', [{ ...head, elseBranch: this.elseBranch }])
      } else {
        const cmds = [head, { code: 0, indent: indent + 1, parameters: [] }]
        if (this.elseBranch) {
          cmds.push({ code: 411, indent, parameters: [] })
          cmds.push({ code: 0, indent: indent + 1, parameters: [] })
        }
        cmds.push({ code: 412, indent, parameters: [] })
        this.$emit('confirm', cmds)
      }
      this.$emit('update:modelValue', false)
    },
  },
}
</script>

<style scoped>
.page-tabs { margin-bottom: 10px; }
.page { display: flex; flex-direction: column; gap: 8px; min-height: 220px; }
.cond-row, .cond-sub {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.cond-sub { padding-left: 28px; }
.else-check { margin-top: 12px; }
</style>
