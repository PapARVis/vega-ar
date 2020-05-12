import { View, Scene, Operator, SceneGroup, SceneItem } from 'vega'
declare module 'vega-typings/types/runtime' {
  export interface View {
    scenegraph(): { root: Scene };
  }

  export class Transform  implements Operator {

    constructor(init: any, params: object);
    targets: any;
    set: any;
    skip: any;
    modified: any;
    parameters: any;
    marshall: any;
    evaluate: any;
    run: any;
  }

}

declare module 'vega-typings/types/runtime/scene' {
  export function sceneZOrder(scene: Scene | SceneGroup): Array<SceneGroup | SceneItem> | undefined

  export interface SceneItem {
    zindex ?: number
  }

}
