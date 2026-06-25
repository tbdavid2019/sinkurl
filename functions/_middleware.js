export default {
  async fetch(_request, _env, _ctx) {
    // This is just a placeholder
    // The actual worker code will be bundled by Nitro
    return new Response('Not Found', { status: 404 })
  },
}

export const config = {
  compatibility_date: '2025-05-08',
  compatibility_flags: ['nodejs_compat'],
}
