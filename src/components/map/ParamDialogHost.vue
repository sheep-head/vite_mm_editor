<template>
  <component
    :is="activeComp"
    v-if="activeComp && modelValue"
    :model-value="modelValue"
    :command="command"
    :entry="entry"
    :command-list="commandList"
    @update:model-value="$emit('update:modelValue', $event)"
    @confirm="onConfirm" />
</template>

<script>
import { defineAsyncComponent } from 'vue'
import { findCatalogEntry } from './eventCommandCatalog'

const PARAM_LOADERS = {
  Cmd101ShowText: () => import('./commands/Cmd101ShowText.vue'),
  Cmd102ShowChoices: () => import('./commands/Cmd102ShowChoices.vue'),
  Cmd103NumInput: () => import('./commands/Cmd103NumInput.vue'),
  Cmd104ItemChoice: () => import('./commands/Cmd104ItemChoice.vue'),
  Cmd105ScrollText: () => import('./commands/Cmd105ScrollText.vue'),
  Cmd108Comment: () => import('./commands/Cmd108Comment.vue'),
  Cmd111Branch: () => import('./commands/Cmd111Branch.vue'),
  Cmd117CommonEvent: () => import('./commands/Cmd117CommonEvent.vue'),
  Cmd118Label: () => import('./commands/Cmd118Label.vue'),
  Cmd119JumpLabel: () => import('./commands/Cmd119JumpLabel.vue'),
  Cmd121Switch: () => import('./commands/Cmd121Switch.vue'),
  Cmd122Variable: () => import('./commands/Cmd122Variable.vue'),
  Cmd123SelfSwitch: () => import('./commands/Cmd123SelfSwitch.vue'),
  Cmd124Timer: () => import('./commands/Cmd124Timer.vue'),
  Cmd125Gold: () => import('./commands/Cmd125Gold.vue'),
  Cmd126Item: () => import('./commands/Cmd126Item.vue'),
  Cmd127Weapon: () => import('./commands/Cmd127Weapon.vue'),
  Cmd128Armor: () => import('./commands/Cmd128Armor.vue'),
  Cmd129Party: () => import('./commands/Cmd129Party.vue'),
  Cmd132BattleBgm: () => import('./commands/Cmd132BattleBgm.vue'),
  Cmd133VictoryMe: () => import('./commands/Cmd133VictoryMe.vue'),
  Cmd138WindowTone: () => import('./commands/Cmd138WindowTone.vue'),
  Cmd139DefeatMe: () => import('./commands/Cmd139DefeatMe.vue'),
  Cmd140VehicleBgm: () => import('./commands/Cmd140VehicleBgm.vue'),
  Cmd201Transfer: () => import('./commands/Cmd201Transfer.vue'),
  Cmd202Vehicle: () => import('./commands/Cmd202Vehicle.vue'),
  Cmd203EventPos: () => import('./commands/Cmd203EventPos.vue'),
  Cmd204Scroll: () => import('./commands/Cmd204Scroll.vue'),
  Cmd205MoveRoute: () => import('./commands/Cmd205MoveRoute.vue'),
  Cmd211Transparency: () => import('./commands/Cmd211Transparency.vue'),
  Cmd212Animation: () => import('./commands/Cmd212Animation.vue'),
  Cmd213Balloon: () => import('./commands/Cmd213Balloon.vue'),
  Cmd216Followers: () => import('./commands/Cmd216Followers.vue'),
  Cmd223Tint: () => import('./commands/Cmd223Tint.vue'),
  Cmd224Flash: () => import('./commands/Cmd224Flash.vue'),
  Cmd225Shake: () => import('./commands/Cmd225Shake.vue'),
  Cmd230Wait: () => import('./commands/Cmd230Wait.vue'),
  Cmd231ShowPicture: () => import('./commands/Cmd231ShowPicture.vue'),
  Cmd232MovePicture: () => import('./commands/Cmd232MovePicture.vue'),
  Cmd233RotatePicture: () => import('./commands/Cmd233RotatePicture.vue'),
  Cmd234TintPicture: () => import('./commands/Cmd234TintPicture.vue'),
  Cmd235ErasePicture: () => import('./commands/Cmd235ErasePicture.vue'),
  Cmd236Weather: () => import('./commands/Cmd236Weather.vue'),
  Cmd241Bgm: () => import('./commands/Cmd241Bgm.vue'),
  Cmd242FadeBgm: () => import('./commands/Cmd242FadeBgm.vue'),
  Cmd245Bgs: () => import('./commands/Cmd245Bgs.vue'),
  Cmd246FadeBgs: () => import('./commands/Cmd246FadeBgs.vue'),
  Cmd249Me: () => import('./commands/Cmd249Me.vue'),
  Cmd250Se: () => import('./commands/Cmd250Se.vue'),
  Cmd261Movie: () => import('./commands/Cmd261Movie.vue'),
  Cmd281MapName: () => import('./commands/CmdEnableToggle.vue'),
  CmdEnableToggle: () => import('./commands/CmdEnableToggle.vue'),
  Cmd282Tileset: () => import('./commands/Cmd282Tileset.vue'),
  Cmd283Battleback: () => import('./commands/Cmd283Battleback.vue'),
  Cmd284Parallax: () => import('./commands/Cmd284Parallax.vue'),
  Cmd285GetLocation: () => import('./commands/Cmd285GetLocation.vue'),
  Cmd301Battle: () => import('./commands/Cmd301Battle.vue'),
  Cmd302Shop: () => import('./commands/Cmd302Shop.vue'),
  Cmd303NameInput: () => import('./commands/Cmd303NameInput.vue'),
  Cmd313State: () => import('./commands/Cmd313State.vue'),
  Cmd314Recover: () => import('./commands/Cmd314Recover.vue'),
  Cmd317Param: () => import('./commands/Cmd317Param.vue'),
  Cmd318Skill: () => import('./commands/Cmd318Skill.vue'),
  Cmd319Equip: () => import('./commands/Cmd319Equip.vue'),
  Cmd321Class: () => import('./commands/Cmd321Class.vue'),
  Cmd322ActorImage: () => import('./commands/Cmd322ActorImage.vue'),
  Cmd323VehicleImage: () => import('./commands/Cmd323VehicleImage.vue'),
  Cmd333EnemyState: () => import('./commands/Cmd333EnemyState.vue'),
  Cmd334EnemyRecover: () => import('./commands/Cmd334EnemyRecover.vue'),
  Cmd335EnemyAppear: () => import('./commands/Cmd335EnemyAppear.vue'),
  Cmd336EnemyTransform: () => import('./commands/Cmd336EnemyTransform.vue'),
  Cmd337BattleAnim: () => import('./commands/Cmd337BattleAnim.vue'),
  Cmd339ForceAction: () => import('./commands/Cmd339ForceAction.vue'),
  Cmd355Script: () => import('./commands/Cmd355Script.vue'),
  Cmd357Plugin: () => import('./commands/Cmd357Plugin.vue'),
  CmdActorChangeValue: () => import('./commands/CmdActorChangeValue.vue'),
  CmdActorText: () => import('./commands/CmdActorText.vue'),
  CmdEnemyChangeValue: () => import('./commands/CmdEnemyChangeValue.vue'),
  Cmd342ActorTp: () => import('./commands/CmdActorChangeValue.vue'),
  Cmd342EnemyTp: () => import('./commands/CmdEnemyChangeValue.vue'),
}

const cache = {}

function loadParam(key) {
  if (!key || !PARAM_LOADERS[key]) return null
  if (!cache[key]) {
    cache[key] = defineAsyncComponent(PARAM_LOADERS[key])
  }
  return cache[key]
}

export default {
  name: 'ParamDialogHost',
  props: {
    modelValue: { type: Boolean, default: false },
    entry: { type: Object, default: null },
    command: { type: Object, default: null },
    commandList: { type: Array, default: () => [] },
  },
  emits: ['update:modelValue', 'confirm'],
  computed: {
    activeComp() {
      const key =
        (this.entry && this.entry.paramKey) ||
        (this.command && findCatalogEntry(this.command.code) && findCatalogEntry(this.command.code).paramKey) ||
        null
      return loadParam(key)
    },
  },
  methods: {
    onConfirm(commands) {
      this.$emit('confirm', commands)
    },
  },
}
</script>
