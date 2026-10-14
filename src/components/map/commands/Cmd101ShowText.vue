<template>
  <el-dialog
    :model-value="modelValue"
    title="显示文字"
    width="520px"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
    @update:model-value="$emit('update:modelValue', $event)">
    <el-form size="small" label-width="80px">
      <el-form-item label="脸图文件">
        <el-input v-model="faceName" placeholder="img/faces 文件名，可空" />
      </el-form-item>
      <el-form-item label="脸图索引">
        <el-input-number v-model="faceIndex" :min="0" :max="7" controls-position="right" />
      </el-form-item>
      <el-form-item label="背景">
        <el-select v-model="background" style="width: 140px">
          <el-option :value="0" label="窗口" />
          <el-option :value="1" label="暗淡" />
          <el-option :value="2" label="透明" />
        </el-select>
      </el-form-item>
      <el-form-item label="窗口位置">
        <el-select v-model="positionType" style="width: 140px">
          <el-option :value="0" label="顶部" />
          <el-option :value="1" label="中间" />
          <el-option :value="2" label="底部" />
        </el-select>
      </el-form-item>
      <el-form-item label="说话人">
        <el-input v-model="speakerName" placeholder="MZ 说话人名称，可空" />
      </el-form-item>
      <el-form-item label="文本">
        <el-input v-model="text" type="textarea" :rows="8" placeholder="多行拆成续行(401)" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" @click="ok">确定</el-button>
    </template>
  </el-dialog>
</template>

<script>
export default {
  name: 'Cmd101ShowText',
  props: {
    modelValue: { type: Boolean, default: false },
    command: { type: Object, default: null },
  },
  emits: ['update:modelValue', 'confirm'],
  data() {
    return {
      faceName: '',
      faceIndex: 0,
      background: 0,
      positionType: 2,
      speakerName: '',
      text: '',
    }
  },
  watch: {
    modelValue: {
      immediate: true,
      handler(v) {
        if (!v) return
        this.syncFromCommand()
      },
    },
  },
  methods: {
    syncFromCommand() {
      const c = this.command
      if (c && c.code === 101) {
        const p = c.parameters || ['', 0, 0, 2, '']
        this.faceName = p[0] || ''
        this.faceIndex = p[1] || 0
        this.background = p[2] || 0
        this.positionType = p[3] ?? 2
        this.speakerName = p[4] || ''
        const lines = Array.isArray(c._extraLines) ? [...c._extraLines] : []
        this.text = lines.join('\n')
      } else {
        this.faceName = ''
        this.faceIndex = 0
        this.background = 0
        this.positionType = 2
        this.speakerName = ''
        this.text = ''
      }
    },
    ok() {
      const indent = (this.command && this.command.indent) || 0
      const lines = String(this.text || '').split(/\r?\n/)
      const commands = [
        {
          code: 101,
          indent,
          parameters: [this.faceName, this.faceIndex, this.background, this.positionType, this.speakerName],
        },
      ]
      if (!lines.length || (lines.length === 1 && lines[0] === '')) {
        // 至少一行空文本，便于再编辑
        commands.push({ code: 401, indent, parameters: [''] })
      } else {
        lines.forEach((line) => {
          commands.push({ code: 401, indent, parameters: [line] })
        })
      }
      this.$emit('confirm', commands)
      this.$emit('update:modelValue', false)
    },
  },
}
</script>
