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
            <template v-for="(item) in visibleDataList" :key="item && item.id">
              <li v-if="item" tabindex="0" data-editor-list-item :title="item.name" @click="selectItem(item); $event.currentTarget.focus()" @contextmenu.prevent.stop="selectItem(item,$event); $event.currentTarget.focus()" :class="[currentItem.id === item.id ? 'active' : '' ]">{{item.id}}:{{item.name}}</li>
            </template>
          </ul>
          <ul v-show="menu.visible" :style="{left:menu.left+'px',top:menu.top+'px'}" class="contextmenu">
            <li @click="clearItem">清空 (Delete)</li>
            <li @click="">复制 (Ctrl + C)</li>
            <li @click="">粘贴 (Ctrl + V)</li>
          </ul>
        </div>
        <el-button class="add-item-btn" @click="handleClick" @contextmenu.prevent.stop="batchAdd" >添加(右键批量)</el-button>
      </div>
      <main class="el-main" v-if="currentItem.id">
        <el-divider >{{currentItem.name}}</el-divider>
        <el-form ref="loginForm" class="login-form fixed-width" label-width="70px" :model="currentItem">
          <el-row >
            <el-col :span="10">
              <el-form-item label="名称" prop="name">
                <el-input v-model="currentItem.name"></el-input>
              </el-form-item>
            </el-col>
            <el-col :span="10">
              <el-form-item label="价格" prop="price">
                <el-input v-model="currentItem.price"></el-input>
              </el-form-item>
            </el-col>
          </el-row>
          <el-row >
            <el-col :span="10">
              <el-form-item label="载重" prop="name">
                <el-input v-model="currentItem.load"></el-input>
              </el-form-item>
            </el-col>
            <el-col :span="10">
              <el-form-item label="重量" prop="price">
                <el-input v-model="currentItem.heft"></el-input>
              </el-form-item>
            </el-col>
          </el-row>
          <el-row>
            <el-col :span="10">
              <el-form-item label="说明" prop="description">
                <el-input v-model="currentItem.description" prop="description"></el-input>
              </el-form-item>
            </el-col>
          </el-row>
        </el-form>
      </main>
    </section>
  </div>
</template>
<script>
import { CONTEXTMENU_SLOT } from '@/mixins/contextmenu'

export default {
  name: 'BaseArmors',
  mixins:[CONTEXTMENU_SLOT],
  data() {
    return {
      meta:{
        dataType: 'items',
      },
      currentItem:{},
      dataList:[],
      watcher:null,
      changedItems:{},
    };
  },
  methods:{
    selectItem(item,e){
      this.watcher && this.watcher();
      if(item){
        this.currentItem = item;
        if(this.currentItem){
          this.watcher = this.$watch("currentItem",{
            handler(){
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
    handleClick(){
      console.log(this.meta.dataType);
      // this.$router.push("/hash2");
    },
    clearItem(){
      if(this.currentItem){
        this.dataList[this.currentItem.id] = {id:this.currentItem.id};
        this.selectItem(this.dataList[this.currentItem.id]);
      }
    },
    batchAdd(){
      return this.$message.error("添加批量未开发");
    }
  },
  created(){
    window.items = this;
    this.$openLoading();
    let contents = this.$loadDataSync("Armors");
    if(contents == null){
      this.$closeLoading();
      return this.$message.error("数据加载失败");
    }
    this.dataList = contents;
    this.$nextTick(()=>{
      this.selectItem(this.dataList[1]);
      this.$closeLoading();
    });
  },
}
</script>
