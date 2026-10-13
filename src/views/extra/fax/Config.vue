<template>
  <div class="div full-height">
    <el-form ref="loginForm" class="login-form fixed-width" label-width="auto" :model="config">
      <el-row >
        <el-col :span="8">
          <el-form-item label="调试模式下隐藏小地图黑幕" prop="b">
            <el-switch
                v-model="config.debugHideMiniMapBlackCanvas"
                style="--el-switch-on-color: #13ce66; --el-switch-off-color: #ff4949">
            </el-switch>
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>
  </div>
</template>
<script>
import { CONTEXTMENU_SLOT } from '@/mixins/contextmenu'
import { useEditorData } from '@/composables/useEditorData'

const configStore = useEditorData({ fileName: 'ConfigMiniMap' })

export default {
  name: 'FaxConfig',
  mixins:[CONTEXTMENU_SLOT],
  data() {
    return {
      meta:{
        dataType: 'configMiniMap',
        init:false,
      },
      config:{
        debugHideMiniMapBlackCanvas:false
      },
    };
  },
  methods:{
    $onSave(){
      console.log('save');
      if(this.changed){
        if(configStore.save(this.config)){
          this.$message.success("保存成功");
          this.changed = false;
        }else {
          this.$message.error("保存失败");
        }
      }
    },
  },
  created(){
    window.fax = this;
    this.$openLoading();
    const contents = configStore.load();
    if(contents == null){
      this.$closeLoading();
      this.$message.error("文件不存在，此次作为新增处理");
    } else if (contents && typeof contents === 'object' && !Array.isArray(contents)) {
      this.config = { ...this.config, ...contents };
    }
    this.$nextTick(()=>{
      this.meta.init = true;
      this.$closeLoading();
    });
  },
  watch:{
    config:{
      handler(){
        if(this.meta.init){
          this.changed = true;
        }
      },
      deep:true,
    },
  },
}
</script>
<style>
  .place-name-input input{
    color: inherit!important;
  }
</style>
