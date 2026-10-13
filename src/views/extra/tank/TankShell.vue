<template>
  <div class="div full-height">
    <section class="el-container full-height">
      <div class="list-slider">
        <el-input placeholder="请输入内容" v-model="meta.searchWord" clearable @clear="$onClearSearch" class="input-with-select">
          <template #append>
            <el-button @click="$onSearch"><yt-icon name="el-icon-search"></yt-icon></el-button>
          </template>
        </el-input>
        <div class="item-list" @scroll="handleScroll">
          <ul>
            <template v-for="(item,index) in visibleDataList" :key="index">
              <li v-if="item" tabindex="0" data-editor-list-item :title="item.name" :style="{color:item.c || ''}" @click="selectItem(item); $event.currentTarget.focus()" @contextmenu.prevent.stop="selectItem(item,$event); $event.currentTarget.focus()" :class="[currentItem.id === item.id ? 'active' : '' ]">{{index + 1}}:{{item.name}}</li>
            </template>
          </ul>
          <ul v-show="menu.visible" :style="{left:menu.left+'px',top:menu.top+'px'}" class="contextmenu">
            <li @click="$clearItem">清空</li>
            <li @click="$deleteItem">删除</li>
            <li @click="$onCopy">复制</li>
            <li @click="">粘贴</li>
          </ul>
        </div>
        <el-button class="add-item-btn" @click="$addItem">add + </el-button>
      </div>
      <main class="el-main" v-if="currentItem.id">
        <el-form ref="loginForm" class="login-form fixed-width" label-width="70px" :model="currentItem">
          <el-row >
            <el-col :span="4">
              <el-form-item label="炮弹名" prop="name">
                <el-input v-model="currentItem.name" clearable class="place-name-input" :style="{color:currentItem.c || 'black'}"></el-input>
              </el-form-item>
            </el-col>
            <el-col :span="2">
              <el-form-item label="" label-width="0" prop="c">
                <el-color-picker v-model="currentItem.c"></el-color-picker>
              </el-form-item>
            </el-col>
          </el-row>
          <el-row >
            <el-col :span="4">
              <el-form-item label="价格" prop="price">
                <el-input-number v-model="currentItem.price"  controls-position="right" :min="0" :max="2000"></el-input-number>
              </el-form-item>
            </el-col>
            <el-col :span="4">
              <el-form-item label="动画" prop="description">
                <el-select v-model="currentItem.animationId" clearable filterable placeholder="请选择">
                  <template v-for="item in animations" :key="item && item.id">
                    <el-option v-if="item" :label="item.id + ':' + item.name" :value="item.id"></el-option>
                  </template>
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
          <el-row>
            <el-col :span="12">
              <el-form-item label="说明" prop="description">
                <el-input v-model="currentItem.description" placeholder="请输入" prop="description"></el-input>
              </el-form-item>
            </el-col>
          </el-row>
        </el-form>
      </main>
    </section>
  </div>
</template>
<script>
import { mapState } from 'vuex'
import { CONTEXTMENU_SLOT } from '@/mixins/contextmenu'
import { useEditorData } from '@/composables/useEditorData'
import Drag from '@/components/Draggable.vue'

const shellStore = useEditorData({
  fileName: 'TankOtherData',
  mergeField: 'shellData',
})

export default {
  name: 'TankShell',
  components: {
    Drag
  },
  mixins:[CONTEXTMENU_SLOT],
  data() {
    return {
      meta:{
        dataType: 'shell',
      },
    };
  },
  computed:{
    ...mapState(['animations']),
  },
  methods:{
    selectItem(item,e){
      this.watcher && this.watcher();
      if(item){
        this.currentItem = item;
        if(this.currentItem){
          this.watcher = this.$watch("currentItem",{
            handler(newVal,oldVal){
              this.changed = true;
            },
            deep:true
          });
        }
      }
      if(e){
        this.openMenu(e);
      }
    },
    $onSave(){
      if(this.changed){
        if(shellStore.save(this.dataList)){
          this.$message.success("保存成功");
          this.changed = false;
        }else {
          this.$message.error("保存失败");
        }
      }
    },
    $addItem(){
      this.dataList.push({
        id:this.dataList.length + 1,
        price:0,
      })
    },
    handleClick(){
      // this.$router.push("/hash2");
    },
    getMapName(id){
      console.log(id);
      let map = this.mapInfos.find(item=>item && item.id === id);
      return map ? map.name : "";
    },
  },
  created(){
    window.tankShell = this;
    this.$openLoading();
    let contents = shellStore.load();
    if(contents == null){
      this.dataList = [];
      this.$closeLoading();
      this.$addItem();
      return this.$message.error("文件不存在，此次作为新增处理");
    }
    if (!Array.isArray(contents)) {
      contents = [];
    }
    contents.forEach(item=>{
      if (!item) return;
      delete item.x;
      delete item.y;
      delete item.s;
    });
    this.dataList = contents;
    this.$nextTick(()=>{
      if (this.dataList.length) {
        this.selectItem(this.dataList[0]);
      }
      this.$closeLoading();
    });
  },
}
</script>
<style>
.place-name-input input{
  color: inherit!important;
}
.full-width.el-select{
  width:100%;
}
.el-dialog-div{
  height: 60vh;
  /*overflow: auto;*/
}
</style>
