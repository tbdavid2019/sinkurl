export default eventHandler((event) => {
  const token = getHeader(event, 'Authorization')?.replace(/^Bearer\s+/, '')

  if (event.path.startsWith('/api/') && !event.path.startsWith('/api/_') && !event.path.startsWith('/api/public/')) {
    const configToken = useRuntimeConfig(event).siteToken || ''
    const validTokens = configToken.split(',').map(t => t.trim()).filter(Boolean)

    if (!validTokens.includes(token || '')) {
      throw createError({
        status: 401,
        statusText: 'Unauthorized',
      })
    }
  }

  if (token && token.length < 8) {
    throw createError({
      status: 401,
      statusText: 'Token is too short',
    })
  }
})
