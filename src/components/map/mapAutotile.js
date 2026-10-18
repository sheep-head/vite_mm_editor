/** RPG Maker MZ autotile 表与判定（来自 YT/RM/editor 地图查看器） */

export const FLOOR_AUTOTILE_TABLE = [[[2,4],[1,4],[2,3],[1,3]],[[2,0],[1,4],[2,3],[1,3]],[[2,4],[3,0],[2,3],[1,3]],[[2,0],[3,0],[2,3],[1,3]],[[2,4],[1,4],[2,3],[3,1]],[[2,0],[1,4],[2,3],[3,1]],[[2,4],[3,0],[2,3],[3,1]],[[2,0],[3,0],[2,3],[3,1]],[[2,4],[1,4],[2,1],[1,3]],[[2,0],[1,4],[2,1],[1,3]],[[2,4],[3,0],[2,1],[1,3]],[[2,0],[3,0],[2,1],[1,3]],[[2,4],[1,4],[2,1],[3,1]],[[2,0],[1,4],[2,1],[3,1]],[[2,4],[3,0],[2,1],[3,1]],[[2,0],[3,0],[2,1],[3,1]],[[0,4],[1,4],[0,3],[1,3]],[[0,4],[3,0],[0,3],[1,3]],[[0,4],[1,4],[0,3],[3,1]],[[0,4],[3,0],[0,3],[3,1]],[[2,2],[1,2],[2,3],[1,3]],[[2,2],[1,2],[2,3],[3,1]],[[2,2],[1,2],[2,1],[1,3]],[[2,2],[1,2],[2,1],[3,1]],[[2,4],[3,4],[2,3],[3,3]],[[2,4],[3,4],[2,1],[3,3]],[[2,0],[3,4],[2,3],[3,3]],[[2,0],[3,4],[2,1],[3,3]],[[2,4],[1,4],[2,5],[1,5]],[[2,0],[1,4],[2,5],[1,5]],[[2,4],[3,0],[2,5],[1,5]],[[2,0],[3,0],[2,5],[1,5]],[[0,4],[3,4],[0,3],[3,3]],[[2,2],[1,2],[2,5],[1,5]],[[0,2],[1,2],[0,3],[1,3]],[[0,2],[1,2],[0,3],[3,1]],[[2,2],[3,2],[2,3],[3,3]],[[2,2],[3,2],[2,1],[3,3]],[[2,4],[3,4],[2,5],[3,5]],[[2,0],[3,4],[2,5],[3,5]],[[0,4],[1,4],[0,5],[1,5]],[[0,4],[3,0],[0,5],[1,5]],[[0,2],[3,2],[0,3],[3,3]],[[0,2],[1,2],[0,5],[1,5]],[[0,4],[3,4],[0,5],[3,5]],[[2,2],[3,2],[2,5],[3,5]],[[0,2],[3,2],[0,5],[3,5]],[[0,0],[1,0],[0,1],[1,1]]]

export const WALL_AUTOTILE_TABLE = [[[2,2],[1,2],[2,1],[1,1]],[[0,2],[1,2],[0,1],[1,1]],[[2,0],[1,0],[2,1],[1,1]],[[0,0],[1,0],[0,1],[1,1]],[[2,2],[3,2],[2,1],[3,1]],[[0,2],[3,2],[0,1],[3,1]],[[2,0],[3,0],[2,1],[3,1]],[[0,0],[3,0],[0,1],[3,1]],[[2,2],[1,2],[2,3],[1,3]],[[0,2],[1,2],[0,3],[1,3]],[[2,0],[1,0],[2,3],[1,3]],[[0,0],[1,0],[0,3],[1,3]],[[2,2],[3,2],[2,3],[3,3]],[[0,2],[3,2],[0,3],[3,3]],[[2,0],[3,0],[2,3],[3,3]],[[0,0],[3,0],[0,3],[3,3]]]

export const WATERFALL_AUTOTILE_TABLE = [[[2,0],[1,0],[2,1],[1,1]],[[0,0],[1,0],[0,1],[1,1]],[[2,0],[3,0],[2,1],[3,1]],[[0,0],[3,0],[0,1],[3,1]]]

export function isVisibleTile(tileId) {
  return tileId > 0 && tileId < 8192
}

export function isAutotile(tileId) {
  return tileId >= 2048
}

export function isTileA5(tileId) {
  return tileId >= 1536 && tileId < 2048
}

export function isTileA1(tileId) {
  return tileId >= 2048 && tileId < 2816
}

export function isTileA2(tileId) {
  return tileId >= 2816 && tileId < 4352
}

export function isTileA3(tileId) {
  return tileId >= 4352 && tileId < 5888
}

export function isTileA4(tileId) {
  return tileId >= 5888 && tileId < 8192
}

export function getAutotileKind(tileId) {
  return Math.floor((tileId - 2048) / 48)
}

export function getAutotileShape(tileId) {
  return (tileId - 2048) % 48
}

export function makeAutotileId(kind, shape) {
  return 2048 + kind * 48 + (shape % 48)
}

export function isSameKindTile(a, b) {
  if (isAutotile(a) && isAutotile(b)) return getAutotileKind(a) === getAutotileKind(b)
  return a === b
}

export function isWaterfallTile(tileId) {
  if (tileId >= 2048 + 192 && tileId < 2816) return getAutotileKind(tileId) % 2 === 1
  return false
}

export function isRoofTile(tileId) {
  return isTileA3(tileId) && getAutotileKind(tileId) % 16 < 8
}

export function isWallTopTile(tileId) {
  return isTileA4(tileId) && getAutotileKind(tileId) % 16 < 8
}

export function isWallSideTile(tileId) {
  return (isTileA3(tileId) || isTileA4(tileId)) && getAutotileKind(tileId) % 16 >= 8
}

export function isFloorTypeAutotile(tileId) {
  return (isTileA1(tileId) && !isWaterfallTile(tileId)) || isTileA2(tileId) || isWallTopTile(tileId)
}

export function isWallTypeAutotile(tileId) {
  return isRoofTile(tileId) || isWallSideTile(tileId)
}

export function isWaterfallTypeAutotile(tileId) {
  return isWaterfallTile(tileId)
}

/**
 * 地板自动图块 shape（与 MZ 编辑器 / KilloZapit 一致）。
 * n/e/s/w/nw/ne/se/sw 为「同 kind」布尔（越界视为同 kind）。
 */
export function floorAutotileShape(n, e, s, w, nw, ne, se, sw) {
  // edge 位 = 该方向「不同」（边界）；越界已当同 kind，故不置位
  const edge = (!w ? 1 : 0) | (!n ? 2 : 0) | (!e ? 4 : 0) | (!s ? 8 : 0)
  let index = 0
  if (edge === 0) {
    if (!nw) index |= 1
    if (!ne) index |= 2
    if (!se) index |= 4
    if (!sw) index |= 8
  } else if (edge === 1) {
    if (!ne) index |= 1
    if (!se) index |= 2
    index |= 16
  } else if (edge === 2) {
    if (!se) index |= 1
    if (!sw) index |= 2
    index |= 20
  } else if (edge === 3) {
    index = !se ? 35 : 34
  } else if (edge === 4) {
    if (!sw) index |= 1
    if (!nw) index |= 2
    index |= 24
  } else if (edge === 5) {
    index = 32
  } else if (edge === 6) {
    index = !sw ? 37 : 36
  } else if (edge === 7) {
    index = 42
  } else if (edge === 8) {
    if (!nw) index |= 1
    if (!ne) index |= 2
    index |= 28
  } else if (edge === 9) {
    index = !ne ? 41 : 40
  } else if (edge === 10) {
    index = 33
  } else if (edge === 11) {
    index = 43
  } else if (edge === 12) {
    index = !nw ? 39 : 38
  } else if (edge === 13) {
    index = 44
  } else if (edge === 14) {
    index = 45
  } else if (edge === 15) {
    index = 46
  } else {
    index = 47
  }
  return index
}

export function wallAutotileShape(n, e, s, w) {
  return (!w ? 1 : 0) | (!n ? 2 : 0) | (!e ? 4 : 0) | (!s ? 8 : 0)
}

export function waterfallAutotileShape(e, w) {
  return (!w ? 1 : 0) | (!e ? 2 : 0)
}

/**
 * @param {(x:number,y:number)=>number} readTile 读某层 tileId；越界应返回 -1 或由 same 处理
 * @param {(a:number,b:number)=>boolean} [sameKind]
 */
export function computeAutotileShapeAt(x, y, kind, readTile, sameKind = isSameKindTile) {
  const base = makeAutotileId(kind, 0)
  const same = (dx, dy) => {
    const t = readTile(x + dx, y + dy)
    if (t < 0) return true
    return sameKind(base, t)
  }
  const n = same(0, -1)
  const e = same(1, 0)
  const s = same(0, 1)
  const w = same(-1, 0)
  const nw = same(-1, -1)
  const ne = same(1, -1)
  const se = same(1, 1)
  const sw = same(-1, 1)

  if (isWaterfallTypeAutotile(base)) return waterfallAutotileShape(e, w)
  if (isWallTypeAutotile(base)) return wallAutotileShape(n, e, s, w)
  return floorAutotileShape(n, e, s, w, nw, ne, se, sw)
}

/**
 * 重算 (x,y,z) 的自动图块 shape 并写回；非自动图块则跳过。
 * @returns {number} 新 tileId（未改则原值）
 */
export function refreshAutotileAt(mapData, x, y, z) {
  if (!mapData || !mapData.data) return 0
  const { width: w, height: h, data } = mapData
  if (x < 0 || y < 0 || x >= w || y >= h) return 0
  const idx = (z * h + y) * w + x
  const tileId = data[idx] || 0
  if (!isAutotile(tileId)) return tileId
  const kind = getAutotileKind(tileId)
  const read = (tx, ty) => {
    if (tx < 0 || ty < 0 || tx >= w || ty >= h) return -1
    return data[(z * h + ty) * w + tx] || 0
  }
  const shape = computeAutotileShapeAt(x, y, kind, read)
  const next = makeAutotileId(kind, shape)
  data[idx] = next
  return next
}

/** 刷新落点及八邻的自动图块 */
export function refreshAutotileNeighbors(mapData, x, y, z) {
  const out = []
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx
      const ny = y + dy
      const id = refreshAutotileAt(mapData, nx, ny, z)
      if (id > 0 || (mapData && nx >= 0 && ny >= 0 && nx < mapData.width && ny < mapData.height)) {
        out.push({ x: nx, y: ny, z, tileId: id })
      }
    }
  }
  return out
}

/** A 页（含 A5）→ 下层；B–E → 上层 */
export function isLowerTile(tileId) {
  return tileId >= 1536
}
