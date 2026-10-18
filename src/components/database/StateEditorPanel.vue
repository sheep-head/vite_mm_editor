<template>
  <div v-if="modelValue" class="state-ed">
    <div class="col-mid">
      <db-group-box title="基本设置">
        <el-form size="small" label-width="100px" @submit.prevent>
          <el-form-item label="名称">
            <el-input v-model="modelValue.name" style="width: 200px" />
          </el-form-item>
          <el-form-item label="图标">
            <icon-picker-field v-model="modelValue.iconIndex" />
          </el-form-item>
          <el-form-item label="行动限制">
            <el-select v-model="modelValue.restriction" style="width: 160px">
              <el-option v-for="o in restrictionOpts" :key="o.value" :label="o.label" :value="o.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="优先级">
            <el-input-number v-model="modelValue.priority" :min="0" :max="100" controls-position="right" />
          </el-form-item>
          <el-form-item label="[侧视] 动作">
            <el-select v-model="modelValue.motion" style="width: 140px">
              <el-option v-for="o in motionOpts" :key="o.value" :label="o.label" :value="o.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="[侧视] 遮罩">
            <el-select v-model="modelValue.overlay" style="width: 140px">
              <el-option v-for="o in overlayOpts" :key="o.value" :label="o.label" :value="o.value" />
            </el-select>
          </el-form-item>
        </el-form>
      </db-group-box>

      <db-group-box title="解除条件" class="mt">
        <el-form size="small" label-width="140px" @submit.prevent>
          <el-form-item label="战斗结束时解除">
            <el-checkbox v-model="modelValue.removeAtBattleEnd" />
          </el-form-item>
          <el-form-item label="受到行动限制时解除">
            <el-checkbox v-model="modelValue.removeByRestriction" />
          </el-form-item>
          <el-form-item label="自动解除的时机">
            <el-select v-model="modelValue.autoRemovalTiming" style="width: 140px">
              <el-option v-for="o in autoOpts" :key="o.value" :label="o.label" :value="o.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="持续回合数">
            <el-input-number
              v-model="modelValue.minTurns"
              :min="1"
              :disabled="!modelValue.autoRemovalTiming"
              controls-position="right" />
            <span class="tilde">~</span>
            <el-input-number
              v-model="modelValue.maxTurns"
              :min="1"
              :disabled="!modelValue.autoRemovalTiming"
              controls-position="right" />
          </el-form-item>
          <el-form-item label="受伤时解除">
            <el-checkbox v-model="modelValue.removeByDamage" />
            <el-input-number
              v-model="modelValue.chanceByDamage"
              :min="0"
              :max="100"
              :disabled="!modelValue.removeByDamage"
              controls-position="right"
              class="ml" />
            <span class="suffix">%</span>
          </el-form-item>
          <el-form-item label="按步数解除">
            <el-checkbox v-model="modelValue.removeByWalking" />
            <el-input-number
              v-model="modelValue.stepsToRemove"
              :min="1"
              :disabled="!modelValue.removeByWalking"
              controls-position="right"
              class="ml" />
            <span class="suffix">步</span>
          </el-form-item>
        </el-form>
      </db-group-box>

      <db-group-box title="信息" class="mt">
        <el-form size="small" label-width="140px" @submit.prevent>
          <el-form-item label="角色被附加状态时">
            <el-input v-model="modelValue.message1" />
          </el-form-item>
          <el-form-item label="敌人被附加状态时">
            <el-input v-model="modelValue.message2" />
          </el-form-item>
          <el-form-item label="状态持续时">
            <el-input v-model="modelValue.message3" />
          </el-form-item>
          <el-form-item label="状态解除时">
            <el-input v-model="modelValue.message4" />
          </el-form-item>
        </el-form>
      </db-group-box>
    </div>

    <div class="col-right">
      <db-group-box title="特性">
        <traits-table-editor v-model="modelValue.traits" />
      </db-group-box>
      <db-group-box title="备注" class="mt">
        <el-input v-model="modelValue.note" type="textarea" :rows="10" />
      </db-group-box>
    </div>
  </div>
</template>

<script>
import DbGroupBox from './shared/DbGroupBox.vue'
import IconPickerField from './shared/IconPickerField.vue'
import TraitsTableEditor from './shared/TraitsTableEditor.vue'
import {
  STATE_RESTRICTION_OPTIONS,
  STATE_MOTION_OPTIONS,
  STATE_OVERLAY_OPTIONS,
  AUTO_REMOVAL_OPTIONS,
} from './shared/rpgDbConstants'
import { normalizeState } from './shared/dbDefaults'

export default {
  name: 'StateEditorPanel',
  components: { DbGroupBox, IconPickerField, TraitsTableEditor },
  props: {
    modelValue: { type: Object, default: null },
  },
  computed: {
    restrictionOpts() {
      return STATE_RESTRICTION_OPTIONS
    },
    motionOpts() {
      return STATE_MOTION_OPTIONS
    },
    overlayOpts() {
      return STATE_OVERLAY_OPTIONS
    },
    autoOpts() {
      return AUTO_REMOVAL_OPTIONS
    },
  },
  watch: {
    modelValue: {
      immediate: true,
      handler(v) {
        if (v) normalizeState(v)
      },
    },
  },
}
</script>

<style scoped>
.state-ed {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: flex-start;
}
.col-mid {
  flex: 1.1;
  min-width: 360px;
}
.col-right {
  flex: 1;
  min-width: 280px;
}
.mt {
  margin-top: 10px;
}
.tilde {
  margin: 0 6px;
}
.ml {
  margin-left: 8px;
}
.suffix {
  margin-left: 4px;
  font-size: 12px;
}
</style>
