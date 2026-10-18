<template>
  <el-dialog
    :model-value="modelValue"
    title="开关操作"
    width="420px"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
    @update:model-value="$emit('update:modelValue', $event)">
    <db-group-box title="开关" class="blk">
      <div class="row">
        <el-radio v-model="mode" value="single">单个</el-radio>
        <id-name-field
          v-model="fromId"
          type="switch"
          width="240px"
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
        <el-radio :value="0">开启</el-radio>
        <el-radio :value="1">关闭</el-radio>
      </el-radio-group>
    </db-group-box>
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
  name: 'Cmd121Switch',
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
    }
  },
  watch: {
    modelValue: {
      immediate: true,
      handler(v) {
        if (!v) return
        const p = (this.command && this.command.parameters) || [1, 1, 0]
        this.fromId = p[0] || 1
        this.toId = p[1] || this.fromId
        this.op = p[2] === 1 ? 1 : 0
        this.mode = this.fromId === this.toId ? 'single' : 'batch'
      },
    },
  },
  methods: {
    onSingle(id) {
      this.fromId = id
      this.toId = id
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
      this.$emit('confirm', [
        {
          code: 121,
          indent: (this.command && this.command.indent) || 0,
          parameters: [a, b, this.op],
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
.sep {
  margin: 0 2px;
}
</style>
