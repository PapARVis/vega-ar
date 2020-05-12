import { SignalRef, Transforms, CollectTransform } from 'vega'
import { isPartitionTransform, isSignalRef, insert, isCrossTransform, isTreeTransform, isTreemapTransform, isTreelinks, warn } from '../utils'
import { ARSpec, TransformItem } from '../type';

export function parseTransform(t: Transforms, dataName: string, transforms: Transforms[], nSpec: ARSpec): TransformItem | undefined {

  if ('_skip' in t) {
    // skip transform in for loop which has the _skip tag
    delete t['_skip']
    return
  } else if (isPartitionTransform(t)) {
    // only can extend in the `height` dimension
    if (!nSpec.signals) {
      nSpec.signals = []
    }
    const signalName = `ar_${dataName}_partition_height`
    let value

    if (isSignalRef(t.size[1])) {
      const sigExp = (t.size[1] as SignalRef).signal
      const wOrH = /\b(width|height)\b/.exec(sigExp)

      value = wOrH
        ? eval(sigExp.replace(/width|height/, nSpec[wOrH[0]]))
        : (t.size[1] as SignalRef).signal // @TODO, here may be some bugss
    } else {
      value = t.size[1]
    }

    nSpec.signals.push({ name: signalName, value })
    t.size[1] = { signal: signalName }

    // add transform to remove the value of internal node
    const insertIdx = transforms.indexOf(t)
    insert(
      { type: "partition", as: (t as any).as, _skip: true },
      { type: "formula", expr: `datum.children?0:datum.${t.field}`, as: t.field, _skip: true },
      // {type: "formula", expr: `['children', '${t.field}']`, as: "_skipFields", _skip: true },
    ).to(transforms).at(insertIdx)
    // add _skip to skip transform in for loop
    t['_skip'] = true

    return { type: t.type, dataName, signalName, _type: 'transform' }
  } else if (isTreemapTransform(t)) {
    // only can extend in the `height` dimension
    if (!nSpec.signals) {
      nSpec.signals = []
    }
    const signalName = `ar_${dataName}_treemap_height`
    let value
    if (isSignalRef(t.size[1])) {
      const sigExp = (t.size[1] as SignalRef).signal
      const wOrH = /\b(width|height)\b/.exec(sigExp)

      value = wOrH
        ? eval(sigExp.replace(/width|height/, nSpec[wOrH[0]]))
        : (t.size[1] as SignalRef).signal // @TODO, here may be some bugss
    } else {
      value = t.size[1]
    }

    nSpec.signals.push({ name: signalName, value })
    t.size[1] = { signal: signalName }

    // add transform to remove the value of internal node
    const insertIdx = transforms.indexOf(t)
    insert(
      { type: "treemap", as: (t as any).as, _skip: true },
      { type: "formula", expr: `datum.children?0:datum.${t.field}`, as: t.field, _skip: true },
      // {type: "formula", expr: `['children', '${t.field}']`, as: "_skipFields", _skip: true },
    ).to(transforms).at(insertIdx)
    // add _skip to skip transform in for loop
    t['_skip'] = true

    return { type: t.type, dataName, signalName, _type: 'transform' }
  } else if (isTreeTransform(t)) {

  } else if (isCrossTransform(t)) {
    const insertIdx = transforms.indexOf(t)
    insert({
      type: 'collect',
      sort: { field: (t.as || ['a', 'b']).map((f: string) => `${f}.__ar__`) },
      _skip: true
    }).to(transforms).at(insertIdx + 1)
    // add _skip to skip transform in for loop
    t['_skip'] = true
  } else if (isTreelinks(t)) {
    warn('treelinks')
    const insertIdx = transforms.indexOf(t)
    insert({
      type: 'formula',
      expr: "datum.source.id + '-' + datum.target.id",
      as: "id",
      _skip: true
    }).to(transforms).at(insertIdx + 1)
    t['_skip'] = true
  }
}
