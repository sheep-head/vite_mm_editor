import { fileURLToPath, URL } from 'node:url'
import fs from 'node:fs'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

/**
 * NW.js 使用 file:// 协议加载页面：
 * 1. 浏览器会直接拒绝执行 type="module" 的脚本，所以改成普通的 iife 脚本；
 * 2. 构建时脚本会被放进 <head>，普通脚本要加 defer，等 #app 解析完再执行；
 * 3. crossorigin 在 file:// 下会触发 CORS 校验导致资源加载失败，一并去掉。
 */
function nwClassicScriptPlugin() {
  return {
    name: 'nw-classic-script',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        return html
          .replace(/<script\b([^>]*)>/g, (match, attrs) => {
            if (!/\btype="module"/.test(attrs)) return match
            let next = attrs
              .replace(/\s*type="module"/, '')
              .replace(/\s*crossorigin(="[^"]*")?/, '')
            if (!/\bdefer\b/.test(next)) next += ' defer'
            return `<script${next}>`
          })
          .replace(/<link\b([^>]*)>/g, (match, attrs) => {
            if (!/\bcrossorigin\b/.test(attrs)) return match
            return `<link${attrs.replace(/\s*crossorigin(="[^"]*")?/, '')}>`
          })
      }
    }
  }
}

/**
 * 把 nwjs/ 目录下的 NW.js 运行文件（清单、config.js、图标、启动脚本）复制到构建产物根目录
 */
function copyNwFilesPlugin() {
  return {
    name: 'copy-nw-files',
    apply: 'build',
    closeBundle() {
      const from = fileURLToPath(new URL('./nwjs', import.meta.url))
      const to = fileURLToPath(new URL('./dist', import.meta.url))
      if (!fs.existsSync(from)) return
      fs.cpSync(from, to, { recursive: true })
    }
  }
}

export default defineConfig({
  // NW.js 通过 file:// 打开，必须使用相对路径
  base: './',
  plugins: [vue(), nwClassicScriptPlugin(), copyNwFilesPlugin()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    host: '127.0.0.1',
    port: 5288
  },
  build: {
    target: 'chrome100',
    outDir: 'dist',
    emptyOutDir: true,
    cssCodeSplit: false,
    modulePreload: false,
    assetsInlineLimit: 0,
    rollupOptions: {
      input: fileURLToPath(new URL('./index.html', import.meta.url)),
      output: {
        // iife + 单文件，保证在 file:// 下可以直接用 <script> 加载
        format: 'iife',
        inlineDynamicImports: true,
        entryFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]'
      }
    }
  }
})
