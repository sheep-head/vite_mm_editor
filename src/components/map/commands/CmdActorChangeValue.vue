<template>
  <el-dialog
    :model-value="modelValue"
    :title="cfg.title"
    width="460px"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
    @update:model-value="$emit('update:modelValue', $event)">
    <db-group-box title="角色" class="blk">
      <div class="row">
        <el-radio v-model="mode" :value="0">固定</el-radio>
        <id-name-field
          v-model="fixedId"
          type="actor"
          width="260px"
          zero-label="全体"
          :disabled="mode !== 0" />
      </div>
      <div class="row">
        <el-radio v-model="mode" :value="1">变量</el-radio>
        <id-name-field
          v-model="varId"
          type="variable"
          width="260px"
          :disabled="mode !== 1" />
      </div>
    </db-group-box>
    <operate-value-fields v-model="ov" />
    <el-checkbox v-if="cfg.allowDeath" v-model="allowDeath" class="extra">允许死亡</el-checkbox>
    <el-checkbox v-if="cfg.showLevelUp" v-model="showLevelUp" class="extra">显示升级</el-checkbox>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" @click="ok">确定</el-button>
    </template>
  </el-dialog>
</template>

<script>
import IdNameField from '@/components/database/shared/IdNameField.vue'
import DbGroupBox from '@/components/database/shared/DbGroupBox.vue'
import OperateValueFields from '../pickers/OperateValueFields.vue'

const CFG = {
  311: { title: '增减生命值', allowDeath: true },
  312: { title: '增减魔法值' },
  342: { title: '增减特技值' },
  315: { title: '增减经验值', showLevelUp: true },
  316: { title: '增减等级', showLevelUp: true },
}

export default {
  name: 'CmdActorChangeValue',
  components: { IdNameField, DbGroupBox, OperateValueFields },
  props: {
    modelValue: { type: Boolean, default: false },
    command: { type: Object, default: null },
    entry: { type: Object, default: null },
  },
  emits: ['update:modelValue', 'confirm'],
  data() {
    return {
      mode: 0,
      fixedId: 1,
      varId: 1,
      ov: { operation: 0, operandType: 0, operand: 0 },
      allowDeath: true,
      showLevelUp: true,
    }
  },
  computed: {
    code() {
      return (this.entry && this.entry.code) || (this.command && this.command.code) || 311
    },
    cfg() {
      return CFG[this.code] || { title: '角色数值' }
    },
  },
  watch: {
    modelValue: {
      immediate: true,
      handler(v) {
        if (!v) return
        const p = (this.command && this.command.parameters) || [0, 0, 0, 0, 0, true]
        this.mode = p[0] === 1 ? 1 : 0
        const id = p[1] || 0
        if (this.mode === 0) this.fixedId = id
        else this.varId = id || 1
        this.ov = { operation: p[2] || 0, operandType: p[3] || 0, operand: p[4] || 0 }
        if (this.cfg.allowDeath) this.allowDeath = p[5] !== false
        if (this.cfg.showLevelUp) this.showLevelUp = p[5] !== false
      },
    },
  },
  methods: {
    ok() {
      const parameters = [
        this.mode,
        this.mode === 0 ? this.fixedId : this.varId,
        this.ov.operation,
        this.ov.operandType,
        this.ov.operand,
      ]
      if (this.cfg.allowDeath) parameters.push(this.allowDeath)
      else if (this.cfg.showLevelUp) parameters.push(this.showLevelUp)
      this.$emit('confirm', [
        {
          code: this.code,
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
.row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.row:last-child {
  margin-bottom: 0;
}
.extra {
  margin-top: 10px;
}
</style>
