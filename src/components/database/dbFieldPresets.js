/** 各数据库表常用可编辑字段（复杂结构用 json） */

export const NAME_NOTE = [
  { key: 'name', label: '名称', type: 'text' },
  { key: 'note', label: '备注', type: 'textarea', rows: 2 },
]

export const ITEM_FIELDS = [
  ...NAME_NOTE,
  { key: 'description', label: '说明', type: 'textarea', rows: 2 },
  { key: 'iconIndex', label: '图标索引', type: 'number' },
  { key: 'price', label: '价格', type: 'number' },
  { key: 'itypeId', label: '物品类型', type: 'number' },
  { key: 'consumable', label: '消耗品', type: 'boolean' },
  { key: 'scope', label: '范围', type: 'number' },
  { key: 'occasion', label: '场合', type: 'number' },
  { key: 'speed', label: '速度补正', type: 'number' },
  { key: 'successRate', label: '成功率', type: 'number' },
  { key: 'load', label: '载重', type: 'number' },
  { key: 'heft', label: '重量', type: 'number' },
  { key: 'effects', label: '效果 JSON', type: 'json', rows: 6 },
  { key: 'damage', label: '伤害 JSON', type: 'json', rows: 4 },
]

export const WEAPON_FIELDS = [
  ...NAME_NOTE,
  { key: 'description', label: '说明', type: 'textarea', rows: 2 },
  { key: 'iconIndex', label: '图标索引', type: 'number' },
  { key: 'price', label: '价格', type: 'number' },
  { key: 'wtypeId', label: '武器类型', type: 'number' },
  { key: 'animationId', label: '动画 ID', type: 'number' },
  { key: 'etypeId', label: '装备类型', type: 'number' },
  { key: 'params', label: '能力值 JSON', type: 'json', rows: 4 },
  { key: 'traits', label: '特性 JSON', type: 'json', rows: 6 },
]

export const ARMOR_FIELDS = [
  ...NAME_NOTE,
  { key: 'description', label: '说明', type: 'textarea', rows: 2 },
  { key: 'iconIndex', label: '图标索引', type: 'number' },
  { key: 'price', label: '价格', type: 'number' },
  { key: 'atypeId', label: '防具类型', type: 'number' },
  { key: 'etypeId', label: '装备类型', type: 'number' },
  { key: 'params', label: '能力值 JSON', type: 'json', rows: 4 },
  { key: 'traits', label: '特性 JSON', type: 'json', rows: 6 },
]

export const ACTOR_FIELDS = [
  ...NAME_NOTE,
  { key: 'nickname', label: '昵称', type: 'text' },
  { key: 'profile', label: '简介', type: 'textarea', rows: 2 },
  { key: 'classId', label: '职业 ID', type: 'number' },
  { key: 'initialLevel', label: '初期等级', type: 'number' },
  { key: 'maxLevel', label: '最大等级', type: 'number' },
  { key: 'characterName', label: '行走图', type: 'text' },
  { key: 'characterIndex', label: '行走图索引', type: 'number' },
  { key: 'faceName', label: '脸图', type: 'text' },
  { key: 'faceIndex', label: '脸图索引', type: 'number' },
  { key: 'battlerName', label: '战斗图', type: 'text' },
  { key: 'equips', label: '初期装备 JSON', type: 'json', rows: 3 },
  { key: 'traits', label: '特性 JSON', type: 'json', rows: 5 },
]

export const CLASS_FIELDS = [
  ...NAME_NOTE,
  { key: 'expParams', label: '经验曲线 JSON', type: 'json', rows: 3 },
  { key: 'params', label: '能力值表 JSON', type: 'json', rows: 6 },
  { key: 'learnings', label: '学会技能 JSON', type: 'json', rows: 6 },
  { key: 'traits', label: '特性 JSON', type: 'json', rows: 5 },
]

export const SKILL_FIELDS = [
  ...NAME_NOTE,
  { key: 'description', label: '说明', type: 'textarea', rows: 2 },
  { key: 'iconIndex', label: '图标索引', type: 'number' },
  { key: 'stypeId', label: '技能类型', type: 'number' },
  { key: 'mpCost', label: 'MP 消耗', type: 'number' },
  { key: 'tpCost', label: 'TP 消耗', type: 'number' },
  { key: 'scope', label: '范围', type: 'number' },
  { key: 'occasion', label: '场合', type: 'number' },
  { key: 'speed', label: '速度补正', type: 'number' },
  { key: 'successRate', label: '成功率', type: 'number' },
  { key: 'animationId', label: '动画 ID', type: 'number' },
  { key: 'message1', label: '使用消息1', type: 'text' },
  { key: 'message2', label: '使用消息2', type: 'text' },
  { key: 'effects', label: '效果 JSON', type: 'json', rows: 5 },
  { key: 'damage', label: '伤害 JSON', type: 'json', rows: 4 },
]

export const ENEMY_FIELDS = [
  ...NAME_NOTE,
  { key: 'battlerName', label: '战斗图', type: 'text' },
  { key: 'battlerHue', label: '色相', type: 'number' },
  { key: 'exp', label: '经验', type: 'number' },
  { key: 'gold', label: '金钱', type: 'number' },
  { key: 'params', label: '能力值 JSON', type: 'json', rows: 4 },
  { key: 'actions', label: '行动模式 JSON', type: 'json', rows: 6 },
  { key: 'dropItems', label: '掉落 JSON', type: 'json', rows: 4 },
  { key: 'traits', label: '特性 JSON', type: 'json', rows: 5 },
]

export const STATE_FIELDS = [
  ...NAME_NOTE,
  { key: 'iconIndex', label: '图标索引', type: 'number' },
  { key: 'priority', label: '优先度', type: 'number' },
  { key: 'restriction', label: '行动限制', type: 'number' },
  { key: 'minTurns', label: '持续最少回合', type: 'number' },
  { key: 'maxTurns', label: '持续最多回合', type: 'number' },
  { key: 'removeAtBattleEnd', label: '战斗结束时解除', type: 'boolean' },
  { key: 'removeByRestriction', label: '行动限制时解除', type: 'boolean' },
  { key: 'autoRemovalTiming', label: '自动解除时机', type: 'number' },
  { key: 'message1', label: '消息1', type: 'text' },
  { key: 'message2', label: '消息2', type: 'text' },
  { key: 'message3', label: '消息3', type: 'text' },
  { key: 'message4', label: '消息4', type: 'text' },
  { key: 'traits', label: '特性 JSON', type: 'json', rows: 5 },
]

export const TROOP_FIELDS = [
  ...NAME_NOTE,
  { key: 'members', label: '成员 JSON', type: 'json', rows: 8 },
  { key: 'pages', label: '战斗事件页 JSON', type: 'json', rows: 10 },
]

export const ANIMATION_FIELDS = [
  ...NAME_NOTE,
  { key: 'animation1Name', label: '图像1', type: 'text' },
  { key: 'animation1Hue', label: '图像1色相', type: 'number' },
  { key: 'animation2Name', label: '图像2', type: 'text' },
  { key: 'animation2Hue', label: '图像2色相', type: 'number' },
  { key: 'position', label: '位置', type: 'number' },
  { key: 'frames', label: '帧 JSON', type: 'json', rows: 8 },
  { key: 'timings', label: 'SE/闪烁时机 JSON', type: 'json', rows: 6 },
]

export const TILESET_FIELDS = [
  ...NAME_NOTE,
  { key: 'mode', label: '模式', type: 'number' },
  { key: 'tilesetNames', label: '图块名 JSON', type: 'json', rows: 6 },
  { key: 'flags', label: '通行标志 JSON', type: 'json', rows: 8 },
]

export const COMMON_EVENT_FIELDS = [
  ...NAME_NOTE,
  { key: 'trigger', label: '触发', type: 'number' },
  { key: 'switchId', label: '条件开关', type: 'number' },
  { key: 'list', label: '事件指令 JSON', type: 'json', rows: 12 },
]

/** Tab 定义：name 用作 el-tab-pane name */
export const DATABASE_TABS = [
  { name: 'Actors', label: '角色', fileName: 'Actors', fields: ACTOR_FIELDS },
  { name: 'Classes', label: '职业', fileName: 'Classes', fields: CLASS_FIELDS },
  { name: 'Skills', label: '技能', fileName: 'Skills', fields: SKILL_FIELDS },
  { name: 'Items', label: '物品', fileName: 'Items', fields: ITEM_FIELDS },
  { name: 'Weapons', label: '武器', fileName: 'Weapons', fields: WEAPON_FIELDS },
  { name: 'Armors', label: '防具', fileName: 'Armors', fields: ARMOR_FIELDS },
  { name: 'Enemies', label: '敌人', fileName: 'Enemies', fields: ENEMY_FIELDS },
  { name: 'Troops', label: '敌群', fileName: 'Troops', fields: TROOP_FIELDS },
  { name: 'States', label: '状态', fileName: 'States', fields: STATE_FIELDS },
  { name: 'Animations', label: '动画', fileName: 'Animations', fields: ANIMATION_FIELDS },
  { name: 'Tilesets', label: '图块', fileName: 'Tilesets', fields: TILESET_FIELDS },
  { name: 'CommonEvents', label: '公共事件', fileName: 'CommonEvents', fields: COMMON_EVENT_FIELDS },
  { name: 'System', label: '系统', kind: 'system' },
]
