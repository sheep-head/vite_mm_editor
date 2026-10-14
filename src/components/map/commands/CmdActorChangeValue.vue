<template>
  <el-dialog
    :model-value="modelValue"
    :title="cfg.title"
    width="440px"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
    @update:model-value="$emit('update:modelValue', $event)">
    <el-form size="small" label-width="72px">
      <actor-target-fields v-model="target" />
      <operate-value-fields v-model="ov" />
      <el-form-item v-if="cfg.allowDeath" label="可死亡">
        <el-checkbox v-model="allowDeath">允许减到 0</el-checkbox>
      </el-form-item>
      <el-form-item v-if="cfg.showLevelUp" label="显示">
        <el-checkbox v-model="showLevelUp">显示升级</el-checkbox>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" @click="ok">确定</el-button>
    </template>
  </el-dialog>
</template>

<script>
import ActorTargetFields from '../pickers/ActorTargetFields.vue'
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
  components: { ActorTargetFields, OperateValueFields },
  props: {
    modelValue: { type: Boolean, default: false },
    command: { type: Object, default: null },
    entry: { type: Object, default: null },
  },
  emits: ['update:modelValue', 'confirm'],
  data() {
    return {
      target: { mode: 0, actorId: 0 },
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
        this.target = { mode: p[0] || 0, actorId: p[1] || 0 }
        this.ov = { operation: p[2] || 0, operandType: p[3] || 0, operand: p[4] || 0 }
        if (this.cfg.allowDeath) this.allowDeath = p[5] !== false
        if (this.cfg.showLevelUp) this.showLevelUp = p[5] !== false
      },
    },
  },
  methods: {
    ok() {
      const parameters = [
        this.target.mode,
        this.target.actorId,
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
