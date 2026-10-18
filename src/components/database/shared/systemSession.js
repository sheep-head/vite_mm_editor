/**
 * 系统 1 / 系统 2 / 类型 / 用语 共用一份 System 内存副本。
 */
import { reactive } from 'vue'
import DataManager from '@/utils/DataManager'
import { COMMAND_FIELDS } from './termKeys'

export const SYSTEM_TAB_NAMES = ['System1', 'System2', 'Types', 'Terms']

export const systemState = reactive({
  data: null,
  dirty: false,
})

export function ensureSystemShape(data) {
  if (!data || typeof data !== 'object') return
  if (!data.advanced || typeof data.advanced !== 'object') {
    data.advanced = {
      gameId: 0,
      screenWidth: 816,
      screenHeight: 624,
      uiAreaWidth: 816,
      uiAreaHeight: 624,
      mainFontFilename: 'GameFont',
      numberFontFilename: '',
      fallbackFonts: 'Verdana, sans-serif',
      fontSize: 26,
      windowOpacity: 255,
    }
  }
  if (data.tileSize == null) data.tileSize = 48
  if (!data.terms || typeof data.terms !== 'object') data.terms = {}
  if (!Array.isArray(data.terms.basic)) data.terms.basic = []
  if (!Array.isArray(data.terms.params)) data.terms.params = []
  if (!data.terms.commands || typeof data.terms.commands !== 'object') data.terms.commands = {}
  if (!data.terms.messages || typeof data.terms.messages !== 'object') data.terms.messages = {}
  COMMAND_FIELDS.forEach(([key]) => {
    if (data.terms.commands[key] == null) data.terms.commands[key] = ''
  })
  for (const key of ['elements', 'skillTypes', 'weaponTypes', 'armorTypes', 'equipTypes']) {
    if (!Array.isArray(data[key])) data[key] = ['']
    if (data[key].length === 0) data[key].push('')
  }
  if (!Array.isArray(data.partyMembers)) data.partyMembers = []
  if (!Array.isArray(data.menuCommands)) data.menuCommands = [true, true, true, true, true, true]
  if (!Array.isArray(data.itemCategories)) data.itemCategories = [true, true, true, true]
  if (!Array.isArray(data.magicSkills)) data.magicSkills = []
  if (!Array.isArray(data.attackMotions)) data.attackMotions = []
  if (!Array.isArray(data.sounds)) data.sounds = []
  if (!Array.isArray(data.windowTone)) data.windowTone = [0, 0, 0, 0]
  for (const v of ['boat', 'ship', 'airship']) {
    if (!data[v] || typeof data[v] !== 'object') {
      data[v] = {
        characterName: '',
        characterIndex: 0,
        bgm: { name: '', volume: 90, pitch: 100, pan: 0 },
        startMapId: 0,
        startX: 0,
        startY: 0,
      }
    }
    if (!data[v].bgm) data[v].bgm = { name: '', volume: 90, pitch: 100, pan: 0 }
  }
}

export function loadSystemSession() {
  const raw = DataManager.$loadDataSync('System', false, false)
  if (!raw || typeof raw !== 'object') {
    systemState.data = null
    systemState.dirty = false
    return false
  }
  const data = JSON.parse(JSON.stringify(raw))
  ensureSystemShape(data)
  systemState.data = data
  systemState.dirty = false
  return true
}

export function resetSystemSession() {
  systemState.data = null
  systemState.dirty = false
}

export function saveSystemSession() {
  if (!systemState.data) return false
  const ok = DataManager.$saveDataSync('System', JSON.parse(JSON.stringify(systemState.data)))
  if (ok) systemState.dirty = false
  return ok
}
