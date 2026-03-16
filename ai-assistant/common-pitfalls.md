**IPC 数据传输规则**:

- 渲染进程向主进程发送数据时，不能直接使用响应式变量作为参数，应该使用其克隆的纯对象作为代替，否则会出现错误“Error: An object could not be cloned.”
