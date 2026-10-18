import { formatRecordName, paramLabels } from '@/components/database/shared/systemLookups'

export const ACTOR_STATS = [
  '等级',
  '经验值',
  'HP',
  'MP',
]

export const ENEMY_STATS = ['HP', 'MP']

export const CHAR_PROPS = ['地图 X', '地图 Y', '方向', '画面 X', '画面 Y']

export const OTHER_DATA = [
  '地图编码',
  '同伴人数',
  '金钱',
  '步数',
  '游戏时间',
  '计时器',
  '存档次数',
  '战斗次数',
  '胜利次数',
  '逃跑次数',
]

export function actorStatLabels() {
  return ACTOR_STATS.concat(paramLabels())
}

export function enemyStatLabels() {
  return ENEMY_STATS.concat(paramLabels())
}

export function describeGameData(type, param1, param2) {
  const t = Number(type) || 0
  const a = Number(param1) || 0
  const b = Number(param2) || 0
  if (t === 0) return `物品 ${formatRecordName('Items', a)}`
  if (t === 1) return `武器 ${formatRecordName('Weapons', a)}`
  if (t === 2) return `防具 ${formatRecordName('Armors', a)}`
  if (t === 3) {
    const stats = actorStatLabels()
    return `角色 ${formatRecordName('Actors', a)} 的 ${stats[b] || stats[0]}`
  }
  if (t === 4) {
    const stats = enemyStatLabels()
    return `敌人 #${a + 1} 的 ${stats[b] || stats[0]}`
  }
  if (t === 5) {
    const who = a === -1 ? '玩家' : a === 0 ? '本事件' : `事件 ${a}`
    return `${who} 的 ${CHAR_PROPS[b] || CHAR_PROPS[0]}`
  }
  if (t === 6) return `队伍成员 #${a + 1}`
  return OTHER_DATA[a] || OTHER_DATA[0]
}
