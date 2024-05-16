# CollectionsManager

An Electron application with Vue and TypeScript

## Recommended IDE Setup

- [VSCode](https://code.visualstudio.com/) + [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) + [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) + [TypeScript Vue Plugin (Volar)](https://marketplace.visualstudio.com/items?itemName=Vue.vscode-typescript-vue-plugin)

## 部署

### 安装前准备

安装 python 3.12

安装 vs2022 的 Desktop development with C++ 工作负载和 Windows SDK: 10.0.20348.0 的单个组件

（可选）对git的全局配置进行修改，提交时 CRLF 转换为 LF ，检出时不做任何的转换，可以防止出现ESLint: Delete `␍`(prettier/prettier)提醒
```bash
$ git config --global core.autocrlf input
```

### 安装

```bash
$ yarn
```
如果出现报错：gyp ERR! find VS - does not match this Visual Studio Command Prompt，尝试使用x64 Native Tools Command Prompt for VS 2022（所安装Visual Studio版本的“开发者命令提示符”）执行yarn命令，或者手动激活Visual Studio的命令提示符环境再执行yarn命令，这个错误只会在首次安装时出现，后续的安装会复用首次安装所编译的sqlite3
### 开发

```bash
$ yarn dev
```

### 构建生产版本

```bash
# For windows
$ yarn build:win

# For macOS
$ yarn build:mac

# For Linux
$ yarn build:linux
```
