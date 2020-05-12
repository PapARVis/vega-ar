import { Spec, ValuesData, UrlData, BaseData } from "vega";

export interface SyncItem {
  type: string
  dataName: string
  signalName: string
}

export type TransformItem = SyncItem & {
  _type: 'transform'
}

export type ScaleItem = SyncItem & {
  name: string
  _type: 'scale'
}

export type ChartVDirection = 'Top' | 'Down'
export type ChartHDirection = 'Left' | 'Right'

export interface ARSpec extends Spec {
  ar: {
    mode: 'ON' | 'NO' | 'NN'
    data: Array<ValuesData | UrlData>
  }
}

interface BasicHint {
  dataName: string
  idx: number
  msg: string
  transformIdx?: number
}

export type ARHintDataset = {
  type: 'dataset'
} & BasicHint

export type ARHintDataValue = {
  type: 'dataValue'
  key: string
  changed: { oData: any, nData: any }
} & BasicHint

export type ARHintDataItem = {
  type: 'dataItem'
  changed: { oData: any, nData: any }
} & BasicHint

export type ARHint = ARHintDataset | ARHintDataValue | ARHintDataItem

export interface FieldToVC {
  [fieldName: string]: Set<string>
}

export interface DataToFieldToVC {
  [dataName: string]: FieldToVC
}

export interface PlaceholderData extends BaseData {
  placeholder: PlaceHolder;
}

type range = [number, number] | number[]

export type PlaceHolder = {
  [attr: string]: range | { range: range, random: boolean, options: boolean }
} & {
  _num: number;
}
