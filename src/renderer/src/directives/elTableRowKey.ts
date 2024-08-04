export default {
  mounted(el, binding, vnode) {
    console.log('el: ', el)
    console.log('binding: ', binding)
    console.log('vnode: ', vnode)
    console.log('vnode.el.__vueParentComponent.exposed: ', vnode.el.__vueParentComponent.exposed)
  }
}
