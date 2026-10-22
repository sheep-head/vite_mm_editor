/** Shared MapViewer constants */
export const DIM_ALPHA = 0.35
export const WALK_ANIM_FPS = 10
export const FOCUS_RING_CYCLE_MS = 800
export const FOCUS_RING_MIN_MS = 80
export const VIEW_BUF_MAX_EDGE = 2048
export const VIEW_BUF_PAD_TILES = 8
export const VIEW_BUF_MAX_TILES = 4096
export const FIT_MAX_VISIBLE_TILES = 160 * 100
/** 滚动轨道上限：过大 spacer 会在缩放时拖垮布局；小溢出仍按真实 hMax/vMax 比例 */
export const SCROLL_RANGE_MAX = 10000
