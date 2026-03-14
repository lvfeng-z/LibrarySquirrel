import { createRouter, createWebHashHistory, type Router, type RouteRecordRaw } from 'vue-router'
import { routes } from './routes'

const router: Router = createRouter({
  history: createWebHashHistory(),
  routes: routes as RouteRecordRaw[]
})

export default router
export { router }
