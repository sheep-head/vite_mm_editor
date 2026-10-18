/** MZ/MV 地图事件默认模板与指令码摘要 */
import DataManager from '@/utils/DataManager'
import { findCatalogEntry } from './eventCommandCatalog'

export function createEmptyPage() {
  return {
    conditions: {
      actorId: 1,
      actorValid: false,
      itemId: 1,
      itemValid: false,
      selfSwitchCh: 'A',
      selfSwitchValid: false,
      switch1Id: 1,
      switch1Valid: false,
      switch2Id: 1,
      switch2Valid: false,
      variableId: 1,
      variableValid: false,
      variableValue: 0,
    },
    directionFix: false,
    image: {
      characterIndex: 0,
      characterName: '',
      direction: 2,
      pattern: 1,
      tileId: 0,
    },
    list: [{ code: 0, indent: 0, parameters: [] }],
    moveFrequency: 3,
    moveRoute: {
      list: [{ code: 0, parameters: [] }],
      repeat: true,
      skippable: false,
      wait: false,
    },
    moveSpeed: 3,
    moveType: 0,
    priorityType: 1,
    stepAnime: false,
    through: false,
    trigger: 0,
    walkAnime: true,
  }
}

export function createEmptyEvent(id, x, y) {
  return {
    id,
    name: `EV${String(id).padStart(3, '0')}`,
    note: '',
    pages: [createEmptyPage()],
    x,
    y,
  }
}

export function nextEventId(events) {
  let max = 0
  ;(events || []).forEach((ev) => {
    if (ev && ev.id > max) max = ev.id
  })
  return max + 1
}

/** 常见事件指令中文名（未覆盖的显示 指令#code） */
export const EVENT_CODE_NAMES = {
  0: '结束',
  101: '显示文字',
  102: '显示选项',
  103: '数值输入处理',
  104: '物品选择处理',
  105: '显示滚动文字',
  108: '注释',
  111: '如果',
  112: '循环',
  113: '跳出循环',
  115: '中止事件处理',
  117: '共通事件',
  118: '标签',
  119: '转至标签',
  121: '开关操作',
  122: '变量操作',
  123: '独立开关操作',
  124: '计时器操作',
  125: '增减金钱',
  126: '增减物品',
  127: '增减武器',
  128: '增减防具',
  129: '队伍管理',
  132: '更改战斗 BGM',
  133: '更改胜利 ME',
  134: '更改存档许可',
  135: '启用/禁用菜单',
  136: '更改遇敌',
  137: '更改整队',
  138: '更改窗口颜色',
  139: '更改败北 ME',
  140: '更改乘船 BGM',
  201: '场所移动',
  202: '设置载具位置',
  203: '设置事件位置',
  204: '地图卷动',
  205: '设置移动路线',
  206: '载具乘降',
  211: '更改透明状态',
  212: '显示动画',
  213: '显示气球图标',
  214: '暂时消除事件',
  216: '更改队列行进',
  217: '集合队列成员',
  221: '淡出画面',
  222: '淡入画面',
  223: '更改画面色调',
  224: '闪烁画面',
  225: '震动画面',
  230: '等待',
  231: '显示图片',
  232: '移动图片',
  233: '旋转图片',
  234: '更改图片色调',
  235: '消除图片',
  236: '设置天气',
  241: '播放 BGM',
  242: '淡出 BGM',
  243: '保存 BGM',
  244: '恢复 BGM',
  245: '播放 BGS',
  246: '淡出 BGS',
  249: '播放 ME',
  250: '播放 SE',
  251: '停止 SE',
  261: '播放影像',
  281: '更改地图名称显示',
  282: '更改图块组',
  283: '更改战斗背景',
  284: '更改远景',
  285: '获取位置信息',
  301: '战斗处理',
  302: '商店处理',
  303: '名字输入处理',
  311: '增减 HP',
  312: '增减 MP',
  313: '更改状态',
  314: '完全恢复',
  315: '增减 EXP',
  316: '增减等级',
  317: '增减能力值',
  318: '增减技能',
  319: '更改装备',
  320: '更改名字',
  321: '更改职业',
  322: '更改角色图像',
  323: '更改载具图像',
  324: '更改昵称',
  325: '更改简介',
  331: '增减敌方 HP',
  332: '增减敌方 MP',
  333: '更改敌方状态',
  334: '敌方全部恢复',
  335: '敌方出现',
  336: '敌方变身',
  337: '显示战斗动画',
  339: '强制行动',
  340: '中止战斗',
  342: '增减 TP',
  351: '打开菜单画面',
  352: '打开存档画面',
  353: '游戏结束',
  354: '返回标题画面',
  355: '脚本',
  356: '插件指令',
  357: '插件指令',
  401: '显示文字',
  402: '当',
  403: '当取消',
  404: '分支结束',
  405: '显示滚动文字',
  408: '注释',
  411: '否则',
  412: '结束分支',
  413: '以上反复',
  601: '如果胜利',
  602: '如果逃跑',
  603: '如果失败',
  604: '战斗处理结束',
  605: '商店处理',
  655: '脚本',
  657: '插件指令',
}

/** 头指令 → 续行码 */
export const CONT_MAP = { 101: 401, 105: 405, 108: 408, 205: 505, 355: 655, 302: 605, 357: 657 }
/** 续行码 → 头指令 */
export const CONT_HEAD = { 401: 101, 405: 105, 408: 108, 505: 205, 655: 355, 605: 302, 657: 357 }

/** 移动路线步骤码 → 列表用中文（MZ：ON/OFF 写成开启/关闭前缀） */
export const MOVE_ROUTE_STEP_LABELS = {
  1: '向下移动',
  2: '向左移动',
  3: '向右移动',
  4: '向上移动',
  5: '左下移动',
  6: '右下移动',
  7: '左上移动',
  8: '右上移动',
  9: '随机移动',
  10: '接近玩家',
  11: '远离玩家',
  12: '前进一步',
  13: '后退一步',
  14: '跳跃',
  15: '等待',
  16: '转向下',
  17: '转向左',
  18: '转向右',
  19: '转向上',
  20: '向右转 90 度',
  21: '向左转 90 度',
  22: '后转 180 度',
  23: '随机转向 90 度',
  24: '随机转向',
  25: '朝向玩家',
  26: '背向玩家',
  27: '开关 ON',
  28: '开关 OFF',
  29: '更改移动速度',
  30: '更改移动频度',
  31: '开启步行动画',
  32: '关闭步行动画',
  33: '开启踏步动画',
  34: '关闭踏步动画',
  35: '开启固定朝向',
  36: '关闭固定朝向',
  37: '开启穿透',
  38: '关闭穿透',
  39: '开启透明',
  40: '关闭透明',
  41: '更改图像',
  42: '更改不透明度',
  43: '更改合成方式',
  44: '播放 SE',
  45: '脚本',
}
const FLOW_CODES = new Set([111, 112, 113, 115, 117, 411, 412, 413, 402, 403, 404, 601, 602, 603, 604])
const CMP_LABELS = ['=', '≥', '≤', '>', '<', '≠']

function mapInfoName(mapId) {
  try {
    const infos = DataManager.$loadDataSync('MapInfos', false, false) || []
    const info = infos[mapId]
    return info && info.name ? info.name : ''
  } catch (e) {
    return ''
  }
}

function loadSystem() {
  try {
    return DataManager.$loadDataSync('System', false, false) || {}
  } catch (e) {
    return {}
  }
}

function padDbId(id) {
  return `#${String(Number(id) || 0).padStart(4, '0')}`
}

function namedDbId(id, arr) {
  const n = arr[id]
  return n ? `${padDbId(id)} ${n}` : padDbId(id)
}

function switchName(id) {
  return namedDbId(id, loadSystem().switches || [])
}

function variableName(id) {
  return namedDbId(id, loadSystem().variables || [])
}

/** 单个：#0029 名称；范围：#0029..#0035 */
function formatIdSpan(from, to, nameFn) {
  const a = Number(from) || 0
  const b = Number(to) || a
  if (a === b) return nameFn(a)
  return `${padDbId(a)}..${padDbId(b)}`
}

const VAR_OP_SYM = ['=', '+=', '-=', '*=', '/=', '%=']

function commonEventName(id) {
  try {
    const list = DataManager.$loadDataSync('CommonEvents', false, false) || []
    const ev = list[id]
    return ev && ev.name ? String(ev.name) : `#${id}`
  } catch (e) {
    return `#${id}`
  }
}

function actorName(id) {
  try {
    const list = DataManager.$loadDataSync('Actors', false, false) || []
    const a = list[id]
    return a && a.name ? String(a.name) : `#${id}`
  } catch (e) {
    return `#${id}`
  }
}

function itemName(id) {
  return recordName('Items', id)
}

function recordName(file, id) {
  try {
    const list = DataManager.$loadDataSync(file, false, false) || []
    const a = list[id]
    return a && a.name ? String(a.name) : `#${id}`
  } catch (e) {
    return `#${id}`
  }
}

/** 增减指令：0 常量，1 变量 */
function operandText(operandType, value) {
  if (operandType === 1) return variableName(value)
  return String(value ?? 0)
}

/** 条件里变量常只显示名称 */
function variableLabel(id) {
  const arr = loadSystem().variables || []
  const n = arr[id]
  return n ? String(n) : padDbId(id)
}

function formatActorTarget(mode, id) {
  if (mode === 1) return `{${variableLabel(id)}}`
  if (!id) return '全体'
  return actorName(id)
}

function formatMoveTarget(charId) {
  if (charId === -1) return '玩家'
  if (charId === 0) return '本事件'
  return `事件${charId}`
}

function formatMoveStep(step) {
  if (!step || typeof step !== 'object') return '◇'
  const c = step.code | 0
  if (c === 0) return ''
  let label = MOVE_ROUTE_STEP_LABELS[c] || `移动#${c}`
  const sp = step.parameters || []
  if (c === 14) label += `(${sp[0] || 0},${sp[1] || 0})`
  else if (c === 15) label += ` ${sp[0] || 0} 帧`
  else if (c === 27 || c === 28) label += ` ${switchName(sp[0])}`
  else if (c === 29 || c === 30 || c === 42) label += ` ${sp[0] ?? ''}`
  else if (c === 41) label += ` ${sp[0] || ''}`
  else if (c === 44) {
    const a = sp[0] || {}
    if (a.name) label += ` ${a.name}`
  } else if (c === 45) label += ` ${sp[0] != null ? sp[0] : ''}`
  return `◇${label}`
}

const VEHICLE_NAMES = ['小舟', '大船', '飞空艇']

const BUTTON_NAMES = ['确定', '取消', 'Shift', '下', '左', '右', '上', 'PageUp', 'PageDown']

function format111Body(p) {
  const kind = p[0]
  const cmp = (i) => (CMP_LABELS[i] != null ? CMP_LABELS[i] : '?')
  if (kind === 0) {
    return `${switchName(p[1])} 为 ${p[2] === 0 ? '开启' : '关闭'}`
  }
  if (kind === 1) {
    let rhs
    if (p.length >= 5) rhs = p[3] === 1 ? variableLabel(p[4]) : String(p[4] ?? 0)
    else rhs = String(p[3] ?? 0)
    return `${variableLabel(p[1])} ${cmp(p[2])} ${rhs}`
  }
  if (kind === 2) return `独立开关 ${p[1]} 为 ${p[2] === 0 ? '开启' : '关闭'}`
  if (kind === 3) return `计时器 ${p[1] === 0 ? '≥' : '≤'} ${p[2]} 秒`
  if (kind === 4) {
    const who = actorName(p[1])
    const t = p[2]
    if (t === 0) return `${who} 在队伍中`
    if (t === 1) return `${who} 的名称是 ${p[3] || ''}`
    if (t === 2) return `${who} 的职业是 ${recordName('Classes', p[3])}`
    if (t === 3) return `${who} 已学会 ${recordName('Skills', p[3])}`
    if (t === 4) return `${who} 装备了 ${recordName('Weapons', p[3])}`
    if (t === 5) return `${who} 装备了 ${recordName('Armors', p[3])}`
    if (t === 6) return `${who} 处于 ${recordName('States', p[3])}`
    return who
  }
  if (kind === 5) {
    const who = `#${(Number(p[1]) || 0) + 1}`
    if (p[2] === 1) return `敌人 ${who} 处于 ${recordName('States', p[3])}`
    return `敌人 ${who} 已经出现`
  }
  if (kind === 6) {
    const who = p[1] === -1 ? '玩家' : p[1] === 0 ? '本事件' : `事件${p[1]}`
    const dirs = { 2: '下', 4: '左', 6: '右', 8: '上' }
    return `${who}面向 ${dirs[p[2]] || p[2]}`
  }
  if (kind === 7) return `金钱 ${cmp(p[1])} ${p[2]}`
  if (kind === 8) return `持有 ${itemName(p[1])}`
  if (kind === 9) return `持有武器 ${recordName('Weapons', p[1])}`
  if (kind === 10) return `持有防具 ${recordName('Armors', p[1])}`
  if (kind === 11) return `按下 ${BUTTON_NAMES[p[1]] || '按钮'}`
  if (kind === 12) return p[1] != null ? String(p[1]) : ''
  if (kind === 13) return `乘坐着 ${VEHICLE_NAMES[p[1]] || '载具'}`
  return ''
}

function buildExtra(cmd) {
  const p = cmd.parameters || []
  const code = cmd.code
  if (code === 101 && p.length) {
    const who = p[4] ? String(p[4]) : ''
    const face = p[0] ? String(p[0]) : ''
    return [face, who].filter(Boolean).join(' ')
  }
  if (code === 102 && Array.isArray(p[0])) return p[0].join(', ')
  if (code === 103) return `变量#${p[0]} ${p[1]}位`
  if (code === 104) return `变量#${p[0]}`
  if (code === 105) return `速度${p[0]}`
  if (code === 108) return p[0] != null ? String(p[0]) : ''
  if (code === 117) return commonEventName(p[0])
  if (code === 118 || code === 119) return p[0] != null ? String(p[0]) : ''
  if (code === 125) return `${p[0] === 0 ? '+' : '-'}${operandText(p[1], p[2])}`
  if (code === 126) return `${recordName('Items', p[0])} ${p[1] === 0 ? '+' : '-'}${operandText(p[2], p[3])}`
  if (code === 127) return `${recordName('Weapons', p[0])} ${p[1] === 0 ? '+' : '-'}${operandText(p[2], p[3])}`
  if (code === 128) return `${recordName('Armors', p[0])} ${p[1] === 0 ? '+' : '-'}${operandText(p[2], p[3])}`
  if (code === 129) return `${actorName(p[0])} ${p[1] === 0 ? '入队' : '离队'}`
  if (code === 121) {
    const span = formatIdSpan(p[0], p[1], switchName)
    return `${span} = ${p[2] === 0 ? '开启' : '关闭'}`
  }
  if (code === 122) {
    const span = formatIdSpan(p[0], p[1], variableName)
    const sym = VAR_OP_SYM[p[2]] != null ? VAR_OP_SYM[p[2]] : '='
    let rhs = ''
    if (p[3] === 0) rhs = String(p[4] ?? 0)
    else if (p[3] === 1) rhs = variableName(p[4])
    else if (p[3] === 2) rhs = `随机 ${p[4]}..${p[5]}`
    else rhs = String(p[4] ?? '')
    return `${span} ${sym} ${rhs}`
  }
  if (code === 123) return `${p[0]} = ${p[1] === 0 ? '开启' : '关闭'}`
  if (code === 124) return p[0] === 0 ? `启动 ${p[1]}秒` : '停止'
  if (code === 134 || code === 135 || code === 136 || code === 137) {
    return p[0] === 0 ? 'ON' : 'OFF'
  }
  if (code === 111) return format111Body(p)
  if (code === 201) {
    const mn = p[0] === 0 ? mapInfoName(p[1]) : ''
    return p[0] === 0 ? `${mn || 'Map' + p[1]} (${p[2]},${p[3]})` : `变量(${p[1]},${p[2]},${p[3]})`
  }
  if (code === 202) return `载具${p[0]} Map${p[2]}`
  if (code === 203) return `事件${p[0]}`
  if (code === 204) return `距${p[1]}`
  if (code === 211 || code === 216) return p[0] === 0 ? 'ON' : 'OFF'
  if (code === 212) return `动画#${p[1]}`
  if (code === 213) return `气泡#${p[1]}`
  if (code === 223 || code === 224) return `${p[1]}帧`
  if (code === 225) return `${p[2]}帧`
  if (code === 230) return `${p[0]} 帧`
  if (code === 231) return `#${p[0]} ${p[1] || ''}`.trim()
  if (code === 232 || code === 233 || code === 234 || code === 235) return `#${p[0]}`
  if (code === 236) return String(p[0] ?? '')
  if ([241, 245, 249, 250, 132, 133, 139].includes(code)) {
    const a = p[0] || {}
    return a.name ? String(a.name) : ''
  }
  if (code === 140) {
    const a = p[1] || {}
    return a.name ? String(a.name) : ''
  }
  if (code === 242 || code === 246) return `${p[0]}秒`
  if (code === 261) return p[0] ? String(p[0]) : ''
  if (code === 205) {
    const route = p[1] || {}
    const wait = route.wait ? ' (等待)' : ''
    return `${formatMoveTarget(p[0])}${wait}`
  }
  if (code === 505) return formatMoveStep(p[0])
  if (code === 301) return p[0] === 0 ? `敌群#${p[1]}` : ''
  if (code === 302) return `商品#${p[1]}`
  if (code === 303) return `角色#${p[0]}`
  if (code === 314) return formatActorTarget(p[0] || 0, p[1] || 0)
  if (code === 311 || code === 312 || code === 315 || code === 316 || code === 342) {
    const who = formatActorTarget(p[0] || 0, p[1] || 0)
    const sign = p[2] === 0 ? '+' : '-'
    const amount = operandText(p[3], p[4])
    return `${who}, ${sign} ${amount}`
  }
  if (code === 318) {
    const who = formatActorTarget(p[0] || 0, p[1] || 0)
    const sign = p[2] === 0 ? '+' : '-'
    return `${who}, ${sign} ${recordName('Skills', p[3])}`
  }
  if (code === 313) {
    const who = formatActorTarget(p[0] || 0, p[1] || 0)
    const sign = p[2] === 0 ? '+' : '-'
    return `${who}, ${sign} ${recordName('States', p[3])}`
  }
  if (code === 333) {
    const sign = p[1] === 0 ? '+' : '-'
    return `敌人${p[0]}, ${sign} ${recordName('States', p[2])}`
  }
  if (code === 331 || code === 332) return `敌人${p[0]}`
  if (code === 355 || code === 655) return p[0] != null ? String(p[0]) : ''
  if (code === 356) return p[0] != null ? String(p[0]) : ''
  if (code === 357) return [p[0], p[1]].filter((x) => x != null && x !== '').join(' ')
  if (code === 401 || code === 405 || code === 408) return p[0] != null ? String(p[0]) : ''
  if (code === 402) return p[1] != null ? String(p[1]) : ''
  if (code === 605) return `商品#${p[1]}`
  if (code === 657) return p[0] != null ? String(p[0]) : ''
  return ''
}

/** 指令选择窗分类 → 列表配色 class（同组同色） */
export const COMMAND_GROUP_COLOR = {
  信息: 'info',
  游戏进程: 'progress',
  流程控制: 'flow',
  队伍: 'actor',
  角色: 'actor',
  移动: 'move',
  人物: 'character',
  图片: 'picture',
  定时: 'move',
  画面: 'screen',
  音频和视频: 'audio',
  场景控制: 'scene',
  系统设置: 'system',
  地图: 'map',
  战斗: 'battle',
  高级: 'script',
}

const CONT_PARENT = {
  401: 101,
  405: 105,
  408: 108,
  505: 205,
  605: 302,
  655: 355,
  657: 357,
}

const PROGRESS_CODES = new Set([121, 122, 123, 124])
const MOVE_CODES = new Set([201, 202, 203, 204, 205, 206])
const CHARACTER_CODES = new Set([211, 212, 213, 214, 216, 217])
const ACTOR_CODES = new Set([
  311, 312, 313, 314, 315, 316, 317, 318, 319, 320, 321, 322, 324, 325, 342,
])
const SYSTEM_CODES = new Set([132, 133, 134, 135, 136, 137, 138, 139, 140])

/** 列表配色：指令码家族优先，分组作回退（对齐 MZ） */
function resolveListColor(code, prevColor) {
  if (CONT_PARENT[code] != null) return prevColor || 'info'
  if (code === 108 || code === 408) return 'comment'
  if (code === 355 || code === 356 || code === 357 || code === 655 || code === 657) return 'script'
  if (FLOW_CODES.has(code)) return 'flow'
  if (PROGRESS_CODES.has(code)) return 'progress'
  if (MOVE_CODES.has(code)) return 'move'
  if (CHARACTER_CODES.has(code)) return 'character'
  if (ACTOR_CODES.has(code)) return 'actor'
  if (SYSTEM_CODES.has(code)) return 'system'
  const entry = findCatalogEntry(code)
  return (entry && COMMAND_GROUP_COLOR[entry.group]) || 'info'
}

function commandNote(cmd) {
  const p = (cmd && cmd.parameters) || []
  if (cmd && cmd.code === 311 && p[5]) return '(允许死亡)'
  return ''
}

/**
 * MZ 风格分段：{ indent, mark, kind, label, body, note, code, color }
 * color: 分类色 key（CSS kind-*）
 * note: 灰色附注，如允许死亡
 */
export function formatCommandParts(cmd, prevColor) {
  if (!cmd) return { indent: 0, mark: '', kind: 'normal', color: 'info', label: '', body: '', note: '', code: 0 }
  const code = cmd.code
  const indent = cmd.indent || 0
  const bodyRaw = buildExtra(cmd)
  const note = commandNote(cmd)

  if (code === 0) {
    return { indent, mark: '◆', kind: 'end', color: 'end', label: '', body: '', code }
  }

  const color = resolveListColor(code, prevColor)

  if (code === 355) {
    return { indent, mark: '◆', kind: 'script', color, label: '脚本：', body: bodyRaw, code }
  }
  if (code === 655) {
    return { indent, mark: '：', kind: 'scriptCont', color, pad: '脚本：', label: '', body: bodyRaw, code }
  }
  if (code === 408) {
    return { indent, mark: '：', kind: 'commentCont', color, pad: '注释：', label: '', body: bodyRaw, code }
  }
  if (code === 401 || code === 405 || code === 505 || code === 605 || code === 657) {
    return { indent, mark: '：', kind: 'cont', color, label: '', body: bodyRaw, code }
  }
  if (code === 412) {
    return { indent, mark: '：', kind: 'flow', color: 'flow', label: '', body: '结束分支', code }
  }
  if (code === 411) {
    return { indent, mark: '：', kind: 'flow', color: 'flow', label: '', body: '否则', code }
  }
  if (code === 413) {
    return { indent, mark: '：', kind: 'flow', color: 'flow', label: '', body: '以上反复', code }
  }
  if (code === 111) {
    return { indent, mark: '◆', kind: 'flow', color: 'flow', label: '如果：', body: bodyRaw, code }
  }
  if (code === 117) {
    return { indent, mark: '◆', kind: 'flow', color: 'flow', label: '共通事件：', body: bodyRaw, code }
  }
  if (FLOW_CODES.has(code)) {
    const name = EVENT_CODE_NAMES[code] || `指令#${code}`
    const label = bodyRaw ? `${name}：` : name
    return { indent, mark: '◆', kind: 'flow', color: 'flow', label, body: bodyRaw, code }
  }
  if (code === 108) {
    return { indent, mark: '◆', kind: 'normal', color: 'comment', label: '注释：', body: bodyRaw, code }
  }
  if (code === 101) {
    return { indent, mark: '◆', kind: 'normal', color, label: '显示文字：', body: bodyRaw, code }
  }
  const name = EVENT_CODE_NAMES[code] || `指令#${code}`
  const label = bodyRaw ? `${name}：` : name
  return { indent, mark: '◆', kind: 'normal', color, label, body: bodyRaw, note, code }
}

export function formatCommandLine(cmd) {
  const parts = formatCommandParts(cmd)
  const indent = '　'.repeat(parts.indent || 0)
  const note = parts.note ? ` ${parts.note}` : ''
  return `${indent}${parts.mark}${parts.label || ''}${parts.body || ''}${note}`
}

/** 续行块长度（仅头+续行，不含控制块） */
export function countReplaceSpan(list, i) {
  const cmd = list && list[i]
  if (!cmd) return 1
  const cont = CONT_MAP[cmd.code]
  if (cont != null) {
    let n = 1
    for (let j = i + 1; j < list.length && list[j].code === cont; j++) n++
    return n
  }
  return 1
}

function findContHeadIndex(list, index) {
  const code = list[index] && list[index].code
  const headCode = CONT_HEAD[code]
  if (headCode == null) return index
  for (let i = index - 1; i >= 0; i--) {
    if (list[i].code === headCode) return i
    if (list[i].code !== code) return index
  }
  return index
}

function findMatchingEnd(list, start, endCode) {
  const open = list[start]
  if (!open) return start
  const base = open.indent || 0
  const openCode = open.code
  let depth = 0
  for (let i = start; i < list.length; i++) {
    const c = list[i]
    if (!c) continue
    const ind = c.indent || 0
    if (ind < base) break
    if (ind === base) {
      if (i === start) {
        depth = 1
        continue
      }
      if (c.code === openCode) depth++
      else if (c.code === endCode) {
        depth--
        if (depth <= 0) return i
      }
    }
  }
  return start
}

function findBranchStart(list, index) {
  const cmd = list[index]
  if (!cmd) return index
  const ind = cmd.indent || 0
  if (cmd.code === 111) return index
  for (let i = index; i >= 0; i--) {
    const c = list[i]
    if (!c) continue
    if ((c.indent || 0) === ind && c.code === 111) return i
    if ((c.indent || 0) < ind) break
  }
  return -1
}

/** 导航落点单位：只合并续行，不吞掉分歧内部 */
export function getNavUnit(list, index) {
  if (!list || !list.length) return { start: 0, end: 0 }
  const i = Math.max(0, Math.min(index, list.length - 1))
  const cmd = list[i]
  if (!cmd) return { start: i, end: i }
  if (CONT_HEAD[cmd.code] != null) {
    const head = findContHeadIndex(list, i)
    const n = countReplaceSpan(list, head)
    return { start: head, end: head + n - 1 }
  }
  if (CONT_MAP[cmd.code] != null) {
    const n = countReplaceSpan(list, i)
    return { start: i, end: i + n - 1 }
  }
  return { start: i, end: i }
}

/**
 * MZ 强制选中范围（含端点）
 * - 续行块：头..续行
 * - 点 111/411/412：整块 111..412
 * - 点 112/413：整块 112..413
 * - 块内普通指令：仅该指令（或其续行 span）
 */
export function getCommandSpan(list, index) {
  if (!list || !list.length) return { start: 0, end: 0 }
  const i = Math.max(0, Math.min(index, list.length - 1))
  const cmd = list[i]
  if (!cmd) return { start: i, end: i }

  if (cmd.code === 111 || cmd.code === 411 || cmd.code === 412) {
    const start = cmd.code === 111 ? i : findBranchStart(list, i)
    if (start >= 0) {
      const end = findMatchingEnd(list, start, 412)
      return { start, end }
    }
  }

  if (cmd.code === 112 || cmd.code === 413) {
    let start = i
    if (cmd.code === 413) {
      start = -1
      const ind = cmd.indent || 0
      for (let j = i; j >= 0; j--) {
        if ((list[j].indent || 0) === ind && list[j].code === 112) {
          start = j
          break
        }
        if ((list[j].indent || 0) < ind) break
      }
      if (start < 0) return { start: i, end: i }
    }
    const end = findMatchingEnd(list, start, 413)
    return { start, end }
  }

  return getNavUnit(list, i)
}

/** ↑↓ 落点：每个续行块 / 单行指令的起点（可进入分歧内部） */
export function listNavStarts(list) {
  const starts = []
  let i = 0
  while (i < (list || []).length) {
    const unit = getNavUnit(list, i)
    starts.push(unit.start)
    i = unit.end + 1
  }
  return starts
}

/** 对齐 MZ 截图文案 */
export const TRIGGER_OPTIONS = [
  { value: 0, label: '确定键' },
  { value: 1, label: '玩家接触' },
  { value: 2, label: '事件接触' },
  { value: 3, label: '自动执行' },
  { value: 4, label: '并行处理' },
]

export const PRIORITY_OPTIONS = [
  { value: 0, label: '在人物下方' },
  { value: 1, label: '与人物相同' },
  { value: 2, label: '在人物上方' },
]

export const MOVE_TYPE_OPTIONS = [
  { value: 0, label: '固定' },
  { value: 1, label: '随机' },
  { value: 2, label: '接近' },
  { value: 3, label: '自定义' },
]

export const MOVE_SPEED_OPTIONS = [
  { value: 1, label: '1: 1/8 倍速' },
  { value: 2, label: '2: 1/4 倍速' },
  { value: 3, label: '3: 1/2 倍速' },
  { value: 4, label: '4: 标准' },
  { value: 5, label: '5: 2 倍速' },
  { value: 6, label: '6: 4 倍速' },
]

export const MOVE_FREQ_OPTIONS = [
  { value: 1, label: '1: 最低' },
  { value: 2, label: '2: 低' },
  { value: 3, label: '3: 标准' },
  { value: 4, label: '4: 高' },
  { value: 5, label: '5: 最高' },
]
