/** MZ/MV 数据库常量与中文标签（对齐 Game_BattlerBase / Game_Action） */

export const SCOPE_OPTIONS = [
  { value: 0, label: '无' },
  { value: 1, label: '敌方单体' },
  { value: 2, label: '敌方全体' },
  { value: 3, label: '敌方随机1体' },
  { value: 4, label: '敌方随机2体' },
  { value: 5, label: '敌方随机3体' },
  { value: 6, label: '敌方随机4体' },
  { value: 7, label: '我方单体' },
  { value: 8, label: '我方全体' },
  { value: 9, label: '我方单体（无法战斗）' },
  { value: 10, label: '我方全体（无法战斗）' },
  { value: 11, label: '使用者' },
  { value: 12, label: '敌方单体（无法战斗）' },
  { value: 13, label: '敌方全体（无法战斗）' },
  { value: 14, label: '敌方与我方全体' },
]

export const OCCASION_OPTIONS = [
  { value: 0, label: '总是' },
  { value: 1, label: '战斗画面' },
  { value: 2, label: '菜单画面' },
  { value: 3, label: '不能使用' },
]

export const HIT_TYPE_OPTIONS = [
  { value: 0, label: '必定命中' },
  { value: 1, label: '物理攻击' },
  { value: 2, label: '魔法攻击' },
]

export const DAMAGE_TYPE_OPTIONS = [
  { value: 0, label: '无' },
  { value: 1, label: '生命伤害' },
  { value: 2, label: '魔法伤害' },
  { value: 3, label: '生命恢复' },
  { value: 4, label: '魔法恢复' },
  { value: 5, label: '生命吸收' },
  { value: 6, label: '魔法吸收' },
]

export const ITEM_TYPE_OPTIONS = [
  { value: 1, label: '普通物品' },
  { value: 2, label: '重要物品' },
  { value: 3, label: '隐藏物品 A' },
  { value: 4, label: '隐藏物品 B' },
]

export const YES_NO = [
  { value: true, label: '是' },
  { value: false, label: '否' },
]

/** trait.code */
export const TRAIT = {
  ELEMENT_RATE: 11,
  DEBUFF_RATE: 12,
  STATE_RATE: 13,
  STATE_RESIST: 14,
  PARAM: 21,
  XPARAM: 22,
  SPARAM: 23,
  ATTACK_ELEMENT: 31,
  ATTACK_STATE: 32,
  ATTACK_SPEED: 33,
  ATTACK_TIMES: 34,
  ATTACK_SKILL: 35,
  STYPE_ADD: 41,
  STYPE_SEAL: 42,
  SKILL_ADD: 43,
  SKILL_SEAL: 44,
  EQUIP_WTYPE: 51,
  EQUIP_ATYPE: 52,
  EQUIP_LOCK: 53,
  EQUIP_SEAL: 54,
  SLOT_TYPE: 55,
  ACTION_PLUS: 61,
  SPECIAL_FLAG: 62,
  COLLAPSE_TYPE: 63,
  PARTY_ABILITY: 64,
}

export const TRAIT_CATEGORIES = [
  {
    id: 'rate',
    label: '抗性',
    items: [
      { code: TRAIT.ELEMENT_RATE, label: '属性有效度', data: 'element', valueKind: 'percent', picker: 'select' },
      { code: TRAIT.DEBUFF_RATE, label: '弱化有效度', data: 'param', valueKind: 'percent', picker: 'select' },
      { code: TRAIT.STATE_RATE, label: '状态有效度', data: 'state', valueKind: 'percent', picker: 'id' },
      { code: TRAIT.STATE_RESIST, label: '状态免疫', data: 'state', valueKind: 'none', picker: 'id' },
    ],
  },
  {
    id: 'param',
    label: '能力值',
    items: [
      { code: TRAIT.PARAM, label: '通常能力值', data: 'param', valueKind: 'percent', picker: 'select' },
      { code: TRAIT.XPARAM, label: '追加能力值', data: 'xparam', valueKind: 'percentPlus', picker: 'select' },
      { code: TRAIT.SPARAM, label: '特殊能力值', data: 'sparam', valueKind: 'percent', picker: 'select' },
    ],
  },
  {
    id: 'attack',
    label: '攻击',
    items: [
      { code: TRAIT.ATTACK_ELEMENT, label: '攻击时属性', data: 'element', valueKind: 'none', picker: 'select' },
      { code: TRAIT.ATTACK_STATE, label: '攻击时状态', data: 'state', valueKind: 'percentPlus', picker: 'id' },
      { code: TRAIT.ATTACK_SPEED, label: '攻击速度补正', data: 'none', valueKind: 'number', picker: 'none' },
      { code: TRAIT.ATTACK_TIMES, label: '攻击追加次数', data: 'none', valueKind: 'number', picker: 'none' },
      { code: TRAIT.ATTACK_SKILL, label: '攻击技能', data: 'skill', valueKind: 'none', picker: 'id' },
    ],
  },
  {
    id: 'skill',
    label: '技能',
    items: [
      { code: TRAIT.STYPE_ADD, label: '添加技能类型', data: 'stype', valueKind: 'none', picker: 'select' },
      { code: TRAIT.STYPE_SEAL, label: '封印技能类型', data: 'stype', valueKind: 'none', picker: 'select' },
      { code: TRAIT.SKILL_ADD, label: '添加技能', data: 'skill', valueKind: 'none', picker: 'id' },
      { code: TRAIT.SKILL_SEAL, label: '封印技能', data: 'skill', valueKind: 'none', picker: 'id' },
    ],
  },
  {
    id: 'equip',
    label: '装备',
    items: [
      { code: TRAIT.EQUIP_WTYPE, label: '装备武器类型', data: 'wtype', valueKind: 'none', picker: 'select' },
      { code: TRAIT.EQUIP_ATYPE, label: '装备防具类型', data: 'atype', valueKind: 'none', picker: 'select' },
      { code: TRAIT.EQUIP_LOCK, label: '固定装备', data: 'etype', valueKind: 'none', picker: 'select' },
      { code: TRAIT.EQUIP_SEAL, label: '封印装备', data: 'etype', valueKind: 'none', picker: 'select' },
      { code: TRAIT.SLOT_TYPE, label: '装备槽类型', data: 'slotType', valueKind: 'none', picker: 'select' },
    ],
  },
  {
    id: 'other',
    label: '其他',
    items: [
      { code: TRAIT.ACTION_PLUS, label: '增加行动次数', data: 'none', valueKind: 'percent', picker: 'none' },
      { code: TRAIT.SPECIAL_FLAG, label: '特殊标志', data: 'specialFlag', valueKind: 'none', picker: 'select' },
      { code: TRAIT.COLLAPSE_TYPE, label: '消失效果', data: 'collapse', valueKind: 'none', picker: 'select' },
      { code: TRAIT.PARTY_ABILITY, label: '队伍能力', data: 'partyAbility', valueKind: 'none', picker: 'select' },
    ],
  },
]

export const XPARAM_LABELS = [
  '命中率',
  '回避率',
  '暴击率',
  '暴击回避',
  '魔法回避',
  '魔法反射',
  '反击率',
  'HP 再生率',
  'MP 再生率',
  'TP 再生率',
]

export const SPARAM_LABELS = [
  '受到攻击几率',
  '防御效果',
  '恢复效果',
  '药理知识',
  'MP 消耗率',
  'TP 补充率',
  '物理伤害率',
  '魔法伤害率',
  '地形伤害率',
  '经验获得率',
]

export const SPECIAL_FLAG_LABELS = ['自动战斗', '防御', '替身', '保留 TP']
export const COLLAPSE_LABELS = ['正常', 'Boss', '瞬间消失', '不消失']
export const PARTY_ABILITY_LABELS = [
  '遇敌减半',
  '无遇敌',
  '取消偷袭',
  '增加先发制人',
  '双倍金钱',
  '双倍物品',
]
export const SLOT_TYPE_LABELS = ['普通', '双持武器']

/** effect.code */
export const EFFECT = {
  RECOVER_HP: 11,
  RECOVER_MP: 12,
  GAIN_TP: 13,
  ADD_STATE: 21,
  REMOVE_STATE: 22,
  ADD_BUFF: 31,
  ADD_DEBUFF: 32,
  REMOVE_BUFF: 33,
  REMOVE_DEBUFF: 34,
  SPECIAL: 41,
  GROW: 42,
  LEARN_SKILL: 43,
  COMMON_EVENT: 44,
}

export const EFFECT_CATEGORIES = [
  {
    id: 'recover',
    label: '恢复',
    items: [
      { code: EFFECT.RECOVER_HP, label: '恢复 HP', data: 'none', v1: 'percent', v2: 'number' },
      { code: EFFECT.RECOVER_MP, label: '恢复 MP', data: 'none', v1: 'percent', v2: 'number' },
      { code: EFFECT.GAIN_TP, label: '获得 TP', data: 'none', v1: 'number', v2: 'none' },
    ],
  },
  {
    id: 'state',
    label: '状态',
    items: [
      { code: EFFECT.ADD_STATE, label: '附加状态', data: 'state', v1: 'percent', v2: 'none' },
      { code: EFFECT.REMOVE_STATE, label: '解除状态', data: 'state', v1: 'percent', v2: 'none' },
    ],
  },
  {
    id: 'buff',
    label: '强化 / 弱化',
    items: [
      { code: EFFECT.ADD_BUFF, label: '强化', data: 'param', v1: 'turns', v2: 'none' },
      { code: EFFECT.ADD_DEBUFF, label: '弱化', data: 'param', v1: 'turns', v2: 'none' },
      { code: EFFECT.REMOVE_BUFF, label: '解除强化', data: 'param', v1: 'none', v2: 'none' },
      { code: EFFECT.REMOVE_DEBUFF, label: '解除弱化', data: 'param', v1: 'none', v2: 'none' },
    ],
  },
  {
    id: 'other',
    label: '其他',
    items: [
      { code: EFFECT.SPECIAL, label: '特殊效果', data: 'specialEffect', v1: 'none', v2: 'none' },
      { code: EFFECT.GROW, label: '成长', data: 'param', v1: 'number', v2: 'none' },
      { code: EFFECT.LEARN_SKILL, label: '学会技能', data: 'skill', v1: 'none', v2: 'none' },
      { code: EFFECT.COMMON_EVENT, label: '公共事件', data: 'commonEvent', v1: 'none', v2: 'none' },
    ],
  },
]

export const SPECIAL_EFFECT_LABELS = ['逃跑']

export function findTraitMeta(code) {
  for (const cat of TRAIT_CATEGORIES) {
    const item = cat.items.find((i) => i.code === code)
    if (item) return item
  }
  return null
}

export function findEffectMeta(code) {
  for (const cat of EFFECT_CATEGORIES) {
    const item = cat.items.find((i) => i.code === code)
    if (item) return item
  }
  return null
}

export function optionLabel(options, value) {
  const o = options.find((x) => x.value === value)
  return o ? o.label : String(value)
}

export const STATE_RESTRICTION_OPTIONS = [
  { value: 0, label: '无' },
  { value: 1, label: '攻击敌人' },
  { value: 2, label: '攻击任何人' },
  { value: 3, label: '攻击队友' },
  { value: 4, label: '无法行动' },
]

export const STATE_MOTION_OPTIONS = [
  { value: 0, label: '无' },
  { value: 1, label: '待机' },
  { value: 2, label: '无法战斗' },
  { value: 3, label: '死亡' },
]

export const STATE_OVERLAY_OPTIONS = [
  { value: 0, label: '无' },
  { value: 1, label: '中毒' },
  { value: 2, label: '失明' },
  { value: 3, label: '沉默' },
  { value: 4, label: '愤怒' },
  { value: 5, label: '混乱' },
  { value: 6, label: '魅惑' },
  { value: 7, label: '睡眠' },
  { value: 8, label: '待机' },
  { value: 9, label: '诅咒' },
  { value: 10, label: '恐惧' },
]

export const AUTO_REMOVAL_OPTIONS = [
  { value: 0, label: '无' },
  { value: 1, label: '行动结束时' },
  { value: 2, label: '回合结束时' },
]

/** 敌人行动条件 conditionType */
export const ENEMY_ACTION_CONDITION_OPTIONS = [
  { value: 0, label: '总是' },
  { value: 1, label: '回合' },
  { value: 2, label: 'HP' },
  { value: 3, label: 'MP' },
  { value: 4, label: '状态' },
  { value: 5, label: '等级' },
  { value: 6, label: '开关' },
]

export const TROOP_SPAN_OPTIONS = [
  { value: 0, label: '战斗' },
  { value: 1, label: '回合' },
  { value: 2, label: '瞬间' },
]

export const DROP_KIND_OPTIONS = [
  { value: 0, label: '无' },
  { value: 1, label: '物品' },
  { value: 2, label: '武器' },
  { value: 3, label: '防具' },
]
