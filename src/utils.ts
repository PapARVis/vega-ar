import {
  SceneGroup, SceneItem, Data, ValuesData, UrlData, Transforms, SignalRef,
  TransformField, DataRef, ScaleData, isObject, isArray, GroupMark, Mark,
  FromFacet, From, Facet, _TODO_, SourceData, array
} from 'vega'
import { TransformItem, ScaleItem, PlaceholderData } from './type';

// type check
function isSceneGroup(node?: SceneItem | SceneGroup): node is SceneGroup {
  return node != undefined && 'items' in node
}

function isValuesData(data: Data): data is ValuesData {
  return 'values' in data
}

function isUrlData(data: Data): data is UrlData {
  return 'url' in data
}

function isPlaceholderData(data: Data): data is PlaceholderData {
  return 'placeholder' in data
}

function isDataReference(o?: (null | string | number | boolean | SignalRef)[] | ScaleData | SignalRef): o is DataRef {
  return o !== undefined && isObject(o) && 'data' in o
}

function isSignalRef(o?: any): o is SignalRef {
  return o !== undefined && o.signal
}

function isGroupMark(m?: Mark): m is GroupMark {
  return m !== undefined && isObject(m) && m.type === 'group'
}

function isFromFacet(f?: FromFacet): f is (From & { facet: Facet }) {
  return f !== undefined && 'facet' in f
}

interface PartitionTransform {
  type: 'partition'
  field: string | TransformField
  size: [SignalRef | Number, SignalRef | Number]
}

function isPartitionTransform(t: Transforms): t is PartitionTransform {
  return t.type === 'partition'
}

function isTreemapTransform(t: Transforms): t is _TODO_<'treemap'> {
  return t.type === 'treemap'
}

function isCrossTransform(t: Transforms): t is _TODO_<'cross'> {
  return t.type === 'cross'
}

function isTreeTransform(t: Transforms): t is _TODO_<'tree'> {
  return t.type === 'tree'
}

function isTreelinks(t: Transforms): t is _TODO_<'treelinks'> {
  return t.type === 'treelinks'
}

export const Ordinal = 'ordinal';
export const Point = 'point';
export const Band = 'band';
export const BinOrdinal = 'bin-ordinal';

function isDiscreteScale(key?: string) {
  return key === BinOrdinal
    || key === Ordinal
    || key === Band
    || key === Point;
}

function isTransformItem(item: TransformItem | ScaleItem): item is TransformItem {
  return item._type === 'transform'
}

function isScaleItem(item: TransformItem | ScaleItem): item is ScaleItem {
  return item._type === 'scale'
}

function isHierarchicalTransform(transform: Transforms): boolean {
  // no 'partition', 'stratify', 'treemap'
  return ['nest', 'treelinks', 'pack', 'tree'].indexOf(transform.type) >= 0
}

function isHierarchicalData(data?: Data[], arData?: Data[]): { transforms: Transforms[], index: number, data: SourceData } | null {
  if (data === undefined || arData === undefined) return null

  for (let i = 0; i < data.length; i++) {
    const dataset = data[i];
    if (!dataset.transform) continue

    for (let j = 0; j < dataset.transform.length; j++) {
      const transform = dataset.transform[j];
      const augmented = intersection(arData.map(d => d.name), [dataset.name, ...(dataset as any).source || []])
      if (isHierarchicalTransform(transform) && augmented.size) {
        return { transforms: dataset.transform, index: j, data: dataset as SourceData }
      }
    }
  }
  return null
}

function toArray(o?: any | any[]) {
  if (o === undefined) return []
  return isArray(o) ? o : [o]
}

const insert = (...items: any[]) => ({
  to: (arr: any[]) => ({
    at: (idx: number) => arr.splice(idx, 0, ...items)
  })
})

const replace = (idx: number) => ({
  of: (arr: any[]) => ({
    with: (...items: any[]) => arr.splice(idx, 1, ...items)
  })
})

function intersection<T>(a: Array<T>, b: Array<T>): Set<T>;
function intersection<T>(a: Set<T>, b: Set<T>): Set<T>;
function intersection<T>(a: Iterable<T>, b: Iterable<T>): Set<T> {
  let aSet: Set<T> = a instanceof Set ? a : new Set([...a])
  let bSet: Set<T> = b instanceof Set ? b : new Set([...b])

  return new Set([...aSet].filter(d => bSet.has(d)))
}

function union<T>(a: Set<T>, b: Set<T>): Set<T> {
  return new Set([...a, ...b])
}

/**
 * Shuffles array in place. ES6 version
 * @param {Array} a items An array containing the items.
 */
function shuffle(a: any[]): any[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function flat<T>(key: string, items: T[]): Array<[any, T, string]> {

  return items
    .reduce((o, item) => o
      .concat((item[key] || [])
        .map((_: any) => [_, item, key])),
      [])
}

function log(...msg: any[]) {
  console.log(`%c Vega-AR====>`, 'background: #2980b9; color: #fff', ...msg)
}

function warn(...msg: any[]) {
  console.warn(`%c Vega-AR====>`, 'background: #2980b9; color: #fff', ...msg)

}

function error(...msg: any[]) {
  console.error(`%c Vega-AR====>`, 'background: #2980b9; color: #fff', ...msg)
}

export function dfsDataTarget(data: any, datas: any[]): any[] {
  const queue = [...datas.filter(d => d.name !== data.name)]
  const sourceDatas = [data]
  const sourceNames = new Set([data.name])
  let increase = 0
  do {
    increase = 0
    for (let i = queue.length - 1; i >= 0; --i) {
      const q = queue[i]
      const { source } = q
      if (!source) {
        continue
      }
      if (sourceNames.has(source)) {
        sourceNames.add(q.name)
        queue.splice(i, 1) // remove
        sourceDatas.push(q)
        ++increase
      }
    }
  } while (increase)

  return sourceDatas
}

export {
  // type check
  isSceneGroup,
  isValuesData,
  isUrlData,
  isPlaceholderData,
  isPartitionTransform,
  isCrossTransform,
  isDataReference,
  isSignalRef,
  isDiscreteScale,
  isTransformItem,
  isTreelinks,
  isTreeTransform,
  isScaleItem,
  isGroupMark,
  isHierarchicalData,
  isFromFacet,
  isTreemapTransform,
  //
  toArray,
  insert,
  replace,
  intersection,
  union,
  shuffle,
  flat,
  // log
  log,
  warn,
  error
}
