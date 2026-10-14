<template>
  <el-dialog :model-value="modelValue" title="更改角色图像" width="440px" append-to-body destroy-on-close :close-on-click-modal="false" @update:model-value="$emit('update:modelValue', $event)">
    <el-form size="small" label-width="88px">
      <el-form-item label="角色">
        <el-input-number v-model="actorId" :min="1" controls-position="right" />
        <el-button size="small" @click="pickerVisible = true">...</el-button>
      </el-form-item>
      <el-form-item label="行走图"><el-input v-model="charName" placeholder="characters 文件名" /></el-form-item>
      <el-form-item label="行走索引"><el-input-number v-model="charIndex" :min="0" :max="7" controls-position="right" /></el-form-item>
      <el-form-item label="脸图"><el-input v-model="faceName" placeholder="faces 文件名" /></el-form-item>
      <el-form-item label="脸图索引"><el-input-number v-model="faceIndex" :min="0" :max="7" controls-position="right" /></el-form-item>
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
export default {
  name: 'Cmd322ActorImage',
  components: { IdNamePickerDialog },
  props: { modelValue: Boolean, command: Object },
  emits: ['update:modelValue', 'confirm'],
  data() {
    return { actorId: 1, charName: '', charIndex: 0, faceName: '', faceIndex: 0, pickerVisible: false }
  },
  watch: {
    modelValue: {
      immediate: true,
      handler(v) {
        if (!v) return
        const p = (this.command && this.command.parameters) || [1, '', 0, '', 0]
        this.actorId = p[0] || 1
        this.charName = p[1] || ''
        this.charIndex = p[2] || 0
        this.faceName = p[3] || ''
        this.faceIndex = p[4] || 0
      },
    },
  },
  methods: {
    ok() {
      this.$emit('confirm', [{
        code: 322,
        indent: (this.command && this.command.indent) || 0,
        parameters: [this.actorId, this.charName, this.charIndex, this.faceName, this.faceIndex],
      }])
      this.$emit('update:modelValue', false)
    },
  },
}
</script>
