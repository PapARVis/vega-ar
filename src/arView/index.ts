import { ARViewOption, ARView } from './arView'
import { CleanView } from './cleanView'

export async function arView(arRuntime: any, runtime: any, options: ARViewOption) {
  // TODO: sync scale on demand (only ar mode ON requires scale extension)
  return arRuntime
    ? (new ARView(arRuntime, runtime, options)).syncScale()
    : new CleanView(runtime, options)
}


export { ARView, ARViewOption } from './arView'
export { CleanView } from './cleanView'
