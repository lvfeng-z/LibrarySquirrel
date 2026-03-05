import { IniConfig } from './types/IniConfig.ts'
import fs from 'fs'
import { isNullish } from '@shared/util/CommonUtil.ts'
import yaml from 'js-yaml'

let iniConfig: IniConfig | undefined = undefined

function createIniConfig(iniConfigFilePath: string) {
  if (isNullish(iniConfig)) {
    const yamlContent = fs.readFileSync(iniConfigFilePath, 'utf-8')
    iniConfig = yaml.load(yamlContent)
  }
}

function getIniConfig() {
  if (isNullish(iniConfig)) {
    throw new Error('初始化配置未初始化！')
  }
  return iniConfig
}

export { createIniConfig, getIniConfig }
