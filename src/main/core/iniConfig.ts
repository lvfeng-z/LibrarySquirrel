import { IniConfig } from './types/IniConfig.ts'
import fs from 'fs'
import { IsNullish } from '../util/CommonUtil.ts'
import yaml from 'js-yaml'

let iniConfig: IniConfig | undefined = undefined

function createIniConfig(iniConfigFilePath: string) {
  if (IsNullish(iniConfig)) {
    const yamlContent = fs.readFileSync(iniConfigFilePath, 'utf-8')
    iniConfig = yaml.load(yamlContent)
  }
}

function getIniConfig() {
  if (IsNullish(iniConfig)) {
    throw new Error('初始化配置未初始化！')
  }
  return iniConfig
}

export { createIniConfig, getIniConfig }
