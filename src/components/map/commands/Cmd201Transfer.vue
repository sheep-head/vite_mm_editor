<template>
  <el-dialog
    :model-value="modelValue"
    title="场所移动"
    width="440px"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
    @update:model-value="$emit('update:modelValue', $event)">
    <el-form size="small" label-width="80px">
      <el-form-item label="指定方式">
        <el-radio-group v-model="direct">
          <el-radio :value="0">直接指定</el-radio>
          <el-radio :value="1">变量指定</el-radio>
        </el-radio-group>
      </el-form-item>
      <template v-if="direct === 0">
        <el-form-item label="地图">
          <el-input-number v-model="mapId" :min="1" controls-position="right" />
          <el-button size="small" @click="pickerVisible = true">...</el-button>
          <span v-if="mapName" class="hint">{{ mapName }}</span>
        </el-form-item>
        <el-form-item label="X">
          <el-input-number v-model="x" :min="0" controls-position="right" />
        </el-form-item>
        <el-form-item label="Y">
          <el-input-number v-model="y" :min="0" controls-position="right" />
        </el-form-item>
      </template>
      <template v-else>
        <el-form-item label="地图变量">
          <el-input-number v-model="mapId" :min="1" controls-position="right" />
        </el-form-item>
        <el-form-item label="X 变量">
          <el-input-number v-model="x" :min="1" controls-position="right" />
        </el-form-item>
        <el-form-item label="Y 变量">
          <el-input-number v-model="y" :min="1" controls-position="right" />
        </el-form-item>
      </template>
      <el-form-item label="朝向">
        <el-select v-model="direction" style="width: 140px">
          <el-option :value="0" label="不变" />
          <el-option :value="2" label="下" />
          <el-option :value="4" label="左" />
          <el-option :value="6" label="右" />
          <el-option :value="8" label="上" />
        </el-select>
      </el-form-item>
      <el-form-item label="淡入淡出">
        <el-select v-model="fade" style="width: 140px">
          <el-option :value="0" label="黑" />
          <el-option :value="1" label="白" />
          <el-option :value="2" label="无" />
        </el-select>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" @click="ok">确定</el-button>
    </template>
    <id-name-picker-dialog
      v-model="pickerVisible"
      type="map"
      :model-id="mapId"
      @confirm="onPick" />
  </el-dialog>
</template>

<script>
import DataManager from '@/utils/DataManager'
import IdNamePickerDialog from '../pickers/IdNamePickerDialog.vue'

export default {
  name: 'Cmd201Transfer',
  components: { IdNamePickerDialog },
  props: {
    modelValue: { type: Boolean, default: false },
    command: { type: Object, default: null },
  },
  emits: ['update:modelValue', 'confirm'],
  data() {
    return {
      direct: 0,
      mapId: 1,
      x: 0,
      y: 0,
      direction: 0,
      fade: 0,
      pickerVisible: false,
    }
  },
  computed: {
    mapName() {
      if (this.direct !== 0) return ''
      try {
        const infos = DataManager.$loadDataSync('MapInfos', false, false) || []
        const info = infos[this.mapId]
        return info && info.name ? info.name : ''
      } catch (e) {
        return ''
      }
    },
  },
  watch: {
    modelValue: {
      immediate: true,
      handler(v) {
        if (!v) return
        const p = (this.command && this.command.parameters) || [0, 1, 0, 0, 0, 0]
        this.direct = p[0] === 1 ? 1 : 0
        this.mapId = p[1] || 1
        this.x = p[2] || 0
        this.y = p[3] || 0
        this.direction = p[4] || 0
        this.fade = p[5] || 0
      },
    },
  },
  methods: {
    onPick(id) {
      this.mapId = id
    },
    ok() {
      this.$emit('confirm', [
        {
          code: 201,
          indent: (this.command && this.command.indent) || 0,
          parameters: [this.direct, this.mapId, this.x, this.y, this.direction, this.fade],
        },
      ])
      this.$emit('update:modelValue', false)
    },
  },
}
</script>

<style scoped>
.hint {
  margin-left: 8px;
  color: var(--app-text-muted, #888);
  font-size: 12px;
}
</style>
