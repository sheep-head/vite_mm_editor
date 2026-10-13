import { normalizeOutlineColor } from '@/utils/spiritOutline'

/**
 * SpiritCompanion 出厂默认配置（与插件 DEFAULT_CONFIG 对齐）
 * 图片路径：相对 img/、无扩展名，如 system/frog、pictures/icon
 */

/** 品级（color 与游戏 SPIRIT_QUALITIES 一致；editorColor 仅编辑器浅底可读） */
export const SPIRIT_QUALITIES = {
  normal: { name: '普通', color: '#ffffff', editorColor: '#5c6370' },
  fine: { name: '精良', color: '#6bcb77' },
  rare: { name: '稀有', color: '#5b8def' },
  epic: { name: '史诗', color: '#b388ff' },
  legend: { name: '传说', color: '#ffb74d' },
}

export const SPIRIT_QUALITY_KEYS = Object.keys(SPIRIT_QUALITIES)

export function qualityMeta(key) {
  return SPIRIT_QUALITIES[key] || SPIRIT_QUALITIES.normal
}

/** 编辑器列表/下拉用色：普通白在浅色主题下改用深灰，游戏内仍用 #ffffff */
export function qualityEditorColor(key) {
  const meta = qualityMeta(key)
  return meta.editorColor || meta.color
}

export function normalizeQuality(key) {
  return SPIRIT_QUALITIES[key] ? key : 'normal'
}

/** 规范化图片路径（兼容旧 folder+file） */
export function normalizeImagePath(pathOrSprite, folderFallback) {
  if (typeof pathOrSprite === 'string') {
    return pathOrSprite.replace(/^img\//, '').replace(/\\/g, '/').replace(/\.(png|jpg|jpeg|gif|webp|bmp)$/i, '')
  }
  if (pathOrSprite && typeof pathOrSprite === 'object') {
    if (pathOrSprite.path) return normalizeImagePath(pathOrSprite.path)
    if (pathOrSprite.file) {
      const folder = pathOrSprite.folder || folderFallback || 'pictures'
      return `${folder}/${pathOrSprite.file}`.replace(/\/+/g, '/')
    }
  }
  return ''
}

/** 默认拖尾音效 */
export function createEmptyTrailSfx() {
  return {
    enabled: false,
    name: '',
    volume: 90,
    pitch: 100,
    pan: 0,
    when: 'moving', // always | moving | idle
    interval: 0,
    frames: [],
  }
}

/** 拖尾库条目（afterimage 残影 / tail 绑定尾巴） */
export function createEmptyTrailEntry() {
  return {
    name: '新拖尾',
    mode: 'afterimage', // afterimage | tail
    interval: 3,
    life: 24,
    max: 8,
    opacity: 120,
    scale: 1,
    segmentGap: 2,
    segments: 5,
    sprite: {
      path: '',
      frameW: 48,
      frameH: 48,
      frames: 1,
      rows: 1,
      frameWait: 8,
      anchorX: 0.5,
      anchorY: 1,
      scale: 1,
    },
    sfx: createEmptyTrailSfx(),
  }
}

export function mergeTrailSfx(raw) {
  const d = createEmptyTrailSfx()
  if (!raw || typeof raw !== 'object') return d
  if (raw.enabled != null) d.enabled = !!raw.enabled
  if (raw.name != null) d.name = String(raw.name)
  if (raw.volume != null && !Number.isNaN(Number(raw.volume))) d.volume = Math.max(0, Math.min(100, Number(raw.volume)))
  if (raw.pitch != null && !Number.isNaN(Number(raw.pitch))) d.pitch = Math.max(50, Math.min(150, Number(raw.pitch)))
  if (raw.pan != null && !Number.isNaN(Number(raw.pan))) d.pan = Math.max(-100, Math.min(100, Number(raw.pan)))
  if (raw.when === 'always' || raw.when === 'moving' || raw.when === 'idle') d.when = raw.when
  if (raw.interval != null && !Number.isNaN(Number(raw.interval))) d.interval = Math.max(0, Number(raw.interval))
  if (Array.isArray(raw.frames)) {
    d.frames = raw.frames.map((n) => Number(n)).filter((n) => !Number.isNaN(n) && n >= 0)
  }
  return d
}

/** 合并拖尾库条目或缺省 */
export function mergeTrailEntry(raw) {
  const d = createEmptyTrailEntry()
  if (!raw || typeof raw !== 'object') return d
  if (raw.name != null) d.name = String(raw.name)
  if (raw.mode === 'tail' || raw.mode === 'afterimage') d.mode = raw.mode
  if (raw.interval != null && !Number.isNaN(Number(raw.interval))) d.interval = Math.max(1, Number(raw.interval))
  if (raw.life != null && !Number.isNaN(Number(raw.life))) d.life = Math.max(1, Number(raw.life))
  if (raw.max != null && !Number.isNaN(Number(raw.max))) d.max = Math.max(1, Math.min(32, Number(raw.max)))
  if (raw.opacity != null && !Number.isNaN(Number(raw.opacity))) d.opacity = Math.max(0, Math.min(255, Number(raw.opacity)))
  if (raw.scale != null && !Number.isNaN(Number(raw.scale))) d.scale = Number(raw.scale)
  if (raw.segmentGap != null && !Number.isNaN(Number(raw.segmentGap))) d.segmentGap = Math.max(1, Number(raw.segmentGap))
  if (raw.segments != null && !Number.isNaN(Number(raw.segments))) d.segments = Math.max(1, Math.min(24, Number(raw.segments)))
  if (raw.sprite && typeof raw.sprite === 'object') {
    const path = normalizeImagePath(raw.sprite)
    d.sprite = {
      path: path || '',
      frameW: Number(raw.sprite.frameW) || 48,
      frameH: Number(raw.sprite.frameH) || 48,
      frames: Number(raw.sprite.frames) || 1,
      rows: Number(raw.sprite.rows) || 1,
      frameWait: Number(raw.sprite.frameWait) || 8,
      anchorX: raw.sprite.anchorX != null ? Number(raw.sprite.anchorX) : 0.5,
      anchorY: raw.sprite.anchorY != null ? Number(raw.sprite.anchorY) : 1,
      scale: raw.sprite.scale != null ? Number(raw.sprite.scale) : 1,
    }
  }
  d.sfx = mergeTrailSfx(raw.sfx)
  return d
}

/** 精灵内联 trail（enabled + trailId + 可覆盖字段） */
export function createEmptySpiritTrail() {
  return {
    enabled: false,
    trailId: '',
    interval: 3,
    life: 24,
    max: 8,
    opacity: 120,
    scale: 1,
  }
}

export function mergeSpiritTrail(raw) {
  const d = createEmptySpiritTrail()
  if (!raw || typeof raw !== 'object') return d
  if (raw.enabled != null) d.enabled = !!raw.enabled
  if (raw.trailId != null) d.trailId = String(raw.trailId)
  if (raw.interval != null && !Number.isNaN(Number(raw.interval))) d.interval = Math.max(1, Number(raw.interval))
  if (raw.life != null && !Number.isNaN(Number(raw.life))) d.life = Math.max(1, Number(raw.life))
  if (raw.max != null && !Number.isNaN(Number(raw.max))) d.max = Math.max(1, Math.min(32, Number(raw.max)))
  if (raw.opacity != null && !Number.isNaN(Number(raw.opacity))) d.opacity = Math.max(0, Math.min(255, Number(raw.opacity)))
  if (raw.scale != null && !Number.isNaN(Number(raw.scale))) d.scale = Number(raw.scale)
  return d
}

/**
 * 解析最终拖尾
 * - 有 trailId 且库存在：完全用库条目（精灵只提供 enabled/trailId）
 * - 无 trailId：精灵内联数值当 afterimage（兼容旧档）
 * @param {object} spiritTrail 精灵 trail
 * @param {object} trailsLib CONFIG.trails
 */
export function resolveTrail(spiritTrail, trailsLib) {
  const local = mergeSpiritTrail(spiritTrail)
  let base = null
  if (local.trailId && trailsLib && trailsLib[local.trailId]) {
    base = mergeTrailEntry(trailsLib[local.trailId])
  } else {
    // 旧档：无库引用 → 内联当 afterimage
    base = mergeTrailEntry({
      mode: 'afterimage',
      interval: local.interval,
      life: local.life,
      max: local.max,
      opacity: local.opacity,
      scale: local.scale,
    })
  }
  const out = Object.assign({}, base)
  out.enabled = local.enabled
  out.trailId = local.trailId || ''
  return out
}
export function migrateSpiritConfig(data) {
  if (!data || typeof data !== 'object') return data
  if (typeof data.menuIcon === 'string' && data.menuIcon && !data.menuIcon.includes('/')) {
    data.menuIcon = `pictures/${data.menuIcon}`
  }
  if (Array.isArray(data.spirits)) {
    data.spirits.forEach((sp) => {
      if (!sp) return
      if (sp.sprite) {
        const path = normalizeImagePath(sp.sprite)
        if (path) sp.sprite.path = path
        delete sp.sprite.folder
        delete sp.sprite.file
      }
      if (sp.outline && sp.outline.color != null) {
        sp.outline.color = normalizeOutlineColor(sp.outline.color)
      }
      sp.quality = normalizeQuality(sp.quality)
      sp.bubble = mergeBubbleConfig(sp.bubble)
      sp.trail = mergeSpiritTrail(sp.trail)
    })
  }
  if (!data.trails || typeof data.trails !== 'object') data.trails = {}
  Object.keys(data.trails).forEach((key) => {
    data.trails[key] = mergeTrailEntry(data.trails[key])
  })
  if (data.traits && typeof data.traits === 'object') {
    Object.keys(data.traits).forEach((key) => {
      const t = data.traits[key]
      if (!t || t.handler !== 'autoFarm') return
      if (!t.params || typeof t.params !== 'object') t.params = { tier: 'mid', cursorDelay: 8 }
      if (!['low', 'mid', 'high'].includes(t.params.tier)) t.params.tier = 'mid'
      if (t.params.cursorDelay == null || Number.isNaN(Number(t.params.cursorDelay))) {
        t.params.cursorDelay = 8
      } else {
        t.params.cursorDelay = Math.max(0, Math.min(60, Math.round(Number(t.params.cursorDelay))))
      }
    })
  }
  return data
}

export function createEmptyBubble() {
  return {
    enabled: true,
    theme: 'dark',
    opacity: 230,
    fontSize: 18,
    width: 200,
    offsetX: 0,
    offsetY: -8,
    duration: 150,
    fadeFrames: 24,
    onCatchUp: ['等等我呀~'],
    onIdle: ['……', '呼~'],
    idleInterval: 300,
    idleChance: 0.35,
  }
}

export function mergeBubbleConfig(raw) {
  const d = createEmptyBubble()
  d.onCatchUp = []
  d.onIdle = []
  if (!raw || typeof raw !== 'object') return d
  if (raw.enabled != null) d.enabled = !!raw.enabled
  if (raw.theme === 'light' || raw.theme === 'dark') d.theme = raw.theme
  if (raw.opacity != null && !Number.isNaN(Number(raw.opacity))) d.opacity = Math.max(0, Math.min(255, Number(raw.opacity)))
  if (raw.fontSize != null && !Number.isNaN(Number(raw.fontSize))) d.fontSize = Math.max(10, Number(raw.fontSize))
  if (raw.width != null && !Number.isNaN(Number(raw.width))) d.width = Math.max(40, Number(raw.width))
  if (raw.offsetX != null && !Number.isNaN(Number(raw.offsetX))) d.offsetX = Number(raw.offsetX)
  if (raw.offsetY != null && !Number.isNaN(Number(raw.offsetY))) d.offsetY = Number(raw.offsetY)
  if (raw.duration != null && !Number.isNaN(Number(raw.duration))) d.duration = Math.max(1, Number(raw.duration))
  if (raw.fadeFrames != null && !Number.isNaN(Number(raw.fadeFrames))) d.fadeFrames = Math.max(0, Number(raw.fadeFrames))
  if (Array.isArray(raw.onCatchUp)) d.onCatchUp = raw.onCatchUp.filter((s) => s != null && String(s) !== '').map(String)
  if (Array.isArray(raw.onIdle)) d.onIdle = raw.onIdle.filter((s) => s != null && String(s) !== '').map(String)
  if (raw.idleInterval != null && !Number.isNaN(Number(raw.idleInterval))) d.idleInterval = Math.max(30, Number(raw.idleInterval))
  if (raw.idleChance != null && !Number.isNaN(Number(raw.idleChance))) d.idleChance = Math.max(0, Math.min(1, Number(raw.idleChance)))
  return d
}

export function linesToText(arr) {
  return Array.isArray(arr) ? arr.join('\n') : ''
}

export function textToLines(text) {
  return String(text || '')
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)
}

export function createEmptySpirit(actorId = 1) {
  return {
    actorId,
    invincible: true,
    name: '',
    desc: '',
    quality: 'normal',
    unlockSwitchId: 0,
    sprite: {
      path: '',
      frameW: 48,
      frameH: 48,
      frames: 1,
      rows: 1,
      frameWait: 8,
      anchorX: 0.5,
      anchorY: 1,
      scale: 1,
    },
    float: {
      enabled: true,
      amplitude: 6,
      speed: 0.08,
      whileFollow: true,
      whileIdle: true,
    },
    trail: createEmptySpiritTrail(),
    fx: {
      scalePulse: 0,
      opacityPulse: 0,
      flipBySide: true,
      lungePx: 24,
      glowOpacity: 0,
    },
    outline: {
      enabled: true,
      expand: 1,
      color: '#ffd740',
      opacity: 200,
      alphaThreshold: 8,
    },
    lazy: {
      enabled: true,
      idleAfterFrames: 40,
      catchUpTiles: 2.5,
      catchUpLerp: 0.22,
      idleOrbit: false,
      orbitRadius: null,
      orbitSpeed: null,
      followLerp: null,
    },
    bubble: createEmptyBubble(),
    menuActions: [],
    traits: [],
  }
}

export function createEmptyTrait(key = 'newTrait') {
  return {
    key,
    name: '新特性',
    desc: '',
    type: 'partyParam',
    paramId: 2,
    rate: 0.1,
  }
}

/** 默认整份 CONFIG（首次无 JSON 时写入） */
export function createDefaultSpiritConfig() {
  return {
    version: 1,
    enableSwitchId: 0,
    orbitRadius: 0.6,
    followLerp: 0.12,
    orbitSpeed: 0.02,
    battleOffsetX: -48,
    battleOffsetY: -40,
    menuIcon: '',
    trails: {
      dust: mergeTrailEntry({
        name: '尘烟残影',
        mode: 'afterimage',
        interval: 3,
        life: 24,
        max: 8,
        opacity: 120,
        scale: 1,
      }),
      ribbon: mergeTrailEntry({
        name: '缎带尾巴',
        mode: 'tail',
        segmentGap: 2,
        segments: 5,
        opacity: 180,
        scale: 0.85,
        sprite: {
          path: 'system/frog',
          frameW: 20,
          frameH: 20,
          frames: 2,
          rows: 1,
          frameWait: 8,
          anchorX: 0.5,
          anchorY: 1,
          scale: 0.7,
        },
      }),
    },
    traits: {
      partyAtk10: {
        name: '战意光环',
        desc: '全队攻击 +10%',
        type: 'partyParam',
        paramId: 2,
        rate: 0.1,
      },
      partyAgi8: {
        name: '疾风光环',
        desc: '全队敏捷 +8%',
        type: 'partyParam',
        paramId: 6,
        rate: 0.08,
      },
      partyDef8: {
        name: '护佑',
        desc: '全队防御 +8%',
        type: 'partyParam',
        paramId: 3,
        rate: 0.08,
      },
      preempt15: {
        name: '先机',
        desc: '遇敌先发制人概率 +15%',
        type: 'preemptive',
        chance: 0.15,
      },
      goldFind: {
        name: '觅金',
        desc: '战斗金币 +20%',
        type: 'goldRate',
        rate: 0.2,
      },
      autoFarm: {
        name: '自动巡航',
        desc: '地图自动巡航遇敌 + 战斗窗托管（需游戏端 SpiritAutoFarm 插件）',
        type: 'special',
        handler: 'autoFarm',
        params: { tier: 'mid', cursorDelay: 8 },
      },
    },
    spirits: [
      {
        ...createEmptySpirit(50),
        name: '路易',
        desc: '介绍文本',
        sprite: {
          path: 'system/frog',
          frameW: 20,
          frameH: 20,
          frames: 2,
          rows: 1,
          frameWait: 20,
          anchorX: 0.5,
          anchorY: 1.5,
          scale: 1,
        },
        traits: ['partyAtk10', 'preempt15', 'autoFarm'],
        trail: {
          ...createEmptySpiritTrail(),
          enabled: true,
          trailId: 'dust',
        },
      },
      {
        ...createEmptySpirit(51),
        name: '拿破仑',
        desc: '你看看',
        sprite: {
          path: 'system/frog2',
          frameW: 20,
          frameH: 20,
          frames: 2,
          rows: 1,
          frameWait: 20,
          anchorX: 0.5,
          anchorY: 1.5,
          scale: 1,
        },
        traits: ['partyAgi8', 'partyDef8', 'goldFind'],
      },
    ],
  }
}

export const PARAM_ID_OPTIONS = [
  { value: 0, label: '0 最大生命' },
  { value: 1, label: '1 最大魔力' },
  { value: 2, label: '2 攻击' },
  { value: 3, label: '3 防御' },
  { value: 4, label: '4 魔法攻击' },
  { value: 5, label: '5 魔法防御' },
  { value: 6, label: '6 敏捷' },
  { value: 7, label: '7 幸运' },
]

export const TRAIT_TYPE_OPTIONS = [
  { value: 'partyParam', label: '全队能力加成' },
  { value: 'preemptive', label: '先发制人' },
  { value: 'goldRate', label: '金币倍率' },
  { value: 'expRate', label: '经验倍率' },
  { value: 'special', label: '特殊' },
]

/** 表单问号说明文案 */
export const SPIRIT_FIELD_HELP = {
  enableSwitchId: '总开关编号。0=不限制；>0 时该开关必须为 ON，否则地图不显示、战斗不辅助。',
  orbitRadius: '默认环绕半径（格）。建议 0.2~2.0；过小贴身，过大像脱队。单精灵可覆盖。',
  followLerp: '默认跟随平滑，每帧插值系数。建议 0.08~0.25；越大越跟手。',
  orbitSpeed: '默认环绕角速度（弧度/帧）。建议 0.005~0.08。',
  battleOffsetX: '战斗中相对主角的 X 像素偏移，负数更靠内侧。',
  battleOffsetY: '战斗中相对主角的 Y 像素偏移，负数更靠上。',
  menuIcon: '主菜单「精灵」命令左侧图标，相对 img/ 无扩展名（如 pictures/icon）；空=不画。',
  actorId: '数据库角色，只用于战斗属性/技能，不用其行走图。',
  invincible: '开启=不进敌方索敌、不受伤；关闭=可被打，战后自动满血。',
  name: '显示名；空则用数据库角色名。',
  quality: '精灵品级：普通白 / 精良绿 / 稀有蓝 / 史诗紫 / 传说金。影响菜单列表与介绍标题颜色。',
  desc: '菜单介绍；空则回退角色简介。可用 \\n 换行。',
  unlockSwitchId: '0=需事件解锁；>0=该开关 ON 即解锁。',
  'sprite.path': '相对 img/ 的路径，不含扩展名，如 system/frog、pictures/xxx。',
  'sprite.frameW': '单帧宽（像素），须与切图一致。',
  'sprite.frameH': '单帧高（像素）。',
  'sprite.frames': '横向帧数（一行几格）。',
  'sprite.rows': '纵向行数；总帧=横向×纵向。',
  'sprite.frameWait': '每帧停留游戏帧数；越大越慢。建议 4~20。',
  'sprite.anchorX': '锚点 X（0~1，可超出做偏移）。0.5=水平居中。',
  'sprite.anchorY': '锚点 Y。脚底常用 1；>1 会整体上移。',
  'sprite.scale': '显示缩放。建议 0.25~5。',
  'float.enabled': '是否启用上下浮动。',
  'float.amplitude': '浮动振幅（像素）。建议 2~16。',
  'float.speed': '相位速度（弧度/帧）。建议 0.03~0.15。',
  'trail.enabled': '是否启用拖尾（残影或绑定尾巴，由拖尾库 mode 决定）。',
  'trail.trailId': '绑定拖尾库条目后，表现完全以库为准（mode/透明度/尾巴贴图/SE 等）。空=用下方内联数值当残影（兼容旧档）。',
  'trail.max': '同时最多残影/节数相关上限。建议 ≤12。',
  'trail.demoMove': '预览中演示位移，才能看到拖尾效果。',
  trailMode: 'afterimage=本体残影钉地图；tail=专用图跟随坐标历史拖尾巴。',
  trailSfx: '拖尾音效：周期 interval（帧）和/或 frames 指定序列帧下标触发。',
  'fx.scalePulse': '缩放呼吸振幅。0=关；0.05 表示 ±5%。',
  'fx.lungePx': '战斗出手前冲像素。0=关。',
  'outline.enabled': '是否启用按像素描边金光。',
  'outline.expand': '0=贴边1px；>0 外扩；<0 内缩。建议 -4~8。',
  'lazy.enabled': '开启后：主角停下若干帧会原地待机；拉开超过「追赶距离」后平滑追赶过来。关闭=始终贴身环绕。',
  'lazy.idleAfterFrames': '主角连续静止满 N 帧后进入待机。60 帧≈1 秒；0=一停下就待机。建议 20~90。注意：进入待机前仍会跟随。',
  'lazy.catchUpTiles': '待机后与主角距离超过 N 格才开始平滑追赶（不是瞬移）。走动但不超距时继续原地待机。建议 2~8。',
  'lazy.catchUpLerp': '追赶速度倾向，越大追得越快；仍按每帧限速平滑移动，不会瞬移。建议 0.15~0.35。',
  'lazy.idleOrbit': '待机时是否在落点附近小幅环绕晃动。关=坐标钉死，只靠浮动上下浮。',
  'lazy.orbitRadius': '本精灵环绕半径（格）；点「用全局」则用全局环绕半径。',
  'lazy.orbitSpeed': '本精灵环绕角速度；点「用全局」则用全局角速度。',
  'lazy.followLerp': '近距离跟随插值；点「用全局」则用全局跟随平滑。',
  'bubble.enabled': '是否在地图上显示跟随精灵的气泡（战斗/菜单不显示）。',
  'bubble.theme': 'dark=黑底白字；light=白底黑字。均可用 \\C[n] 彩字（系统色表）。',
  'bubble.opacity': '底框/箭头透明度 0~255（文字始终不透明）。255=框不透明；越小框越透。',
  'bubble.fontSize': '气泡正文字号。建议 14~22。',
  'bubble.width': '气泡内容最大宽度（像素）。超出后自动换行；短文仍自适应变窄。也可用 \\n 强制换行。',
  'bubble.offset': '相对精灵头顶的像素偏移。',
  'bubble.duration': '显示时长（帧）。60 帧≈1 秒。',
  'bubble.fadeFrames': '淡出占用的帧数，计入总时长末尾。',
  'bubble.onCatchUp': '开始追赶玩家时随机说一句。一行一句。例：等等我呀~',
  'bubble.onIdle': '待机时按间隔与概率随机碎碎念。一行一句。',
  'bubble.idleInterval': '待机期间每隔 N 帧尝试说一次。建议 180~480。',
  'bubble.idleChance': '每次尝试说话的概率 0~1。',
  autoFarmTier:
    '挂机脚本档位：low 低级（不重上）；mid 中级（记忆重上）；high 高级（换车+锚点巡航）。光标快慢见「光标间隔」。',
  autoFarmCursorDelay:
    '战斗指令光标每格等待帧数。0=瞬移直跳；8≈中速；15~20 较慢。由编辑器配置，玩家确认窗不可改。',
}
