import vega, { Spec, Encode, Mark, isNumber } from 'vega'

import { ARSpec, SyncItem } from '../type'
import {
  isValuesData, isUrlData, insert, isGroupMark, isHierarchicalData, isPlaceholderData, isCrossTransform, isSignalRef,
  dfsDataTarget,
  warn, log, flat, replace
} from '../utils'
import { parseTransform } from './transform';
import { parseScale, dfsDatasource } from './scale';
import { parseChartDirection } from './chartDirection';
import { collectDataFieldEncoded } from './evaluateField';
import { genPlaceholder } from './placeholder';
import { isGeoSpec } from './isGeo';

export interface ARParseOption {
  ar?: boolean
  [opt: string]: any
}

function mergerOandN(oData: vega.ValuesData | vega.UrlData, arData: vega.ValuesData, oDataIndex: number, oDatas: any[]) {
  const mergedData = { ...oData };
  ['url', 'values', 'format'].forEach(attr => delete mergedData[attr])

  // rename oData
  oData.name = `${oData.name}_s1`;
  // clean oData
  ['on', 'transform'].forEach(attr => delete oData[attr])
  oData.transform = [{
    type: "formula",
    as: "__ar__",
    expr: "false"
  } as any]

  arData.name = `${arData.name}_s2`;
  arData.transform = [{
    type: "formula",
    as: "__ar__",
    expr: "true"
  } as any]
  //  insert(oDatas, oDataIndex+1, arData);
  insert(arData).to(oDatas).at(oDataIndex + 1);

  (mergedData as any).source = [oData.name, arData.name];
  insert(mergedData).to(oDatas).at(oDataIndex + 2)
}

function mergeONARData(nSpec: ARSpec) {
  const oDatas: any[] = nSpec.data || []
  let arSyncScale: SyncItem[] = []
  // extend data
  nSpec.ar.data.forEach((arData: any) => {

    const dataName: string = arData.name
    let oDataIndex = oDatas.findIndex((d: any) => d.name == dataName)
    if (oDataIndex === -1) return
    let oData = oDatas[oDataIndex]

    // merge data
    if (isValuesData(oData)) { // values

      if (isValuesData(arData)) {
        mergerOandN(oData, arData, oDataIndex, oDatas)
      } else if (isUrlData(arData)) {
        (oData as any).url = arData.url
        delete oData.values
      } else if (isPlaceholderData(arData)) {
        const nData = { ...arData, values: genPlaceholder(arData.placeholder) }
        delete nData.placeholder
        mergerOandN(oData, nData, oDataIndex, oDatas)
      }
    } else if (isUrlData(oData)) { // url
      if (isValuesData(arData)) {
        mergerOandN(oData, arData, oDataIndex, oDatas)
      } else if (isUrlData(arData)) {
        oData.url = arData.url
      }
    }

    // handle transforms
    {
      // refined
      oDataIndex = oDatas.findIndex((d: any) => d.name == dataName)
      oData = oDatas[oDataIndex]
      // decorate transform on oData
      let transforms = flat('transform', dfsDataTarget(oData, oDatas))
      if (transforms) {
        for (const [t, flatFrom, flatKey] of transforms) {
          const item = parseTransform(t, flatFrom.name, flatFrom[flatKey], nSpec)
          if (item) {
            arSyncScale.push(item)
          }
        }
      }
    }

    // decortate scales on nSpec
    if (nSpec.scales) {
      for (const s of nSpec.scales) {
        const items = parseScale(s, dataName, nSpec)
        if (items) {
          arSyncScale = arSyncScale.concat(items)
        }
      }
    }
  })

  if (nSpec.data) {
    nSpec.data.forEach(data => {
      const { transform: transforms } = data
      if (transforms) {
        transforms.forEach(t => {
          if (isCrossTransform(t)) {
            const insertIdx = transforms.indexOf(t)
            insert({
              type: 'collect',
              sort: { field: (t.as || ['a', 'b']).map((f: string) => `${f}.__ar__`) },
              _skip: true
            }).to(transforms).at(insertIdx + 1)
            // add _skip to skip transform in for loop
            t['_skip'] = true
          }
        })
      }
    })
  }

  return arSyncScale
}

function mergeNOARData(nSpec: ARSpec) {
  const oDatas: any[] = nSpec.data || []

  nSpec.ar.data.forEach((arData: any) => {
    const oDataIndex = oDatas.findIndex((d: any) => d.name == arData.name)
    if (oDataIndex === -1) return
    const oData = oDatas[oDataIndex]

    if (isValuesData(oData)) {
      arData.values = oData.values
      delete arData.url
    } else if (isUrlData(oData)) {
      arData.url = oData.url
      delete arData.values
    }
  });
}

export function compileVegaARSpec(spec: ARSpec) {
  let nSpec = JSON.parse(JSON.stringify(spec)) as ARSpec
  // check armode
  const arMode = nSpec.ar && nSpec.ar.mode
  let arSyncScale: any[] = []
  let reParseOSpec

  if (arMode === 'ON') {
    arSyncScale = mergeONARData(nSpec)
  } else if (arMode === 'NN') {
  } else if (arMode === 'NO') {
    mergeNOARData(nSpec)
  } else {
    warn("Unknown AR Mode")
  }

  // Handle the normal view
  const hTransforms = isHierarchicalData(nSpec.data, nSpec.ar.data)
  if (hTransforms && nSpec.marks) {
    const { index, transforms, data: sourceData } = hTransforms

    const hierachyT = transforms[index] as any

    // extend canvas
    if (hierachyT.as && (hierachyT.as[0] !== 'angle' || hierachyT.as[0] !== 'alpha')) {
      // 1. find direction
      const isVertical = (hierachyT.as[0] === 'y' && hierachyT.as[1] === 'x')
        ? 0
        : 1
      // 2. modify size
      {
        const hackRatio = (hierachyT as any).method === 'cluster'
          ? 1.54
          : 2.5
        const data = nSpec.data as any[]
        insert({
          name: "_width_extent",
          source: sourceData.source,
          transform: [
            transforms.find(t => t.type === 'stratify'),
            { type: "tree" }
          ]
        }, {
            name: "_o_width_extent",
            source: "_width_extent",
            transform: [
              { "type": "filter", "expr": "!datum.__ar__" },
              { "type": "aggregate", "groupby": ["depth"], "ops": ["count"] },
              { "type": "extent", "field": "count", "signal": "_o_width_extent" }
            ]
          }, {
            name: "_n_width_extent",
            source: "_width_extent",
            transform: [
              { "type": "aggregate", "groupby": ["depth"], "ops": ["count"] },
              { "type": "extent", "field": "count", "signal": "_n_width_extent" }
            ]
          }).to(data).at(data.findIndex(d => d.name === sourceData.name))

        hierachyT.size[isVertical] = isSignalRef(hierachyT.size[isVertical])
          ? { signal: `(${hierachyT.size[isVertical].signal})*(_n_width_extent[1]/_o_width_extent[1])` }
          : isNumber(hierachyT.size[isVertical])
            ? { signal: `${hierachyT.size[isVertical]} * (_n_width_extent[1]/_o_width_extent[1])` }
            : hierachyT.size[isVertical]
      }

      if ((hierachyT as any).method === 'tidy') {
        // add extent to signals
        const data = nSpec.data as any[]
        insert({
          name: "_depth_extent",
          source: sourceData.source,
          transform: [
            transforms.find(t => t.type === 'stratify'),
            { type: "tree" }
          ]
        }, {
            name: "_o_depth_extent",
            source: '_depth_extent',
            transform: [
              { "type": "filter", "expr": "!datum.__ar__" },
              { "type": "extent", "field": "depth", "signal": "_o_depth_extent" }
            ]
          }, {
            name: "_n_depth_extent",
            source: '_depth_extent',
            transform: [
              { "type": "filter", "expr": "datum.__ar__" },
              { "type": "extent", "field": "depth", "signal": "_n_depth_extent" }
            ]
          }).to(data).at(data.findIndex(d => d.name === sourceData.name))

        const another = 1 - isVertical
        hierachyT.size[another] = isSignalRef(hierachyT.size[another])
          ? { signal: `(${hierachyT.size[another].signal})*(_n_depth_extent[1] / _o_depth_extent[1])` } // @ HACK, *1.5
          : isNumber(hierachyT.size[another])
            ? { signal: `(${hierachyT.size[another]})*(_n_depth_extent[1]/_o_depth_extent[1])` } //// ierachyT.size[another] * hackRatio // @ HACK, *1.5
            : hierachyT.size[another]
      }
    }

    // save
    reParseOSpec = nSpec
    const tmpSpec = JSON.parse(JSON.stringify(nSpec))

    // add transform
    {
      // hide the ar node
      insert({ type: 'filter', expr: "!datum.__ar__" })
        .to(transforms)
        .at(transforms.findIndex(t => t === hierachyT) + 1)
      // .at(index + 1)

      // for cluster layout
      if ((hierachyT as any).method === 'cluster' && sourceData.source) {
        insert({
          type: "filter",
          expr: `!datum.__ar__ || !(indata('${sourceData.source[0]}', 'id', datum.parent) && !indata('${sourceData.source[1]}', 'parent', datum.id))`
        })
          .to(transforms)
          .at(transforms.findIndex(t => t === hierachyT) - 1)
        // .at(index - 1)
      }
    }

    log('spec', nSpec)
    // oRuntime = vega.parse(nSpec, opt)

    // restore
    nSpec = tmpSpec
  }

  return { nSpec, reParseOSpec, arSyncScale }
}

export function arParse(spec: ARSpec | Spec, opt: ARParseOption = { ar: false }) {
  let oSpec = spec
  let oRuntime = vega.parse(spec, opt)
  const arMode = (spec as any).ar && (spec as any).ar.mode
  if (!opt.ar || !arMode) { // if force not ar, then directly return the runtime
    return { runtime: oRuntime }
  }

  // deep copy
  const { nSpec, reParseOSpec, arSyncScale } = compileVegaARSpec(spec as ARSpec)
  if (reParseOSpec) {
    oSpec = reParseOSpec
    oRuntime = vega.parse(reParseOSpec, opt)
  }

  const arRuntime = arMode === 'ON'
    ? vega.parse(nSpec, { ...opt, background: "#fff" })
    : (['NN', 'NO'].indexOf(arMode) !== -1
      ? vega.parse(nSpec.ar, { ...opt, background: "#fff" })
      : null)

  if (arRuntime) {
    arRuntime.arSyncScale = arSyncScale
    arRuntime.arMode = arMode
    arRuntime.arDirection = parseChartDirection(nSpec)
    arRuntime.isGeoSpec = isGeoSpec(nSpec)
    arRuntime.datasetNames = (spec.data || []).map((d: any) => d.name)
    arRuntime.datasetSpec = arRuntime.datasetNames.reduce((o: any, dn: string) => {
      o[dn] = (spec.data || []).find(d => d.name === dn)
      return o
    }, {})
    const { dataFieldsEncoded, fixedVC } = collectDataFieldEncoded(nSpec)
    arRuntime.dataFieldEncoded = dataFieldsEncoded
    arRuntime.fixedVC = fixedVC
  } else {
    warn(`Unknown AR Mode:${arMode}`)
  }

  log('oSpec', oSpec)
  log('ARSpec', nSpec)
  return { runtime: oRuntime, arRuntime }
}


// {
//   "type": "filter",
//   "expr": "datum.__ar__ && (indata('tree_s1', 'id', datum.parent) && !indata('tree_s2', 'parent', datum.id) )"
// }
