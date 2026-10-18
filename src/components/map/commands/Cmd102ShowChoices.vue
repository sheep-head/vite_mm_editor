<template>
  <el-dialog
    :model-value="modelValue"
    title="显示选项"
    width="560px"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
    @update:model-value="$emit('update:modelValue', $event)">
    <div class="grid">
      <div class="left">
        <div class="sec-title">选项</div>
        <div v-for="(opt, i) in slots" :key="i" class="choice-row">
          <span class="idx">#{{ i + 1 }}</span>
          <el-input v-model="slots[i]" size="small" />
        </div>
      </div>
      <div class="right">
        <div class="field">
          <div class="lab">背景</div>
          <el-select v-model="background" style="width: 100%">
            <el-option :value="0" label="窗口" />
            <el-option :value="1" label="暗淡" />
            <el-option :value="2" label="透明" />
          </el-select>
        </div>
        <div class="field">
          <div class="lab">窗口位置</div>
          <el-select v-model="positionType" style="width: 100%">
            <el-option :value="0" label="左侧" />
            <el-option :value="1" label="中间" />
            <el-option :value="2" label="右侧" />
          </el-select>
        </div>
        <div class="field">
          <div class="lab">默认</div>
          <el-select v-model="defaultType" style="width: 100%">
            <el-option :value="-1" label="无" />
            <el-option v-for="n in 6" :key="'d' + n" :value="n - 1" :label="'选项 #' + n" />
          </el-select>
        </div>
        <div class="field">
          <div class="lab">取消</div>
          <el-select v-model="cancelType" style="width: 100%">
            <el-option :value="-2" label="分支" />
            <el-option :value="-1" label="禁止" />
            <el-option v-for="n in 6" :key="'c' + n" :value="n - 1" :label="'选项 #' + n" />
          </el-select>
        </div>
      </div>
    </div>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" @click="ok">确定</el-button>
    </template>
  </el-dialog>
</template>

<script>
export default {
  name: 'Cmd102ShowChoices',
  props: {
    modelValue: { type: Boolean, default: false },
    command: { type: Object, default: null },
  },
  emits: ['update:modelValue', 'confirm'],
  data() {
    return {
      slots: ['是', '否', '', '', '', ''],
      defaultType: 0,
      cancelType: 1,
      positionType: 2,
      background: 0,
      editOnly: false,
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
      const next = ['', '', '', '', '', '']
      if (c && c.code === 102 && Array.isArray(c.parameters) && c.parameters.length) {
        const p = c.parameters
        const choices = Array.isArray(p[0]) ? p[0] : []
        for (let i = 0; i < 6; i++) next[i] = choices[i] != null ? String(choices[i]) : ''
        let cancel = p[1] ?? 1
        if (cancel >= choices.length) cancel = -2
        this.cancelType = cancel
        this.defaultType = p[2] ?? 0
        this.positionType = p[3] ?? 2
        this.background = p[4] ?? 0
        this.editOnly = true
      } else {
        next[0] = '是'
        next[1] = '否'
        this.defaultType = 0
        this.cancelType = 1
        this.positionType = 2
        this.background = 0
        this.editOnly = false
      }
      this.slots = next
    },
    compactChoices() {
      const opts = this.slots.map((s) => String(s || '')).filter((s) => s !== '')
      if (!opts.length) opts.push('')
      // 默认/取消按原槽位映射到压缩后的下标
      const kept = []
      this.slots.forEach((s, i) => {
        if (String(s || '') !== '') kept.push(i)
      })
      let def = this.defaultType
      if (def >= 0) {
        const ni = kept.indexOf(def)
        def = ni >= 0 ? ni : -1
      }
      let cancel = this.cancelType
      if (cancel >= 0) {
        const ni = kept.indexOf(cancel)
        cancel = ni >= 0 ? ni : -1
      }
      return { opts, def, cancel }
    },
    ok() {
      const indent = (this.command && this.command.indent) || 0
      const { opts, def, cancel: cancelRaw } = this.compactChoices()
      let cancel = cancelRaw
      if (cancel === -2) cancel = opts.length
      const cmd102 = {
        code: 102,
        indent,
        parameters: [opts, cancel, def, this.positionType, this.background],
      }
      if (this.editOnly) {
        this.$emit('confirm', [cmd102])
        this.$emit('update:modelValue', false)
        return
      }
      const commands = [cmd102]
      opts.forEach((_, i) => {
        commands.push({ code: 402, indent, parameters: [i, opts[i]] })
        commands.push({ code: 0, indent: indent + 1, parameters: [] })
      })
      if (cancelRaw === -2) {
        commands.push({ code: 403, indent, parameters: [] })
        commands.push({ code: 0, indent: indent + 1, parameters: [] })
      }
      commands.push({ code: 404, indent, parameters: [] })
      this.$emit('confirm', commands)
      this.$emit('update:modelValue', false)
    },
  },
}
</script>

<style scoped>
.grid {
  display: grid;
  grid-template-columns: 1fr 180px;
  gap: 16px;
}
.sec-title {
  font-weight: 600;
  margin-bottom: 8px;
}
.choice-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.idx {
  width: 28px;
  flex: 0 0 28px;
  color: var(--app-muted, #666);
}
.field {
  margin-bottom: 12px;
}
.lab {
  font-size: 13px;
  margin-bottom: 4px;
}
</style>
