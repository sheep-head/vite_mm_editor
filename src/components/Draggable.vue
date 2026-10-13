<template>
  <div class="test_wrapper" @dragover="dragover($event)">
    <transition-group class="transition-wrapper" name="sort">
      <div v-for="(item,index) in dataList" :key='index' class="el-tag el-tag--light"
           :draggable="true"
           @dragstart="dragstart(item)"
           @dragenter="dragenter(item,$event)"
           @dragend="dragend(item,$event)"
           @dragover="dragover($event)"
      >
        {{ getName(item) }}<yt-icon name="el-icon-close" class="el-tag__close" @click.stop="deleteThis(index)"></yt-icon>
      </div>
    </transition-group>
  </div>
</template>
<script >
export default  {
  name: 'Drag',
  // vue2 的 model:{event:"change"} + props.value，在 vue3 中对应 modelValue / update:modelValue
  props:{
    modelValue: {
      required: false
    },
    dictMap:{
      type:Object,
      default(){
        return []
      }
    },
  },
  data(){
    return {
      oldData:null, // 开始排序时按住的旧数据
      newData:null, // 拖拽过程的数据
      // 列表数据
      dataList:[],
    }
  },
  methods:{
    dragstart(value) {
      this.oldData = value
    },
    // 记录移动过程中信息
    dragenter(value, e) {
      this.newData = value
      e.preventDefault()
    },
    // 拖拽最终操作
    dragend(value, e) {
      if (this.oldData !== this.newData) {
        let oldIndex = this.dataList.indexOf(this.oldData)
        let newIndex = this.dataList.indexOf(this.newData)
        let newItems = [...this.dataList]
        // 删除老的节点
        newItems.splice(oldIndex, 1)
        // 在列表中目标位置增加新的节点
        newItems.splice(newIndex, 0, this.oldData)
        console.log(newItems)
        this.dataList = [...newItems];
        this.$emit("update:modelValue", this.dataList);
      }
    },
    deleteThis(index){
      this.dataList.splice(index,1)
      this.$emit("update:modelValue", this.dataList);
    },
    // 拖动事件（主要是为了拖动时鼠标光标不变为禁止）
    dragover(e) {
      e.preventDefault()
    },
    getName(id){
      return this.dictMap[id] || "";
    },
  },
  created(){
    window.drag = this;
  },
  watch: {
    modelValue: {
      handler(newVal) {
        this.dataList = newVal;
      },
      deep: true,
      immediate: true
    },
  }
};
</script>
<style scoped>
  .sort-item{
/*    -webkit-appearance: none;
    background-color: #FFF;
    background-image: none;
    border-radius: 4px;
    border: 1px solid #DCDFE6;
    -webkit-box-sizing: border-box;
    box-sizing: border-box;
    color: #606266;
    display: inline-block;
    font-size: inherit;
    height: 40px;
    line-height: 40px;
    outline: 0;
    padding: 0 15px;
    -webkit-transition: border-color .2s cubic-bezier(.645,.045,.355,1);
    transition: border-color .2s cubic-bezier(.645,.045,.355,1);
    width: 100%;*/
    background-color: #ecf5ff;
    border-color: #d9ecff;
    display: inline-block;
    height: 32px;
    padding: 0 10px;
    line-height: 30px;
    font-size: 12px;
    color: #409EFF;
    border-width: 1px;
    border-style: solid;
    border-radius: 4px;
    box-sizing: border-box;
    white-space: nowrap;
  }
  .sort-move {
    transition: transform 0.3s;
  }
</style>
