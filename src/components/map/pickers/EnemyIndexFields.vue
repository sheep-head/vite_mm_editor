<template>
  <div class="enemy-index">
    <el-form-item label="敌人">
      <el-radio-group v-model="kind">
        <el-radio :value="'all'">全体</el-radio>
        <el-radio :value="'one'">索引</el-radio>
      </el-radio-group>
      <el-input-number
        v-if="kind === 'one'"
        v-model="index"
        :min="0"
        :max="7"
        controls-position="right"
        class="ml" />
    </el-form-item>
  </div>
</template>

<script>
/** MZ iterateEnemyIndex: -1 全体，0–7 索引 */
export default {
  name: 'EnemyIndexFields',
  props: {
    modelValue: { type: Number, default: -1 },
  },
  emits: ['update:modelValue'],
  computed: {
    kind: {
      get() {
        return this.modelValue < 0 ? 'all' : 'one'
      },
      set(v) {
        this.$emit('update:modelValue', v === 'all' ? -1 : Math.max(0, this.modelValue))
      },
    },
    index: {
      get() {
        return this.modelValue < 0 ? 0 : this.modelValue
      },
      set(v) {
        this.$emit('update:modelValue', v)
      },
    },
  },
}
</script>

<style scoped>
.ml {
  margin-left: 8px;
}
</style>
