<template>
  <el-dialog
    :model-value="modelValue"
    title="显示选项"
    width="480px"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
    @update:model-value="$emit('update:modelValue', $event)">
    <el-form size="small" label-width="88px">
      <el-form-item label="选项">
        <div class="choice-list">
          <div v-for="(opt, i) in choices" :key="i" class="choice-row">
            <el-input v-model="choices[i]" size="small" />
            <el-button size="small" :disabled="choices.length <= 1" @click="choices.splice(i, 1)">删</el-button>
          </div>
          <el-button size="small" :disabled="choices.length >= 6" @click="choices.push('')">添加选项</el-button>
        </div>
      </el-form-item>
      <el-form-item label="默认">
        <el-select v-model="defaultType" style="width: 160px">
          <el-option :value="-1" label="无" />
          <el-option v-for="(c, i) in choices" :key="'d' + i" :value="i" :label="'选项 ' + (i + 1)" />
        </el-select>
      </el-form-item>
      <el-form-item label="取消">
        <el-select v-model="cancelType" style="width: 160px">
          <el-option :value="-2" label="分支" />
          <el-option :value="-1" label="禁止" />
          <el-option v-for="(c, i) in choices" :key="'c' + i" :value="i" :label="'选项 ' + (i + 1)" />
        </el-select>
      </el-form-item>
      <el-form-item label="窗口位置">
        <el-select v-model="positionType" style="width: 140px">
          <el-option :value="0" label="左" />
          <el-option :value="1" label="中" />
          <el-option :value="2" label="右" />
        </el-select>
      </el-form-item>
      <el-form-item label="背景">
        <el-select v-model="background" style="width: 140px">
          <el-option :value="0" label="窗口" />
          <el-option :value="1" label="暗淡" />
          <el-option :value="2" label="透明" />
        </el-select>
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
  name: 'Cmd102ShowChoices',
  props: {
    modelValue: { type: Boolean, default: false },
    command: { type: Object, default: null },
  },
  emits: ['update:modelValue', 'confirm'],
  data() {
    return {
      choices: ['是', '否'],
      defaultType: 0,
      cancelType: 1,
      positionType: 2,
      background: 0,
      /** 编辑已有 102 时只改本行，不重建分支树 */
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
      // MZ: [choices, cancelType, defaultType, positionType, background]
      if (c && c.code === 102 && Array.isArray(c.parameters) && c.parameters.length) {
        const p = c.parameters
        this.choices = Array.isArray(p[0]) && p[0].length ? [...p[0]] : ['是', '否']
        let cancel = p[1] ?? 1
        // 存 choices.length 表示「分支」
        if (cancel >= this.choices.length) cancel = -2
        this.cancelType = cancel
        this.defaultType = p[2] ?? 0
        this.positionType = p[3] ?? 2
        this.background = p[4] ?? 0
        this.editOnly = true
      } else {
        this.choices = ['是', '否']
        this.defaultType = 0
        this.cancelType = 1
        this.positionType = 2
        this.background = 0
        this.editOnly = false
      }
    },
    ok() {
      const indent = (this.command && this.command.indent) || 0
      const opts = this.choices.map((s) => String(s || ''))
      if (!opts.length) opts.push('')
      let cancel = this.cancelType
      // 分支：存 choices.length，运行时会当作 -2，并带 403
      if (cancel === -2) cancel = opts.length
      const cmd102 = {
        code: 102,
        indent,
        parameters: [opts, cancel, this.defaultType, this.positionType, this.background],
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
      if (this.cancelType === -2) {
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
.choice-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
}
.choice-row {
  display: flex;
  gap: 6px;
}
</style>
