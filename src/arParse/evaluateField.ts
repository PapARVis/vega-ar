import { Spec } from 'vega';
import { isGroupMark, isFromFacet } from '../utils';
import { FieldToVC, DataToFieldToVC } from '../type';

function merge(d: FieldToVC) {

  return {
    to(o: DataToFieldToVC) {
      return {
        at(dataName: string) {
          if (!(dataName in o)) {
            o[dataName] = {}
          }

          Object.keys(d)
            .forEach(field => {
              if (!o[dataName][field]) {
                o[dataName][field] = new Set()
              }
              d[field].forEach(vc => o[dataName][field].add(vc))
            })
        }
      }
    }
  }
}

function findField(obj: object, transforms: any[] = []): { fieldToVC: FieldToVC, fixedVC: Set<string> } {
  const fieldToVC: FieldToVC = {}
  const fixedVC: Set<string> = new Set()

  if (!obj) return { fieldToVC, fixedVC }

  for (const entry of ["enter", "update", "exit"]) {
    if (!obj[entry]) continue

    const encodes = obj[entry]
    Object.keys(encodes)
      .filter(vc => encodes[vc].field)
      .forEach(vc => {
        const field = encodes[vc].field
        if (!(field in fieldToVC)) {
          fieldToVC[field] = new Set()
        }
        fieldToVC[field].add(vc)
      })

    Object.keys(encodes)
      .filter(vc => encodes[vc].value !== undefined || encodes[vc].band !== undefined)
      .forEach(vc => fixedVC.add(vc))
  }

  for(const t of transforms) {
    if(t.type === 'geopath') {
      if(!('coordinates' in fieldToVC)) {
        fieldToVC['coordinates'] = new Set()
      }
      fieldToVC['coordinates'].add('path')
    }
  }

  return { fieldToVC, fixedVC }
}


export function collectDataFieldEncoded(spec: Spec) {
  const dataFieldsEncoded: DataToFieldToVC = {}
  const fixedVC = new Set()
  if (!spec.marks) return { dataFieldsEncoded, fixedVC }

  for (const mark of spec.marks) {

    if (mark.from === undefined) continue
    const from = mark.from

    let dataName: string
    let facetName: string
    if (isGroupMark(mark) && isFromFacet(from)) {
      dataName = from.facet.data
      facetName = from.facet.name
    } else {
      if (from.data === undefined) continue
      dataName = from.data
    }

    if (mark.encode === undefined) continue
    const { fieldToVC: fields, fixedVC: tmpFixedVC } = findField(mark.encode, mark.transform)
    merge(fields).to(dataFieldsEncoded).at(dataName)
    tmpFixedVC.forEach(vc => fixedVC.add(vc))

    if (isGroupMark(mark)) {
      const {
        dataFieldsEncoded: tmpToBeEvaluate,
        fixedVC: tmpFixedVC
      } = collectDataFieldEncoded(mark)

      Object.keys(tmpToBeEvaluate)
        .forEach(gDataName => {
          const tmpDataName = gDataName === facetName
            ? dataName
            : gDataName

          const fields = tmpToBeEvaluate[gDataName]
          merge(fields).to(dataFieldsEncoded).at(tmpDataName)

        })

      // @TODO
      tmpFixedVC.forEach(vc => fixedVC.add(vc))
    }
  }

  return { dataFieldsEncoded, fixedVC }
}
