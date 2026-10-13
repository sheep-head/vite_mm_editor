<template>
  <el-tooltip v-if="text" :content="text" placement="top" :show-after="200">
    <span class="field-help" @click.stop>
      <el-icon><QuestionFilled /></el-icon>
    </span>
  </el-tooltip>
</template>
<script>
import { QuestionFilled } from '@element-plus/icons-vue'

export default {
  name: 'FieldHelp',
  components: { QuestionFilled },
  props: {
    text: { type: String, default: '' },
  },
}
</script>
<style scoped>
.field-help {
  display: inline-flex;
  align-items: center;
  margin-left: 4px;
  color: var(--app-text-muted, #909399);
  cursor: help;
  vertical-align: middle;
  font-size: 14px;
}
.field-help:hover {
  color: var(--app-active-color, #409eff);
}
</style>
