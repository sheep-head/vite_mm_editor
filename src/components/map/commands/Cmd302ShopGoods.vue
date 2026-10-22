<template>
  <el-dialog
    :model-value="modelValue"
    title="商品"
    width="420px"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
    @update:model-value="$emit('update:modelValue', $event)">
    <db-group-box title="商品" class="goods-box">
      <div class="goods-opt">
        <el-radio v-model="type" :value="0">物品</el-radio>
        <id-name-field v-model="itemId" type="item" width="220px" :disabled="type !== 0" :allow-none="false" />
      </div>
      <div class="goods-opt">
        <el-radio v-model="type" :value="1">武器</el-radio>
        <id-name-field v-model="weaponId" type="weapon" width="220px" :disabled="type !== 1" :allow-none="false" />
      </div>
      <div class="goods-opt">
        <el-radio v-model="type" :value="2">防具</el-radio>
        <id-name-field v-model="armorId" type="armor" width="220px" :disabled="type !== 2" :allow-none="false" />
      </div>
    </db-group-box>
    <db-group-box title="价格">
      <div class="price-opt">
        <el-radio v-model="priceType" :value="0">标准</el-radio>
      </div>
      <div class="price-opt">
        <el-radio v-model="priceType" :value="1">指定</el-radio>
        <el-input-number
          v-model="price"
          :min="0"
          :disabled="priceType !== 1"
          size="small"
          controls-position="right" />
      </div>
    </db-group-box>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" @click="ok">确定</el-button>
    </template>
  </el-dialog>
</template>

<script>
import DbGroupBox from '@/components/database/shared/DbGroupBox.vue'
import IdNameField from '@/components/database/shared/IdNameField.vue'

export default {
  name: 'Cmd302ShopGoods',
  components: { DbGroupBox, IdNameField },
  props: {
    modelValue: Boolean,
    goods: {
      type: Object,
      default: () => ({ type: 0, id: 1, priceType: 0, price: 0 }),
    },
  },
  emits: ['update:modelValue', 'confirm'],
  data() {
    return {
      type: 0,
      itemId: 1,
      weaponId: 1,
      armorId: 1,
      priceType: 0,
      price: 0,
    }
  },
  watch: {
    modelValue: {
      immediate: true,
      handler(v) {
        if (!v) return
        const g = this.goods || {}
        this.type = g.type || 0
        this.itemId = this.type === 0 ? g.id || 1 : 1
        this.weaponId = this.type === 1 ? g.id || 1 : 1
        this.armorId = this.type === 2 ? g.id || 1 : 1
        this.priceType = g.priceType || 0
        this.price = g.price || 0
      },
    },
  },
  methods: {
    ok() {
      const id = this.type === 0 ? this.itemId : this.type === 1 ? this.weaponId : this.armorId
      this.$emit('confirm', {
        type: this.type,
        id: id || 1,
        priceType: this.priceType,
        price: this.priceType === 1 ? this.price || 0 : 0,
      })
      this.$emit('update:modelValue', false)
    },
  },
}
</script>

<style scoped>
.goods-box {
  margin-bottom: 10px;
}
.goods-opt,
.price-opt {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}
.goods-opt :deep(.el-radio),
.price-opt :deep(.el-radio) {
  min-width: 56px;
}
</style>
