<template>
  <el-dialog
    :model-value="modelValue"
    title="行动模式"
    width="480px"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
    @update:model-value="$emit('update:modelValue', $event)">
    <el-form size="small" label-width="88px">
      <el-form-item label="技能">
        <id-name-field v-model="draft.skillId" type="skill" />
      </el-form-item>
      <el-form-item label="评级">
        <el-input-number v-model="draft.rating" :min="1" :max="9" controls-position="right" />
      </el-form-item>
      <el-form-item label="条件">
        <el-select v-model="draft.conditionType" style="width: 160px">
          <el-option v-for="o in condOpts" :key="o.value" :label="o.label" :value="o.value" />
        </el-select>
      </el-form-item>
      <template v-if="draft.conditionType === 1">
        <el-form-item label="回合 a">
          <el-input-number v-model="draft.conditionParam1" :min="0" controls-position="right" />
        </el-form-item>
        <el-form-item label="回合 b">
          <el-input-number v-model="draft.conditionParam2" :min="0" controls-position="right" />
        </el-form-item>
        <div class="hint">每 a + b×n 回合（b=0 仅第 a 回合）</div>
      </template>
      <template v-else-if="draft.conditionType === 2 || draft.conditionType === 3">
        <el-form-item :label="draft.conditionType === 2 ? 'HP % ≥' : 'MP % ≥'">
          <el-input-number v-model="draft.conditionParam1" :min="0" :max="100" controls-position="right" />
        </el-form-item>
        <el-form-item :label="draft.conditionType === 2 ? 'HP % ≤' : 'MP % ≤'">
          <el-input-number v-model="draft.conditionParam2" :min="0" :max="100" controls-position="right" />
        </el-form-item>
      </template>
      <el-form-item v-else-if="draft.conditionType === 4" label="状态">
        <id-name-field v-model="draft.conditionParam1" type="state" />
      </el-form-item>
      <template v-else-if="draft.conditionType === 5">
        <el-form-item label="等级 ≥">
          <el-input-number v-model="draft.conditionParam1" :min="1" controls-position="right" />
        </el-form-item>
        <el-form-item label="等级 ≤">
          <el-input-number v-model="draft.conditionParam2" :min="1" controls-position="right" />
        </el-form-item>
      </template>
      <el-form-item v-else-if="draft.conditionType === 6" label="开关">
        <el-input-number v-model="draft.conditionParam1" :min="1" controls-position="right" />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" @click="confirm">确定</el-button>
    </template>
  </el-dialog>
</template>

<script>
import IdNameField from './IdNameField.vue'
import { ENEMY_ACTION_CONDITION_OPTIONS } from './rpgDbConstants'

export default {
  name: 'EnemyActionEditDialog',
  components: { IdNameField },
  props: {
    modelValue: { type: Boolean, default: false },
    action: { type: Object, default: null },
  },
  emits: ['update:modelValue', 'confirm'],
  data() {
    return {
      draft: {
        skillId: 1,
        rating: 5,
        conditionType: 0,
        conditionParam1: 0,
        conditionParam2: 0,
      },
    }
  },
  computed: {
    condOpts() {
      return ENEMY_ACTION_CONDITION_OPTIONS
    },
  },
  watch: {
    modelValue: {
      immediate: true,
      handler(v) {
        if (!v) return
        const a = this.action || {}
        this.draft = {
          skillId: a.skillId != null ? a.skillId : 1,
          rating: a.rating != null ? a.rating : 5,
          conditionType: a.conditionType != null ? a.conditionType : 0,
          conditionParam1: a.conditionParam1 != null ? a.conditionParam1 : 0,
          conditionParam2: a.conditionParam2 != null ? a.conditionParam2 : 0,
        }
      },
    },
  },
  methods: {
    confirm() {
      this.$emit('confirm', { ...this.draft })
      this.$emit('update:modelValue', false)
    },
  },
}
</script>

<style scoped>
.hint {
  font-size: 11px;
  color: var(--app-text-muted);
  margin: -4px 0 8px 88px;
}
</style>
