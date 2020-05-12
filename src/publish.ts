import { UrlData } from 'vega'
import { ARSpec } from './type'
import { log, error } from './utils'
import { ARView } from './arView';

const API_URL = 'http://vegaarapi.hkustvis.org'
// const API_URL = 'http://localhost:12331'

export async function publish(el: string, spec: ARSpec, arView: ARView) {
  // 1. check url data source
  const urlToDatas: { [url: string]: any } = {}
  if (spec.data) {
    const urlToFullUrl = {}
    const urlDatas = spec.data.filter(d => 'url' in d) as UrlData[]
    // assume all url is string
    // Cache the data for each url
    await Promise.all(urlDatas.map(async ({ url, name }) => {
      if (typeof url !== 'string') {
        log('The url is not a string:' + url)
        return
      }

      if (!(url in urlToDatas)) {
        const response = await fetch(url)
        urlToFullUrl[url] = response.url
        try {
          const jsonData = await response[url.endsWith('.json') ? 'json' : 'text']()
          urlToDatas[url] = jsonData
        } catch(err) {
          console.error(err)
        }
      }

      // sbstitude ar data source
      if (spec.ar && spec.ar.data) {
        // url data
        const arData = spec.ar.data.find(d => d.name === name) as UrlData
        if (arData
          && (arData.url === url || !arData.url)) {
          arData.url == urlToFullUrl[url]
        }
      }
    }))

    log(urlToDatas)
  }

  const data = await postData(API_URL + '/spec', { spec, urlToDatas, anchor: arView.getAlignPadding()})
  log(data);
  (document.querySelector(el) as HTMLImageElement).src = data.image
  return data
}

async function postData(url: string, data: any) {
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data),
    });
    return await response.json();
  } catch (err) {
    error(err)
    return null
  }
}
