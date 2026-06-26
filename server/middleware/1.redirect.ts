import type { LinkSchema } from '@@/schemas/link'
import type { z } from 'zod'
import { TransitionSettingsSchema } from '@@/schemas/settings'
import { parsePath, withQuery } from 'ufo'

export default eventHandler(async (event) => {
  const { pathname: slug } = parsePath(event.path.replace(/^\/|\/$/g, '')) // remove leading and trailing slashes
  const { slugRegex, reserveSlug } = useAppConfig(event)
  const { homeURL, redirectWithQuery, caseSensitive } = useRuntimeConfig(event)
  const { cloudflare } = event.context

  if (event.path === '/' && homeURL)
    return sendRedirect(event, homeURL)

  if (slug && !reserveSlug.includes(slug) && slugRegex.test(slug) && cloudflare) {
    const { KV } = cloudflare.env

    let link: z.infer<typeof LinkSchema> | null = null

    // Redirect behavior must reflect recent edits immediately, especially transition-mode changes.
    const getLink = async (key: string) =>
      await KV.get(`link:${key}`, { type: 'json' })

    const lowerCaseSlug = slug.toLowerCase()
    link = await getLink(caseSensitive ? slug : lowerCaseSlug)

    // fallback to original slug if caseSensitive is false and the slug is not found
    if (!caseSensitive && !link && lowerCaseSlug !== slug) {
      console.log('original slug fallback:', `slug:${slug} lowerCaseSlug:${lowerCaseSlug}`)
      link = await getLink(slug)
    }

    if (link) {
      event.context.link = link
      try {
        await useAccessLog(event)
      }
      catch (error) {
        console.error('Failed write access log:', error)
      }
      const target = redirectWithQuery ? withQuery(link.url, getQuery(event)) : link.url

      const globalTransition = TransitionSettingsSchema.parse(await KV.get('setting:transition', { type: 'json' }) || {})
      const showTransition = globalTransition.mode === 'force'
        || link.transitionMode === 'on'
        || (link.transitionMode !== 'off' && globalTransition.mode === 'inherit')

      if (showTransition) {
        const transitionContent = link.transitionHtml || globalTransition.content
        const customHtmlContent = transitionContent
          ? `<div class="w-full text-slate-800 dark:text-slate-100">${transitionContent}</div>`
          : `
            <div class="flex flex-col items-center text-center space-y-2">
              <div class="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-full text-emerald-500">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-8 h-8">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                </svg>
              </div>
              <h2 class="text-xl font-bold">Leaving Current Site</h2>
              <p class="text-sm text-slate-500 dark:text-slate-400">You are being redirected to an external site. Please make sure the destination URL is safe.</p>
            </div>
          `

        setHeader(event, 'Content-Type', 'text/html; charset=utf-8')
        return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Redirecting... | Sink</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'media',
      theme: {
        extend: {
          colors: {
            brand: '#10b981',
          }
        }
      }
    }
  </script>
  <style>
    @keyframes progress {
      from { width: 0%; }
      to { width: 100%; }
    }
    .progress-bar {
      animation: progress 5s linear forwards;
    }
  </style>
</head>
<body class="bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-100 flex min-h-screen flex-col items-center justify-center p-4">
  <div class="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl p-8 flex flex-col items-center space-y-6">
    
    ${customHtmlContent}
    
    <div class="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 p-4 rounded-xl text-center">
      <p class="text-sm text-slate-500 dark:text-slate-400 mb-1">Destination URL</p>
      <a href="${target}" id="target-link" class="text-emerald-500 font-medium hover:underline break-all block max-h-20 overflow-y-auto">${target}</a>
    </div>

    <div class="w-full flex flex-col items-center space-y-4">
      <div class="text-sm font-medium text-slate-500 dark:text-slate-400">
        Redirecting in <span id="countdown" class="font-bold text-slate-800 dark:text-slate-100 text-lg">5</span> seconds...
      </div>
      <div class="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
        <div class="bg-emerald-500 h-full progress-bar"></div>
      </div>
      <div class="flex space-x-3 w-full pt-2">
        <button onclick="stopRedirect()" id="btn-stop" class="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 font-medium rounded-xl text-sm transition">
          Stop Redirect
        </button>
        <a href="${target}" class="flex-1 px-4 py-2.5 bg-emerald-500 hover:opacity-90 text-white font-medium rounded-xl text-sm transition text-center flex items-center justify-center">
          Redirect Now
        </a>
      </div>
    </div>
  </div>

  <script>
    let countdown = 5;
    const countdownEl = document.getElementById('countdown');
    const target = ${JSON.stringify(target)};
    let timer = setInterval(() => {
      countdown--;
      countdownEl.innerText = countdown;
      if (countdown <= 0) {
        clearInterval(timer);
        window.location.href = target;
      }
    }, 1000);

    function stopRedirect() {
      clearInterval(timer);
      const progressBar = document.querySelector('.progress-bar');
      if (progressBar) progressBar.style.animationPlayState = 'paused';
      const countdownParent = countdownEl.parentElement;
      countdownParent.innerHTML = 'Auto-redirect stopped.';
      document.getElementById('btn-stop').style.display = 'none';
    }
  </script>
</body>
</html>
        `
      }

      return sendRedirect(event, target, +useRuntimeConfig(event).redirectStatusCode)
    }
  }
})
