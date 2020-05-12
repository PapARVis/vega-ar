import vega, { View, Renderers } from 'vega'
import { syncScale } from './scale'
import { evalDataNoUpdate } from './evaluate'
import { TransformItem, ScaleItem, ARHint, ChartVDirection, ChartHDirection, DataToFieldToVC } from '../type';
import { error, log } from '../utils'

export interface ARViewOption {
  container?: string | Element
  renderer?: string
  debug?: boolean
  [opt: string]: any
}

export class ARView extends View {
  private _arMode: string;

  public get mode() { return this._arMode }
  private _dualView: View
  public get dualView() { return this._dualView }
  private _debug: boolean = false
  public set debug(v: boolean) {
    this._debug = v
    const container = this.container()
    container && (container.style.opacity = this._debug ? '0.5' : '1')
  }

  private _arSyncScale: Array<TransformItem | ScaleItem>
  public get arSyncScale() { return this._arSyncScale }

  private _vDirection: ChartVDirection = 'Top'
  public get vDirection() { return this._vDirection }

  private _hDirection: ChartHDirection = 'Left'
  public get hDirection() { return this._hDirection }

  private _datasetNames: string[]
  public get datasetNames() { return this._datasetNames }

  private _arHints: ARHint[] = []
  public get arHints() { return this._arHints }

  private _dataFieldEncoded: DataToFieldToVC
  public get dataFieldEncoded() { return this._dataFieldEncoded }

  private _fixedVC: Set<string>;
  public get fixedVC() { return this._fixedVC }

  private _datasetSpec: any[];
  public get datasetSpec() { return this._datasetSpec }

  private _isGeoSpec: boolean;

  private static createARContainer(container: HTMLElement, isDebug = false, isGeoSpec = false) {
    const arContainerId = `ar__${container.id}`
    const elementSibling = container.previousElementSibling || container.nextElementSibling
    let arContainer: HTMLElement
    if (elementSibling && elementSibling.id === arContainerId) {
      arContainer = elementSibling as HTMLElement
      // detach for re-ordering
      arContainer.remove()
    } else {
      arContainer = container.cloneNode() as HTMLElement
      arContainer.id = arContainerId
    }
    log('#createARContainer ===> insert ARcontainer to container')
    container.insertAdjacentElement(isGeoSpec? 'afterend' :'beforebegin', arContainer)

    // clean arContainer styles
    arContainer.style.left = null
    arContainer.style.top = null
    arContainer.style.margin = null

    // set container styles
    container.style.position = isDebug ? 'absolute' : 'relative'
    container.style.margin = isDebug
      ? container.parentElement && (container.parentElement.style.padding || getComputedStyle(container.parentElement).padding)
      : '0px'
    arContainer.style.opacity = isDebug ? '0.5' : '1'
    arContainer.style.display = isDebug ? '' : 'none'

    return arContainer
  }

  private static attachedARContainer(dom: string | Element, isDebug = false, isGeoSpec = false) {
    const container: HTMLElement = typeof dom === 'string'
      ? document.querySelector(dom) as HTMLElement
      : dom as HTMLElement

    const arContainer = container
      ? ARView.createARContainer(container, isDebug, isGeoSpec)
      : dom

    if(!arContainer) {
      error('#attachedARContainer ==> No chart container!')
    }

    return arContainer
  }

  constructor(arRuntime: any, runtime: any, options: ARViewOption) {
    super(arRuntime, options)
    this._dualView = new vega.View(runtime, options)
    this._arSyncScale = arRuntime.arSyncScale
    this._arMode = arRuntime.arMode
    const { v, h } = arRuntime.arDirection
    this._vDirection = v
    this._hDirection = h
    this._datasetNames = arRuntime.datasetNames
    this._dataFieldEncoded = arRuntime.dataFieldEncoded
    this._datasetSpec = arRuntime.datasetSpec
    this._fixedVC = arRuntime.fixedVC
    this._isGeoSpec = arRuntime.isGeoSpec
    this.debug = options.debug === true
  }

  public async syncScale() {
    return await syncScale(this)
  }

  public async runAsync(encode?: any, prerun?: any, postrun?: any) {
    type AnyFunction = (...args: any[]) => Promise<View>;
    if (this._dualView) {
      await (this._dualView.runAsync as AnyFunction).bind(this._dualView)(encode, prerun, postrun)
    }
    const ret: ARView = await (super.runAsync as AnyFunction).bind(this)(encode, prerun, postrun) as ARView

    // store at the first time
    // if (!this._arHints.length) {
      // hint
      if (this._arMode === 'ON') {
        // evaluate if data changed after all transforms
        this._arHints = evalDataNoUpdate(this._dualView, ret)
        log('Update AR hints', this._arHints)
      }
    // }

    const dualViewContainer = this._dualView.container()
    if(this._debug) {
      // auto-position
      const sg = this._dualView.scenegraph().root
      const arSg = super.scenegraph().root
      const sgBounds = sg.bounds
      const arSgBounds = arSg.bounds

      if (this._arMode != 'ON') {
        if (dualViewContainer) {
          // pivot point is top left
          dualViewContainer.style.left = '0px'
          dualViewContainer.style.top = '0px'
        }
        return ret
      }

      if (dualViewContainer) {
        // rules to check direction
        switch (this.hDirection) {
          case 'Left': {
            dualViewContainer.style.left = `${Math.floor(Math.abs(arSgBounds.x1 - sgBounds.x1))}px`
          }
            break
          case 'Right':
            break
        }

        switch (this.vDirection) {
          case 'Top': {
            const dy1 = Math.abs(arSgBounds.y1 - sgBounds.y1)
            const dy2 = Math.abs(arSgBounds.y2 - sgBounds.y2)
            dualViewContainer.style.top = `${Math.floor(Math.min(dy1, dy2))}px`
          }
            break
          case 'Down': {
            const dy1 = Math.abs(arSgBounds.y1 - sgBounds.y1)
            const dy2 = Math.abs(arSgBounds.y2 - sgBounds.y2)
            dualViewContainer.style.top = `${Math.floor(Math.max(dy1, dy2))}px`
          }
            break
        }
      }
    } else {
      if (dualViewContainer) {
        dualViewContainer.style.top = `0px`
        dualViewContainer.style.left = `0px`
      }
    }
    return ret
  }

  public getAlignPadding() {
    let vv = 0
    let hv = 0
    const sg = this._dualView.scenegraph().root
    const arSg = super.scenegraph().root
    const sgBounds = sg.bounds
    const arSgBounds = arSg.bounds
    // rules to check direction
    switch (this.hDirection) {
      case 'Left': {
        hv = Math.floor(Math.abs(arSgBounds.x1 - sgBounds.x1))
      }
        break
      case 'Right':
        break
    }

    switch (this.vDirection) {
      case 'Top': {
        const dy1 = Math.abs(arSgBounds.y1 - sgBounds.y1)
        const dy2 = Math.abs(arSgBounds.y2 - sgBounds.y2)
        vv = Math.floor(Math.min(dy1, dy2))
      }
        break
      case 'Down': {
        const dy1 = Math.abs(arSgBounds.y1 - sgBounds.y1)
        const dy2 = Math.abs(arSgBounds.y2 - sgBounds.y2)
        vv = Math.floor(Math.max(dy1, dy2))
      }
        break
    }

    const dualViewContainer = this._dualView.container()!
    const arViewContainer = this.container()!

    if (this._arMode != 'ON') {
      if (dualViewContainer) {
        // pivot point is top left
        vv = 0
        hv = 0
      }
    }

    console.log('arSgBounds', arSgBounds)
    console.log('sgBounds', sgBounds)
    let res = {
      v: this.vDirection,
      vv: arViewContainer.clientHeight - dualViewContainer.clientHeight - vv,
      // vv: Math.abs(arSgBounds.y2 - arSgBounds.y1 - sgBounds.y2 + sgBounds.y1) - vv,
      h: this.hDirection,
      hv,
    }
    console.log('result', res)
    return res
  }

  public renderer(renderer: Renderers) {
    if (this._dualView) {
      this._dualView.renderer(renderer)
    }
    return super.renderer(renderer)
  }

  public initialize(dom?: string | Element) {
    if (this._dualView && dom) {
      this._dualView.initialize(dom) // initialize only when dom is not none
    }

    // set debug when initialize
    const arContainer = (dom && (this as any)._rendererType !== 'none')
      ? ARView.attachedARContainer(dom, this._debug, this._isGeoSpec) // if dom & not rendererType === none, attach AR container
      : dom // otherwise, default

    return arContainer ? super.initialize(arContainer) : this // initialize only when dom is not none
  }

  public hover() {
    if (this._dualView) {
      this._dualView.hover()
    }
    return super.hover()
  }

  public finalize() {
    if (this._dualView) {
      this._dualView.finalize()
    }
    return super.finalize()
  }
}
