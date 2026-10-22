<template>
  <div class="div full-height">
    <section class="el-container full-height">
      <editor-side-list
        :items="dataList"
        :current-id="currentItem.id"
        label-key="n"
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
              <el-form-item label="目的地名" prop="n">
                <el-input v-model="currentItem.n" clearable class="place-name-input" :style="{color:currentItem.c || 'black'}"></el-input>
              </el-form-item>
            </el-col>
            <el-col :span="10">
              <el-form-item label="" label-width="0" prop="c">
                <el-color-picker v-model="currentItem.c"></el-color-picker>
              </el-form-item>
            </el-col>
          </el-row>
          <el-row >
            <el-col :span="10">
              <el-form-item label="说明" prop="name">
                <el-input v-model="currentItem.d" type="textarea"></el-input>
              </el-form-item>
            </el-col>
          </el-row>
          <el-row >
            <el-col :span="10">
              <el-form-item label="字号" prop="s">
                <el-input v-model="currentItem.s"></el-input>
              </el-form-item>
            </el-col>
          </el-row>
          <el-row >
            <el-col :span="4">
              <el-form-item label="x轴" prop="x">
                <el-input-number v-model="currentItem.x"  controls-position="right" :min="0" :max="2000"></el-input-number>
<!--                <el-input v-model="currentItem.x"></el-input>-->
              </el-form-item>
            </el-col>
            <el-col :span="4">
              <el-form-item label="y轴" prop="y">
                <el-input-number v-model="currentItem.y"  controls-position="right" :min="0" :max="2000"></el-input-number>
<!--                <el-input v-model="currentItem.y"></el-input>-->
              </el-form-item>
            </el-col>
          </el-row>
          <el-row >
            <el-col :span="8">
              <el-form-item label="携带船只" prop="b">
                <el-switch
                    v-model="currentItem.b"
                    style="--el-switch-on-color: #13ce66; --el-switch-off-color: #ff4949">
                </el-switch>
              </el-form-item>
            </el-col>
          </el-row>

          <el-row v-if="currentItem.b">
            <el-col :span="4">
              <el-form-item label="船只x轴" prop="bx">
                <el-input-number v-model="currentItem.bx"  controls-position="right" :min="0" :max="2000"></el-input-number>
              </el-form-item>
            </el-col>
            <el-col :span="4">
              <el-form-item label="船只y轴" prop="by">
                <el-input-number v-model="currentItem.by"  controls-position="right" :min="0" :max="2000"></el-input-number>
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
import { CONTEXTMENU_SLOT } from '@/mixins/contextmenu'
import EditorSideList from '@/components/shared/EditorSideList.vue'

export default {
  name: 'Fax',
  components: { EditorSideList },
  mixins:[CONTEXTMENU_SLOT],
  data() {
    return {
      changedItems:{},
    };
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
        if(this.$saveDataSync("Fax",this.dataList)){
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
        b:false,
        x:0,
        y:0,
        bx:0,
        by:0,
      })
    },
  },
  created(){
    window.fax = this;
    this.$openLoading();
    let contents = this.$loadExtraDataSync("Fax");
    if(contents == null){
      this.$closeLoading();
      this.$addItem();
      return this.$message.error("文件不存在，此次作为新增处理");
    }
    this.dataList = contents;
    this.$nextTick(()=>{
      this.selectItem(this.dataList[0]);
      this.$closeLoading();
    });
  },
}
</script>
<style>
  .place-name-input input{
    color: inherit!important;
  }
</style>
