<template>
  <div class="actor-target">
    <el-form-item label="角色">
      <el-radio-group v-model="local.mode">
        <el-radio :value="0">固定</el-radio>
        <el-radio :value="1">变量</el-radio>
      </el-radio-group>
    </el-form-item>
    <el-form-item v-if="local.mode === 0" label="指定">
      <el-radio-group v-model="fixedKind">
        <el-radio :value="'all'">全体</el-radio>
        <el-radio :value="'one'">角色</el-radio>
      </el-radio-group>
      <template v-if="fixedKind === 'one'">
        <el-input-number v-model="local.actorId" :min="1" controls-position="right" class="ml" />
        <el-button size="small" @click="pickerVisible = true">...</el-button>
      </template>
    </el-form-item>
    <el-form-item v-else label="变量">
      <el-input-number v-model="local.actorId" :min="1" controls-position="right" />
      <el-button size="small" @click="varPickerVisible = true">...</el-button>
    </el-form-item>
    <id-name-picker-dialog
      v-model="pickerVisible"
      type="actor"
      :model-id="local.actorId"
      @confirm="onActor" />
    <id-name-picker-dialog
      v-model="varPickerVisible"
      type="variable"
      :model-id="local.actorId"
      @confirm="onActor" />
  </div>
</template>

<script>
import IdNamePickerDialog from './IdNamePickerDialog.vue'

/**
 * MZ iterateActorEx: params[0]=0 固定 / 1 变量；params[1]=0 全体或角色ID/变量ID
 * modelValue: { mode, actorId } 其中固定全体时 actorId=0
 */
export default {
  name: 'ActorTargetFields',
  components: { IdNamePickerDialog },
  props: {
    modelValue: {
      type: Object,
      default: () => ({ mode: 0, actorId: 0 }),
    },
  },
  emits: ['update:modelValue'],
  data() {
    return { pickerVisible: false, varPickerVisible: false }
  },
  computed: {
    local: {
      get() {
        return this.modelValue || { mode: 0, actorId: 0 }
      },
      set(v) {
        this.$emit('update:modelValue', v)
      },
    },
    fixedKind: {
      get() {
        return this.local.mode === 0 && this.local.actorId === 0 ? 'all' : 'one'
      },
      set(v) {
        if (v === 'all') {
          this.$emit('update:modelValue', { ...this.local, mode: 0, actorId: 0 })
        } else {
          this.$emit('update:modelValue', {
            ...this.local,
            mode: 0,
            actorId: this.local.actorId || 1,
          })
        }
      },
    },
  },
  methods: {
    onActor(id) {
      this.$emit('update:modelValue', { ...this.local, actorId: id })
    },
  },
}
</script>

<style scoped>
.ml {
  margin-left: 8px;
}
</style>
