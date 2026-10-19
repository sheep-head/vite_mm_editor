<template>
  <el-dialog
    :model-value="modelValue"
    title="场所移动"
    width="420px"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
    @update:model-value="$emit('update:modelValue', $event)">
    <db-group-box title="位置">
      <div class="loc">
        <el-radio v-model="direct" :value="0">直接指定</el-radio>
        <div class="loc-direct" :class="{ off: direct !== 0 }">
          <el-input :model-value="directLabel" size="small" readonly :disabled="direct !== 0" />
          <el-button size="small" :disabled="direct !== 0" @click="designVisible = true">...</el-button>
        </div>

        <el-radio v-model="direct" :value="1" class="loc-var-radio">变量指定</el-radio>
        <div class="loc-vars" :class="{ off: direct !== 1 }">
          <div class="loc-var-row">
            <span class="lbl">编号</span>
            <id-name-field v-model="varMap" type="variable" width="100%" :disabled="direct !== 1" />
          </div>
          <div class="loc-var-row">
            <span class="lbl">横向</span>
            <id-name-field v-model="varX" type="variable" width="100%" :disabled="direct !== 1" />
          </div>
          <div class="loc-var-row">
            <span class="lbl">纵向</span>
            <id-name-field v-model="varY" type="variable" width="100%" :disabled="direct !== 1" />
          </div>
        </div>
      </div>
    </db-group-box>

    <div class="opts">
      <div class="opt">
        <div class="opt-label">朝向:</div>
        <el-select v-model="direction" size="small" style="width: 100%">
          <el-option :value="0" label="不变" />
          <el-option :value="2" label="下" />
          <el-option :value="4" label="左" />
          <el-option :value="6" label="右" />
          <el-option :value="8" label="上" />
        </el-select>
      </div>
      <div class="opt">
        <div class="opt-label">淡入淡出:</div>
        <el-select v-model="fade" size="small" style="width: 100%">
          <el-option :value="0" label="黑" />
          <el-option :value="1" label="白" />
          <el-option :value="2" label="无" />
        </el-select>
      </div>
    </div>

    <template #footer>
      <el-button type="primary" @click="ok">确定</el-button>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
    </template>

    <map-designation-dialog
      v-model="designVisible"
      :map-id="mapId"
      :x="x"
      :y="y"
      @confirm="onDesign" />
  </el-dialog>
</template>

<script>
import DataManager from '@/utils/DataManager'
import DbGroupBox from '@/components/database/shared/DbGroupBox.vue'
import IdNameField from '@/components/database/shared/IdNameField.vue'
import MapDesignationDialog from '../MapDesignationDialog.vue'

export default {
  name: 'Cmd201Transfer',
  components: { DbGroupBox, IdNameField, MapDesignationDialog },
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
      varMap: 1,
      varX: 1,
      varY: 1,
      direction: 0,
      fade: 0,
      designVisible: false,
    }
  },
  computed: {
    mapName() {
      try {
        const infos = DataManager.$loadDataSync('MapInfos', false, false) || []
        const info = infos[this.mapId]
        return (info && info.name) || `地图${this.mapId}`
      } catch (e) {
        return `地图${this.mapId}`
      }
    },
    directLabel() {
      return `${this.mapName} (${this.x},${this.y})`
    },
  },
  watch: {
    modelValue: {
      immediate: true,
      handler(v) {
        if (!v) return
        const p = (this.command && this.command.parameters) || [0, 1, 0, 0, 0, 0]
        this.direct = p[0] === 1 ? 1 : 0
        this.direction = p[4] || 0
        this.fade = p[5] || 0
        if (this.direct === 0) {
          this.mapId = p[1] || 1
          this.x = p[2] || 0
          this.y = p[3] || 0
        } else {
          this.varMap = p[1] || 1
          this.varX = p[2] || 1
          this.varY = p[3] || 1
        }
      },
    },
  },
  methods: {
    onDesign({ mapId, x, y }) {
      this.mapId = mapId
      this.x = x
      this.y = y
    },
    ok() {
      const mapId = this.direct === 0 ? this.mapId : this.varMap
      const x = this.direct === 0 ? this.x : this.varX
      const y = this.direct === 0 ? this.y : this.varY
      this.$emit('confirm', [
        {
          code: 201,
          indent: (this.command && this.command.indent) || 0,
          parameters: [this.direct, mapId, x, y, this.direction, this.fade],
        },
      ])
      this.$emit('update:modelValue', false)
    },
  },
}
</script>

<style scoped>
.loc {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.loc-direct {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 2px 0 8px 22px;
}
.loc-direct :deep(.el-input) {
  flex: 1;
}
.loc-var-radio {
  margin-top: 2px;
}
.loc-vars {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin: 2px 0 0 22px;
}
.loc-var-row {
  display: grid;
  grid-template-columns: 36px 1fr;
  align-items: center;
  gap: 6px;
}
.loc-var-row .lbl {
  font-size: 12px;
  color: var(--app-text, #303133);
}
.loc-var-row :deep(.id-name-field) {
  width: 100%;
  min-width: 0;
}
.loc-var-row :deep(.el-input) {
  flex: 1;
  min-width: 0;
}
.loc .off {
  opacity: 0.55;
  pointer-events: none;
}
.opts {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-top: 14px;
}
.opt-label {
  font-size: 12px;
  margin-bottom: 4px;
}
</style>
