<template>
  <div class="ce" v-if="modelValue">
    <db-group-box title="基本设置">
      <el-form label-width="88px" size="small" inline>
        <el-form-item label="名称">
          <el-input v-model="modelValue.name" style="width: 220px" />
        </el-form-item>
        <el-form-item label="触发条件">
          <el-select v-model="modelValue.trigger" style="width: 140px">
            <el-option :value="0" label="无" />
            <el-option :value="1" label="自动执行" />
            <el-option :value="2" label="并行处理" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="modelValue.trigger" label="开关">
          <el-input :model-value="switchLabel" readonly style="width: 200px" />
          <el-button size="small" @click="switchPicker = true">...</el-button>
        </el-form-item>
      </el-form>
    </db-group-box>
    <db-group-box title="执行内容" class="ce-list">
      <event-command-list-editor v-model="modelValue.list" :show-title="false" class="ce-cmds" />
    </db-group-box>
    <id-name-picker-dialog
      v-model="switchPicker"
      type="switch"
      :model-id="modelValue.switchId || 1"
      @confirm="onSwitch" />
  </div>
</template>

<script>
import DbGroupBox from './shared/DbGroupBox.vue'
import EventCommandListEditor from '@/components/map/EventCommandListEditor.vue'
import IdNamePickerDialog from '@/components/map/pickers/IdNamePickerDialog.vue'
import { loadSystem } from './shared/systemLookups'

export default {
  name: 'CommonEventEditorPanel',
  components: { DbGroupBox, EventCommandListEditor, IdNamePickerDialog },
  props: {
    modelValue: { type: Object, required: true },
  },
  data() {
    return { switchPicker: false }
  },
  computed: {
    switchLabel() {
      const id = this.modelValue.switchId || 0
      if (!id) return '(无)'
      const names = loadSystem().switches || []
      const name = names[id] || ''
      return `#${String(id).padStart(4, '0')} ${name}`
    },
  },
  methods: {
    onSwitch(id) {
      this.modelValue.switchId = id || 0
    },
  },
}
</script>

<style scoped>
.ce {
  display: flex;
  flex-direction: column;
  gap: 8px;
  height: 100%;
  min-height: 0;
}
.ce-list {
  flex: 1;
  min-height: 0;
  display: flex;
}
.ce-list :deep(.db-group-body) {
  flex: 1;
  min-height: 280px;
  display: flex;
}
.ce-cmds {
  flex: 1;
  min-height: 260px;
}
</style>
