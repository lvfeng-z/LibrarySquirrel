# Library Squirrel

这是一个能在个人电脑上维护一个类似在线艺术社区（如pixiv）的资源库的软件，软件会在硬盘的指定目录中存储作品资源，并提供作品查找、导入等功能

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
