<template>
  <el-dialog :model-value="modelValue" title="商店处理" width="520px" append-to-body destroy-on-close :close-on-click-modal="false" @update:model-value="$emit('update:modelValue', $event)">
    <el-form size="small" label-width="88px">
      <el-form-item label="购买专用"><el-checkbox v-model="purchaseOnly" /></el-form-item>
      <el-form-item label="商品">
        <div class="goods-list">
          <div v-for="(g, i) in goods" :key="i" class="goods-row">
            <el-select v-model="g.type" style="width: 88px">
              <el-option :value="0" label="物品" />
              <el-option :value="1" label="武器" />
              <el-option :value="2" label="防具" />
            </el-select>
            <el-input-number v-model="g.id" :min="1" controls-position="right" />
            <el-select v-model="g.priceType" style="width: 100px">
              <el-option :value="0" label="标准价" />
              <el-option :value="1" label="指定价" />
            </el-select>
            <el-input-number v-if="g.priceType === 1" v-model="g.price" :min="0" controls-position="right" />
            <el-button size="small" @click="goods.splice(i, 1)">删</el-button>
          </div>
          <el-button size="small" @click="goods.push({ type: 0, id: 1, priceType: 0, price: 0 })">添加商品</el-button>
        </div>
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
  name: 'Cmd302Shop',
  props: { modelValue: Boolean, command: Object },
  emits: ['update:modelValue', 'confirm'],
  data() {
    return {
      purchaseOnly: false,
      goods: [{ type: 0, id: 1, priceType: 0, price: 0 }],
      editOnly: false,
    }
  },
  watch: {
    modelValue: {
      immediate: true,
      handler(v) {
        if (!v) return
        const c = this.command
        const p = (c && c.parameters) || []
        // MZ/MV: [type, id, priceType, price, purchaseOnly?] — catalog uses [[], false, 0] which is wrong shape
        // Runtime: goods rows are [type, id, priceType, price]; purchaseOnly is params[4] on first
        if (c && c.code === 302 && p.length >= 4 && typeof p[0] === 'number') {
          this.goods = [{ type: p[0] || 0, id: p[1] || 1, priceType: p[2] || 0, price: p[3] || 0 }]
          this.purchaseOnly = !!p[4]
          this.editOnly = true
        } else if (Array.isArray(p[0])) {
          // catalog weird default
          this.goods = [{ type: 0, id: 1, priceType: 0, price: 0 }]
          this.purchaseOnly = !!p[1]
          this.editOnly = false
        } else {
          this.goods = [{ type: 0, id: 1, priceType: 0, price: 0 }]
          this.purchaseOnly = false
          this.editOnly = false
        }
        if (Array.isArray(c && c._extraGoods)) {
          this.goods = this.goods.concat(c._extraGoods)
        }
      },
    },
  },
  methods: {
    ok() {
      const indent = (this.command && this.command.indent) || 0
      const list = this.goods.length ? this.goods : [{ type: 0, id: 1, priceType: 0, price: 0 }]
      const first = list[0]
      const cmd302 = {
        code: 302,
        indent,
        parameters: [first.type, first.id, first.priceType, first.price, this.purchaseOnly],
      }
      if (this.editOnly && list.length === 1) {
        this.$emit('confirm', [cmd302])
        this.$emit('update:modelValue', false)
        return
      }
      const commands = [cmd302]
      for (let i = 1; i < list.length; i++) {
        const g = list[i]
        commands.push({
          code: 605,
          indent,
          parameters: [g.type, g.id, g.priceType, g.price],
        })
      }
      this.$emit('confirm', commands)
      this.$emit('update:modelValue', false)
    },
  },
}
</script>
<style scoped>
.goods-list { display: flex; flex-direction: column; gap: 6px; width: 100%; }
.goods-row { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
</style>
