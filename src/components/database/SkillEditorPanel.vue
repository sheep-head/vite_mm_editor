<template>
  <div v-if="modelValue" class="skill-ed">
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
          <el-form-item label="技能类型">
            <el-select v-model="modelValue.stypeId" style="width: 160px">
              <el-option v-for="o in stypeOpts" :key="o.value" :label="o.label" :value="o.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="MP 消耗">
            <el-input-number v-model="modelValue.mpCost" :min="0" controls-position="right" />
          </el-form-item>
          <el-form-item label="TP 消耗">
            <el-input-number v-model="modelValue.tpCost" :min="0" controls-position="right" />
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

      <db-group-box title="信息" class="mt">
        <el-form size="small" label-width="72px" @submit.prevent>
          <el-form-item label="消息1">
            <el-input v-model="modelValue.message1" />
          </el-form-item>
          <el-form-item label="消息2">
            <el-input v-model="modelValue.message2" />
          </el-form-item>
          <div class="msg-btns">
            <el-button size="small" @click="fillMsg('吟唱了%1！')">吟唱了～！</el-button>
            <el-button size="small" @click="fillMsg('施放了%1！')">施放了～！</el-button>
            <el-button size="small" @click="fillMsg('使用了%1！')">使用了～！</el-button>
          </div>
        </el-form>
      </db-group-box>

      <db-group-box title="需要武器" class="mt">
        <el-form size="small" label-width="88px" @submit.prevent>
          <el-form-item label="武器类型1">
            <el-select v-model="modelValue.requiredWtypeId1" style="width: 160px">
              <el-option v-for="o in wtypeOpts" :key="o.value" :label="o.label" :value="o.value" />
            </el-select>
          </el-form-item>
          <el-form-item label="武器类型2">
            <el-select v-model="modelValue.requiredWtypeId2" style="width: 160px">
              <el-option v-for="o in wtypeOpts" :key="o.value" :label="o.label" :value="o.value" />
            </el-select>
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
        <el-input v-model="modelValue.note" type="textarea" :rows="6" />
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
} from './shared/rpgDbConstants'
import { typeList, typeOptions } from './shared/systemLookups'
import { normalizeSkill } from './shared/dbDefaults'

export default {
  name: 'SkillEditorPanel',
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
    stypeOpts() {
      return typeOptions(typeList('skillTypes'))
    },
    wtypeOpts() {
      return typeOptions(typeList('weaponTypes'))
    },
  },
  watch: {
    modelValue: {
      immediate: true,
      handler(v) {
        if (v) normalizeSkill(v)
      },
    },
  },
  methods: {
    fillMsg(tpl) {
      // 运行时 %1 = 使用者名
      this.modelValue.message1 = tpl
      if (this.modelValue.message2 == null) this.modelValue.message2 = ''
    },
  },
}
</script>

<style scoped>
.skill-ed {
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
.msg-btns {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-left: 72px;
  margin-bottom: 4px;
}
</style>
