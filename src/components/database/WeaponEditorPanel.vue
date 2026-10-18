<template>
  <div v-if="modelValue" class="weapon-ed">
    <div class="col-left">
      <db-group-box title="基本设置">
        <el-form size="small" label-width="72px" @submit.prevent>
          <el-form-item label="名称">
            <el-input v-model="modelValue.name" />
          </el-form-item>
          <el-form-item label="图标">
            <icon-picker-field v-model="modelValue.iconIndex" />
          </el-form-item>
          <el-form-item label="说明">
            <el-input v-model="modelValue.description" type="textarea" :rows="3" />
          </el-form-item>
          <el-form-item label="武器类型">
            <el-select v-model="modelValue.wtypeId" style="width: 180px">
              <el-option v-for="o in wtypeOpts" :key="o.value" :label="o.label" :value="o.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="价格">
            <el-input-number v-model="modelValue.price" :min="0" controls-position="right" />
          </el-form-item>
          <el-form-item label="动画">
            <id-name-field v-model="modelValue.animationId" type="animation" />
          </el-form-item>
          <el-form-item label="装备类型">
            <el-select v-model="modelValue.etypeId" style="width: 180px">
              <el-option v-for="o in etypeOpts" :key="o.value" :label="o.label" :value="o.value" />
            </el-select>
          </el-form-item>
        </el-form>
      </db-group-box>

      <db-group-box title="能力值变化量" class="mt">
        <div class="params-grid">
          <div v-for="(lab, i) in labels" :key="i" class="param-item">
            <span class="param-lab">{{ lab }}</span>
            <el-input-number
              v-model="modelValue.params[i]"
              controls-position="right"
              size="small"
              class="param-num" />
          </div>
        </div>
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
import IdNameField from './shared/IdNameField.vue'
import { typeList, typeOptions, paramLabels } from './shared/systemLookups'
import { normalizeWeapon } from './shared/dbDefaults'

export default {
  name: 'WeaponEditorPanel',
  components: { DbGroupBox, IconPickerField, TraitsTableEditor, IdNameField },
  props: {
    modelValue: { type: Object, default: null },
  },
  computed: {
    labels() {
      return paramLabels()
    },
    wtypeOpts() {
      return typeOptions(typeList('weaponTypes'))
    },
    etypeOpts() {
      return typeOptions(typeList('equipTypes'), { includeNone: false })
    },
  },
  watch: {
    modelValue: {
      immediate: true,
      handler(v) {
        if (v) normalizeWeapon(v)
      },
    },
  },
}
</script>

<style scoped>
.weapon-ed {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: flex-start;
}
.col-left {
  flex: 1.1;
  min-width: 320px;
}
.col-right {
  flex: 1;
  min-width: 280px;
}
.mt {
  margin-top: 10px;
}
.params-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px 12px;
}
.param-item {
  display: flex;
  align-items: center;
  gap: 6px;
}
.param-lab {
  width: 72px;
  font-size: 12px;
  flex-shrink: 0;
}
.param-num {
  width: 100px;
}
</style>
