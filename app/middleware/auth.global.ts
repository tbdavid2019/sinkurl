export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server)
    return

  const token = window.localStorage.getItem('SinkSiteToken')

  if (to.path.startsWith('/dashboard') && to.path !== '/dashboard/login') {
    if (!token)
      return navigateTo('/dashboard/login')
  }

  if (to.path === '/dashboard/login') {
    if (token) {
      try {
        await useAPI('/api/verify')
        return navigateTo('/dashboard')
      }
      catch (e) {
        console.warn(e)
      }
    }
  }
})
