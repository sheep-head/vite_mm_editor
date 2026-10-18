import { equipSlotCount } from './systemLookups'

function emptyTraits() {
  return []
}

function emptyEffects() {
  return []
}

function emptyDamage() {
  return { type: 0, elementId: 0, formula: '0', variance: 20, critical: false }
}

function emptyParams8() {
  return [0, 0, 0, 0, 0, 0, 0, 0]
}

function emptyClassParams() {
  const params = []
  for (let p = 0; p < 8; p++) {
    const row = []
    for (let lv = 0; lv < 100; lv++) {
      row.push(p === 0 ? 1 + lv * 10 : p === 1 ? lv * 2 : 10 + lv)
    }
    params.push(row)
  }
  return params
}

export function defaultActor(id) {
  const n = equipSlotCount() || 5
  return {
    id,
    name: '',
    nickname: '',
    profile: '',
    note: '',
    classId: 1,
    initialLevel: 1,
    maxLevel: 99,
    characterName: '',
    characterIndex: 0,
    faceName: '',
    faceIndex: 0,
    battlerName: '',
    equips: Array.from({ length: n }, () => 0),
    traits: emptyTraits(),
  }
}

export function defaultClass(id) {
  return {
    id,
    name: '',
    note: '',
    expParams: [30, 20, 30, 30],
    params: emptyClassParams(),
    learnings: [],
    traits: emptyTraits(),
  }
}

export function defaultSkill(id) {
  return {
    id,
    name: '',
    note: '',
    description: '',
    iconIndex: 0,
    stypeId: 0,
    mpCost: 0,
    tpCost: 0,
    scope: 1,
    occasion: 1,
    speed: 0,
    successRate: 100,
    repeats: 1,
    tpGain: 0,
    hitType: 0,
    animationId: 0,
    message1: '',
    message2: '',
    requiredWtypeId1: 0,
    requiredWtypeId2: 0,
    damage: emptyDamage(),
    effects: emptyEffects(),
  }
}

export function defaultItem(id) {
  return {
    id,
    name: '',
    note: '',
    description: '',
    iconIndex: 0,
    itypeId: 1,
    price: 0,
    consumable: true,
    scope: 7,
    occasion: 0,
    speed: 0,
    successRate: 100,
    repeats: 1,
    tpGain: 0,
    hitType: 0,
    animationId: 0,
    damage: emptyDamage(),
    effects: emptyEffects(),
  }
}

export function defaultWeapon(id) {
  return {
    id,
    name: '',
    note: '',
    description: '',
    iconIndex: 0,
    wtypeId: 0,
    etypeId: 1,
    price: 0,
    animationId: 0,
    params: emptyParams8(),
    traits: emptyTraits(),
  }
}

export function defaultArmor(id) {
  return {
    id,
    name: '',
    note: '',
    description: '',
    iconIndex: 0,
    atypeId: 0,
    etypeId: 2,
    price: 0,
    params: emptyParams8(),
    traits: emptyTraits(),
  }
}

export function defaultEnemy(id) {
  return {
    id,
    name: '',
    note: '',
    battlerName: '',
    battlerHue: 0,
    exp: 0,
    gold: 0,
    params: [1, 0, 0, 0, 0, 0, 0, 0],
    actions: [{ skillId: 1, rating: 5, conditionType: 0, conditionParam1: 0, conditionParam2: 0 }],
    dropItems: [
      { kind: 0, dataId: 1, denominator: 1 },
      { kind: 0, dataId: 1, denominator: 1 },
      { kind: 0, dataId: 1, denominator: 1 },
    ],
    traits: emptyTraits(),
  }
}

export function defaultTroop(id) {
  return {
    id,
    name: '',
    members: [],
    pages: [
      {
        conditions: emptyTroopConditions(),
        list: [{ code: 0, indent: 0, parameters: [] }],
        span: 0,
      },
    ],
  }
}

function emptyTroopConditions() {
  return {
    actorHp: 50,
    actorId: 1,
    actorValid: false,
    enemyHp: 50,
    enemyIndex: 0,
    enemyValid: false,
    switchId: 1,
    switchValid: false,
    turnA: 0,
    turnB: 0,
    turnEnding: false,
    turnValid: false,
  }
}

export function defaultState(id) {
  return {
    id,
    name: '',
    note: '',
    iconIndex: 0,
    priority: 50,
    restriction: 0,
    motion: 0,
    overlay: 0,
    removeAtBattleEnd: true,
    removeByRestriction: false,
    autoRemovalTiming: 0,
    minTurns: 1,
    maxTurns: 1,
    removeByDamage: false,
    chanceByDamage: 100,
    removeByWalking: false,
    stepsToRemove: 100,
    message1: '',
    message2: '',
    message3: '',
    message4: '',
    traits: emptyTraits(),
  }
}

export function defaultAnimation(id) {
  return {
    id,
    name: '',
    animation1Name: '',
    animation1Hue: 0,
    animation2Name: '',
    animation2Hue: 0,
    position: 1,
    frames: Array.from({ length: 10 }, () => []),
    timings: [],
  }
}

export function defaultByFileName(fileName, id) {
  switch (fileName) {
    case 'Actors':
      return defaultActor(id)
    case 'Classes':
      return defaultClass(id)
    case 'Skills':
      return defaultSkill(id)
    case 'Items':
      return defaultItem(id)
    case 'Weapons':
      return defaultWeapon(id)
    case 'Armors':
      return defaultArmor(id)
    case 'Enemies':
      return defaultEnemy(id)
    case 'Troops':
      return defaultTroop(id)
    case 'States':
      return defaultState(id)
    case 'Animations':
      return defaultAnimation(id)
    default:
      return { id, name: '', note: '' }
  }
}

export function normalizeActor(rec) {
  if (!rec) return
  const n = equipSlotCount() || 5
  if (!Array.isArray(rec.equips)) rec.equips = Array.from({ length: n }, () => 0)
  while (rec.equips.length < n) rec.equips.push(0)
  if (!Array.isArray(rec.traits)) rec.traits = []
  if (rec.classId == null) rec.classId = 1
  if (rec.initialLevel == null) rec.initialLevel = 1
  if (rec.maxLevel == null) rec.maxLevel = 99
}

export function normalizeClass(rec) {
  if (!rec) return
  if (!Array.isArray(rec.expParams) || rec.expParams.length < 4) rec.expParams = [30, 20, 30, 30]
  if (!Array.isArray(rec.params) || rec.params.length < 8) {
    rec.params = emptyClassParams()
  } else {
    for (let p = 0; p < 8; p++) {
      if (!Array.isArray(rec.params[p])) rec.params[p] = Array.from({ length: 100 }, (_, i) => i + 1)
      while (rec.params[p].length < 100) rec.params[p].push(rec.params[p][rec.params[p].length - 1] || 1)
    }
  }
  if (!Array.isArray(rec.learnings)) rec.learnings = []
  if (!Array.isArray(rec.traits)) rec.traits = []
}

export function normalizeSkill(rec) {
  if (!rec) return
  if (!rec.damage || typeof rec.damage !== 'object') rec.damage = emptyDamage()
  if (!Array.isArray(rec.effects)) rec.effects = []
  if (rec.repeats == null) rec.repeats = 1
  if (rec.tpGain == null) rec.tpGain = 0
  if (rec.hitType == null) rec.hitType = 0
  if (rec.requiredWtypeId1 == null) rec.requiredWtypeId1 = 0
  if (rec.requiredWtypeId2 == null) rec.requiredWtypeId2 = 0
  if (rec.message1 == null) rec.message1 = ''
  if (rec.message2 == null) rec.message2 = ''
}

export function normalizeItem(rec) {
  if (!rec) return
  if (!rec.damage || typeof rec.damage !== 'object') rec.damage = emptyDamage()
  if (!Array.isArray(rec.effects)) rec.effects = []
  if (rec.repeats == null) rec.repeats = 1
  if (rec.tpGain == null) rec.tpGain = 0
  if (rec.hitType == null) rec.hitType = 0
  if (rec.animationId == null) rec.animationId = 0
  if (rec.consumable == null) rec.consumable = true
}

export function normalizeWeapon(rec) {
  if (!rec) return
  if (!Array.isArray(rec.params) || rec.params.length < 8) rec.params = emptyParams8()
  if (!Array.isArray(rec.traits)) rec.traits = []
  if (rec.etypeId == null) rec.etypeId = 1
}

export function normalizeArmor(rec) {
  if (!rec) return
  if (!Array.isArray(rec.params) || rec.params.length < 8) rec.params = emptyParams8()
  if (!Array.isArray(rec.traits)) rec.traits = []
  if (rec.etypeId == null) rec.etypeId = 2
  if (rec.atypeId == null) rec.atypeId = 0
}

export function normalizeEnemy(rec) {
  if (!rec) return
  if (!Array.isArray(rec.params) || rec.params.length < 8) rec.params = [1, 0, 0, 0, 0, 0, 0, 0]
  if (!Array.isArray(rec.actions)) {
    rec.actions = [{ skillId: 1, rating: 5, conditionType: 0, conditionParam1: 0, conditionParam2: 0 }]
  }
  if (!Array.isArray(rec.dropItems) || rec.dropItems.length < 3) {
    const base = Array.isArray(rec.dropItems) ? rec.dropItems : []
    while (base.length < 3) base.push({ kind: 0, dataId: 1, denominator: 1 })
    rec.dropItems = base.slice(0, 3)
  }
  if (!Array.isArray(rec.traits)) rec.traits = []
  if (rec.battlerHue == null) rec.battlerHue = 0
  if (rec.exp == null) rec.exp = 0
  if (rec.gold == null) rec.gold = 0
}

export function normalizeTroop(rec) {
  if (!rec) return
  if (!Array.isArray(rec.members)) rec.members = []
  if (!Array.isArray(rec.pages) || !rec.pages.length) {
    rec.pages = [
      {
        conditions: emptyTroopConditions(),
        list: [{ code: 0, indent: 0, parameters: [] }],
        span: 0,
      },
    ]
  }
  for (const page of rec.pages) {
    if (!page.conditions) page.conditions = emptyTroopConditions()
    if (!Array.isArray(page.list) || !page.list.length) {
      page.list = [{ code: 0, indent: 0, parameters: [] }]
    }
    if (page.span == null) page.span = 0
  }
}

export function normalizeState(rec) {
  if (!rec) return
  if (!Array.isArray(rec.traits)) rec.traits = []
  if (rec.restriction == null) rec.restriction = 0
  if (rec.priority == null) rec.priority = 50
  if (rec.motion == null) rec.motion = 0
  if (rec.overlay == null) rec.overlay = 0
  if (rec.autoRemovalTiming == null) rec.autoRemovalTiming = 0
  if (rec.minTurns == null) rec.minTurns = 1
  if (rec.maxTurns == null) rec.maxTurns = 1
  if (rec.chanceByDamage == null) rec.chanceByDamage = 100
  if (rec.stepsToRemove == null) rec.stepsToRemove = 100
  if (rec.message1 == null) rec.message1 = ''
  if (rec.message2 == null) rec.message2 = ''
  if (rec.message3 == null) rec.message3 = ''
  if (rec.message4 == null) rec.message4 = ''
  if (rec.removeAtBattleEnd == null) rec.removeAtBattleEnd = false
  if (rec.removeByRestriction == null) rec.removeByRestriction = false
  if (rec.removeByDamage == null) rec.removeByDamage = false
  if (rec.removeByWalking == null) rec.removeByWalking = false
}

export function normalizeTileset(rec) {
  if (!rec) return
  if (!Array.isArray(rec.tilesetNames)) rec.tilesetNames = []
  while (rec.tilesetNames.length < 9) rec.tilesetNames.push('')
  if (!Array.isArray(rec.flags)) rec.flags = []
  if (rec.mode == null) rec.mode = 0
  if (rec.note == null) rec.note = ''
}

export function normalizeCommonEvent(rec) {
  if (!rec) return
  if (rec.trigger == null) rec.trigger = 0
  if (rec.switchId == null) rec.switchId = 1
  if (!Array.isArray(rec.list) || !rec.list.length) {
    rec.list = [{ code: 0, indent: 0, parameters: [] }]
  }
}

export function normalizeByEditor(editor, rec) {
  switch (editor) {
    case 'actors':
      normalizeActor(rec)
      break
    case 'classes':
      normalizeClass(rec)
      break
    case 'skills':
      normalizeSkill(rec)
      break
    case 'items':
      normalizeItem(rec)
      break
    case 'weapons':
      normalizeWeapon(rec)
      break
    case 'armors':
      normalizeArmor(rec)
      break
    case 'enemies':
      normalizeEnemy(rec)
      break
    case 'troops':
      normalizeTroop(rec)
      break
    case 'states':
      normalizeState(rec)
      break
    case 'tilesets':
      normalizeTileset(rec)
      break
    case 'commonEvents':
      normalizeCommonEvent(rec)
      break
    default:
      break
  }
}
