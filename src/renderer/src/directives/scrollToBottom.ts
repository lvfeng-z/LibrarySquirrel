// 处理el-select滚动到底部的自定义指令
export default {
  mounted(el, binding) {
    const handleScroll = async function (event) {
      const domTarget = event.target
      const scrollTop = domTarget.scrollTop
      const clientHeight = domTarget.clientHeight
      const scrollHeight = domTarget.scrollHeight
      if (scrollHeight - scrollTop <= clientHeight) {
        binding()
      }
    }
    const dom = document.querySelector('.select-scroll .el-scrollbar__wrap')
    if (dom !== null) {
      dom.addEventListener('scroll', handleScroll)
      el.__handleScroll = handleScroll
      el.__scrollDom = dom
    }
  },
  unmounted(el) {
    el.__scrollDom.removeEventListener('scroll', el.__handleScroll)
  }
}
