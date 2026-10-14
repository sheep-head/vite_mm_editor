/** MZ/MV 地图事件默认模板与指令码摘要 */
import DataManager from '@/utils/DataManager'

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
  111: '条件分歧',
  112: '循环',
  113: '跳出循环',
  115: '中止事件处理',
  117: '公共事件',
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
  135: '更改菜单许可',
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
  357: '插件指令(MZ)',
  401: '显示文字(续)',
  402: '显示选项(分支)',
  403: '显示选项(取消)',
  404: '显示选项(结束)',
  405: '显示滚动文字(续)',
  408: '注释(续)',
  411: '否则',
  412: '条件分歧结束',
  413: '以上反复',
  601: '战斗处理(胜利)',
  602: '战斗处理(逃跑)',
  603: '战斗处理(失败)',
  604: '战斗处理结束',
  605: '商店处理(续)',
  657: '插件指令(续)',
}

function mapInfoName(mapId) {
  try {
    const infos = DataManager.$loadDataSync('MapInfos', false, false) || []
    const info = infos[mapId]
    return info && info.name ? info.name : ''
  } catch (e) {
    return ''
  }
}

export function formatCommandLine(cmd) {
  if (!cmd) return ''
  const name = EVENT_CODE_NAMES[cmd.code] || `指令#${cmd.code}`
  const indent = '　'.repeat(cmd.indent || 0)
  let extra = ''
  const p = cmd.parameters || []
  if (cmd.code === 101 && p.length) {
    const who = p[4] ? String(p[4]) : ''
    const face = p[0] ? String(p[0]) : ''
    extra = [face, who].filter(Boolean).join(' ')
    if (extra) extra = ` ${extra}`
  } else if (cmd.code === 102 && Array.isArray(p[0])) extra = ` ${p[0].join(', ')}`
  else if (cmd.code === 103) extra = ` 变量#${p[0]} ${p[1]}位`
  else if (cmd.code === 104) extra = ` 变量#${p[0]}`
  else if (cmd.code === 105) extra = ` 速度${p[0]}`
  else if (cmd.code === 108 || cmd.code === 408) extra = p[0] ? `：${p[0]}` : ''
  else if (cmd.code === 117) extra = ` #${p[0]}`
  else if (cmd.code === 118 || cmd.code === 119) extra = p[0] ? ` ${p[0]}` : ''
  else if (cmd.code === 125) extra = ` ${p[0] === 0 ? '+' : '-'}${p[2]}`
  else if (cmd.code === 126 || cmd.code === 127 || cmd.code === 128) extra = ` #${p[0]} ${p[1] === 0 ? '+' : '-'}${p[3]}`
  else if (cmd.code === 129) extra = ` 角色#${p[0]} ${p[1] === 0 ? '加入' : '离开'}`
  else if (cmd.code === 355 || cmd.code === 356 || cmd.code === 357) extra = p[0] ? ` ${String(p[0]).slice(0, 60)}` : ''
  else if (cmd.code === 121) extra = ` ${p[0]}..${p[1]} = ${p[2] === 0 ? 'ON' : 'OFF'}`
  else if (cmd.code === 122) extra = ` ${p[0]}..${p[1]}`
  else if (cmd.code === 123) extra = ` ${p[0]} = ${p[1] === 0 ? 'ON' : 'OFF'}`
  else if (cmd.code === 124) extra = p[0] === 0 ? ` 启动 ${p[1]}秒` : ' 停止'
  else if (cmd.code === 111) extra = ''
  else if (cmd.code === 201) {
    const mn = p[0] === 0 ? mapInfoName(p[1]) : ''
    extra = p[0] === 0 ? ` ${mn || 'Map' + p[1]} (${p[2]},${p[3]})` : ` 变量(${p[1]},${p[2]},${p[3]})`
  } else if (cmd.code === 202) extra = ` 载具${p[0]} Map${p[2]}`
  else if (cmd.code === 203) extra = ` 事件${p[0]}`
  else if (cmd.code === 204) extra = ` 距${p[1]}`
  else if (cmd.code === 211) extra = p[0] === 0 ? ' ON' : ' OFF'
  else if (cmd.code === 212) extra = ` 动画#${p[1]}`
  else if (cmd.code === 213) extra = ` 气泡#${p[1]}`
  else if (cmd.code === 216) extra = p[0] === 0 ? ' ON' : ' OFF'
  else if (cmd.code === 223 || cmd.code === 224) extra = ` ${p[1]}帧`
  else if (cmd.code === 225) extra = ` ${p[2]}帧`
  else if (cmd.code === 230) extra = ` ${p[0]} 帧`
  else if (cmd.code === 231) extra = ` #${p[0]} ${p[1] || ''}`
  else if (cmd.code === 232 || cmd.code === 233 || cmd.code === 234 || cmd.code === 235) extra = ` #${p[0]}`
  else if (cmd.code === 236) extra = ` ${p[0]}`
  else if (cmd.code === 241 || cmd.code === 245 || cmd.code === 249 || cmd.code === 250 || cmd.code === 132 || cmd.code === 133 || cmd.code === 139) {
    const a = p[0] || {}
    extra = a.name ? ` ${a.name}` : ''
  } else if (cmd.code === 140) {
    const a = p[1] || {}
    extra = a.name ? ` ${a.name}` : ''
  }   else if (cmd.code === 242 || cmd.code === 246) extra = ` ${p[0]}秒`
  else if (cmd.code === 261) extra = p[0] ? ` ${p[0]}` : ''
  else if (cmd.code === 205) extra = ` 目标${p[0]}`
  else if (cmd.code === 301) extra = p[0] === 0 ? ` 敌群#${p[1]}` : ''
  else if (cmd.code === 302) extra = ` 商品#${p[1]}`
  else if (cmd.code === 303) extra = ` 角色#${p[0]}`
  else if (cmd.code === 311 || cmd.code === 312 || cmd.code === 315 || cmd.code === 316) {
    extra = p[0] === 0 && p[1] === 0 ? ' 全体' : ` #${p[1]}`
  } else if (cmd.code === 331 || cmd.code === 332) extra = ` 敌人${p[0]}`
  else if (cmd.code === 355 || cmd.code === 655) extra = p[0] ? ` ${String(p[0]).slice(0, 40)}` : ''
  else if (cmd.code === 357) extra = p[0] ? ` ${p[0]} ${p[1] || ''}` : ''
  else if (cmd.code === 401 || cmd.code === 405) extra = p[0] ? ` ${p[0]}` : ''
  else if (cmd.code === 402) extra = p[1] != null ? ` ${p[1]}` : ''
  const mark = cmd.code === 0 ? '：' : '◆'
  return `${indent}${mark}${name}${extra}`
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
