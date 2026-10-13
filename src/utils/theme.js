import { ref, watch } from 'vue'

const THEME_KEY = 'editor-theme'

function readIsDark() {
  try {
    return localStorage.getItem(THEME_KEY) === 'dark'
  } catch (e) {
    return false
  }
}

/** 是否使用深暗色皮肤，默认明亮色 */
export const isDark = ref(readIsDark())

function applyTheme(dark) {
  document.documentElement.classList.toggle('dark', dark)
}

watch(isDark, (dark) => {
  applyTheme(dark)
  try {
    localStorage.setItem(THEME_KEY, dark ? 'dark' : 'light')
  } catch (e) {
    /* ignore */
  }
}, { immediate: true })
