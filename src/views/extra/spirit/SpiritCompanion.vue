<template>
  <div class="spirit-page full-height">
    <div class="spirit-layout">
      <aside class="spirit-side">
        <div class="side-title">{{ sideTitle }}</div>
        <p v-if="tab === 'global'" class="side-hint">在右侧编辑伴游全局参数</p>

        <div v-show="tab === 'traits'" class="list-panel">
          <el-button size="small" type="primary" @click="addTrait">添加特性</el-button>
          <ul class="item-ul">
            <li
              v-for="key in traitKeys"
              :key="key"
              tabindex="0"
              data-editor-list-item
              :class="{ active: selectedTraitKey === key }"
              @click="selectTrait(key, $event)">
              {{ key }} · {{ config.traits[key] && config.traits[key].name }}
            </li>
          </ul>
        </div>

        <div v-show="tab === 'trails'" class="list-panel">
          <div class="list-actions">
            <el-button size="small" type="primary" @click="addTrail">添加</el-button>
            <el-button size="small" type="danger" :disabled="!selectedTrailKey" @click="removeTrail">删除</el-button>
          </div>
          <ul class="item-ul">
            <li
              v-for="key in trailKeys"
              :key="key"
              tabindex="0"
              data-editor-list-item
              :class="{ active: selectedTrailKey === key }"
              @click="selectTrail(key, $event)">
              {{ key }} · {{ config.trails[key] && config.trails[key].name }}
              <span class="q-tag">〔{{ trailModeLabel(config.trails[key]) }}〕</span>
            </li>
          </ul>
        </div>

        <div v-show="tab === 'spirits'" class="list-panel">
          <div class="list-actions">
            <el-button size="small" type="primary" @click="addSpirit">添加</el-button>
            <el-button size="small" :disabled="spiritIndex < 0" @click="dupSpirit">复制</el-button>
            <el-button size="small" type="danger" :disabled="spiritIndex < 0" @click="removeSpirit">删除</el-button>
          </div>
          <ul class="item-ul">
            <li
              v-for="(sp, i) in config.spirits"
              :key="i"
              tabindex="0"
              data-editor-list-item
              :class="{ active: spiritIndex === i }"
              :style="{ color: qualityEditorColor(sp.quality) }"
              @click="selectSpirit(i, $event)">
              #{{ sp.actorId }} {{ sp.name || '(未命名)' }}
              <span class="q-tag">〔{{ qualityLabel(sp.quality) }}〕</span>
            </li>
          </ul>
        </div>
      </aside>

      <main class="spirit-main">
        <!-- 全局 -->
        <el-form v-show="tab === 'global'" label-width="108px" class="spirit-form dense">
          <div class="form-grid">
            <el-form-item>
              <template #label>总开关 ID<FieldHelp :text="help.enableSwitchId" /></template>
              <el-input-number v-model="config.enableSwitchId" :min="0" controls-position="right" class="ctrl-full" />
            </el-form-item>
            <el-form-item>
              <template #label>环绕半径<FieldHelp :text="help.orbitRadius" /></template>
              <el-input-number v-model="config.orbitRadius" :min="0.1" :max="5" :step="0.05" controls-position="right" class="ctrl-full" />
            </el-form-item>
            <el-form-item>
              <template #label>跟随平滑<FieldHelp :text="help.followLerp" /></template>
              <el-input-number v-model="config.followLerp" :min="0.01" :max="1" :step="0.01" controls-position="right" class="ctrl-full" />
            </el-form-item>
            <el-form-item>
              <template #label>环绕角速度<FieldHelp :text="help.orbitSpeed" /></template>
              <el-input-number v-model="config.orbitSpeed" :min="0.001" :max="0.2" :step="0.005" controls-position="right" class="ctrl-full" />
            </el-form-item>
            <el-form-item>
              <template #label>战斗偏移 X<FieldHelp :text="help.battleOffsetX" /></template>
              <el-input-number v-model="config.battleOffsetX" controls-position="right" class="ctrl-full" />
            </el-form-item>
            <el-form-item>
              <template #label>战斗偏移 Y<FieldHelp :text="help.battleOffsetY" /></template>
              <el-input-number v-model="config.battleOffsetY" controls-position="right" class="ctrl-full" />
            </el-form-item>
            <el-form-item class="full">
              <template #label>菜单图标<FieldHelp :text="help.menuIcon" /></template>
              <ImageAssetPicker
                v-model="config.menuIcon"
                lock-folder="pictures"
                import-folder="pictures" />
            </el-form-item>
          </div>
        </el-form>

        <!-- 特性 -->
        <el-form v-if="tab === 'traits' && currentTrait" label-width="100px" class="spirit-form dense">
          <div class="form-grid">
            <el-form-item label="标识 Key">
              <el-input :model-value="selectedTraitKey" disabled />
            </el-form-item>
            <el-form-item label="名称">
              <el-input v-model="currentTrait.name" />
            </el-form-item>
            <el-form-item label="类型">
              <el-select v-model="currentTrait.type" class="ctrl-full">
                <el-option v-for="o in traitTypes" :key="o.value" :label="o.label" :value="o.value" />
              </el-select>
            </el-form-item>
            <el-form-item class="full" label="说明">
              <el-input v-model="currentTrait.desc" type="textarea" :rows="2" />
            </el-form-item>
            <template v-if="currentTrait.type === 'partyParam'">
              <el-form-item label="能力项">
                <el-select v-model="currentTrait.paramId" class="ctrl-full">
                  <el-option v-for="o in paramIds" :key="o.value" :label="o.label" :value="o.value" />
                </el-select>
              </el-form-item>
              <el-form-item label="加成倍率">
                <el-input-number v-model="currentTrait.rate" :step="0.01" controls-position="right" class="ctrl-full" />
              </el-form-item>
            </template>
            <el-form-item v-if="currentTrait.type === 'preemptive'" label="触发概率">
              <el-input-number v-model="currentTrait.chance" :min="0" :max="1" :step="0.01" controls-position="right" class="ctrl-full" />
            </el-form-item>
            <el-form-item v-if="currentTrait.type === 'goldRate' || currentTrait.type === 'expRate'" label="倍率">
              <el-input-number v-model="currentTrait.rate" :step="0.01" controls-position="right" class="ctrl-full" />
            </el-form-item>
            <el-form-item v-if="currentTrait.type === 'special'" class="span-2" label="处理器键名">
              <el-input v-model="currentTrait.handler" placeholder="TraitHandlers 键名" />
            </el-form-item>
            <el-form-item
              v-if="currentTrait.type === 'special' && currentTrait.handler === 'autoFarm'"
            >
              <template #label>挂机档位<FieldHelp :text="help.autoFarmTier" /></template>
              <el-select v-model="autoFarmTier" class="ctrl-full">
                <el-option label="低级 low" value="low" />
                <el-option label="中级 mid" value="mid" />
                <el-option label="高级 high" value="high" />
              </el-select>
            </el-form-item>
            <el-form-item
              v-if="currentTrait.type === 'special' && currentTrait.handler === 'autoFarm'"
            >
              <template #label>光标间隔<FieldHelp :text="help.autoFarmCursorDelay" /></template>
              <el-input-number
                v-model="autoFarmCursorDelay"
                :min="0"
                :max="60"
                controls-position="right"
                class="ctrl-full" />
            </el-form-item>
            <el-form-item class="full" label-width="0">
              <el-button type="danger" @click="removeTrait">删除此特性</el-button>
            </el-form-item>
          </div>
        </el-form>

        <!-- 拖尾库 -->
        <el-form v-if="tab === 'trails' && currentTrail" label-width="108px" class="spirit-form dense">
          <div class="form-grid">
            <el-form-item label="标识 Key">
              <el-input :model-value="selectedTrailKey" disabled />
            </el-form-item>
            <el-form-item label="名称">
              <el-input v-model="currentTrail.name" />
            </el-form-item>
            <el-form-item>
              <template #label>模式<FieldHelp :text="help.trailMode" /></template>
              <el-select v-model="currentTrail.mode" class="ctrl-full">
                <el-option label="残影 afterimage" value="afterimage" />
                <el-option label="尾巴 tail" value="tail" />
              </el-select>
            </el-form-item>
            <el-form-item label="不透明度">
              <el-input-number v-model="currentTrail.opacity" :min="0" :max="255" controls-position="right" class="ctrl-full" />
            </el-form-item>
            <el-form-item label="缩放">
              <el-input-number v-model="currentTrail.scale" :step="0.05" controls-position="right" class="ctrl-full" />
            </el-form-item>
            <template v-if="currentTrail.mode === 'afterimage'">
              <el-form-item label="生成间隔">
                <el-input-number v-model="currentTrail.interval" :min="1" controls-position="right" class="ctrl-full" />
              </el-form-item>
              <el-form-item label="存活帧数">
                <el-input-number v-model="currentTrail.life" :min="1" controls-position="right" class="ctrl-full" />
              </el-form-item>
              <el-form-item>
                <template #label>最大数量<FieldHelp :text="help['trail.max']" /></template>
                <el-input-number v-model="currentTrail.max" :min="1" :max="32" controls-position="right" class="ctrl-full" />
              </el-form-item>
            </template>
            <template v-else>
              <el-form-item label="节间距">
                <el-input-number v-model="currentTrail.segmentGap" :min="1" controls-position="right" class="ctrl-full" />
              </el-form-item>
              <el-form-item label="节数">
                <el-input-number v-model="currentTrail.segments" :min="1" :max="24" controls-position="right" class="ctrl-full" />
              </el-form-item>
            </template>
          </div>

          <el-divider content-position="left">尾巴贴图（tail）</el-divider>
          <div class="form-grid" :class="{ 'is-disabled': currentTrail.mode !== 'tail' }">
            <el-form-item class="full">
              <template #label>图片<FieldHelp :text="help['sprite.path']" /></template>
              <ImageAssetPicker v-model="currentTrail.sprite.path" />
            </el-form-item>
            <el-form-item label="帧宽">
              <el-input-number v-model="currentTrail.sprite.frameW" :min="1" controls-position="right" class="ctrl-full" />
            </el-form-item>
            <el-form-item label="帧高">
              <el-input-number v-model="currentTrail.sprite.frameH" :min="1" controls-position="right" class="ctrl-full" />
            </el-form-item>
            <el-form-item label="横向帧">
              <el-input-number v-model="currentTrail.sprite.frames" :min="1" controls-position="right" class="ctrl-full" />
            </el-form-item>
            <el-form-item label="纵向行">
              <el-input-number v-model="currentTrail.sprite.rows" :min="1" controls-position="right" class="ctrl-full" />
            </el-form-item>
            <el-form-item label="帧等待">
              <el-input-number v-model="currentTrail.sprite.frameWait" :min="1" controls-position="right" class="ctrl-full" />
            </el-form-item>
            <el-form-item label="锚点 X">
              <el-input-number v-model="currentTrail.sprite.anchorX" :step="0.05" controls-position="right" class="ctrl-full" />
            </el-form-item>
            <el-form-item label="锚点 Y">
              <el-input-number v-model="currentTrail.sprite.anchorY" :step="0.05" controls-position="right" class="ctrl-full" />
            </el-form-item>
            <el-form-item label="贴图缩放">
              <el-input-number v-model="currentTrail.sprite.scale" :step="0.05" controls-position="right" class="ctrl-full" />
            </el-form-item>
          </div>

          <el-divider content-position="left">音效</el-divider>
          <div class="form-grid">
            <el-form-item>
              <template #label>启用 SE<FieldHelp :text="help.trailSfx" /></template>
              <el-switch v-model="currentTrail.sfx.enabled" />
            </el-form-item>
            <el-form-item label="SE 文件名">
              <el-input v-model="currentTrail.sfx.name" placeholder="audio/se 下无扩展名" />
            </el-form-item>
            <el-form-item label="音量">
              <el-input-number v-model="currentTrail.sfx.volume" :min="0" :max="100" controls-position="right" class="ctrl-full" />
            </el-form-item>
            <el-form-item label="音调">
              <el-input-number v-model="currentTrail.sfx.pitch" :min="50" :max="150" controls-position="right" class="ctrl-full" />
            </el-form-item>
            <el-form-item label="声道">
              <el-input-number v-model="currentTrail.sfx.pan" :min="-100" :max="100" controls-position="right" class="ctrl-full" />
            </el-form-item>
            <el-form-item label="触发时机">
              <el-select v-model="currentTrail.sfx.when" class="ctrl-full">
                <el-option label="移动中" value="moving" />
                <el-option label="待机" value="idle" />
                <el-option label="总是" value="always" />
              </el-select>
            </el-form-item>
            <el-form-item label="周期(帧)">
              <el-input-number v-model="currentTrail.sfx.interval" :min="0" controls-position="right" class="ctrl-full" />
            </el-form-item>
            <el-form-item class="full" label="序列帧">
              <el-input
                :model-value="sfxFramesText"
                placeholder="逗号分隔，如 0,2,4"
                @update:model-value="onSfxFramesInput" />
            </el-form-item>
          </div>
        </el-form>

        <!-- 精灵 -->
        <div v-show="tab === 'spirits' && currentSpirit" class="spirit-editor">
          <el-form label-width="108px" class="spirit-form dense">
            <el-divider content-position="left">身份</el-divider>
            <div class="form-grid">
              <el-form-item>
                <template #label>绑定角色<FieldHelp :text="help.actorId" /></template>
                <el-select v-model="currentSpirit.actorId" clearable filterable placeholder="请选择" class="ctrl-full">
                  <template v-for="item in actors" :key="item && item.id">
                    <el-option v-if="item" :label="item.id + ':' + item.name" :value="item.id" />
                  </template>
                </el-select>
              </el-form-item>
              <el-form-item>
                <template #label>名称<FieldHelp :text="help.name" /></template>
                <el-input v-model="currentSpirit.name" />
              </el-form-item>
              <el-form-item>
                <template #label>品级<FieldHelp :text="help.quality" /></template>
                <el-select v-model="currentSpirit.quality" class="ctrl-full">
                  <el-option
                    v-for="key in qualityKeys"
                    :key="key"
                    :label="qualities[key].name"
                    :value="key">
                    <span class="q-opt">
                      <i
                        class="q-dot"
                        :class="{ 'is-normal': key === 'normal' }"
                        :style="{ background: qualities[key].color }" />
                      <span :style="{ color: qualityEditorColor(key) }">{{ qualities[key].name }}</span>
                    </span>
                  </el-option>
                </el-select>
              </el-form-item>
              <el-form-item>
                <template #label>无敌<FieldHelp :text="help.invincible" /></template>
                <el-switch v-model="currentSpirit.invincible" />
              </el-form-item>
              <el-form-item>
                <template #label>解锁开关<FieldHelp :text="help.unlockSwitchId" /></template>
                <el-input-number v-model="currentSpirit.unlockSwitchId" :min="0" controls-position="right" class="ctrl-full" />
              </el-form-item>
              <el-form-item class="full">
                <template #label>介绍<FieldHelp :text="help.desc" /></template>
                <el-input v-model="currentSpirit.desc" type="textarea" :rows="2" />
              </el-form-item>
              <el-form-item class="full" label="特性引用">
                <el-select v-model="currentSpirit.traits" multiple filterable class="ctrl-full" placeholder="选择特性">
                  <el-option v-for="k in traitKeys" :key="k" :label="k + ' · ' + (config.traits[k] && config.traits[k].name)" :value="k" />
                </el-select>
              </el-form-item>
            </div>

            <el-divider content-position="left">序列帧外观</el-divider>
            <div class="form-grid">
              <el-form-item class="full">
                <template #label>图片<FieldHelp :text="help['sprite.path']" /></template>
                <ImageAssetPicker v-model="currentSpirit.sprite.path" />
              </el-form-item>
              <el-form-item>
                <template #label>帧宽<FieldHelp :text="help['sprite.frameW']" /></template>
                <el-input-number v-model="currentSpirit.sprite.frameW" :min="1" controls-position="right" class="ctrl-full" />
              </el-form-item>
              <el-form-item>
                <template #label>帧高<FieldHelp :text="help['sprite.frameH']" /></template>
                <el-input-number v-model="currentSpirit.sprite.frameH" :min="1" controls-position="right" class="ctrl-full" />
              </el-form-item>
              <el-form-item>
                <template #label>切帧间隔<FieldHelp :text="help['sprite.frameWait']" /></template>
                <el-input-number v-model="currentSpirit.sprite.frameWait" :min="1" controls-position="right" class="ctrl-full" />
              </el-form-item>
              <el-form-item>
                <template #label>横向帧数<FieldHelp :text="help['sprite.frames']" /></template>
                <el-input-number v-model="currentSpirit.sprite.frames" :min="1" controls-position="right" class="ctrl-full" />
              </el-form-item>
              <el-form-item>
                <template #label>纵向行数<FieldHelp :text="help['sprite.rows']" /></template>
                <el-input-number v-model="currentSpirit.sprite.rows" :min="1" controls-position="right" class="ctrl-full" />
              </el-form-item>
              <el-form-item>
                <template #label>缩放<FieldHelp :text="help['sprite.scale']" /></template>
                <el-input-number v-model="currentSpirit.sprite.scale" :min="0.1" :step="0.1" controls-position="right" class="ctrl-full" />
              </el-form-item>
              <el-form-item>
                <template #label>锚点 X<FieldHelp :text="help['sprite.anchorX']" /></template>
                <el-input-number v-model="currentSpirit.sprite.anchorX" :step="0.1" controls-position="right" class="ctrl-full" />
              </el-form-item>
              <el-form-item>
                <template #label>锚点 Y<FieldHelp :text="help['sprite.anchorY']" /></template>
                <el-input-number v-model="currentSpirit.sprite.anchorY" :step="0.1" controls-position="right" class="ctrl-full" />
              </el-form-item>
            </div>

            <el-divider content-position="left">浮动</el-divider>
            <div class="form-grid">
              <el-form-item>
                <template #label>启用<FieldHelp :text="help['float.enabled']" /></template>
                <el-switch v-model="currentSpirit.float.enabled" />
              </el-form-item>
              <el-form-item>
                <template #label>振幅<FieldHelp :text="help['float.amplitude']" /></template>
                <el-input-number v-model="currentSpirit.float.amplitude" :min="0" controls-position="right" class="ctrl-full" />
              </el-form-item>
              <el-form-item>
                <template #label>速度<FieldHelp :text="help['float.speed']" /></template>
                <el-input-number v-model="currentSpirit.float.speed" :min="0.01" :step="0.01" controls-position="right" class="ctrl-full" />
              </el-form-item>
              <el-form-item label="跟随中浮动">
                <el-switch v-model="currentSpirit.float.whileFollow" />
              </el-form-item>
              <el-form-item label="待机浮动">
                <el-switch v-model="currentSpirit.float.whileIdle" />
              </el-form-item>
            </div>

            <el-divider content-position="left">拖尾</el-divider>
            <div class="form-grid">
              <el-form-item>
                <template #label>启用<FieldHelp :text="help['trail.enabled']" /></template>
                <el-switch v-model="currentSpirit.trail.enabled" />
              </el-form-item>
              <el-form-item>
                <template #label>拖尾库<FieldHelp :text="help['trail.trailId']" /></template>
                <el-select v-model="currentSpirit.trail.trailId" clearable placeholder="空=内联残影" class="ctrl-full">
                  <el-option
                    v-for="key in trailKeys"
                    :key="key"
                    :label="`${key} · ${(config.trails[key] && config.trails[key].name) || ''}`"
                    :value="key" />
                </el-select>
              </el-form-item>
              <template v-if="!currentSpirit.trail.trailId">
                <el-form-item label="生成间隔">
                  <el-input-number v-model="currentSpirit.trail.interval" :min="1" controls-position="right" class="ctrl-full" />
                </el-form-item>
                <el-form-item label="存活帧数">
                  <el-input-number v-model="currentSpirit.trail.life" :min="1" controls-position="right" class="ctrl-full" />
                </el-form-item>
                <el-form-item>
                  <template #label>最大数量<FieldHelp :text="help['trail.max']" /></template>
                  <el-input-number v-model="currentSpirit.trail.max" :min="1" :max="32" controls-position="right" class="ctrl-full" />
                </el-form-item>
                <el-form-item label="不透明度">
                  <el-input-number v-model="currentSpirit.trail.opacity" :min="0" :max="255" controls-position="right" class="ctrl-full" />
                </el-form-item>
                <el-form-item label="缩放">
                  <el-input-number v-model="currentSpirit.trail.scale" :step="0.05" controls-position="right" class="ctrl-full" />
                </el-form-item>
              </template>
              <el-form-item v-else class="full">
                <span class="trail-lib-hint">已绑定库「{{ currentSpirit.trail.trailId }}」，参数请在拖尾库页调整</span>
              </el-form-item>
              <el-form-item>
                <template #label>演示移动<FieldHelp :text="help['trail.demoMove']" /></template>
                <el-switch v-model="previewDemoMove" />
              </el-form-item>
              <el-form-item label="预览 SE">
                <el-switch v-model="previewPlaySfx" />
              </el-form-item>
            </div>

            <el-divider content-position="left">特效</el-divider>
            <div class="form-grid">
              <el-form-item>
                <template #label>缩放呼吸<FieldHelp :text="help['fx.scalePulse']" /></template>
                <el-input-number v-model="currentSpirit.fx.scalePulse" :min="0" :step="0.01" controls-position="right" class="ctrl-full" />
              </el-form-item>
              <el-form-item label="透明度呼吸">
                <el-input-number v-model="currentSpirit.fx.opacityPulse" :min="0" :max="255" controls-position="right" class="ctrl-full" />
              </el-form-item>
              <el-form-item label="按侧翻转">
                <el-switch v-model="currentSpirit.fx.flipBySide" />
              </el-form-item>
              <el-form-item>
                <template #label>前冲像素<FieldHelp :text="help['fx.lungePx']" /></template>
                <el-input-number v-model="currentSpirit.fx.lungePx" :min="0" controls-position="right" class="ctrl-full" />
              </el-form-item>
              <el-form-item label="发光不透明度">
                <el-input-number v-model="currentSpirit.fx.glowOpacity" :min="0" :max="255" controls-position="right" class="ctrl-full" />
              </el-form-item>
            </div>

            <el-divider content-position="left">轮廓</el-divider>
            <div class="form-grid">
              <el-form-item>
                <template #label>启用<FieldHelp :text="help['outline.enabled']" /></template>
                <el-switch v-model="currentSpirit.outline.enabled" />
              </el-form-item>
              <el-form-item>
                <template #label>外扩<FieldHelp :text="help['outline.expand']" /></template>
                <el-input-number v-model="currentSpirit.outline.expand" controls-position="right" class="ctrl-full" />
              </el-form-item>
              <el-form-item label="颜色">
                <el-color-picker v-model="currentSpirit.outline.color" color-format="hex" />
                <span class="color-hex">{{ currentSpirit.outline.color }}</span>
              </el-form-item>
              <el-form-item label="不透明度">
                <el-input-number v-model="currentSpirit.outline.opacity" :min="0" :max="255" controls-position="right" class="ctrl-full" />
              </el-form-item>
              <el-form-item label="透明阈值">
                <el-input-number v-model="currentSpirit.outline.alphaThreshold" :min="0" :max="255" controls-position="right" class="ctrl-full" />
              </el-form-item>
            </div>

            <el-divider content-position="left">懒跟随</el-divider>
            <div class="form-grid">
              <el-form-item>
                <template #label>启用<FieldHelp :text="help['lazy.enabled']" /></template>
                <el-switch v-model="currentSpirit.lazy.enabled" />
              </el-form-item>
              <el-form-item>
                <template #label>待机等待帧<FieldHelp :text="help['lazy.idleAfterFrames']" /></template>
                <el-input-number v-model="currentSpirit.lazy.idleAfterFrames" :min="0" controls-position="right" class="ctrl-full" />
              </el-form-item>
              <el-form-item>
                <template #label>追赶距离<FieldHelp :text="help['lazy.catchUpTiles']" /></template>
                <el-input-number v-model="currentSpirit.lazy.catchUpTiles" :min="0.1" :step="0.1" controls-position="right" class="ctrl-full" />
              </el-form-item>
              <el-form-item>
                <template #label>追赶平滑<FieldHelp :text="help['lazy.catchUpLerp']" /></template>
                <el-input-number v-model="currentSpirit.lazy.catchUpLerp" :min="0" :step="0.01" controls-position="right" class="ctrl-full" />
              </el-form-item>
              <el-form-item>
                <template #label>待机环绕<FieldHelp :text="help['lazy.idleOrbit']" /></template>
                <el-switch v-model="currentSpirit.lazy.idleOrbit" />
              </el-form-item>
              <el-form-item>
                <template #label>环绕半径<FieldHelp :text="help['lazy.orbitRadius']" /></template>
                <div class="ctrl-with-btn">
                  <el-input-number v-model="currentSpirit.lazy.orbitRadius" :step="0.05" controls-position="right" class="ctrl-full" />
                  <el-button link type="primary" @click="currentSpirit.lazy.orbitRadius = null">用全局</el-button>
                </div>
              </el-form-item>
              <el-form-item>
                <template #label>环绕角速度<FieldHelp :text="help['lazy.orbitSpeed']" /></template>
                <div class="ctrl-with-btn">
                  <el-input-number v-model="currentSpirit.lazy.orbitSpeed" :step="0.005" controls-position="right" class="ctrl-full" />
                  <el-button link type="primary" @click="currentSpirit.lazy.orbitSpeed = null">用全局</el-button>
                </div>
              </el-form-item>
              <el-form-item>
                <template #label>跟随平滑<FieldHelp :text="help['lazy.followLerp']" /></template>
                <div class="ctrl-with-btn">
                  <el-input-number v-model="currentSpirit.lazy.followLerp" :step="0.01" controls-position="right" class="ctrl-full" />
                  <el-button link type="primary" @click="currentSpirit.lazy.followLerp = null">用全局</el-button>
                </div>
              </el-form-item>
            </div>

            <el-divider content-position="left">气泡对话</el-divider>
            <div class="form-grid">
              <el-form-item>
                <template #label>启用<FieldHelp :text="help['bubble.enabled']" /></template>
                <el-switch v-model="currentSpirit.bubble.enabled" />
              </el-form-item>
              <el-form-item>
                <template #label>主题<FieldHelp :text="help['bubble.theme']" /></template>
                <el-select v-model="currentSpirit.bubble.theme" class="ctrl-full">
                  <el-option label="黑底白字" value="dark" />
                  <el-option label="白底黑字" value="light" />
                </el-select>
              </el-form-item>
              <el-form-item>
                <template #label>透明度<FieldHelp :text="help['bubble.opacity']" /></template>
                <el-input-number v-model="currentSpirit.bubble.opacity" :min="0" :max="255" controls-position="right" class="ctrl-full" />
              </el-form-item>
              <el-form-item>
                <template #label>字号<FieldHelp :text="help['bubble.fontSize']" /></template>
                <el-input-number v-model="currentSpirit.bubble.fontSize" :min="10" :max="36" controls-position="right" class="ctrl-full" />
              </el-form-item>
              <el-form-item>
                <template #label>最大宽度<FieldHelp :text="help['bubble.width']" /></template>
                <el-input-number v-model="currentSpirit.bubble.width" :min="40" :max="480" :step="10" controls-position="right" class="ctrl-full" />
              </el-form-item>
              <el-form-item>
                <template #label>偏移 X<FieldHelp :text="help['bubble.offset']" /></template>
                <el-input-number v-model="currentSpirit.bubble.offsetX" controls-position="right" class="ctrl-full" />
              </el-form-item>
              <el-form-item>
                <template #label>偏移 Y<FieldHelp :text="help['bubble.offset']" /></template>
                <el-input-number v-model="currentSpirit.bubble.offsetY" controls-position="right" class="ctrl-full" />
              </el-form-item>
              <el-form-item>
                <template #label>显示帧数<FieldHelp :text="help['bubble.duration']" /></template>
                <el-input-number v-model="currentSpirit.bubble.duration" :min="1" controls-position="right" class="ctrl-full" />
              </el-form-item>
              <el-form-item>
                <template #label>淡出帧数<FieldHelp :text="help['bubble.fadeFrames']" /></template>
                <el-input-number v-model="currentSpirit.bubble.fadeFrames" :min="0" controls-position="right" class="ctrl-full" />
              </el-form-item>
              <el-form-item>
                <template #label>待机间隔帧<FieldHelp :text="help['bubble.idleInterval']" /></template>
                <el-input-number v-model="currentSpirit.bubble.idleInterval" :min="30" controls-position="right" class="ctrl-full" />
              </el-form-item>
              <el-form-item>
                <template #label>待机概率<FieldHelp :text="help['bubble.idleChance']" /></template>
                <el-input-number v-model="currentSpirit.bubble.idleChance" :min="0" :max="1" :step="0.05" controls-position="right" class="ctrl-full" />
              </el-form-item>
              <el-form-item class="span-2">
                <template #label>追赶台词<FieldHelp :text="help['bubble.onCatchUp']" /></template>
                <el-input
                  :model-value="catchUpLinesText"
                  type="textarea"
                  :rows="3"
                  placeholder="一行一句，例如：等等我呀~"
                  @update:model-value="onCatchUpLinesInput" />
              </el-form-item>
              <el-form-item class="span-2">
                <template #label>待机台词<FieldHelp :text="help['bubble.onIdle']" /></template>
                <el-input
                  :model-value="idleLinesText"
                  type="textarea"
                  :rows="3"
                  placeholder="一行一句"
                  @update:model-value="onIdleLinesInput" />
              </el-form-item>
            </div>

            <el-divider content-position="left">菜单附加按钮</el-divider>
            <div v-for="(act, ai) in currentSpirit.menuActions" :key="ai" class="menu-action-row">
              <el-input v-model="act.name" placeholder="显示名" />
              <el-input v-model="act.symbol" placeholder="符号" />
              <el-button type="danger" link @click="currentSpirit.menuActions.splice(ai, 1)">删</el-button>
            </div>
            <el-button size="small" @click="currentSpirit.menuActions.push({ name: '', symbol: '' })">添加按钮</el-button>
          </el-form>
        </div>
      </main>

      <!-- 精灵页浮层预览：可拖移 + 边缘缩放 -->
      <div
        v-if="tab === 'spirits' && currentSpirit"
        class="spirit-float-preview"
        :style="floatPreviewStyle"
        @pointerdown.stop>
        <div class="float-title" @pointerdown="onPreviewDragStart">
          <span>预览</span>
          <span class="float-tip">拖标题移动 · 拖边缘缩放</span>
        </div>
        <div class="float-body">
          <SpiritPreview
            :spirit="currentSpirit"
            :trails-lib="config.trails"
            :size="previewSize"
            :demo-move="previewDemoMove"
            :play-sfx="previewPlaySfx" />
        </div>
        <div class="resize-e" @pointerdown="onPreviewResizeStart($event, 'e')" />
        <div class="resize-s" @pointerdown="onPreviewResizeStart($event, 's')" />
        <div class="resize-se" @pointerdown="onPreviewResizeStart($event, 'se')" />
      </div>
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex'
import { CONTEXTMENU_SLOT } from '@/mixins/contextmenu'
import { useEditorData } from '@/composables/useEditorData'
import {
  createDefaultSpiritConfig,
  createEmptySpirit,
  createEmptyTrailEntry,
  migrateSpiritConfig,
  linesToText,
  textToLines,
  PARAM_ID_OPTIONS,
  TRAIT_TYPE_OPTIONS,
  SPIRIT_FIELD_HELP,
  SPIRIT_QUALITIES,
  SPIRIT_QUALITY_KEYS,
  qualityMeta,
  qualityEditorColor as resolveQualityEditorColor,
} from '@/utils/spiritDefaults'
import FieldHelp from '@/components/spirit/FieldHelp.vue'
import ImageAssetPicker from '@/components/spirit/ImageAssetPicker.vue'
import SpiritPreview from '@/components/spirit/SpiritPreview.vue'

const spiritStore = useEditorData({ fileName: 'SpiritCompanion' })

const PREVIEW_MIN = 160
const PREVIEW_MAX = 420
const PREVIEW_DEFAULT = 220

export default {
  name: 'SpiritCompanionEditor',
  components: { FieldHelp, ImageAssetPicker, SpiritPreview },
  mixins: [CONTEXTMENU_SLOT],
  data() {
    return {
      meta: { dataType: 'spiritCompanion' },
      tab: 'spirits',
      config: createDefaultSpiritConfig(),
      selectedTraitKey: '',
      selectedTrailKey: '',
      spiritIndex: 0,
      help: SPIRIT_FIELD_HELP,
      paramIds: PARAM_ID_OPTIONS,
      traitTypes: TRAIT_TYPE_OPTIONS,
      qualities: SPIRIT_QUALITIES,
      qualityKeys: SPIRIT_QUALITY_KEYS,
      ready: false,
      previewSize: PREVIEW_DEFAULT,
      previewLeft: null,
      previewTop: null,
      previewDemoMove: true,
      previewPlaySfx: false,
      _drag: null,
      _resize: null,
    }
  },
  computed: {
    ...mapState(['actors']),
    sideTitle() {
      const map = {
        global: '全局设定',
        traits: '特性库',
        trails: '拖尾库',
        spirits: '精灵列表',
      }
      return map[this.tab] || '精灵伴游'
    },
    traitKeys() {
      return Object.keys(this.config.traits || {})
    },
    trailKeys() {
      return Object.keys(this.config.trails || {})
    },
    currentTrait() {
      if (!this.selectedTraitKey) return null
      return this.config.traits[this.selectedTraitKey] || null
    },
    currentTrail() {
      if (!this.selectedTrailKey || !this.config.trails) return null
      return this.config.trails[this.selectedTrailKey] || null
    },
    sfxFramesText() {
      const t = this.currentTrail
      if (!t || !t.sfx || !Array.isArray(t.sfx.frames)) return ''
      return t.sfx.frames.join(',')
    },
    autoFarmTier: {
      get() {
        const t = this.currentTrait
        if (!t) return 'mid'
        if (!t.params) t.params = { tier: 'mid', cursorDelay: 8 }
        return t.params.tier || 'mid'
      },
      set(v) {
        const t = this.currentTrait
        if (!t) return
        if (!t.params) t.params = {}
        t.params.tier = v
      },
    },
    autoFarmCursorDelay: {
      get() {
        const t = this.currentTrait
        if (!t) return 8
        if (!t.params) t.params = { tier: 'mid', cursorDelay: 8 }
        if (t.params.cursorDelay == null) t.params.cursorDelay = t.params.tier === 'high' ? 0 : 8
        return t.params.cursorDelay
      },
      set(v) {
        const t = this.currentTrait
        if (!t) return
        if (!t.params) t.params = {}
        const n = Number(v)
        t.params.cursorDelay = Number.isNaN(n) ? 8 : Math.max(0, Math.min(60, Math.round(n)))
      },
    },
    currentSpirit() {
      if (!this.config.spirits || this.spiritIndex < 0) return null
      return this.config.spirits[this.spiritIndex] || null
    },
    catchUpLinesText() {
      const sp = this.currentSpirit
      return sp && sp.bubble ? linesToText(sp.bubble.onCatchUp) : ''
    },
    idleLinesText() {
      const sp = this.currentSpirit
      return sp && sp.bubble ? linesToText(sp.bubble.onIdle) : ''
    },
    floatPreviewStyle() {
      const size = this.previewSize
      const style = {
        width: `${size + 16}px`,
      }
      if (this.previewLeft != null && this.previewTop != null) {
        style.left = `${this.previewLeft}px`
        style.top = `${this.previewTop}px`
        style.right = 'auto'
        style.bottom = 'auto'
      }
      return style
    },
  },
  watch: {
    config: {
      deep: true,
      handler() {
        if (this.ready) this.changed = true
      },
    },
    '$route.meta.spiritTab': {
      immediate: true,
      handler(v) {
        if (v === 'global' || v === 'traits' || v === 'trails' || v === 'spirits') {
          this.tab = v
        }
      },
    },
  },
  methods: {
    qualityColor(key) {
      return qualityMeta(key).color
    },
    qualityEditorColor(key) {
      return resolveQualityEditorColor(key)
    },
    qualityLabel(key) {
      return qualityMeta(key).name
    },
    clampPreviewSize(n) {
      return Math.max(PREVIEW_MIN, Math.min(PREVIEW_MAX, Math.round(n)))
    },
    onPreviewDragStart(e) {
      if (e.button != null && e.button !== 0) return
      const el = e.currentTarget.closest('.spirit-float-preview')
      if (!el) return
      const rect = el.getBoundingClientRect()
      this._drag = {
        ox: e.clientX - rect.left,
        oy: e.clientY - rect.top,
      }
      if (this.previewLeft == null) {
        this.previewLeft = rect.left
        this.previewTop = rect.top
      }
      window.addEventListener('pointermove', this.onPreviewDragMove)
      window.addEventListener('pointerup', this.onPreviewDragEnd)
      e.preventDefault()
    },
    onPreviewDragMove(e) {
      if (!this._drag) return
      const w = this.previewSize + 16
      const h = this.previewSize + 44
      let left = e.clientX - this._drag.ox
      let top = e.clientY - this._drag.oy
      left = Math.max(0, Math.min(window.innerWidth - w, left))
      top = Math.max(0, Math.min(window.innerHeight - h, top))
      this.previewLeft = left
      this.previewTop = top
    },
    onPreviewDragEnd() {
      this._drag = null
      window.removeEventListener('pointermove', this.onPreviewDragMove)
      window.removeEventListener('pointerup', this.onPreviewDragEnd)
    },
    onPreviewResizeStart(e, edge) {
      if (e.button != null && e.button !== 0) return
      this._resize = {
        edge,
        startX: e.clientX,
        startY: e.clientY,
        startSize: this.previewSize,
      }
      window.addEventListener('pointermove', this.onPreviewResizeMove)
      window.addEventListener('pointerup', this.onPreviewResizeEnd)
      e.preventDefault()
      e.stopPropagation()
    },
    onPreviewResizeMove(e) {
      if (!this._resize) return
      const dx = e.clientX - this._resize.startX
      const dy = e.clientY - this._resize.startY
      let delta = 0
      if (this._resize.edge === 'e') delta = dx
      else if (this._resize.edge === 's') delta = dy
      else delta = Math.max(dx, dy)
      this.previewSize = this.clampPreviewSize(this._resize.startSize + delta)
    },
    onPreviewResizeEnd() {
      this._resize = null
      window.removeEventListener('pointermove', this.onPreviewResizeMove)
      window.removeEventListener('pointerup', this.onPreviewResizeEnd)
    },
    focusListRow(e) {
      if (e && e.currentTarget && e.currentTarget.focus) {
        e.currentTarget.focus()
      }
    },
    selectTrait(key, e) {
      this.selectedTraitKey = key
      this.focusListRow(e)
    },
    selectTrail(key, e) {
      this.selectedTrailKey = key
      this.focusListRow(e)
    },
    selectSpirit(i, e) {
      this.spiritIndex = i
      this.focusListRow(e)
    },
    trailModeLabel(entry) {
      if (!entry) return ''
      return entry.mode === 'tail' ? '尾巴' : '残影'
    },
    onCatchUpLinesInput(val) {
      if (!this.currentSpirit || !this.currentSpirit.bubble) return
      this.currentSpirit.bubble.onCatchUp = textToLines(val)
    },
    onIdleLinesInput(val) {
      if (!this.currentSpirit || !this.currentSpirit.bubble) return
      this.currentSpirit.bubble.onIdle = textToLines(val)
    },
    onSfxFramesInput(val) {
      const t = this.currentTrail
      if (!t || !t.sfx) return
      const parts = String(val || '')
        .split(/[,，\s]+/)
        .map((s) => s.trim())
        .filter(Boolean)
        .map((n) => Number(n))
        .filter((n) => !Number.isNaN(n) && n >= 0)
      t.sfx.frames = parts
    },
    $onSave() {
      if (!this.changed) return
      if (spiritStore.save(this.config)) {
        this.$message.success('保存成功（data/SpiritCompanion.json → $extraData.spiritCompanion）')
        this.changed = false
      } else {
        this.$message.error('保存失败')
      }
    },
    $onCopy() {
      if (this.tab === 'spirits' && this.currentSpirit) {
        this.$clipboard.set(JSON.stringify({ dataType: this.meta.dataType, data: this.currentSpirit }))
        this.$message.success('复制成功')
        return
      }
      if (this.tab === 'traits' && this.currentTrait) {
        this.$clipboard.set(JSON.stringify({
          dataType: this.meta.dataType + ':trait',
          key: this.selectedTraitKey,
          data: this.currentTrait,
        }))
        this.$message.success('复制成功')
        return
      }
      if (this.tab === 'trails' && this.currentTrail) {
        this.$clipboard.set(JSON.stringify({
          dataType: this.meta.dataType + ':trail',
          key: this.selectedTrailKey,
          data: this.currentTrail,
        }))
        this.$message.success('复制成功')
      }
    },
    $onPaste() {
      try {
        const text = this.$clipboard.get()
        if (!text) return
        const item = JSON.parse(text)
        if (this.tab === 'spirits' && item.dataType === this.meta.dataType && item.data && this.spiritIndex >= 0) {
          const actorId = this.currentSpirit.actorId
          const next = JSON.parse(JSON.stringify(item.data))
          next.actorId = actorId
          this.config.spirits.splice(this.spiritIndex, 1, next)
          this.$message.success('粘贴成功')
          return
        }
        if (this.tab === 'traits' && item.dataType === this.meta.dataType + ':trait' && item.data && this.selectedTraitKey) {
          this.config.traits[this.selectedTraitKey] = JSON.parse(JSON.stringify(item.data))
          this.$message.success('粘贴成功')
          return
        }
        if (this.tab === 'trails' && item.dataType === this.meta.dataType + ':trail' && item.data && this.selectedTrailKey) {
          this.config.trails[this.selectedTrailKey] = {
            ...createEmptyTrailEntry(),
            ...JSON.parse(JSON.stringify(item.data)),
            sfx: {
              ...createEmptyTrailEntry().sfx,
              ...(item.data.sfx || {}),
            },
            sprite: {
              ...createEmptyTrailEntry().sprite,
              ...(item.data.sprite || {}),
            },
          }
          this.$message.success('粘贴成功')
        }
      } catch (e) {
        console.log(e)
        this.$message.error('粘贴失败,无法解析粘贴内容')
      }
    },
    addTrait() {
      let key = 'trait' + Date.now().toString(36)
      this.config.traits[key] = {
        name: '新特性',
        desc: '',
        type: 'partyParam',
        paramId: 2,
        rate: 0.1,
      }
      this.selectedTraitKey = key
      if (this.$route.path !== '/extra/spirit/Traits') {
        this.$router.push('/extra/spirit/Traits')
      } else {
        this.tab = 'traits'
      }
    },
    removeTrait() {
      if (!this.selectedTraitKey) return
      delete this.config.traits[this.selectedTraitKey]
      this.selectedTraitKey = this.traitKeys[0] || ''
    },
    addTrail() {
      if (!this.config.trails) this.config.trails = {}
      let key = 'trail' + Date.now().toString(36)
      this.config.trails[key] = createEmptyTrailEntry()
      this.selectedTrailKey = key
      if (this.$route.path !== '/extra/spirit/Trails') {
        this.$router.push('/extra/spirit/Trails')
      } else {
        this.tab = 'trails'
      }
    },
    removeTrail() {
      if (!this.selectedTrailKey || !this.config.trails) return
      const key = this.selectedTrailKey
      delete this.config.trails[key]
      // 清理精灵上的引用
      if (Array.isArray(this.config.spirits)) {
        this.config.spirits.forEach((sp) => {
          if (sp && sp.trail && sp.trail.trailId === key) sp.trail.trailId = ''
        })
      }
      this.selectedTrailKey = this.trailKeys[0] || ''
    },
    addSpirit() {
      const id = (this.config.spirits.reduce((m, s) => Math.max(m, Number(s.actorId) || 0), 0) || 0) + 1
      this.config.spirits.push(createEmptySpirit(id))
      this.spiritIndex = this.config.spirits.length - 1
      if (this.$route.path !== '/extra/spirit/Spirits') {
        this.$router.push('/extra/spirit/Spirits')
      } else {
        this.tab = 'spirits'
      }
    },
    dupSpirit() {
      if (!this.currentSpirit) return
      const copy = JSON.parse(JSON.stringify(this.currentSpirit))
      copy.actorId = (Number(copy.actorId) || 1) + 1
      copy.name = (copy.name || '') + ' 副本'
      this.config.spirits.push(copy)
      this.spiritIndex = this.config.spirits.length - 1
    },
    removeSpirit() {
      if (this.spiritIndex < 0) return
      this.config.spirits.splice(this.spiritIndex, 1)
      this.spiritIndex = Math.min(this.spiritIndex, this.config.spirits.length - 1)
    },
  },
  beforeUnmount() {
    this.onPreviewDragEnd()
    this.onPreviewResizeEnd()
  },
  created() {
    this.$openLoading()
    let data = spiritStore.load()
    if (data == null || typeof data !== 'object' || Array.isArray(data)) {
      data = createDefaultSpiritConfig()
      spiritStore.save(data)
      this.$message.info('已生成默认 data/SpiritCompanion.json')
    }
    migrateSpiritConfig(data)
    if (!data.traits) data.traits = {}
    if (!data.trails) data.trails = {}
    if (!Array.isArray(data.spirits)) data.spirits = []
    if (data.version == null) data.version = 1
    this.config = data
    this.selectedTraitKey = Object.keys(this.config.traits)[0] || ''
    this.selectedTrailKey = Object.keys(this.config.trails)[0] || ''
    this.spiritIndex = this.config.spirits.length ? 0 : -1
    this.$nextTick(() => {
      this.ready = true
      this.changed = false
      this.$closeLoading()
    })
  },
}
</script>

<style scoped>
.spirit-page {
  height: 100%;
  box-sizing: border-box;
}
.spirit-layout {
  display: flex;
  height: 100%;
  min-height: 0;
  gap: 0;
}
.spirit-side {
  width: 240px;
  flex-shrink: 0;
  border-right: 1px solid var(--app-border);
  background: var(--app-surface-2);
  padding: 8px;
  overflow: auto;
}
.side-title {
  font-size: 14px;
  font-weight: 600;
  padding: 6px 8px 4px;
  color: var(--app-text, inherit);
}
.side-hint {
  margin: 8px;
  font-size: 12px;
  color: var(--el-text-color-secondary, #909399);
  line-height: 1.5;
}
.list-panel {
  margin-top: 8px;
}
.list-actions {
  display: flex;
  gap: 6px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}
.item-ul {
  list-style: none;
  margin: 0;
  padding: 0;
}
.item-ul li {
  padding: 8px 10px;
  cursor: pointer;
  border-radius: 4px;
  font-size: 13px;
  outline: none;
}
.item-ul li:hover,
.item-ul li.active {
  background: var(--app-hover-bg);
  color: var(--app-active-color);
}
.item-ul li:focus {
  box-shadow: inset 0 0 0 1px var(--app-active-color);
}
.spirit-main {
  flex: 1;
  overflow: auto;
  padding: 12px 16px;
  background: var(--app-surface);
  min-width: 0;
}
.spirit-form {
  max-width: none;
}
.spirit-form.dense .form-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  column-gap: 16px;
  row-gap: 2px;
  align-items: start;
}
.spirit-form.dense .form-grid > .el-form-item {
  margin-bottom: 12px;
}
.spirit-form.dense .form-grid > .full {
  grid-column: 1 / -1;
}
.spirit-form.dense .form-grid > .span-2 {
  grid-column: span 2;
}
.spirit-form.dense .ctrl-full {
  width: 100%;
}
.spirit-form.dense :deep(.el-input-number.ctrl-full) {
  width: 100%;
}
.spirit-form.dense :deep(.el-select.ctrl-full) {
  width: 100%;
}
.form-grid.is-disabled {
  opacity: 0.45;
  pointer-events: none;
}
.trail-lib-hint {
  font-size: 12px;
  color: var(--el-text-color-secondary, #909399);
}
.ctrl-with-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
}
.ctrl-with-btn .ctrl-full {
  flex: 1;
  min-width: 0;
}
@media (max-width: 1100px) {
  .spirit-form.dense .form-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
.q-tag {
  margin-left: 4px;
  opacity: 0.85;
  font-size: 12px;
}
.q-opt {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.q-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-block;
  border: 1px solid rgba(0, 0, 0, 0.25);
  box-sizing: border-box;
}
.q-dot.is-normal {
  border-color: #909399;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.06);
}
.spirit-float-preview {
  position: fixed;
  right: 16px;
  bottom: 16px;
  z-index: 40;
  background: var(--app-surface-2, #1e1e1e);
  border: 1px solid var(--app-border, #414243);
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
  padding: 0 8px 8px;
  user-select: none;
  box-sizing: border-box;
}
.float-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  height: 32px;
  cursor: move;
  font-size: 13px;
  font-weight: 600;
  padding: 0 4px;
}
.float-tip {
  font-size: 11px;
  font-weight: 400;
  color: var(--app-text-muted, #909399);
}
.float-body {
  display: flex;
  justify-content: center;
}
.resize-e,
.resize-s,
.resize-se {
  position: absolute;
  z-index: 2;
}
.resize-e {
  top: 32px;
  right: 0;
  width: 8px;
  bottom: 8px;
  cursor: ew-resize;
}
.resize-s {
  left: 0;
  right: 8px;
  bottom: 0;
  height: 8px;
  cursor: ns-resize;
}
.resize-se {
  right: 0;
  bottom: 0;
  width: 14px;
  height: 14px;
  cursor: nwse-resize;
}
.ml8 {
  margin-left: 8px;
}
.menu-action-row {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}
.color-hex {
  margin-left: 10px;
  font-size: 13px;
  color: var(--app-text-muted);
  vertical-align: middle;
}
</style>
