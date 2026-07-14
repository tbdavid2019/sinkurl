<script setup>
const { title, description, image, twitter } = useAppConfig()

const siteUrl = 'https://glsoft.ai'
const twitterUsername = twitter ? twitter.replace('https://x.com/', '') : ''

useSeoMeta({
  title: `${title} - ${description}`,
  description,
  ogType: 'website',
  ogTitle: title,
  ogSiteName: title,
  ogDescription: description,
  ogImage: image,
  ogImageWidth: 1200,
  ogImageHeight: 630,
  ogImageAlt: title,
  ogUrl: siteUrl,
  ogLocale: 'zh_TW',
  twitterTitle: title,
  twitterDescription: description,
  twitterImage: image,
  twitterCard: 'summary_large_image',
  twitterSite: twitterUsername ? `@${twitterUsername}` : undefined,
})

useHead({
  htmlAttrs: {
    lang: 'en',
  },
  meta: [
    {
      name: 'viewport',
      content: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0',
      tagPosition: 'head',
    },
    {
      name: 'theme-color',
      content: '#10b981',
    },
  ],
  link: [
    {
      rel: 'icon',
      type: 'image/png',
      sizes: '32x32',
      href: '/icon-192.png',
    },
    {
      rel: 'icon',
      type: 'image/svg+xml',
      href: '/favicon.svg',
    },
    {
      rel: 'apple-touch-icon',
      href: '/apple-touch-icon.png',
    },
    {
      rel: 'canonical',
      href: siteUrl,
    },
    {
      rel: 'manifest',
      href: '/site.webmanifest',
    },
  ],
  script: [
    {
      type: 'application/ld+json',
      children: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        'name': title,
        'description': description,
        'url': siteUrl,
      }),
    },
  ],
})
</script>

<template>
  <NuxtLayout>
    <NuxtLoadingIndicator color="#000" />
    <NuxtPage />
    <Toaster />
  </NuxtLayout>
</template>
