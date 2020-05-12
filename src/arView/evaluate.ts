import { View, isObject, isArray } from "vega";
import { ARHint, ARHintDataValue } from "../type";
import { ARView } from "./arView";
import { log, union, intersection } from '../utils'

function isChanged(o: object, n: object, fields: Set<string>) {
  // to check whether there is skipFields in data
  // const skipKeys = new Set(n['_skipFields'] || [])
  const _fields = new Set();
  const _nextLevel = {};

  fields.forEach(f => {
    const layer = f.split('.')
    _fields.add(layer[0])

    if (layer.length > 1) {
      if (!_nextLevel[layer[0]]) {
        _nextLevel[layer[0]] = []
      }
      _nextLevel[layer[0]].push(layer[1])
    }
  })

  for (const key of Object.keys(o)) {
    if (!_fields.has(key)) {
      continue
    }

    // new object miss some properies
    if (!n.hasOwnProperty(key)) return { key };

    if (Array.isArray(o[key])) {

      for(let i = 0, len = o[key].length; i < len; ++i) {
        let oItem = o[key][i]
        if(Array.isArray(oItem)) {
          oItem = oItem[0]
          if(
            n[key].filter((ni:any)=> ni[0].length === oItem.length)
              .every((ni:any) => JSON.stringify(oItem) !== JSON.stringify(ni[0]))
          ) {
            return { key }
          }
        } else {
          const nItem = n[key][i]
          // somehow hack
          if(!nItem || JSON.stringify(oItem) !== JSON.stringify(nItem)) {
            return { key }
          }
        }
      }
    } else if (isObject(o[key])) {
      if (isChanged(o[key], n[key], _nextLevel[key])) {
        return { key }
      }
    } else {
      if (o[key] !== n[key]) {
        return { key }
      }
    }
  }
}

export function evalDataNoUpdate(view: View, arView: ARView): ARHint[] {
  // Check old data consistence
  // let { data: datasets } = view.getState({ data: truthy, signals: falsy, recurse: true })

  const hints: ARHint[] = [];
  const { datasetNames, fixedVC } = arView
  // add all source to
  const allDataToCheck: Set<string> = new Set()

  const dataFieldEncoded = {...arView.dataFieldEncoded}
  datasetNames
    .filter(datasetName => dataFieldEncoded.hasOwnProperty(datasetName))
    .forEach(datasetName => {
      const dataSpec = arView.datasetSpec[datasetName]

      allDataToCheck.add(datasetName)
      if(dataSpec.source && datasetNames.indexOf(dataSpec.source) !== -1) {
        allDataToCheck.add(dataSpec.source)
        // merge
        if(!dataFieldEncoded[dataSpec.source]) {
          dataFieldEncoded[dataSpec.source] = {}
        }
        Object.keys(dataFieldEncoded[datasetName])
          .forEach(field => {
            if(!dataFieldEncoded[dataSpec.source][field]) {
              dataFieldEncoded[dataSpec.source][field] = new Set()
            }
            dataFieldEncoded[dataSpec.source][field] = union(dataFieldEncoded[dataSpec.source][field], dataFieldEncoded[datasetName][field])
          })
      }
    })

  console.log('asdfasdf', allDataToCheck)
  Array.from(allDataToCheck)
    .forEach((datasetName) => {
      const idx = datasetNames.findIndex(d => d == datasetName)
      const fields = dataFieldEncoded[datasetName]
      log(`In dataset ${datasetName}, fields [${[...Object.keys(fields)].join(',')}] is used in vis`)

      const oDataset = view.data(datasetName)
      let nDataset
      try {
        nDataset = arView.data(datasetName)
      } catch (error) {
        hints.push({
          dataName: datasetName,
          idx,
          type: 'dataset',
          msg: `This dataset does not exist in the 'data' of the new ArSpec`
        })
        return
      }

      // log(`====> datasetName: ${datasetName}`, oDataset, nDataset)
      const dataSpec = arView.datasetSpec[datasetName]
      const dataspecTs: any[] = (dataSpec && dataSpec.transform) || []
      const dataspecTsType: string[] = dataspecTs.map(t => t.type)

      console.log('datasetname', datasetName, ', fields', fields)
      for (let j = 0, len = oDataset.length; j < len; ++j) {
        const oData = oDataset[j];
        const nData = oData.id
          ? nDataset.find(nd => nd.id === oData.id) // [j];
          : nDataset[j]

        if (isObject(oData) && isObject(nData)) {
          const change = isChanged(oData, nData, new Set(Object.keys(fields)))

          if (change) {
            const hint: ARHintDataValue = {
              dataName: datasetName,
              idx,
              type: 'dataValue',
              msg: `In dataset '${datasetName}', the attribute '${change.key}' of old data will be changed due to the new data. You should either use another transform, or remove the encoding of '${change.key}' using '${Array.from(fields[change.key]).join(',')}' in the 'marks' block`,
              key: change.key,
              changed: { oData: oData, nData: nData }
            }

            // cluster mode
            if (intersection(dataspecTsType, ["stratify", "tree"]).size == 2 &&
              dataspecTs.find(t => t.type === 'tree').method === 'cluster'
            ) {
              hint.transformIdx = dataspecTs.findIndex(t => t.type === 'tree')
              hint.msg = `If new nodes are added to the leaf nodes of the original tree, 'cluster' method should not be used. Instead, you can use 'tidy' method`
            } else if (intersection(dataspecTsType, ["partition"]).size == 1) {
              hint.transformIdx = dataspecTs.findIndex(t => t.type === 'partition')
              hint.msg = `If new nodes are added to the internal nodes of the original tree, 'partition' transform should not be used. Instead, you can use 'tree' transform`
            } else if (intersection(dataspecTsType, ['treemap']).size == 1) {
              hint.transformIdx = dataspecTs.findIndex(t => t.type === 'treemap')
              hint.msg = `If new nodes are added to the internal nodes of the original tree, 'treemap' transform should not be used. Instead, you can use 'tree' transform`
            }else if(intersection(dataspecTsType, ["contour"]).size == 1) {
              hint.transformIdx = dataspecTs.findIndex(t => t.type === 'contour')
              hint.msg = `The old contour has been modified due to the new data. You should either not use 'contour' transform, or incease the minumin threshold value.`
            } else if(intersection(dataspecTsType, ["pie"]).size == 1) {
              hint.transformIdx = dataspecTs.findIndex(t => t.type === 'pie')
              hint.msg = `If new data items are added to this dataset, 'pie' transform should not be used`
            } else if(intersection(dataspecTsType, ["formula", "window", "lookup"]).size == 3) {
              hint.transformIdx = dataspecTs.findIndex(t => t.type === 'formula' && t.as === "degree")
            }

            hints.push(hint as ARHintDataValue)
            break
          }
        } else if (oData !== nData) {
          hints.push({
            dataName: datasetName,
            idx,
            type: 'dataItem',
            msg: `In dataset '${datasetName}', the data item ${oData.id ? 'with id' : 'at index'} ${oData.id || j} has been changed.`,
            changed: { oData, nData }
          })
        }
      }
    })

  return hints
}
