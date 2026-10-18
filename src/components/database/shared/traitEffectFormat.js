import {
  findTraitMeta,
  findEffectMeta,
  XPARAM_LABELS,
  SPARAM_LABELS,
  SPECIAL_FLAG_LABELS,
  COLLAPSE_LABELS,
  PARTY_ABILITY_LABELS,
  SLOT_TYPE_LABELS,
  SPECIAL_EFFECT_LABELS,
} from './rpgDbConstants'
import {
  typeList,
  formatTypeName,
  formatRecordName,
  paramLabels,
} from './systemLookups'

function pct(v) {
  return `${Math.round((Number(v) || 0) * 100)}%`
}

function dataLabel(kind, dataId) {
  switch (kind) {
    case 'element':
      return formatTypeName(typeList('elements'), dataId)
    case 'param':
      return paramLabels()[dataId] || `能力${dataId}`
    case 'xparam':
      return XPARAM_LABELS[dataId] || `追加${dataId}`
    case 'sparam':
      return SPARAM_LABELS[dataId] || `特殊${dataId}`
    case 'state':
      return formatRecordName('States', dataId)
    case 'skill':
      return formatRecordName('Skills', dataId)
    case 'stype':
      return formatTypeName(typeList('skillTypes'), dataId)
    case 'wtype':
      return formatTypeName(typeList('weaponTypes'), dataId)
    case 'atype':
      return formatTypeName(typeList('armorTypes'), dataId)
    case 'etype':
      return formatTypeName(typeList('equipTypes'), dataId)
    case 'slotType':
      return SLOT_TYPE_LABELS[dataId] || String(dataId)
    case 'specialFlag':
      return SPECIAL_FLAG_LABELS[dataId] || String(dataId)
    case 'collapse':
      return COLLAPSE_LABELS[dataId] || String(dataId)
    case 'partyAbility':
      return PARTY_ABILITY_LABELS[dataId] || String(dataId)
    case 'specialEffect':
      return SPECIAL_EFFECT_LABELS[dataId] || String(dataId)
    case 'commonEvent':
      return formatRecordName('CommonEvents', dataId)
    default:
      return dataId != null ? String(dataId) : ''
  }
}

export function formatTraitType(trait) {
  const meta = findTraitMeta(trait && trait.code)
  if (meta) return meta.label
  return `自定义 (${trait && trait.code})`
}

export function formatTraitContent(trait) {
  if (!trait) return ''
  const meta = findTraitMeta(trait.code)
  if (!meta) {
    return `dataId=${trait.dataId}, value=${trait.value}`
  }
  const name = meta.data === 'none' ? '' : dataLabel(meta.data, trait.dataId)
  if (meta.valueKind === 'none') return name || '—'
  if (meta.valueKind === 'percent') {
    return name ? `${name} * ${pct(trait.value)}` : pct(trait.value)
  }
  if (meta.valueKind === 'percentPlus') {
    return name ? `${name} + ${pct(trait.value)}` : `+ ${pct(trait.value)}`
  }
  // number
  return name ? `${name} ${trait.value}` : String(trait.value)
}

export function formatEffectType(effect) {
  const meta = findEffectMeta(effect && effect.code)
  if (meta) return meta.label
  return `自定义 (${effect && effect.code})`
}

export function formatEffectContent(effect) {
  if (!effect) return ''
  const meta = findEffectMeta(effect.code)
  if (!meta) {
    return `dataId=${effect.dataId}, v1=${effect.value1}, v2=${effect.value2}`
  }
  const name = meta.data === 'none' ? '' : dataLabel(meta.data, effect.dataId)
  const parts = []
  if (name) parts.push(name)
  if (meta.v1 === 'percent') parts.push(pct(effect.value1))
  else if (meta.v1 === 'number' || meta.v1 === 'turns') {
    parts.push(meta.v1 === 'turns' ? `${effect.value1} 回合` : String(effect.value1))
  }
  if (meta.v2 === 'number' && effect.value2) parts.push(`+${effect.value2}`)
  return parts.join(' ') || '—'
}
