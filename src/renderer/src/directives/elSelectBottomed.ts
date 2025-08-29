// 处理el-select触底的的自定义指令
export default {
  mounted(el, binding) {
    const handleScroll = function (event) {
      const domTarget = event.target
      const scrollTop = domTarget.scrollTop
      const clientHeight = domTarget.clientHeight
      const scrollHeight = domTarget.scrollHeight
      if (scrollHeight - scrollTop <= clientHeight) {
        binding.value(el.firstElementChild.firstElementChild.firstElementChild.firstElementChild.value)
      }
    }
    const child = el.querySelector('.el-select__input')
    const id = child.getAttribute('aria-controls')
    const popper = document.getElementById(id)
    if (popper != null) {
      const selectWrapper = popper.parentElement

      if (selectWrapper !== null) {
        selectWrapper.addEventListener('scroll', handleScroll)
        el.__ls_handleScroll = handleScroll
        el.__ls_scrollDom = selectWrapper
      }
    }
  },
  unmounted(el) {
    el.__ls_scrollDom.removeEventListener('scroll', el.__ls_handleScroll)
  }
}
