<template>
  <div v-if="modelValue" class="anim-editor">
    <el-form size="small" label-width="88px" @submit.prevent>
      <el-form-item label="名称">
        <el-input v-model="modelValue.name" style="width: 220px" />
      </el-form-item>
      <el-form-item label="格式">
        <el-tag size="small" :type="isMz ? 'success' : 'warning'">
          {{ isMz ? 'MZ (Effekseer)' : 'MV 帧表（兼容）' }}
        </el-tag>
        <el-button v-if="!isMz" size="small" class="ml" @click="convertToMzStub">转为 MZ 空壳</el-button>
      </el-form-item>
    </el-form>

    <!-- MZ Effekseer -->
    <div v-if="isMz" class="anim-mz">
      <div class="anim-mz-main">
        <el-form size="small" label-width="88px" class="anim-mz-form">
          <el-form-item label="效果">
            <el-select
              v-model="modelValue.effectName"
              filterable
              clearable
              allow-create
              default-first-option
              placeholder="effects/*.efkefc"
              style="width: 200px">
              <el-option v-for="n in effectNames" :key="n" :label="n" :value="n" />
            </el-select>
            <el-button size="small" @click="refreshEffects">刷新</el-button>
          </el-form-item>
          <el-form-item label="显示类型">
            <el-select v-model="modelValue.displayType" style="width: 140px">
              <el-option :value="0" label="居中" />
              <el-option :value="1" label="脚底" />
              <el-option :value="2" label="头顶" />
              <el-option :value="3" label="画面" />
            </el-select>
          </el-form-item>
          <el-form-item label="缩放">
            <el-input-number v-model="modelValue.scale" :min="1" :max="999" controls-position="right" />
          </el-form-item>
          <el-form-item label="速度">
            <el-input-number v-model="modelValue.speed" :min="1" :max="999" controls-position="right" />
          </el-form-item>
          <el-form-item label="偏移 X">
            <el-input-number v-model="modelValue.offsetX" controls-position="right" />
          </el-form-item>
          <el-form-item label="偏移 Y">
            <el-input-number v-model="modelValue.offsetY" controls-position="right" />
          </el-form-item>
          <el-form-item label="旋转 X">
            <el-input-number v-model="rotationProxy.x" controls-position="right" />
          </el-form-item>
          <el-form-item label="旋转 Y">
            <el-input-number v-model="rotationProxy.y" controls-position="right" />
          </el-form-item>
          <el-form-item label="旋转 Z">
            <el-input-number v-model="rotationProxy.z" controls-position="right" />
          </el-form-item>
        </el-form>
        <effekseer-preview
          :effect-name="modelValue.effectName || ''"
          :scale="modelValue.scale || 100"
          :speed="modelValue.speed || 100"
          :offset-x="modelValue.offsetX || 0"
          :offset-y="modelValue.offsetY || 0"
          :rotation="modelValue.rotation || { x: 0, y: 0, z: 0 }" />
      </div>

      <el-divider content-position="left">闪烁时机</el-divider>
      <div class="timing-tools">
        <el-button size="small" @click="addFlashTiming">添加</el-button>
      </div>
      <el-table :data="flashTimings" size="small" max-height="180">
        <el-table-column label="帧" width="90">
          <template #default="{ row }">
            <el-input-number v-model="row.frame" :min="0" size="small" controls-position="right" />
          </template>
        </el-table-column>
        <el-table-column label="范围" width="110">
          <template #default="{ row }">
            <el-select v-model="row.scope" size="small">
              <el-option :value="1" label="目标" />
              <el-option :value="2" label="画面" />
              <el-option :value="3" label="消除" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="时长" width="90">
          <template #default="{ row }">
            <el-input-number v-model="row.duration" :min="1" size="small" controls-position="right" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="70">
          <template #default="{ $index }">
            <el-button link type="danger" size="small" @click="flashTimings.splice($index, 1)">删</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-divider content-position="left">SE 时机</el-divider>
      <div class="timing-tools">
        <el-button size="small" @click="addSoundTiming">添加</el-button>
      </div>
      <el-table :data="soundTimings" size="small" max-height="180">
        <el-table-column label="帧" width="90">
          <template #default="{ row }">
            <el-input-number v-model="row.frame" :min="0" size="small" controls-position="right" />
          </template>
        </el-table-column>
        <el-table-column label="SE" min-width="160">
          <template #default="{ row }">
            <picker-input-field
              :model-value="(row.se && row.se.name) || ''"
              empty-text="（无）"
              width="140px"
              @pick="pickSeFor(row)" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="70">
          <template #default="{ $index }">
            <el-button link type="danger" size="small" @click="soundTimings.splice($index, 1)">删</el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- MV 帧兼容 -->
    <div v-else class="anim-mv">
      <div class="mv-top">
        <db-group-box title="基本设置" class="mv-basic">
          <el-form size="small" label-width="72px" @submit.prevent>
            <el-form-item label="名称">
              <el-input v-model="modelValue.name" style="width: 200px" />
            </el-form-item>
            <el-form-item label="图像1">
              <picker-input-field
                :model-value="modelValue.animation1Name || ''"
                empty-text="（无）"
                width="220px"
                @pick="pickAnimImage(1)" />
            </el-form-item>
            <el-form-item label="图像2">
              <picker-input-field
                :model-value="modelValue.animation2Name || ''"
                empty-text="（无）"
                width="220px"
                @pick="pickAnimImage(2)" />
            </el-form-item>
            <el-form-item label="位置">
              <el-select v-model="modelValue.position" style="width: 100px">
                <el-option :value="0" label="头上" />
                <el-option :value="1" label="中心" />
                <el-option :value="2" label="脚底" />
                <el-option :value="3" label="画面" />
              </el-select>
            </el-form-item>
            <el-form-item label="最大帧数">
              <el-input-number :model-value="frames.length" :min="1" :max="100" :controls="false" class="max-fr" />
              <el-button size="small" @click="promptMaxFrames">…</el-button>
            </el-form-item>
          </el-form>
        </db-group-box>
        <db-group-box title="SE 和闪光的时机" class="mv-timings-box">
          <div class="timing-tools">
            <el-button size="small" @click="addMvTiming">添加</el-button>
            <el-button size="small" :disabled="timingSel < 0" @click="removeMvTiming">删除</el-button>
          </div>
          <el-table
            :data="mvTimings"
            size="small"
            max-height="180"
            highlight-current-row
            @current-change="onTimingCurrent"
            @row-dblclick="editMvTiming">
            <el-table-column label="No." width="56">
              <template #default="{ row }">#{{ String((row.frame || 0) + 1).padStart(3, '0') }}</template>
            </el-table-column>
            <el-table-column label="SE" min-width="100" show-overflow-tooltip>
              <template #default="{ row }">{{ (row.se && row.se.name) || '' }}</template>
            </el-table-column>
            <el-table-column label="闪光" min-width="140" show-overflow-tooltip>
              <template #default="{ row }">{{ flashText(row) }}</template>
            </el-table-column>
          </el-table>
        </db-group-box>
      </div>

      <db-group-box title="帧" class="mt">
        <div class="mv-frame-row">
          <div class="mv-frame-list">
            <el-scrollbar :max-height="previewH + 80">
              <!-- MV：帧数+1，最后一项为 ---- -->
              <div
                v-for="i in frames.length + 1"
                :key="i - 1"
                class="mv-frame-item"
                :class="{
                  active: i - 1 === frameIndex && i - 1 < frames.length,
                  'is-end': i - 1 >= frames.length,
                }"
                @click="onFrameListClick(i - 1)">
                {{ i - 1 < frames.length ? '#' + String(i).padStart(3, '0') : '----' }}
              </div>
            </el-scrollbar>
          </div>
          <div class="mv-preview-col" :style="{ width: previewW + 'px' }">
            <div class="mv-preview-wrap" :style="{ width: previewW + 'px', height: previewH + 'px' }">
              <canvas
                v-show="!playing"
                ref="mvCanvas"
                :width="previewW"
                :height="previewH"
                class="mv-canvas"
                @pointerdown="onPreviewPointerDown"
                @dblclick="onPreviewDblClick"
                @contextmenu.prevent="onPreviewContextMenu" />
              <img
                v-show="playing"
                class="mv-canvas mv-play-img"
                :src="playFrameSrc"
                alt=""
                :width="previewW"
                :height="previewH" />
              <div v-if="!playing && cellCoordText" class="mv-coord-badge">{{ cellCoordText }}</div>
            </div>
            <div
              v-if="hasAnimSheet"
              class="mv-ribbon-wrap"
              :style="{ width: previewW + 'px' }">
              <canvas
                ref="patternRibbon"
                class="mv-ribbon"
                @click="onPatternRibbonClick" />
            </div>
          </div>
          <div class="mv-side-tools">
            <el-button size="small" @click="openChangeTarget">更改目标…</el-button>
            <el-button size="small" :disabled="frameIndex <= 0 || playing" @click="copyPrevFrame">继承上帧</el-button>
            <el-button size="small" :disabled="playing || frames.length < 2" @click="openTweenDlg">补间…</el-button>
            <el-button size="small" :disabled="playing" @click="openBatchDlg">批量设置…</el-button>
            <el-button size="small" :disabled="playing" @click="openMoveDlg">移动…</el-button>
            <el-button size="small" type="primary" :disabled="playing" @click="playMvPreview">播放</el-button>
            <el-button size="small" :disabled="!playing" @click="stopPlay">停止</el-button>
            <el-divider />
            <div class="cell-tools">单元格</div>
            <el-button size="small" @click="addCell">添加格</el-button>
          </div>
          <div class="mv-cells">
            <el-table
              ref="cellTable"
              :data="currentCells"
              size="small"
              :max-height="previewH"
              highlight-current-row
              @current-change="onCellCurrent"
              @row-click="onCellRow">
              <el-table-column label="模式" width="70">
                <template #default="{ row }">
                  <el-input-number
                    :model-value="patternToUi(row[0])"
                    size="small"
                    controls-position="right"
                    @update:model-value="(v) => (row[0] = patternFromUi(v))" />
                </template>
              </el-table-column>
              <el-table-column label="X" width="64">
                <template #default="{ row }">
                  <el-input-number v-model="row[1]" size="small" controls-position="right" />
                </template>
              </el-table-column>
              <el-table-column label="Y" width="64">
                <template #default="{ row }">
                  <el-input-number v-model="row[2]" size="small" controls-position="right" />
                </template>
              </el-table-column>
              <el-table-column label="缩放" width="64">
                <template #default="{ row }">
                  <el-input-number v-model="row[3]" size="small" controls-position="right" />
                </template>
              </el-table-column>
              <el-table-column label="旋转" width="64">
                <template #default="{ row }">
                  <el-input-number v-model="row[4]" size="small" controls-position="right" />
                </template>
              </el-table-column>
              <el-table-column label="镜" width="50">
                <template #default="{ row }">
                  <el-checkbox :model-value="!!row[5]" @update:model-value="(v) => (row[5] = v ? 1 : 0)" />
                </template>
              </el-table-column>
              <el-table-column label="不透明" width="70">
                <template #default="{ row }">
                  <el-input-number v-model="row[6]" :min="0" :max="255" size="small" controls-position="right" />
                </template>
              </el-table-column>
              <el-table-column label="" width="48">
                <template #default="{ $index }">
                  <el-button
                    link
                    type="danger"
                    size="small"
                    @click="selectCell($index); cellDelete()">删</el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </div>
      </db-group-box>
    </div>

    <el-dialog
      v-model="timingDlg"
      title="SE 和闪光定时"
      width="480px"
      append-to-body
      :close-on-click-modal="false">
      <div v-if="timingDraft" class="timing-dlg">
        <div class="timing-row">
          <span class="timing-label">帧</span>
          <el-input-number
            :model-value="(timingDraft.frame || 0) + 1"
            :min="1"
            :max="Math.max(1, frames.length)"
            controls-position="right"
            @update:model-value="(v) => (timingDraft.frame = Math.max(0, (Number(v) || 1) - 1))" />
        </div>
        <div class="timing-row">
          <span class="timing-label">SE</span>
          <picker-input-field
            :model-value="(timingDraft.se && timingDraft.se.name) || ''"
            empty-text="（无）"
            width="260px"
            @pick="pickSeFor(timingDraft)" />
        </div>
        <el-divider content-position="left">闪光</el-divider>
        <el-radio-group v-model="timingDraft.flashScope" class="flash-scope">
          <el-radio :value="0">无</el-radio>
          <el-radio :value="1">目标</el-radio>
          <el-radio :value="2">画面</el-radio>
          <el-radio :value="3">隐藏目标</el-radio>
        </el-radio-group>
        <div class="flash-color-block" :class="{ 'is-disabled': !flashColorEditable && !flashDurationEditable }">
          <div class="flash-sliders">
            <div v-for="(lab, i) in flashColorLabels" :key="lab" class="flash-slider-row">
              <span class="timing-label">{{ lab }}</span>
              <el-slider
                v-model="timingDraft.flashColor[i]"
                :min="0"
                :max="255"
                :disabled="!flashColorEditable"
                :show-tooltip="false"
                style="flex: 1; margin: 0 10px" />
              <el-input-number
                v-model="timingDraft.flashColor[i]"
                :min="0"
                :max="255"
                :disabled="!flashColorEditable"
                size="small"
                controls-position="right"
                class="flash-num" />
            </div>
            <div class="flash-slider-row">
              <span class="timing-label">持续时间</span>
              <el-input-number
                v-model="timingDraft.flashDuration"
                :min="1"
                :max="200"
                :disabled="!flashDurationEditable"
                size="small"
                controls-position="right"
                class="flash-num" />
            </div>
          </div>
          <div
            class="flash-swatch"
            :class="{ 'is-muted': !flashColorEditable }"
            :style="{ background: flashColorEditable ? flashPreviewCss : '#e5e5e5' }" />
        </div>
      </div>
      <template #footer>
        <el-button @click="timingDlg = false">取消</el-button>
        <el-button type="primary" @click="confirmTiming">确定</el-button>
      </template>
    </el-dialog>

    <!-- 补间 -->
    <el-dialog v-model="tweenDlg" title="补间" width="420px" append-to-body :close-on-click-modal="false">
      <div v-if="tweenDraft" class="range-dlg">
        <db-group-box title="范围">
          <div class="range-row">
            <span class="timing-label">帧</span>
            <el-input-number v-model="tweenDraft.frameFrom" :min="1" :max="frames.length" controls-position="right" class="range-num" />
            <span>~</span>
            <el-input-number v-model="tweenDraft.frameTo" :min="1" :max="frames.length" controls-position="right" class="range-num" />
          </div>
          <div class="range-row">
            <span class="timing-label">元件</span>
            <el-input-number v-model="tweenDraft.cellFrom" :min="1" :max="16" controls-position="right" class="range-num" />
            <span>~</span>
            <el-input-number v-model="tweenDraft.cellTo" :min="1" :max="16" controls-position="right" class="range-num" />
          </div>
        </db-group-box>
        <db-group-box title="数据" class="mt">
          <div class="prop-grid">
            <el-checkbox v-for="p in cellPropDefs" :key="p.key" v-model="tweenDraft.props[p.key]">{{ p.label }}</el-checkbox>
          </div>
        </db-group-box>
      </div>
      <template #footer>
        <el-button @click="tweenDlg = false">取消</el-button>
        <el-button type="primary" @click="confirmTween">确定</el-button>
      </template>
    </el-dialog>

    <!-- 批量设置 -->
    <el-dialog v-model="batchDlg" title="批量" width="480px" append-to-body :close-on-click-modal="false">
      <div v-if="batchDraft" class="range-dlg">
        <db-group-box title="范围">
          <div class="range-row">
            <span class="timing-label">帧</span>
            <el-input-number v-model="batchDraft.frameFrom" :min="1" :max="frames.length" controls-position="right" class="range-num" />
            <span>~</span>
            <el-input-number v-model="batchDraft.frameTo" :min="1" :max="frames.length" controls-position="right" class="range-num" />
          </div>
          <div class="range-row">
            <span class="timing-label">元件</span>
            <el-input-number v-model="batchDraft.cellFrom" :min="1" :max="16" controls-position="right" class="range-num" />
            <span>~</span>
            <el-input-number v-model="batchDraft.cellTo" :min="1" :max="16" controls-position="right" class="range-num" />
          </div>
        </db-group-box>
        <db-group-box title="数据" class="mt">
          <div class="batch-grid">
            <div v-for="p in cellPropDefs" :key="p.key" class="batch-item">
              <el-checkbox v-model="batchDraft.enable[p.key]">{{ p.label }}</el-checkbox>
              <el-select
                v-if="p.key === 'mirror' || p.key === 'blend'"
                v-model="batchDraft.values[p.key]"
                :disabled="!batchDraft.enable[p.key]"
                size="small"
                class="batch-val">
                <el-option v-for="o in p.options" :key="o.value" :label="o.label" :value="o.value" />
              </el-select>
              <el-input-number
                v-else-if="p.key === 'pattern'"
                :model-value="patternToUi(batchDraft.values.pattern)"
                :min="1"
                :disabled="!batchDraft.enable.pattern"
                size="small"
                controls-position="right"
                class="batch-val"
                @update:model-value="(v) => (batchDraft.values.pattern = patternFromUi(v))" />
              <el-input-number
                v-else
                v-model="batchDraft.values[p.key]"
                :disabled="!batchDraft.enable[p.key]"
                size="small"
                controls-position="right"
                class="batch-val" />
            </div>
          </div>
        </db-group-box>
      </div>
      <template #footer>
        <el-button @click="batchDlg = false">取消</el-button>
        <el-button type="primary" @click="confirmBatch">确定</el-button>
      </template>
    </el-dialog>

    <!-- 移动 -->
    <el-dialog v-model="moveDlg" title="移动" width="360px" append-to-body :close-on-click-modal="false">
      <div v-if="moveDraft" class="range-dlg">
        <db-group-box title="范围">
          <div class="range-row">
            <span class="timing-label">帧</span>
            <el-input-number v-model="moveDraft.frameFrom" :min="1" :max="frames.length" controls-position="right" class="range-num" />
            <span>~</span>
            <el-input-number v-model="moveDraft.frameTo" :min="1" :max="frames.length" controls-position="right" class="range-num" />
          </div>
          <div class="range-row">
            <span class="timing-label">元件</span>
            <el-input-number v-model="moveDraft.cellFrom" :min="1" :max="16" controls-position="right" class="range-num" />
            <span>~</span>
            <el-input-number v-model="moveDraft.cellTo" :min="1" :max="16" controls-position="right" class="range-num" />
          </div>
        </db-group-box>
        <db-group-box title="偏移" class="mt">
          <div class="range-row">
            <span class="timing-label">X</span>
            <el-input-number v-model="moveDraft.dx" controls-position="right" class="range-num" />
          </div>
          <div class="range-row">
            <span class="timing-label">Y</span>
            <el-input-number v-model="moveDraft.dy" controls-position="right" class="range-num" />
          </div>
        </db-group-box>
      </div>
      <template #footer>
        <el-button @click="moveDlg = false">取消</el-button>
        <el-button type="primary" @click="confirmMove">确定</el-button>
      </template>
    </el-dialog>

    <audio-file-picker-dialog
      v-model="sePickerVisible"
      folder="se"
      :model-name="sePickerName"
      :model-volume="sePickerVolume"
      :model-pitch="sePickerPitch"
      :model-pan="sePickerPan"
      @confirm="onSePicked" />

    <battler-picker-dialog
      v-model="animImgPickerVisible"
      folder="animations"
      :model-name="animImgPickerName"
      :model-hue="animImgPickerHue"
      :show-hue="true"
      @confirm="onAnimImagePicked" />

    <battler-picker-dialog
      v-model="targetPickerVisible"
      folder="enemies"
      :model-name="targetBattlerName"
      :model-hue="targetBattlerHue"
      :show-hue="true"
      @confirm="onTargetBattlerPicked" />

    <popup-context-menu
      menu-class="anim-cell-ctx"
      :visible="cellMenu.visible"
      :x="cellMenu.x"
      :y="cellMenu.y"
      @update:visible="(v) => (cellMenu.visible = v)">
      <template #default="{ action }">
        <li @click="action(cellNew)">
          <span>新建</span><span class="sc">Ctrl+N</span>
        </li>
        <li :class="{ disabled: cellSel < 0 }" @click="action(cellEdit)">
          <span>编辑...</span><span class="sc">Return</span>
        </li>
        <li class="sep" />
        <li :class="{ disabled: cellSel < 0 }" @click="action(cellCut)">
          <span>剪切</span><span class="sc">Ctrl+X</span>
        </li>
        <li :class="{ disabled: cellSel < 0 }" @click="action(cellCopy)">
          <span>复制</span><span class="sc">Ctrl+C</span>
        </li>
        <li :class="{ disabled: !hasCellClipboard }" @click="action(cellPaste)">
          <span>粘贴</span><span class="sc">Ctrl+V</span>
        </li>
        <li :class="{ disabled: cellSel < 0 }" @click="action(cellDelete)">
          <span>删除</span><span class="sc">Del</span>
        </li>
        <li class="sep" />
        <li :class="{ disabled: !canCellUndo }" @click="action(cellUndo)">
          <span>撤销</span><span class="sc">Ctrl+Z</span>
        </li>
        <li :class="{ disabled: !canCellRedo }" @click="action(cellRedo)">
          <span>重做</span><span class="sc">Ctrl+Y</span>
        </li>
        <li class="sep" />
        <li :class="{ disabled: !canCellMoveUp }" @click="action(cellMoveUp)">
          <span>向上</span><span class="sc">PgUp</span>
        </li>
        <li :class="{ disabled: !canCellMoveDown }" @click="action(cellMoveDown)">
          <span>向下</span><span class="sc">PgDown</span>
        </li>
      </template>
    </popup-context-menu>

    <!-- 元件属性 -->
    <el-dialog
      v-model="cellEditDlg"
      title="元件属性"
      width="560px"
      append-to-body
      :close-on-click-modal="false"
      @closed="cellEditDraft = null">
      <db-group-box v-if="cellEditDraft" title="元件属性">
        <div class="cell-props-grid">
          <div class="cell-prop">
            <span class="cell-prop-lab">模式</span>
            <el-input-number
              :model-value="patternToUi(cellEditDraft[0])"
              :min="1"
              controls-position="right"
              class="cell-prop-num"
              @update:model-value="(v) => (cellEditDraft[0] = patternFromUi(v))" />
          </div>
          <div class="cell-prop">
            <span class="cell-prop-lab">横轴</span>
            <el-input-number v-model="cellEditDraft[1]" controls-position="right" class="cell-prop-num" />
          </div>
          <div class="cell-prop">
            <span class="cell-prop-lab">纵轴</span>
            <el-input-number v-model="cellEditDraft[2]" controls-position="right" class="cell-prop-num" />
          </div>
          <div class="cell-prop">
            <span class="cell-prop-lab">缩放率</span>
            <el-input-number v-model="cellEditDraft[3]" controls-position="right" class="cell-prop-num" />
            <span class="cell-prop-unit">%</span>
          </div>
          <div class="cell-prop">
            <span class="cell-prop-lab">旋转</span>
            <el-input-number v-model="cellEditDraft[4]" controls-position="right" class="cell-prop-num" />
          </div>
          <div class="cell-prop">
            <span class="cell-prop-lab">镜像</span>
            <el-select v-model="cellEditDraft[5]" class="cell-prop-sel">
              <el-option :value="0" label="否" />
              <el-option :value="1" label="是" />
            </el-select>
          </div>
          <div class="cell-prop">
            <span class="cell-prop-lab">不透明度</span>
            <el-input-number v-model="cellEditDraft[6]" :min="0" :max="255" controls-position="right" class="cell-prop-num" />
          </div>
          <div class="cell-prop">
            <span class="cell-prop-lab">合成</span>
            <el-select v-model="cellEditDraft[7]" class="cell-prop-sel">
              <el-option :value="0" label="正常" />
              <el-option :value="1" label="叠加" />
              <el-option :value="2" label="正片叠底" />
              <el-option :value="3" label="滤色" />
            </el-select>
          </div>
        </div>
      </db-group-box>
      <template #footer>
        <el-button @click="cellEditDlg = false">取消</el-button>
        <el-button type="primary" @click="confirmCellEdit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script>
import { defineAsyncComponent, markRaw } from 'vue'
import {
  listEffectNames,
  imageAbsPath,
  loadImageFile,
  resolveBattlerAbsPath,
} from '@/utils/imgAssets'
import DbGroupBox from './shared/DbGroupBox.vue'
import PickerInputField from './shared/PickerInputField.vue'
import PopupContextMenu from '@/components/shared/PopupContextMenu.vue'
import AudioFilePickerDialog from '@/components/map/pickers/AudioFilePickerDialog.vue'
import BattlerPickerDialog from '@/components/map/pickers/BattlerPickerDialog.vue'
import { animationPaintMethods, ANIM_PREVIEW_W, ANIM_PREVIEW_H } from '@/utils/animation/paint'
import { loadSystem } from './shared/systemLookups'
import DataManager from '@/utils/DataManager'

const CELL_PROP_DEFS = [
  { key: 'pattern', label: '模式', index: 0 },
  { key: 'x', label: '横轴', index: 1 },
  { key: 'y', label: '纵轴', index: 2 },
  { key: 'scale', label: '缩放率', index: 3 },
  { key: 'rotation', label: '旋转', index: 4 },
  {
    key: 'mirror',
    label: '镜像',
    index: 5,
    options: [
      { label: '否', value: 0 },
      { label: '是', value: 1 },
    ],
  },
  { key: 'opacity', label: '不透明度', index: 6 },
  {
    key: 'blend',
    label: '合成',
    index: 7,
    options: [
      { label: '普通', value: 0 },
      { label: '叠加', value: 1 },
      { label: '正片叠底', value: 2 },
      { label: '滤色', value: 3 },
    ],
  },
]

function emptyCell() {
  return [-1, 0, 0, 100, 0, 0, 255, 0]
}

function defaultNewCell() {
  return [0, 0, 0, 100, 0, 0, 255, 0]
}

function cloneCells(cells) {
  return JSON.parse(JSON.stringify(Array.isArray(cells) ? cells : []))
}

const UNDO_MAX = 40

function ensureCellSlot(frame, cellIndex) {
  if (!Array.isArray(frame)) return null
  while (frame.length <= cellIndex) frame.push(emptyCell())
  if (!Array.isArray(frame[cellIndex])) frame[cellIndex] = emptyCell()
  while (frame[cellIndex].length < 8) frame[cellIndex].push(0)
  return frame[cellIndex]
}

function lerpNum(a, b, t) {
  return Math.round(a + (b - a) * t)
}

/** MV 优先：有 frames 数组一律按 MV，避免 displayType:0 空壳误挂 Effekseer 导致 STATUS_BREAKPOINT */
function isMzAnimation(rec) {
  if (!rec) return false
  if (Array.isArray(rec.frames)) return false
  if (rec.animation1Name || rec.animation2Name) return false
  if (Array.isArray(rec.timings) && rec.timings.length > 0) return false
  if (rec.effectName) return true
  if (typeof rec.displayType === 'number') return true
  if (Array.isArray(rec.flashTimings) && rec.flashTimings.length) return true
  if (Array.isArray(rec.soundTimings) && rec.soundTimings.length) return true
  return false
}

function ensureMzShape(rec) {
  if (!rec.rotation) rec.rotation = { x: 0, y: 0, z: 0 }
  if (rec.scale == null) rec.scale = 100
  if (rec.speed == null) rec.speed = 100
  if (rec.offsetX == null) rec.offsetX = 0
  if (rec.offsetY == null) rec.offsetY = 0
  if (rec.displayType == null) rec.displayType = 0
  if (!Array.isArray(rec.flashTimings)) rec.flashTimings = []
  if (!Array.isArray(rec.soundTimings)) rec.soundTimings = []
  if (rec.effectName == null) rec.effectName = ''
}

function ensureMvShape(rec) {
  // 注意：勿在 length===0 时重建，computed 里调用会触发无限更新
  if (!Array.isArray(rec.frames)) {
    rec.frames = Array.from({ length: 10 }, () => [])
  }
  if (!Array.isArray(rec.timings)) rec.timings = []
  if (rec.animation1Name == null) rec.animation1Name = ''
  if (rec.animation2Name == null) rec.animation2Name = ''
  if (rec.animation1Hue == null) rec.animation1Hue = 0
  if (rec.animation2Hue == null) rec.animation2Hue = 0
  if (rec.position == null) rec.position = 1
}

export default {
  name: 'AnimationEditorPanel',
  components: {
    // 异步加载，MV 条目不拉 Effekseer/WebGL
    EffekseerPreview: defineAsyncComponent(() => import('./EffekseerPreview.vue')),
    DbGroupBox,
    PickerInputField,
    PopupContextMenu,
    AudioFilePickerDialog,
    BattlerPickerDialog,
  },
  props: {
    modelValue: { type: Object, default: null },
  },
  emits: ['update:modelValue'],
  data() {
    return {
      effectNames: [],
      frameIndex: 0,
      cellSel: -1,
      sePickerVisible: false,
      seTarget: null,
      sePickerName: '',
      sePickerVolume: 90,
      sePickerPitch: 100,
      sePickerPan: 0,
      animImgPickerVisible: false,
      animImgTarget: 1,
      animImgPickerName: '',
      animImgPickerHue: 0,
      targetPickerVisible: false,
      targetBattlerName: '',
      targetBattlerHue: 0,
      timingSel: -1,
      timingDlg: false,
      timingDraft: null,
      timingEditIndex: -1,
      tweenDlg: false,
      tweenDraft: null,
      batchDlg: false,
      batchDraft: null,
      moveDlg: false,
      moveDraft: null,
      playing: false,
      playFrameSrc: '',
      showTarget: true,
      ribbonSelPattern: -1,
      previewW: ANIM_PREVIEW_W,
      previewH: ANIM_PREVIEW_H,
      cellPropDefs: CELL_PROP_DEFS,
      cellMenu: { visible: false, x: 0, y: 0 },
      cellEditDlg: false,
      cellEditDraft: null,
      cellEditIndex: -1,
      hasCellClipboard: false,
      canCellUndo: false,
      canCellRedo: false,
    }
  },
  created() {
    // Image / timer / offscreen canvas 禁止进 data()
    this._img1 = null
    this._img2 = null
    this._targetImg = null
    this._targetHue = 0
    this._playTimer = 0
    this._playGen = 0
    this._paintScheduled = false
    this._ctx2d = null
    this._playUrls = []
    this._previewSeList = []
    this._ribbonPatterns = []
    this._ribbonCell = 48
    this._cellDrag = null
    this._cellLayouts = []
    this._cellClipboard = null
    this._undoStack = []
    this._redoStack = []
  },
  mounted() {
    this._onCellKeyDown = (e) => this.onCellKeyDown(e)
    window.addEventListener('keydown', this._onCellKeyDown, true)
  },
  computed: {
    isMz() {
      return isMzAnimation(this.modelValue)
    },
    rotationProxy() {
      const rec = this.modelValue
      if (!rec) return { x: 0, y: 0, z: 0 }
      if (!rec.rotation) rec.rotation = { x: 0, y: 0, z: 0 }
      return rec.rotation
    },
    flashTimings() {
      if (!this.modelValue || !Array.isArray(this.modelValue.flashTimings)) return []
      return this.modelValue.flashTimings
    },
    soundTimings() {
      if (!this.modelValue || !Array.isArray(this.modelValue.soundTimings)) return []
      return this.modelValue.soundTimings
    },
    frames() {
      if (!this.modelValue) return []
      return Array.isArray(this.modelValue.frames) ? this.modelValue.frames : []
    },
    currentCells() {
      const f = this.frames[this.frameIndex]
      return Array.isArray(f) ? f : []
    },
    mvTimings() {
      if (!this.modelValue || !Array.isArray(this.modelValue.timings)) return []
      return this.modelValue.timings
    },
    hasAnimSheet() {
      return !!(this.modelValue && (this.modelValue.animation1Name || this.modelValue.animation2Name))
    },
    flashColorLabels() {
      return ['红', '绿', '蓝', '强度']
    },
    flashPreviewCss() {
      const c = (this.timingDraft && this.timingDraft.flashColor) || [255, 255, 255, 255]
      const a = Math.max(0, Math.min(1, (Number(c[3]) || 0) / 255))
      return `rgba(${Number(c[0]) || 0},${Number(c[1]) || 0},${Number(c[2]) || 0},${a})`
    },
    /** 目标/画面可改颜色；隐藏目标/无不可改颜色 */
    flashColorEditable() {
      const s = this.timingDraft && Number(this.timingDraft.flashScope)
      return s === 1 || s === 2
    },
    /** 无：不可改；其余可改持续时间 */
    flashDurationEditable() {
      const s = this.timingDraft && Number(this.timingDraft.flashScope)
      return s === 1 || s === 2 || s === 3
    },
    /** 选中单元格相对中心的 (x,y) */
    cellCoordText() {
      if (this.cellSel < 0) return ''
      const cell = this.currentCells[this.cellSel]
      if (!cell || !Array.isArray(cell)) return ''
      const fmt = (n) => {
        const v = Number(n) || 0
        return Number.isInteger(v) ? String(v) : String(Math.round(v * 10) / 10)
      }
      return `(${fmt(cell[1])},${fmt(cell[2])})`
    },
    canCellMoveUp() {
      const n = this.currentCells.length
      return this.cellSel >= 0 && this.cellSel < n - 1
    },
    canCellMoveDown() {
      return this.cellSel > 0
    },
    anyLocalDialogOpen() {
      return !!(
        this.cellEditDlg ||
        this.timingDlg ||
        this.tweenDlg ||
        this.batchDlg ||
        this.moveDlg ||
        this.sePickerVisible ||
        this.animImgPickerVisible ||
        this.targetPickerVisible
      )
    },
  },
  watch: {
    modelValue: {
      immediate: true,
      handler(v) {
        if (!v) return
        if (isMzAnimation(v)) ensureMzShape(v)
        else ensureMvShape(v)
        this.stopPlay()
        this.frameIndex = 0
        this.cellSel = -1
        this.clearCellHistory()
        this.refreshEffects()
        this.syncTargetFromSystem()
        this.$nextTick(() => {
          Promise.all([this.loadMvImages(), this.loadTargetBattler()]).then(() => this.schedulePaint())
        })
      },
    },
    frameIndex() {
      this.cellSel = -1
      if (!this.playing) this.schedulePaint()
    },
    'modelValue.animation1Name'() {
      this.loadMvImages().then(() => this.schedulePaint())
    },
    'modelValue.animation2Name'() {
      this.loadMvImages().then(() => this.schedulePaint())
    },
    'modelValue.animation1Hue'() {
      this.schedulePaint()
    },
    'modelValue.animation2Hue'() {
      this.schedulePaint()
    },
    'modelValue.position'() {
      this.schedulePaint()
    },
    currentCells: {
      deep: true,
      handler() {
        if (!this.playing) this.schedulePaint()
      },
    },
  },
  methods: {
    ...animationPaintMethods,
    refreshEffects() {
      this.effectNames = listEffectNames()
    },
    convertToMzStub() {
      if (!this.modelValue) return
      if (!window.confirm('将清空 MV 帧数据并改为 MZ Effekseer 结构，继续？')) return
      const id = this.modelValue.id
      const name = this.modelValue.name
      Object.keys(this.modelValue).forEach((k) => {
        if (k !== 'id' && k !== 'name') delete this.modelValue[k]
      })
      this.modelValue.id = id
      this.modelValue.name = name
      ensureMzShape(this.modelValue)
    },
    addFlashTiming() {
      if (!this.modelValue) return
      if (!Array.isArray(this.modelValue.flashTimings)) this.modelValue.flashTimings = []
      this.modelValue.flashTimings.push({
        frame: 0,
        scope: 1,
        color: [255, 255, 255, 255],
        duration: 5,
      })
    },
    addSoundTiming() {
      if (!this.modelValue) return
      if (!Array.isArray(this.modelValue.soundTimings)) this.modelValue.soundTimings = []
      this.modelValue.soundTimings.push({
        frame: 0,
        se: { name: '', volume: 90, pitch: 100, pan: 0 },
      })
    },
    pickSeFor(row) {
      this.seTarget = row
      if (row && !row.se) row.se = { name: '', volume: 90, pitch: 100, pan: 0 }
      const se = row.se || {}
      this.sePickerName = se.name || ''
      this.sePickerVolume = Number.isFinite(se.volume) ? se.volume : 90
      this.sePickerPitch = Number.isFinite(se.pitch) ? se.pitch : 100
      this.sePickerPan = Number.isFinite(se.pan) ? se.pan : 0
      this.sePickerVisible = true
    },
    onSePicked(audio) {
      if (!this.seTarget) return
      const obj = audio && typeof audio === 'object'
        ? audio
        : { name: audio || '', volume: 90, pitch: 100, pan: 0 }
      const name = obj.name || ''
      if (!name) {
        this.seTarget.se = null
        return
      }
      this.seTarget.se = {
        name,
        volume: Number.isFinite(obj.volume) ? obj.volume : 90,
        pitch: Number.isFinite(obj.pitch) ? obj.pitch : 100,
        pan: Number.isFinite(obj.pan) ? obj.pan : 0,
      }
    },
    promptMaxFrames() {
      const cur = this.frames.length
      const input = window.prompt('最大帧数 (1–100)', String(cur))
      if (input == null) return
      const n = Math.max(1, Math.min(100, parseInt(input, 10) || cur))
      if (n === cur) return
      if (n < cur) {
        if (!window.confirm(`将删除第 ${n + 1}～${cur} 帧，继续？`)) return
        this.modelValue.frames.length = n
      } else {
        while (this.modelValue.frames.length < n) this.modelValue.frames.push([])
      }
      this.frameIndex = Math.min(this.frameIndex, n - 1)
    },
    addCell() {
      this.cellNew()
    },
    /** UI 1-based ↔ 存储 0-based（引擎 / JSON） */
    patternToUi(stored) {
      const n = Number(stored)
      if (!Number.isFinite(n) || n < 0) return 0
      return n + 1
    },
    patternFromUi(ui) {
      const n = Number(ui)
      if (!Number.isFinite(n) || n <= 0) return -1
      return Math.max(0, Math.round(n) - 1)
    },
    /** 帧列表：0..N-1 真帧；N 为 ---- 仅展示不选中 */
    onFrameListClick(i) {
      if (i < 0 || i >= this.frames.length) return
      this.frameIndex = i
    },
    ensureFrameCells() {
      if (!this.modelValue || !Array.isArray(this.modelValue.frames)) return null
      let f = this.modelValue.frames[this.frameIndex]
      if (!Array.isArray(f)) {
        f = []
        this.modelValue.frames[this.frameIndex] = f
      }
      return f
    },
    clearCellHistory() {
      this._undoStack = []
      this._redoStack = []
      this.syncUndoFlags()
    },
    syncUndoFlags() {
      this.canCellUndo = (this._undoStack || []).length > 0
      this.canCellRedo = (this._redoStack || []).length > 0
      this.hasCellClipboard = !!(this._cellClipboard && Array.isArray(this._cellClipboard))
    },
    snapshotCurrentFrame() {
      return {
        frameIndex: this.frameIndex,
        cells: cloneCells(this.currentCells),
        cellSel: this.cellSel,
      }
    },
    applyFrameSnapshot(snap) {
      if (!snap || !this.modelValue || !Array.isArray(this.modelValue.frames)) return
      this.frameIndex = snap.frameIndex
      this.modelValue.frames[snap.frameIndex] = cloneCells(snap.cells)
      const n = (this.modelValue.frames[snap.frameIndex] || []).length
      this.selectCell(Math.min(snap.cellSel, n - 1))
    },
    pushUndo() {
      if (!this._undoStack) this._undoStack = []
      this._undoStack.push(this.snapshotCurrentFrame())
      if (this._undoStack.length > UNDO_MAX) this._undoStack.shift()
      this._redoStack = []
      this.syncUndoFlags()
    },
    cellUndo() {
      if (!this._undoStack || !this._undoStack.length) return
      if (!this._redoStack) this._redoStack = []
      this._redoStack.push(this.snapshotCurrentFrame())
      const snap = this._undoStack.pop()
      this.applyFrameSnapshot(snap)
      this.syncUndoFlags()
      this.schedulePaint()
    },
    cellRedo() {
      if (!this._redoStack || !this._redoStack.length) return
      if (!this._undoStack) this._undoStack = []
      this._undoStack.push(this.snapshotCurrentFrame())
      const snap = this._redoStack.pop()
      this.applyFrameSnapshot(snap)
      this.syncUndoFlags()
      this.schedulePaint()
    },
    cellNew() {
      if (this.playing || this.isMz) return
      const f = this.ensureFrameCells()
      if (!f) return
      this.pushUndo()
      f.push(defaultNewCell())
      this.selectCell(f.length - 1)
      this.schedulePaint()
    },
    cellEdit() {
      if (this.cellSel < 0 || this.playing || this.isMz) return
      const cell = this.currentCells[this.cellSel]
      if (!cell || !Array.isArray(cell)) return
      const draft = cell.slice()
      while (draft.length < 8) draft.push(0)
      this.cellEditDraft = draft
      this.cellEditIndex = this.cellSel
      this.cellEditDlg = true
    },
    confirmCellEdit() {
      if (!this.cellEditDraft || this.cellEditIndex < 0) {
        this.cellEditDlg = false
        return
      }
      const f = this.ensureFrameCells()
      if (!f || !f[this.cellEditIndex]) {
        this.cellEditDlg = false
        return
      }
      this.pushUndo()
      const d = this.cellEditDraft
      f[this.cellEditIndex] = [
        Number(d[0]) || 0,
        Number(d[1]) || 0,
        Number(d[2]) || 0,
        Number(d[3]) || 100,
        Number(d[4]) || 0,
        d[5] ? 1 : 0,
        Number.isFinite(Number(d[6])) ? Number(d[6]) : 255,
        Number(d[7]) || 0,
      ]
      this.selectCell(this.cellEditIndex)
      this.cellEditDlg = false
      this.schedulePaint()
    },
    cellCopy() {
      if (this.cellSel < 0) return
      const cell = this.currentCells[this.cellSel]
      if (!cell) return
      this._cellClipboard = cell.slice()
      while (this._cellClipboard.length < 8) this._cellClipboard.push(0)
      this.syncUndoFlags()
    },
    cellCut() {
      if (this.cellSel < 0) return
      this.cellCopy()
      this.cellDelete()
    },
    cellPaste() {
      if (!this._cellClipboard || this.playing || this.isMz) return
      const f = this.ensureFrameCells()
      if (!f) return
      this.pushUndo()
      const insertAt = this.cellSel >= 0 ? this.cellSel + 1 : f.length
      f.splice(insertAt, 0, this._cellClipboard.slice())
      this.selectCell(insertAt)
      this.schedulePaint()
    },
    cellDelete() {
      if (this.cellSel < 0 || this.playing || this.isMz) return
      const f = this.ensureFrameCells()
      if (!f || !f.length) return
      this.pushUndo()
      const idx = this.cellSel
      f.splice(idx, 1)
      if (!f.length) this.selectCell(-1)
      else this.selectCell(Math.min(idx, f.length - 1))
      this.schedulePaint()
    },
    cellMoveUp() {
      if (!this.canCellMoveUp || this.playing) return
      const f = this.ensureFrameCells()
      if (!f) return
      const i = this.cellSel
      this.pushUndo()
      const tmp = f[i]
      f[i] = f[i + 1]
      f[i + 1] = tmp
      this.selectCell(i + 1)
      this.schedulePaint()
    },
    cellMoveDown() {
      if (!this.canCellMoveDown || this.playing) return
      const f = this.ensureFrameCells()
      if (!f) return
      const i = this.cellSel
      this.pushUndo()
      const tmp = f[i]
      f[i] = f[i - 1]
      f[i - 1] = tmp
      this.selectCell(i - 1)
      this.schedulePaint()
    },
    onCellRow() {
      this.schedulePaint()
    },
    onCellCurrent(row) {
      this.cellSel = row ? this.currentCells.indexOf(row) : -1
      if (this.cellSel >= 0 && this.currentCells[this.cellSel]) {
        this.ribbonSelPattern = Number(this.currentCells[this.cellSel][0])
      }
      this.schedulePaint()
    },
    selectCell(index) {
      this.cellSel = index
      const row = index >= 0 ? this.currentCells[index] : null
      if (row) this.ribbonSelPattern = Number(row[0])
      this.$nextTick(() => {
        const table = this.$refs.cellTable
        if (table && typeof table.setCurrentRow === 'function') {
          table.setCurrentRow(row || undefined)
        }
      })
      this.schedulePaint()
    },
    previewCanvasPoint(e) {
      const canvas = this.$refs.mvCanvas
      if (!canvas) return null
      const rect = canvas.getBoundingClientRect()
      if (!rect.width || !rect.height) return null
      const scaleX = canvas.width / rect.width
      const scaleY = canvas.height / rect.height
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      }
    },
    onPreviewContextMenu(e) {
      if (this.playing || this.isMz) return
      const pt = this.previewCanvasPoint(e)
      if (pt) {
        const hit = this.hitTestCellAt(pt.x, pt.y)
        if (hit >= 0) this.selectCell(hit)
        else this.selectCell(-1)
      }
      this.cellMenu = { visible: true, x: e.clientX, y: e.clientY }
    },
    onPreviewDblClick(e) {
      if (this.playing || this.isMz) return
      const pt = this.previewCanvasPoint(e)
      if (!pt) return
      const hit = this.hitTestCellAt(pt.x, pt.y)
      if (hit < 0) return
      this.selectCell(hit)
      this.cellEdit()
    },
    onPreviewPointerDown(e) {
      if (this.playing || e.button !== 0) return
      this.cellMenu.visible = false
      const pt = this.previewCanvasPoint(e)
      if (!pt) return
      const hit = this.hitTestCellAt(pt.x, pt.y)
      if (hit < 0) {
        this.selectCell(-1)
        return
      }
      this.selectCell(hit)
      const cell = this.currentCells[hit]
      if (!cell) return
      this._cellDrag = {
        index: hit,
        startX: e.clientX,
        startY: e.clientY,
        origX: Number(cell[1]) || 0,
        origY: Number(cell[2]) || 0,
        undoSnap: this.snapshotCurrentFrame(),
        moved: false,
      }
      try {
        e.currentTarget.setPointerCapture?.(e.pointerId)
      } catch (err) {
        /* ignore */
      }
      window.addEventListener('pointermove', this.onPreviewPointerMove)
      window.addEventListener('pointerup', this.onPreviewPointerUp)
      window.addEventListener('pointercancel', this.onPreviewPointerUp)
      e.preventDefault()
    },
    onPreviewPointerMove(e) {
      if (!this._cellDrag) return
      const canvas = this.$refs.mvCanvas
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const scaleX = canvas.width / Math.max(1, rect.width)
      const scaleY = canvas.height / Math.max(1, rect.height)
      const dx = (e.clientX - this._cellDrag.startX) * scaleX
      const dy = (e.clientY - this._cellDrag.startY) * scaleY
      const cell = this.currentCells[this._cellDrag.index]
      if (!cell) return
      const nx = Math.round(this._cellDrag.origX + dx)
      const ny = Math.round(this._cellDrag.origY + dy)
      if (nx !== this._cellDrag.origX || ny !== this._cellDrag.origY) this._cellDrag.moved = true
      cell[1] = nx
      cell[2] = ny
      this.schedulePaint()
    },
    onPreviewPointerUp() {
      if (!this._cellDrag) return
      if (this._cellDrag.moved && this._cellDrag.undoSnap) {
        if (!this._undoStack) this._undoStack = []
        this._undoStack.push(this._cellDrag.undoSnap)
        if (this._undoStack.length > UNDO_MAX) this._undoStack.shift()
        this._redoStack = []
        this.syncUndoFlags()
      }
      this._cellDrag = null
      window.removeEventListener('pointermove', this.onPreviewPointerMove)
      window.removeEventListener('pointerup', this.onPreviewPointerUp)
      window.removeEventListener('pointercancel', this.onPreviewPointerUp)
    },
    isEditableTarget(el) {
      if (!el || !el.closest) return false
      const node = el.closest('input, textarea, select, [contenteditable="true"], .el-input, .el-textarea, .el-select')
      return !!node
    },
    onCellKeyDown(e) {
      if (this.isMz || this.playing) return
      if (!this.modelValue || !Array.isArray(this.modelValue.frames)) return
      if (this.cellEditDlg) {
        if (e.key === 'Escape') {
          e.preventDefault()
          this.cellEditDlg = false
        }
        return
      }
      if (this.anyLocalDialogOpen()) return
      if (this.isEditableTarget(e.target)) return
      const ctrl = e.ctrlKey || e.metaKey
      const key = e.key
      let handled = false
      if (ctrl && !e.shiftKey && (key === 'n' || key === 'N')) {
        this.cellNew()
        handled = true
      } else if (ctrl && !e.shiftKey && (key === 'x' || key === 'X')) {
        this.cellCut()
        handled = true
      } else if (ctrl && !e.shiftKey && (key === 'c' || key === 'C')) {
        this.cellCopy()
        handled = true
      } else if (ctrl && !e.shiftKey && (key === 'v' || key === 'V')) {
        this.cellPaste()
        handled = true
      } else if (ctrl && !e.shiftKey && (key === 'z' || key === 'Z')) {
        this.cellUndo()
        handled = true
      } else if (ctrl && (key === 'y' || key === 'Y' || (e.shiftKey && (key === 'z' || key === 'Z')))) {
        this.cellRedo()
        handled = true
      } else if (key === 'Enter' && this.cellSel >= 0) {
        this.cellEdit()
        handled = true
      } else if (key === 'Delete' && this.cellSel >= 0) {
        this.cellDelete()
        handled = true
      } else if (key === 'PageUp') {
        this.cellMoveUp()
        handled = true
      } else if (key === 'PageDown') {
        this.cellMoveDown()
        handled = true
      }
      if (handled) e.preventDefault()
    },
    pickAnimImage(which) {
      this.animImgTarget = which
      if (which === 1) {
        this.animImgPickerName = this.modelValue.animation1Name || ''
        this.animImgPickerHue = this.modelValue.animation1Hue || 0
      } else {
        this.animImgPickerName = this.modelValue.animation2Name || ''
        this.animImgPickerHue = this.modelValue.animation2Hue || 0
      }
      this.animImgPickerVisible = true
    },
    onAnimImagePicked({ name, hue }) {
      if (this.animImgTarget === 1) {
        this.modelValue.animation1Name = name || ''
        this.modelValue.animation1Hue = hue || 0
      } else {
        this.modelValue.animation2Name = name || ''
        this.modelValue.animation2Hue = hue || 0
      }
    },
    syncTargetFromSystem() {
      const sys = loadSystem()
      this.targetBattlerName = sys.battlerName || ''
      this.targetBattlerHue = Number(sys.battlerHue) || 0
      this._targetHue = this.targetBattlerHue
    },
    openChangeTarget() {
      this.syncTargetFromSystem()
      this.targetPickerVisible = true
    },
    onTargetBattlerPicked({ name, hue }) {
      const sys = loadSystem()
      sys.battlerName = name || ''
      sys.battlerHue = hue || 0
      if (!DataManager.$saveDataSync('System', sys)) {
        this.$message.error('保存 System.json 失败')
        return
      }
      this.targetBattlerName = sys.battlerName
      this.targetBattlerHue = sys.battlerHue
      this._targetHue = sys.battlerHue
      this.showTarget = true
      this.loadTargetBattler().then(() => this.schedulePaint())
      this.$message.success('已更新预览目标（System.battlerName）')
    },
    async loadTargetBattler() {
      this._targetImg = null
      const name = this.targetBattlerName
      if (!name) return
      const abs = resolveBattlerAbsPath(name, 'enemies')
      const img = await loadImageFile(abs)
      this._targetImg = img ? markRaw(img) : null
      this._targetHue = this.targetBattlerHue || 0
    },
    flashText(row) {
      if (!row || !row.flashScope) return ''
      const scope = { 1: '目标', 2: '画面', 3: '隐藏目标' }[row.flashScope] || ''
      const c = row.flashColor || [255, 255, 255, 255]
      return `${scope}(${c.join(',')}), ${row.flashDuration || 0}帧`
    },
    onTimingCurrent(row) {
      this.timingSel = row ? this.mvTimings.indexOf(row) : -1
    },
    addMvTiming() {
      this.timingEditIndex = -1
      this.timingDraft = {
        frame: this.frameIndex,
        se: { name: '', volume: 90, pitch: 100, pan: 0 },
        flashScope: 0,
        flashColor: [255, 255, 255, 255],
        flashDuration: 5,
      }
      this.timingDlg = true
    },
    editMvTiming(row) {
      this.timingEditIndex = this.mvTimings.indexOf(row)
      const se = row.se ? { ...row.se } : null
      this.timingDraft = {
        frame: row.frame || 0,
        se,
        flashScope: row.flashScope || 0,
        flashColor: (row.flashColor || [255, 255, 255, 255]).slice(),
        flashDuration: row.flashDuration || 5,
      }
      this.timingDlg = true
    },
    removeMvTiming() {
      if (this.timingSel < 0) return
      this.mvTimings.splice(this.timingSel, 1)
      this.timingSel = -1
    },
    clearSe() {
      if (this.timingDraft) this.timingDraft.se = null
    },
    confirmTiming() {
      const t = {
        frame: this.timingDraft.frame || 0,
        se: this.timingDraft.se && this.timingDraft.se.name ? { ...this.timingDraft.se } : null,
        flashScope: this.timingDraft.flashScope || 0,
        flashColor: (this.timingDraft.flashColor || [255, 255, 255, 255]).slice(),
        flashDuration: this.timingDraft.flashDuration || 5,
      }
      if (this.timingEditIndex >= 0) this.mvTimings[this.timingEditIndex] = t
      else this.mvTimings.push(t)
      this.timingDlg = false
    },
    copyPrevFrame() {
      if (this.frameIndex <= 0) return
      const prev = this.frames[this.frameIndex - 1] || []
      this.frames[this.frameIndex] = JSON.parse(JSON.stringify(prev))
      this.paintMvFrame()
    },
    defaultRangeDraft() {
      const n = Math.max(1, this.frames.length)
      return {
        frameFrom: 1,
        frameTo: n,
        cellFrom: 1,
        cellTo: 16,
      }
    },
    normalizeRange(draft) {
      const n = Math.max(1, this.frames.length)
      let f0 = Math.max(1, Math.min(n, Number(draft.frameFrom) || 1))
      let f1 = Math.max(1, Math.min(n, Number(draft.frameTo) || 1))
      if (f0 > f1) [f0, f1] = [f1, f0]
      let c0 = Math.max(1, Math.min(16, Number(draft.cellFrom) || 1))
      let c1 = Math.max(1, Math.min(16, Number(draft.cellTo) || 1))
      if (c0 > c1) [c0, c1] = [c1, c0]
      return { frameFrom: f0 - 1, frameTo: f1 - 1, cellFrom: c0 - 1, cellTo: c1 - 1 }
    },
    openTweenDlg() {
      const r = this.defaultRangeDraft()
      const props = {}
      CELL_PROP_DEFS.forEach((p) => {
        props[p.key] = true
      })
      this.tweenDraft = { ...r, props }
      this.tweenDlg = true
    },
    confirmTween() {
      if (!this.tweenDraft || !this.modelValue) return
      const { frameFrom, frameTo, cellFrom, cellTo } = this.normalizeRange(this.tweenDraft)
      if (frameTo - frameFrom < 1) {
        this.$message.warning('补间至少需要 2 帧')
        return
      }
      const props = this.tweenDraft.props || {}
      const startFrame = this.frames[frameFrom]
      const endFrame = this.frames[frameTo]
      if (!Array.isArray(startFrame) || !Array.isArray(endFrame)) return
      for (let c = cellFrom; c <= cellTo; c++) {
        const a = ensureCellSlot(startFrame, c)
        const b = ensureCellSlot(endFrame, c)
        if (!a || !b) continue
        for (let f = frameFrom + 1; f < frameTo; f++) {
          let frame = this.frames[f]
          if (!Array.isArray(frame)) {
            frame = []
            this.frames[f] = frame
          }
          const cell = ensureCellSlot(frame, c)
          const t = (f - frameFrom) / (frameTo - frameFrom)
          for (const p of CELL_PROP_DEFS) {
            if (!props[p.key]) continue
            const i = p.index
            if (p.key === 'mirror' || p.key === 'blend') {
              cell[i] = t < 0.5 ? a[i] : b[i]
            } else {
              cell[i] = lerpNum(Number(a[i]) || 0, Number(b[i]) || 0, t)
            }
          }
        }
      }
      this.tweenDlg = false
      this.schedulePaint()
    },
    openBatchDlg() {
      const r = this.defaultRangeDraft()
      const enable = {}
      const values = {
        pattern: 0,
        x: 0,
        y: 0,
        scale: 100,
        rotation: 0,
        mirror: 0,
        opacity: 255,
        blend: 0,
      }
      CELL_PROP_DEFS.forEach((p) => {
        enable[p.key] = false
      })
      this.batchDraft = { ...r, enable, values }
      this.batchDlg = true
    },
    confirmBatch() {
      if (!this.batchDraft || !this.modelValue) return
      const { frameFrom, frameTo, cellFrom, cellTo } = this.normalizeRange(this.batchDraft)
      const enable = this.batchDraft.enable || {}
      const values = this.batchDraft.values || {}
      for (let f = frameFrom; f <= frameTo; f++) {
        let frame = this.frames[f]
        if (!Array.isArray(frame)) {
          frame = []
          this.frames[f] = frame
        }
        for (let c = cellFrom; c <= cellTo; c++) {
          const cell = ensureCellSlot(frame, c)
          for (const p of CELL_PROP_DEFS) {
            if (!enable[p.key]) continue
            cell[p.index] = values[p.key]
          }
        }
      }
      this.batchDlg = false
      this.schedulePaint()
    },
    openMoveDlg() {
      this.moveDraft = { ...this.defaultRangeDraft(), dx: 0, dy: 0 }
      this.moveDlg = true
    },
    confirmMove() {
      if (!this.moveDraft || !this.modelValue) return
      const { frameFrom, frameTo, cellFrom, cellTo } = this.normalizeRange(this.moveDraft)
      const dx = Number(this.moveDraft.dx) || 0
      const dy = Number(this.moveDraft.dy) || 0
      if (!dx && !dy) {
        this.moveDlg = false
        return
      }
      for (let f = frameFrom; f <= frameTo; f++) {
        const frame = this.frames[f]
        if (!Array.isArray(frame)) continue
        for (let c = cellFrom; c <= cellTo; c++) {
          if (!frame[c] || !Array.isArray(frame[c])) continue
          if (Number(frame[c][0]) < 0) continue
          frame[c][1] = (Number(frame[c][1]) || 0) + dx
          frame[c][2] = (Number(frame[c][2]) || 0) + dy
        }
      }
      this.moveDlg = false
      this.schedulePaint()
    },
    async loadMvImages() {
      this._img1 = null
      this._img2 = null
      if (!this.modelValue) return
      if (this.modelValue.animation1Name) {
        const img = await loadImageFile(imageAbsPath('animations', this.modelValue.animation1Name))
        this._img1 = img ? markRaw(img) : null
      }
      if (this.modelValue.animation2Name) {
        const img = await loadImageFile(imageAbsPath('animations', this.modelValue.animation2Name))
        this._img2 = img ? markRaw(img) : null
      }
    },
  },
  beforeUnmount() {
    if (this._onCellKeyDown) {
      window.removeEventListener('keydown', this._onCellKeyDown, true)
      this._onCellKeyDown = null
    }
    this.onPreviewPointerUp()
    this.stopPlay()
    this._img1 = null
    this._img2 = null
    this._targetImg = null
    this._ctx2d = null
    this._playUrls = []
    this._previewSeList = []
    this._cellLayouts = []
    this._undoStack = []
    this._redoStack = []
    this._cellClipboard = null
  },
}
</script>

<style scoped>
.anim-editor {
  width: 100%;
  max-width: 1280px;
}
.anim-mz-main {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  align-items: flex-start;
}
.anim-mz-form {
  flex: 1;
  min-width: 280px;
}
.ml {
  margin-left: 8px;
}
.mt {
  margin-top: 10px;
}
.timing-tools {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.mv-top {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}
.mv-basic {
  flex: 1;
  min-width: 280px;
}
.mv-timings-box {
  flex: 1;
  min-width: 280px;
}
.max-fr {
  width: 72px;
}
.mv-frame-row {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: flex-start;
}
.mv-frame-list {
  width: 72px;
}
.mv-frame-item {
  padding: 4px 6px;
  cursor: pointer;
  font-size: 12px;
  border: 1px solid var(--app-border);
  margin-bottom: 2px;
  text-align: center;
}
.mv-frame-item.active {
  background: var(--el-color-primary-light-7, #c6e2ff);
}
.mv-frame-item.is-end {
  color: var(--app-text-muted, #909399);
  cursor: default;
  opacity: 0.85;
}
.mv-preview-col {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex-shrink: 0;
}
.mv-preview-wrap {
  position: relative;
}
.mv-canvas {
  border: 1px solid var(--app-border);
  background: #1a2744;
  display: block;
  cursor: crosshair;
  touch-action: none;
}
.mv-play-img {
  object-fit: contain;
  image-rendering: pixelated;
}
.mv-coord-badge {
  position: absolute;
  right: 8px;
  bottom: 6px;
  padding: 1px 8px;
  font-size: 12px;
  line-height: 18px;
  color: #e8f0ff;
  background: rgba(0, 0, 0, 0.55);
  border-radius: 3px;
  pointer-events: none;
  font-variant-numeric: tabular-nums;
  font-family: Consolas, 'Courier New', monospace;
}
.mv-ribbon-wrap {
  position: relative;
  /* 96 格高 + 滚动条带，避免条叠在图上 */
  height: 110px;
  box-sizing: border-box;
  overflow-x: auto;
  overflow-y: hidden;
  border: 1px solid var(--app-border);
  background: #f0f0f0;
  scrollbar-gutter: stable;
}
.mv-ribbon-wrap::-webkit-scrollbar {
  height: 12px;
}
.mv-ribbon-wrap::-webkit-scrollbar-track {
  background: #e4e4e4;
}
.mv-ribbon-wrap::-webkit-scrollbar-thumb {
  background: #b0b0b0;
  border-radius: 6px;
}
.mv-ribbon {
  display: block;
  height: 96px;
  width: max-content;
  cursor: pointer;
  image-rendering: pixelated;
  vertical-align: top;
}
.mv-side-tools {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 110px;
}
.cell-tools {
  font-size: 12px;
  color: var(--app-text-muted);
}
.mv-cells {
  flex: 1;
  min-width: 320px;
}
.c4 {
  width: 72px;
  margin-right: 4px;
}
.timing-dlg {
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.timing-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.timing-label {
  width: 64px;
  flex-shrink: 0;
  font-size: 13px;
  color: var(--app-text, #303133);
}
.flash-scope {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 12px;
  margin-bottom: 4px;
}
.flash-color-block {
  display: flex;
  gap: 12px;
  align-items: stretch;
}
.flash-sliders {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.flash-slider-row {
  display: flex;
  align-items: center;
  gap: 4px;
}
.flash-num {
  width: 88px;
}
.flash-swatch {
  width: 72px;
  flex-shrink: 0;
  border: 1px solid var(--app-border, #dcdfe6);
  border-radius: 4px;
  background: #fff;
}
.flash-swatch.is-muted {
  opacity: 0.45;
}
.flash-color-block.is-disabled {
  opacity: 0.7;
}
.range-dlg {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.range-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.range-num {
  width: 96px;
}
.prop-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px 12px;
}
.batch-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px 16px;
}
.batch-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.batch-val {
  width: 100%;
}
.cell-props-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px 10px;
}
.cell-prop {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}
.cell-prop-lab {
  font-size: 12px;
  color: var(--app-text-muted, #909399);
}
.cell-prop-num {
  width: 100%;
}
.cell-prop-sel {
  width: 100%;
}
.cell-prop-unit {
  font-size: 12px;
  color: var(--app-text-muted, #909399);
  margin-top: -2px;
}
</style>

<style>
.popup-context-menu.anim-cell-ctx {
  z-index: 10060;
  min-width: 168px;
}
.popup-context-menu.anim-cell-ctx li {
  display: flex;
  justify-content: space-between;
  gap: 28px;
}
.popup-context-menu.anim-cell-ctx .sc {
  opacity: 0.65;
  font-size: 11px;
}
</style>
