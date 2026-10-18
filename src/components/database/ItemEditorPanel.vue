<template>
  <div v-if="modelValue" class="item-ed">
    <div class="col-mid">
      <db-group-box title="基本设置">
        <el-form size="small" label-width="88px" @submit.prevent>
          <el-form-item label="名称">
            <el-input v-model="modelValue.name" style="width: 200px" />
          </el-form-item>
          <el-form-item label="图标">
            <icon-picker-field v-model="modelValue.iconIndex" />
          </el-form-item>
          <el-form-item label="说明">
            <el-input v-model="modelValue.description" type="textarea" :rows="2" />
          </el-form-item>
          <el-form-item label="物品类型">
            <el-select v-model="modelValue.itypeId" style="width: 140px">
              <el-option v-for="o in itypeOpts" :key="o.value" :label="o.label" :value="o.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="价格">
            <el-input-number v-model="modelValue.price" :min="0" controls-position="right" />
          </el-form-item>
          <el-form-item label="消耗品">
            <el-select
              :model-value="modelValue.consumable ? 1 : 0"
              style="width: 100px"
              @update:model-value="(v) => (modelValue.consumable = !!v)">
              <el-option :value="1" label="是" />
              <el-option :value="0" label="否" />
            </el-select>
          </el-form-item>
          <el-form-item label="范围">
            <el-select v-model="modelValue.scope" style="width: 180px">
              <el-option v-for="o in scopeOpts" :key="o.value" :label="o.label" :value="o.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="使用场合">
            <el-select v-model="modelValue.occasion" style="width: 140px">
              <el-option v-for="o in occasionOpts" :key="o.value" :label="o.label" :value="o.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="载重">
            <el-input-number v-model="modelValue.load" controls-position="right" />
          </el-form-item>
          <el-form-item label="重量">
            <el-input-number v-model="modelValue.heft" controls-position="right" />
          </el-form-item>
        </el-form>
      </db-group-box>

      <db-group-box title="发动" class="mt">
        <el-form size="small" label-width="88px" @submit.prevent>
          <el-form-item label="速度补正">
            <el-input-number v-model="modelValue.speed" controls-position="right" />
          </el-form-item>
          <el-form-item label="成功率">
            <el-input-number v-model="modelValue.successRate" :min="0" :max="100" controls-position="right" />
            <span class="suffix">%</span>
          </el-form-item>
          <el-form-item label="连续次数">
            <el-input-number v-model="modelValue.repeats" :min="1" controls-position="right" />
          </el-form-item>
          <el-form-item label="获得 TP">
            <el-input-number v-model="modelValue.tpGain" :min="0" controls-position="right" />
          </el-form-item>
          <el-form-item label="命中类型">
            <el-select v-model="modelValue.hitType" style="width: 140px">
              <el-option v-for="o in hitOpts" :key="o.value" :label="o.label" :value="o.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="动画">
            <id-name-field v-model="modelValue.animationId" type="animation" />
          </el-form-item>
        </el-form>
      </db-group-box>
    </div>

    <div class="col-right">
      <db-group-box title="伤害">
        <damage-fields v-model="modelValue.damage" />
      </db-group-box>
      <db-group-box title="效果" class="mt">
        <effects-table-editor v-model="modelValue.effects" />
      </db-group-box>
      <db-group-box title="备注" class="mt">
        <el-input v-model="modelValue.note" type="textarea" :rows="8" />
      </db-group-box>
    </div>
  </div>
</template>

<script>
import DbGroupBox from './shared/DbGroupBox.vue'
import IconPickerField from './shared/IconPickerField.vue'
import IdNameField from './shared/IdNameField.vue'
import DamageFields from './shared/DamageFields.vue'
import EffectsTableEditor from './shared/EffectsTableEditor.vue'
import {
  SCOPE_OPTIONS,
  OCCASION_OPTIONS,
  HIT_TYPE_OPTIONS,
  ITEM_TYPE_OPTIONS,
} from './shared/rpgDbConstants'
import { normalizeItem } from './shared/dbDefaults'

export default {
  name: 'ItemEditorPanel',
  components: {
    DbGroupBox,
    IconPickerField,
    IdNameField,
    DamageFields,
    EffectsTableEditor,
  },
  props: {
    modelValue: { type: Object, default: null },
  },
  computed: {
    scopeOpts() {
      return SCOPE_OPTIONS
    },
    occasionOpts() {
      return OCCASION_OPTIONS
    },
    hitOpts() {
      return HIT_TYPE_OPTIONS
    },
    itypeOpts() {
      return ITEM_TYPE_OPTIONS
    },
  },
  watch: {
    modelValue: {
      immediate: true,
      handler(v) {
        if (v) normalizeItem(v)
      },
    },
  },
}
</script>

<style scoped>
.item-ed {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: flex-start;
}
.col-mid {
  flex: 1.1;
  min-width: 340px;
}
.col-right {
  flex: 1;
  min-width: 280px;
}
.mt {
  margin-top: 10px;
}
.suffix {
  margin-left: 4px;
  font-size: 12px;
}
</style>
