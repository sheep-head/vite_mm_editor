<template>
  <div>
    <header>
      羊头专用编辑器
      <div class="profile">
        <el-dropdown trigger="hover" placement="bottom-end">
          <span class="profile-trigger">
            <img class="profile-img" src="https://q2.qlogo.cn/headimg_dl?dst_uin=761303761&amp;spec=40" alt="">
            <span class="profile-name">羊头</span>
            <yt-icon name="el-icon-arrow-down" class="profile-arrow"></yt-icon>
          </span>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item @click="settingsVisible = true">设置</el-dropdown-item>
              <el-dropdown-item @click="changeWorkspace">更换工作空间</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </header>

    <el-dialog
      v-model="settingsVisible"
      title="设置"
      width="420px"
      append-to-body>
      <el-form label-width="80px">
        <el-form-item label="主题">
          <el-radio-group v-model="dark">
            <el-radio :value="false">明亮色</el-radio>
            <el-radio :value="true">深暗色</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button type="primary" @click="settingsVisible = false">完成</el-button>
      </template>
    </el-dialog>
  </div>
</template>
<script>
import { isDark } from '@/utils/theme'

export default {
  name: 'YtHeader',
  data() {
    return {
      settingsVisible: false,
    };
  },
  computed: {
    dark: {
      get() {
        return isDark.value;
      },
      set(value) {
        isDark.value = value;
      }
    }
  },
  methods: {
    changeWorkspace() {
      this.$router.push({ path: '/workspace', query: { change: '1' } }).catch(() => true);
    }
  }
}
</script>
<style scoped>
  header{
    height: 50px;
    line-height: 50px;
    font-size: 20px;
    font-weight: bold;
    text-align: center;
    border-bottom: 1px solid var(--app-header-border);
    background-color: var(--app-header-bg);
    color: var(--app-header-text);
    box-sizing: border-box;
    position: relative;
  }

  .profile{
    padding: 0 16px;
    position: absolute;
    right: 0;
    top: 0;
    height: 100%;
    display: flex;
    align-items: center;
  }
  .profile-trigger{
    display: inline-flex;
    align-items: center;
    cursor: pointer;
    color: inherit;
    font-size: 14px;
    outline: none;
  }
  .profile-img{
    vertical-align: middle;
    width: 30px;
    height: 30px;
    margin-right: 8px;
    border-radius: 50%;
    border: 1px solid var(--app-border);
  }
  .profile-name{
    margin-right: 4px;
  }
  .profile-arrow{
    font-size: 12px;
    opacity: 0.75;
  }
</style>
