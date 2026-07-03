<script setup>
const appConfig = useAppConfig()
const { data: seoSettings } = await useFetch('/api/public/settings/seo', {
  default: () => ({
    title: '',
    description: '',
    image: '',
    siteName: '',
  }),
})

const siteTitle = computed(() => seoSettings.value.title || appConfig.title)
const siteDescription = computed(() => seoSettings.value.description || appConfig.description)
const siteImage = computed(() => seoSettings.value.image || appConfig.image)
const siteName = computed(() => seoSettings.value.siteName || siteTitle.value)

useSeoMeta({
  title: computed(() => `${siteTitle.value} - ${siteDescription.value}`),
  description: siteDescription,
  ogType: 'website',
  ogTitle: siteTitle,
  ogSiteName: siteName,
  ogDescription: siteDescription,
  ogImage: siteImage,
  twitterTitle: siteTitle,
  twitterDescription: siteDescription,
  twitterImage: siteImage,
  twitterCard: 'summary_large_image',
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
  ],
  link: [
    {
      rel: 'icon',
      type: 'image/png',
      href: '/icon-192.png',
    },
    {
      rel: 'apple-touch-icon',
      href: '/apple-touch-icon.png',
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
