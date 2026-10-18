<template>
  <el-dialog
    :model-value="modelValue"
    title="队伍管理"
    width="420px"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
    @update:model-value="$emit('update:modelValue', $event)">
    <div class="pick">
      <div class="lab">角色:</div>
      <id-name-field v-model="actorId" type="actor" width="320px" />
    </div>
    <db-group-box title="操作">
      <el-radio-group v-model="op">
        <el-radio :value="0">入队</el-radio>
        <el-radio :value="1">离队</el-radio>
      </el-radio-group>
    </db-group-box>
    <el-checkbox v-model="initialize" class="extra" :disabled="op !== 0">初始化</el-checkbox>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" @click="ok">确定</el-button>
    </template>
  </el-dialog>
</template>

<script>
import IdNameField from '@/components/database/shared/IdNameField.vue'
import DbGroupBox from '@/components/database/shared/DbGroupBox.vue'

export default {
  name: 'Cmd129Party',
  components: { IdNameField, DbGroupBox },
  props: {
    modelValue: { type: Boolean, default: false },
    command: { type: Object, default: null },
  },
  emits: ['update:modelValue', 'confirm'],
  data() {
    return { actorId: 1, op: 0, initialize: true }
  },
  watch: {
    modelValue: {
      immediate: true,
      handler(v) {
        if (!v) return
        const p = (this.command && this.command.parameters) || [1, 0, true]
        this.actorId = p[0] || 1
        this.op = p[1] === 1 ? 1 : 0
        this.initialize = p[2] !== false
      },
    },
  },
  methods: {
    ok() {
      this.$emit('confirm', [
        {
          code: 129,
          indent: (this.command && this.command.indent) || 0,
          parameters: [this.actorId, this.op, this.op === 0 ? this.initialize : false],
        },
      ])
      this.$emit('update:modelValue', false)
    },
  },
}
</script>

<style scoped>
.pick {
  margin-bottom: 10px;
}
.lab {
  margin-bottom: 4px;
  font-size: 13px;
}
.extra {
  margin-top: 10px;
}
</style>
