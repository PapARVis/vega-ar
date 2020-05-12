import { View } from "vega";
import { ARView } from ".";
import { union, intersection } from "../utils";

const SpatialVC = new Set([
  'x', 'x2', 'xc', 'width',
  'y', 'y2', 'yc', 'height',
  'startAngle', 'endAngle', 'innerRadius', 'outerRadius'
])

export function calBBox(view: View, arView: ARView) {
  const { datasetNames, fixedVC, dataFieldEncoded } = arView
  console.debug(`Fix spatial VC: ${[...intersection(fixedVC, SpatialVC)].join(',')}`)
  console.debug(view.scenegraph().root.bounds)

  datasetNames
    .forEach(datasetName => {
      const fields = dataFieldEncoded[datasetName]
      console.debug(`In dataset ${datasetName}, spatial vc [${[...Object.keys(fields)
        // .map(f => union(fields[f], fixedVC))
        .map(f => intersection(SpatialVC, fields[f]))
        .reduce(union)
      ].join(',')}] is used in vis`)

    })

}
