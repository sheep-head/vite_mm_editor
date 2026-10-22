<template>
  <el-dialog
    :model-value="modelValue"
    title="战斗处理"
    width="440px"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
    @update:model-value="$emit('update:modelValue', $event)">
    <db-group-box title="敌群" class="battle-box">
      <div class="battle-opt">
        <el-radio v-model="designation" :value="0">直接指定</el-radio>
        <id-name-field
          v-model="troopId"
          type="troop"
          width="220px"
          :disabled="designation !== 0"
          :allow-none="false" />
      </div>
      <div class="battle-opt">
        <el-radio v-model="designation" :value="1">变量指定</el-radio>
        <id-name-field
          v-model="varId"
          type="variable"
          width="220px"
          :disabled="designation !== 1"
          :allow-none="false" />
      </div>
      <div class="battle-opt">
        <el-radio v-model="designation" :value="2">与随机遇敌相同</el-radio>
      </div>
    </db-group-box>
    <div class="battle-flags">
      <el-checkbox v-model="canEscape">允许逃跑</el-checkbox>
      <el-checkbox v-model="canLose">允许失败</el-checkbox>
    </div>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" @click="ok">确定</el-button>
    </template>
  </el-dialog>
</template>

<script>
import DbGroupBox from '@/components/database/shared/DbGroupBox.vue'
import IdNameField from '@/components/database/shared/IdNameField.vue'

export default {
  name: 'Cmd301Battle',
  components: { DbGroupBox, IdNameField },
  props: { modelValue: Boolean, command: Object },
  emits: ['update:modelValue', 'confirm'],
  data() {
    return {
      designation: 0,
      troopId: 1,
      varId: 1,
      canEscape: true,
      canLose: false,
      editOnly: false,
    }
  },
  watch: {
    modelValue: {
      immediate: true,
      handler(v) {
        if (!v) return
        const c = this.command
        const p = (c && c.parameters) || [0, 1, true, false]
        this.designation = p[0] || 0
        if (this.designation === 1) {
          this.varId = p[1] || 1
          this.troopId = 1
        } else {
          this.troopId = p[1] || 1
          this.varId = 1
        }
        this.canEscape = p[2] !== false
        this.canLose = !!p[3]
        this.editOnly = !!(c && c.code === 301 && Array.isArray(c.parameters) && c.parameters.length)
      },
    },
  },
  methods: {
    ok() {
      const indent = (this.command && this.command.indent) || 0
      const id = this.designation === 1 ? this.varId : this.designation === 0 ? this.troopId : 0
      const cmd301 = {
        code: 301,
        indent,
        parameters: [this.designation, id, this.canEscape, this.canLose],
      }
      if (this.editOnly) {
        this.$emit('confirm', [cmd301])
        this.$emit('update:modelValue', false)
        return
      }
      const commands = [
        cmd301,
        { code: 601, indent, parameters: [] },
        { code: 0, indent: indent + 1, parameters: [] },
        { code: 602, indent, parameters: [] },
        { code: 0, indent: indent + 1, parameters: [] },
        { code: 603, indent, parameters: [] },
        { code: 0, indent: indent + 1, parameters: [] },
        { code: 604, indent, parameters: [] },
      ]
      this.$emit('confirm', commands)
      this.$emit('update:modelValue', false)
    },
  },
}
</script>

<style scoped>
.battle-box {
  margin-bottom: 12px;
}
.battle-opt {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
  flex-wrap: wrap;
}
.battle-opt :deep(.el-radio) {
  min-width: 120px;
}
.battle-flags {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding-left: 4px;
}
</style>
