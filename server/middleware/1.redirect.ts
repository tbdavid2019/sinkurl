import type { LinkSchema } from '@@/schemas/link'
import type { z } from 'zod'
import { SeoSettingsSchema, TrackingSettingsSchema, TransitionSettingsSchema } from '@@/schemas/settings'
import { parsePath, withQuery } from 'ufo'

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function isSocialPreviewCrawler(userAgent: string) {
  return /facebookexternalhit|facebot|twitterbot|slackbot|discordbot|telegrambot|whatsapp|linkedinbot|pinterest|skypeuripreview|line/i.test(userAgent)
}

function isGeneralBot(userAgent: string) {
  return /googlebot|bingbot|yandexbot|duckduckbot|baiduspider|sogou|yahoo|ia_archiver|bot|crawler|spider/i.test(userAgent)
}

function renderSocialPreviewHtml(params: {
  title: string
  description: string
  image: string
  siteName: string
  url: string
  target: string
}) {
  const title = escapeHtml(params.title)
  const description = escapeHtml(params.description)
  const image = escapeHtml(params.image)
  const siteName = escapeHtml(params.siteName)
  const url = escapeHtml(params.url)
  const target = escapeHtml(params.target)
  const twitterCard = image ? 'summary_large_image' : 'summary'
  const imageMeta = image
    ? `<meta property="og:image" content="${image}">
  <meta name="twitter:image" content="${image}">`
    : ''

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <title>${title}</title>
  <link rel="canonical" href="${url}">
  <meta name="description" content="${description}">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:site_name" content="${siteName}">
  <meta property="og:url" content="${url}">
  ${imageMeta}
  <meta name="twitter:card" content="${twitterCard}">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
</head>
<body>
  <p><a href="${target}">${target}</a></p>
</body>
</html>`
}

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
      const userAgent = getHeader(event, 'user-agent') || ''

      if (isSocialPreviewCrawler(userAgent)) {
        const seo = SeoSettingsSchema.parse(await KV.get('setting:seo', { type: 'json' }) || {})
        const requestURL = getRequestURL(event)
        const title = link.title || link.comment || seo.title || seo.siteName || slug
        const description = link.description || link.comment || seo.description || target
        const image = link.image || seo.image || ''
        const siteName = seo.siteName || seo.title || requestURL.hostname

        setHeader(event, 'Content-Type', 'text/html; charset=utf-8')
        setHeader(event, 'Cache-Control', 'public, max-age=300')
        return renderSocialPreviewHtml({
          title,
          description,
          image,
          siteName,
          url: requestURL.href,
          target,
        })
      }
      else if (isGeneralBot(userAgent)) {
        setHeader(event, 'X-Robots-Tag', 'noindex, nofollow')
        return sendRedirect(event, target, +useRuntimeConfig(event).redirectStatusCode)
      }

      const globalTransition = TransitionSettingsSchema.parse(await KV.get('setting:transition', { type: 'json' }) || {})
      const showTransition = globalTransition.mode === 'force'
        || link.transitionMode === 'on'

      if (showTransition) {
        const transitionContent = link.transitionHtml || globalTransition.content
        const tracking = TrackingSettingsSchema.parse(await KV.get('setting:tracking', { type: 'json' }) || {})
        const redirectDelaySeconds = tracking.redirectDelaySeconds
        const safeTarget = escapeHtml(target)
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
        setHeader(event, 'X-Robots-Tag', 'noindex, nofollow')
        return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <title>Redirecting... | Sink</title>
  ${tracking.enabled && tracking.gaMeasurementId
    ? `<script async src="https://www.googletagmanager.com/gtag/js?id=${escapeHtml(tracking.gaMeasurementId)}"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', ${JSON.stringify(tracking.gaMeasurementId)}, { send_page_view: false });
  </script>`
    : ''}
  ${tracking.enabled && tracking.metaPixelId
    ? `<script>
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
    n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}
    (window, document,'script','https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', ${JSON.stringify(tracking.metaPixelId)});
  </script>`
    : ''}
  ${tracking.enabled && tracking.lineLiffId
    ? '<script src="https://static.line-scdn.net/liff/edge/2/sdk.js"></script>'
    : ''}
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
      <a href="${safeTarget}" id="target-link" class="text-emerald-500 font-medium hover:underline break-all block max-h-20 overflow-y-auto">${safeTarget}</a>
    </div>

    <div class="w-full flex flex-col items-center space-y-4">
      <div class="text-sm font-medium text-slate-500 dark:text-slate-400">
        Redirecting in <span id="countdown" class="font-bold text-slate-800 dark:text-slate-100 text-lg">5</span> seconds...
      </div>
      <div class="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
        <div class="bg-emerald-500 h-full progress-bar" style="animation-duration: ${redirectDelaySeconds}s"></div>
      </div>
      <div class="flex space-x-3 w-full pt-2">
        <button onclick="stopRedirect()" id="btn-stop" class="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 font-medium rounded-xl text-sm transition">
          Stop Redirect
        </button>
        <a href="${safeTarget}" id="btn-redirect-now" class="flex-1 px-4 py-2.5 bg-emerald-500 hover:opacity-90 text-white font-medium rounded-xl text-sm transition text-center flex items-center justify-center">
          Redirect Now
        </a>
      </div>
    </div>
  </div>

  <script>
    const trackingConfig = ${JSON.stringify({
      enabled: tracking.enabled,
      gaMeasurementId: tracking.gaMeasurementId,
      metaPixelId: tracking.metaPixelId,
      lineLiffId: tracking.lineLiffId,
      requireLineLogin: tracking.requireLineLogin,
      slug: link.slug,
      target,
      redirectDelaySeconds,
    })};
    let countdown = trackingConfig.redirectDelaySeconds || 5;
    const countdownEl = document.getElementById('countdown');
    const target = ${JSON.stringify(target)};
    const redirectNowButton = document.getElementById('btn-redirect-now');
    const targetLink = document.getElementById('target-link');
    let timer;
    let stopped = false;

    countdownEl.innerText = countdown;

    function postTrackingEvent(eventName, lineIdToken) {
      if (!trackingConfig.enabled) return Promise.resolve();

      const payload = JSON.stringify({
        event: eventName,
        slug: trackingConfig.slug,
        target: trackingConfig.target,
        lineIdToken: lineIdToken || undefined,
      });

      if (navigator.sendBeacon && !lineIdToken) {
        navigator.sendBeacon('/api/tracking/event', new Blob([payload], { type: 'application/json' }));
      }
      else {
        return fetch('/api/tracking/event', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
          keepalive: true,
        }).catch(() => {});
      }

      return Promise.resolve();
    }

    function trackPixel(eventName) {
      if (!trackingConfig.enabled) return;
      if (window.gtag && trackingConfig.gaMeasurementId) {
        gtag('event', eventName, {
          event_category: 'shortlink',
          link_slug: trackingConfig.slug,
          transport_type: 'beacon',
        });
      }
      if (window.fbq && trackingConfig.metaPixelId) {
        fbq('trackCustom', 'ShortlinkRedirect', {
          event_name: eventName,
          link_slug: trackingConfig.slug,
        });
      }
    }

    async function trackEvent(eventName, lineIdToken) {
      trackPixel(eventName);
      await postTrackingEvent(eventName, lineIdToken);
    }

    async function prepareLineLogin() {
      const isTargetLiff = target.indexOf('liff.line.me') !== -1 || target.startsWith('line://');
      if (isTargetLiff) return;

      if (!trackingConfig.enabled || !trackingConfig.lineLiffId || !window.liff) return;

      try {
        await liff.init({ liffId: trackingConfig.lineLiffId });
        if (trackingConfig.requireLineLogin && !liff.isLoggedIn()) {
          liff.login({ redirectUri: window.location.href });
          return new Promise(() => {});
        }

        if (liff.isLoggedIn()) {
          const lineIdToken = liff.getIDToken ? liff.getIDToken() : '';
          if (lineIdToken) await trackEvent('line_login_success', lineIdToken);
        }
      }
      catch (error) {
        await trackEvent('line_login_error');
      }
    }

    function startCountdown() {
      timer = setInterval(async () => {
      countdown--;
      countdownEl.innerText = countdown;
      if (countdown <= 0) {
        clearInterval(timer);
        await trackEvent('redirect_auto');
        setTimeout(() => {
          window.location.replace(target);
        }, 150);
      }
      }, 1000);
    }

    async function goNow(event) {
      if (event) event.preventDefault();
      clearInterval(timer);
      await trackEvent('redirect_now');
      setTimeout(() => {
        window.location.replace(target);
      }, 150);
    }

    function stopRedirect() {
      stopped = true;
      clearInterval(timer);
      const progressBar = document.querySelector('.progress-bar');
      if (progressBar) progressBar.style.animationPlayState = 'paused';
      const countdownParent = countdownEl.parentElement;
      countdownParent.innerHTML = 'Auto-redirect stopped.';
      document.getElementById('btn-stop').style.display = 'none';
      trackEvent('redirect_stopped');
    }

    redirectNowButton.addEventListener('click', goNow);
    targetLink.addEventListener('click', goNow);

    (async () => {
      await trackEvent('transition_view');
      await prepareLineLogin();
      if (!stopped) startCountdown();
    })();
  </script>
</body>
</html>
        `
      }

      return sendRedirect(event, target, +useRuntimeConfig(event).redirectStatusCode)
    }
  }
})
