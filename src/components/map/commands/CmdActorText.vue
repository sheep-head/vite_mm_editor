<template>
  <el-dialog :model-value="modelValue" :title="cfg.title" width="420px" append-to-body destroy-on-close :close-on-click-modal="false" @update:model-value="$emit('update:modelValue', $event)">
    <el-form size="small" label-width="72px">
      <el-form-item label="角色">
        <el-input-number v-model="actorId" :min="1" controls-position="right" />
        <el-button size="small" @click="pickerVisible = true">...</el-button>
      </el-form-item>
      <el-form-item :label="cfg.field">
        <el-input v-model="text" :type="cfg.multiline ? 'textarea' : 'text'" :rows="cfg.multiline ? 4 : 1" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" @click="ok">确定</el-button>
    </template>
    <id-name-picker-dialog v-model="pickerVisible" type="actor" :model-id="actorId" @confirm="(id) => (actorId = id)" />
  </el-dialog>
</template>
<script>
import IdNamePickerDialog from '../pickers/IdNamePickerDialog.vue'
const CFG = {
  320: { title: '更改名字', field: '名字' },
  324: { title: '更改昵称', field: '昵称' },
  325: { title: '更改简介', field: '简介', multiline: true },
}
export default {
  name: 'CmdActorText',
  components: { IdNamePickerDialog },
  props: { modelValue: Boolean, command: Object, entry: Object },
  emits: ['update:modelValue', 'confirm'],
  data() { return { actorId: 1, text: '', pickerVisible: false } },
  computed: {
    code() { return (this.entry && this.entry.code) || (this.command && this.command.code) || 320 },
    cfg() { return CFG[this.code] || { title: '文本', field: '内容' } },
  },
  watch: {
    modelValue: {
      immediate: true,
      handler(v) {
        if (!v) return
        const p = (this.command && this.command.parameters) || [1, '']
        this.actorId = p[0] || 1
        this.text = p[1] || ''
      },
    },
  },
  methods: {
    ok() {
      this.$emit('confirm', [{
        code: this.code,
        indent: (this.command && this.command.indent) || 0,
        parameters: [this.actorId, this.text],
      }])
      this.$emit('update:modelValue', false)
    },
  },
}
</script>
