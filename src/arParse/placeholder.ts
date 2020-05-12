import * as d3Interpolate from 'd3-interpolate'

import { PlaceHolder } from "../type";
import { shuffle } from "../utils";

function pick(range: any[]) {
  return (idx: number) => {
    const tick = idx % range.length
    return range[tick]
  }
}

export function genPlaceholder(placeholder: PlaceHolder) {
  //
  const data = []
  let numOfData = placeholder._num || 10
  delete placeholder._num

  Object.keys(placeholder)
    .forEach(attr => {
      const item = placeholder[attr]
      const range = Array.isArray(item)
        ? item
        : item.range
      const options = Array.isArray(item)
        ? item.length > 2
        : (item.options || false)
      if (options) {
        numOfData *= range.length
      }
    })

  const interpolates = {}
  // create interpolate
  Object.keys(placeholder)
    .forEach(attr => {
      const item = placeholder[attr]
      const range = Array.isArray(item)
        ? item
        : item.range
      const random = Array.isArray(item)
        ? false
        : (item.random || false)
      const options = Array.isArray(item)
        ? false
        : (item.options || false)

      let index = Array(numOfData).fill(1)
      if (range.length === 2 && !options) {
        index = index.map((d, i) => i / numOfData)
        if (random) {
          index = shuffle(index)
        }

        interpolates[attr] = {
          interpolate: d3Interpolate.interpolateNumber(range[0], range[1]),
          index
        }
      } else {
        index = index.map((d, i) => range.length === 2 ? Math.round(i / index.length) : i)
        if (random) {
          index = shuffle(index)
        }

        interpolates[attr] = {
          interpolate: pick(range),
          index
        }
      }
    })

  // gen data
  for (let i = 0; i < numOfData; ++i) {
    const item = {}
    Object.keys(interpolates)
      .forEach(attr => {
        const { interpolate, index } = interpolates[attr]
        item[attr] = interpolate(index[i])
      })
    data.push(item)
  }
  return data
}
