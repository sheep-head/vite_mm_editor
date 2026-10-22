<template>
  <el-dialog
    :model-value="modelValue"
    title="名字输入处理"
    width="400px"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
    @update:model-value="$emit('update:modelValue', $event)">
    <el-form size="small" label-width="80px">
      <el-form-item label="角色">
        <id-name-field v-model="actorId" type="actor" width="220px" :allow-none="false" />
      </el-form-item>
      <el-form-item label="最大字数">
        <el-input-number v-model="maxCount" :min="1" :max="16" controls-position="right" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" @click="ok">确定</el-button>
    </template>
  </el-dialog>
</template>

<script>
import IdNameField from '@/components/database/shared/IdNameField.vue'

export default {
  name: 'Cmd303NameInput',
  components: { IdNameField },
  props: { modelValue: Boolean, command: Object },
  emits: ['update:modelValue', 'confirm'],
  data() {
    return { actorId: 1, maxCount: 8 }
  },
  watch: {
    modelValue: {
      immediate: true,
      handler(v) {
        if (!v) return
        const p = (this.command && this.command.parameters) || [1, 8]
        this.actorId = p[0] || 1
        this.maxCount = p[1] || 8
      },
    },
  },
  methods: {
    ok() {
      this.$emit('confirm', [
        {
          code: 303,
          indent: (this.command && this.command.indent) || 0,
          parameters: [this.actorId, this.maxCount],
        },
      ])
      this.$emit('update:modelValue', false)
    },
  },
}
</script>
