<template>
  <div v-if="modelValue" class="class-ed">
    <div class="col-mid">
      <db-group-box title="基本设置">
        <el-form size="small" label-width="88px" @submit.prevent>
          <el-form-item label="名称">
            <el-input v-model="modelValue.name" style="width: 200px" />
          </el-form-item>
          <el-form-item label="经验值曲线">
            <el-input :model-value="expSummary" readonly style="width: 200px" />
            <el-button size="small" @click="expOpen = true">…</el-button>
          </el-form-item>
        </el-form>
      </db-group-box>

      <db-group-box title="能力值曲线" class="mt">
        <div class="curves">
          <param-curve-view
            v-for="(lab, i) in labels"
            :key="i"
            :label="lab"
            :values="modelValue.params[i]"
            @click="openCurve(i)" />
        </div>
      </db-group-box>

      <db-group-box title="要习得的技能" class="mt">
        <div class="tools">
          <el-button size="small" @click="addLearning">添加</el-button>
          <el-button size="small" :disabled="learnSel < 0" @click="removeLearning">删除</el-button>
        </div>
        <el-table
          :data="modelValue.learnings"
          size="small"
          max-height="220"
          highlight-current-row
          @current-change="onLearnCurrent">
          <el-table-column label="等级" width="100">
            <template #default="{ row }">
              <el-input-number v-model="row.level" :min="1" :max="99" size="small" controls-position="right" />
            </template>
          </el-table-column>
          <el-table-column label="技能" min-width="180">
            <template #default="{ row }">
              <id-name-field v-model="row.skillId" type="skill" width="160px" />
            </template>
          </el-table-column>
          <el-table-column label="备注" min-width="120">
            <template #default="{ row }">
              <el-input v-model="row.note" size="small" />
            </template>
          </el-table-column>
        </el-table>
      </db-group-box>
    </div>

    <div class="col-right">
      <db-group-box title="特性">
        <traits-table-editor v-model="modelValue.traits" />
      </db-group-box>
      <db-group-box title="备注" class="mt">
        <el-input v-model="modelValue.note" type="textarea" :rows="8" />
      </db-group-box>
    </div>

    <param-curve-dialog
      v-model="curveOpen"
      :label="curveLabel"
      :values="curveValues"
      @confirm="onCurveConfirm" />
    <exp-curve-dialog
      v-model="expOpen"
      :params="modelValue.expParams"
      @confirm="onExpConfirm" />
  </div>
</template>

<script>
import DbGroupBox from './shared/DbGroupBox.vue'
import TraitsTableEditor from './shared/TraitsTableEditor.vue'
import ParamCurveView from './shared/ParamCurveView.vue'
import ParamCurveDialog from './shared/ParamCurveDialog.vue'
import ExpCurveDialog from './shared/ExpCurveDialog.vue'
import IdNameField from './shared/IdNameField.vue'
import { paramLabels } from './shared/systemLookups'
import { normalizeClass } from './shared/dbDefaults'

export default {
  name: 'ClassEditorPanel',
  components: {
    DbGroupBox,
    TraitsTableEditor,
    ParamCurveView,
    ParamCurveDialog,
    ExpCurveDialog,
    IdNameField,
  },
  props: {
    modelValue: { type: Object, default: null },
  },
  data() {
    return {
      curveOpen: false,
      curveIndex: 0,
      expOpen: false,
      learnSel: -1,
    }
  },
  computed: {
    labels() {
      return paramLabels()
    },
    expSummary() {
      const p = (this.modelValue && this.modelValue.expParams) || []
      return `[${p[0] || 0}, ${p[1] || 0}, ${p[2] || 0}, ${p[3] || 0}]`
    },
    curveLabel() {
      return this.labels[this.curveIndex] || ''
    },
    curveValues() {
      return (this.modelValue && this.modelValue.params && this.modelValue.params[this.curveIndex]) || []
    },
  },
  watch: {
    modelValue: {
      immediate: true,
      handler(v) {
        if (v) normalizeClass(v)
      },
    },
  },
  methods: {
    openCurve(i) {
      this.curveIndex = i
      this.curveOpen = true
    },
    onCurveConfirm(vals) {
      if (!this.modelValue.params) return
      this.modelValue.params[this.curveIndex] = vals
    },
    onExpConfirm(p) {
      this.modelValue.expParams = p
    },
    addLearning() {
      if (!Array.isArray(this.modelValue.learnings)) this.modelValue.learnings = []
      this.modelValue.learnings.push({ level: 1, skillId: 1, note: '' })
    },
    removeLearning() {
      if (this.learnSel < 0) return
      this.modelValue.learnings.splice(this.learnSel, 1)
      this.learnSel = -1
    },
    onLearnCurrent(row) {
      this.learnSel = row ? this.modelValue.learnings.indexOf(row) : -1
    },
  },
}
</script>

<style scoped>
.class-ed {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: flex-start;
}
.col-mid {
  flex: 1.2;
  min-width: 360px;
}
.col-right {
  flex: 1;
  min-width: 280px;
}
.mt {
  margin-top: 10px;
}
.curves {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}
.tools {
  display: flex;
  gap: 6px;
  margin-bottom: 6px;
}
</style>
