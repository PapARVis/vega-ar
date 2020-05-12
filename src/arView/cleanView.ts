import { View } from 'vega'

export class CleanView extends View {

  private static cleanARContainer(container?: string | HTMLElement) {
    // if no container
    if (!container) {
      return
    }

    // if selector
    if (typeof container === 'string') {
      container = document.querySelector(container) as HTMLElement
    }

    const arContainerId = `ar__${container.id}`
    const nextElementSibling = container.previousElementSibling
    let arContainer: HTMLElement
    if (nextElementSibling && nextElementSibling.id === arContainerId) {
      arContainer = nextElementSibling as HTMLElement
      arContainer.remove()
    }

    // clean container styles
    container.style.position = 'relative';
    container.style.display = '';
    container.style.top = null
    container.style.left = null
    container.style.margin = null
    // if(container.style.margin === '10px') {
    //   container.style.margin = null
    // }
  }

  public initialize(dom?: string | Element) {
    CleanView.cleanARContainer(dom as HTMLElement)
    return super.initialize(dom)
  }
}
