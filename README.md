# Library Squirrel

LibrarySquirrel是一个用于在个人电脑中创建并维护一个基于标签进行检索的资源库的软件，从远程站点下载资源到本地资源库中，并提供标签式的检索服务是这个软件的主要功能。

# 开发相关

## IDE设置

- [IntelliJ IDEA](https://www.jetbrains.com/idea/) / [VSCode](https://code.visualstudio.com/) + [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) + [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar) + [TypeScript Vue Plugin (Volar)](https://marketplace.visualstudio.com/items?itemName=Vue.vscode-typescript-vue-plugin)

## 开发环境部署

### 安装

安装 python 3.12

安装 vs2022 的 Desktop development with C++ 工作负载和 Windows SDK: 10.0.20348.0 的单个组件

```bash
$ yarn
```
如果出现报错：gyp ERR! find VS - does not match this Visual Studio Command Prompt，尝试使用x64 Native Tools Command Prompt for VS 2022（所安装Visual Studio版本的“开发者命令提示符”）执行yarn命令，或者手动激活Visual Studio的命令提示符环境再执行yarn命令
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
