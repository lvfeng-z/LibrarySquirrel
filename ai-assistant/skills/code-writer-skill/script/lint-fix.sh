#!/bin/bash

# ESLint 格式化代码脚本
# 用法: ./lint-fix.sh <文件路径>
# 示例: ./lint-fix.sh src/main/service/WorkService.ts

if [ -z "$1" ]; then
  echo "用法: $0 <文件路径>"
  echo "示例: $0 src/main/service/WorkService.ts"
  exit 1
fi

FILE_PATH="$1"

# 检查文件是否存在
if [ ! -f "$FILE_PATH" ]; then
  echo "错误: 文件不存在: $FILE_PATH"
  exit 1
fi

echo "正在格式化: $FILE_PATH"

# 使用 yarn lint --fix 格式化指定文件
yarn lint --fix "$FILE_PATH"

if [ $? -eq 0 ]; then
  echo "格式化完成: $FILE_PATH"
else
  echo "格式化失败: $FILE_PATH"
  exit 1
fi
