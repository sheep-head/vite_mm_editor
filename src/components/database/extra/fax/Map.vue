<template>
  <div class="div full-height">
    <section class="el-container full-height">
      <editor-side-list
        :items="dataList"
        :current-id="currentItem.id"
        label-key="name"
        :index-base="0"
        @select="selectItem"
        @add="$addItem"
        @clear="$clearItem"
        @delete="$deleteItem"
        @copy="$onCopy"
        @paste="$onPaste" />
      <main class="el-main" v-if="currentItem.id">
        <el-form ref="loginForm" class="login-form fixed-width" label-width="70px" :model="currentItem">
          <el-row >
            <el-col :span="10">
              <el-form-item label="名称" prop="n">
                <el-input v-model="currentItem.name" clearable class="place-name-input" :style="{color:currentItem.c || 'black'}"></el-input>
              </el-form-item>
            </el-col>
            <el-col :span="10">
              <el-form-item label="" label-width="0" prop="c">
                <el-color-picker v-model="currentItem.c"></el-color-picker>
              </el-form-item>
            </el-col>
          </el-row>
          <el-row >
            <el-col :span="8">
              <el-form-item label="洞穴" prop="b">
                <el-switch
                    v-model="currentItem.b"
                    style="--el-switch-on-color: #13ce66; --el-switch-off-color: #ff4949">
                </el-switch>
              </el-form-item>
            </el-col>
          </el-row>
          <el-row >
            <el-col :span="4">
              <el-form-item label="宽" prop="x">
                <el-input-number v-model="currentMapInfo.width"  controls-position="right" :min="0" :max="2000"></el-input-number>
              </el-form-item>
            </el-col>
            <el-col :span="4">
              <el-form-item label="高" prop="y">
                <el-input-number v-model="currentMapInfo.height"  controls-position="right" :min="0" :max="2000"></el-input-number>
              </el-form-item>
            </el-col>
          </el-row>
          <el-row>
            <el-col :span="10">
              <el-form-item label="备注" prop="description">
                <el-input v-model="currentItem.description" placeholder="没有实际作用" prop="description"></el-input>
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
import EditorSideList from '@/components/shared/EditorSideList.vue'

export default {
  name: 'FaxMap',
  components: { EditorSideList },
  mixins:[CONTEXTMENU_SLOT],
  data() {
    return {
      currentMapInfo:{},
    };
  },
  computed:{
    ...mapState(['mapInfos']),
  },
  methods:{
    selectItem(item){
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
    },
    $onSave(){
      console.log("save");
      if(this.changed){
        if(this.$saveDataSync("TownFax",this.dataList)){
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
        s:15,
        x:0,
        y:0,
      })
    },
    makeMapName(id){
      return 'Map%1'.format(id.toString().padZero(3));
    },
    mapChanged(mapId){
      if(!this.currentItem.n){
        this.currentItem.n = this.getMapName(mapId);
      }
    },
    handleClick(){
      // this.$router.push("/hash2");
    },
  },
  created(){
    window.map = this;
    this.$openLoading();
    this.dataList = this.mapInfos;
    this.$nextTick(()=>{
      this.selectItem(this.dataList[1]);
      this.$closeLoading();
    });
  },
  watch:{
    "currentItem.id":{
      handler(newVal,oldVal){
        if(newVal){
          this.currentMapInfo = this.$loadDataSync(this.makeMapName(newVal),true);
        }
      },
      deep:true
    }
  }
}
</script>
<style>
.place-name-input input{
  color: inherit!important;
}
</style>
