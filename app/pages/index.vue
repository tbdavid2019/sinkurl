<script setup>
import { marked } from 'marked'

const appConfig = useAppConfig()
const { company } = appConfig
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

definePageMeta({
  layout: false,
})

const enterpriseSettings = ref({ enabled: false, content: '' })
const loading = ref(true)

const renderedHtml = computed(() => {
  try {
    return marked.parse(enterpriseSettings.value.content || '')
  }
  catch {
    return enterpriseSettings.value.content
  }
})

useHead({
  title: computed(() => {
    if (enterpriseSettings.value.enabled && enterpriseSettings.value.companyName) {
      return enterpriseSettings.value.companyName
    }
    return company?.name ? `${company.name} - ${company.nameEnglish || ''}` : 'Company Profile'
  }),
})

onMounted(async () => {
  try {
    const data = await $fetch('/api/public/settings/enterprise')
    if (data) {
      enterpriseSettings.value = data
    }
  }
  catch (error) {
    console.error('Failed to fetch enterprise settings:', error)
  }
  finally {
    loading.value = false
  }
})
</script>

<template>
  <main
    class="
      flex min-h-screen items-center justify-center bg-gradient-to-br
      from-gray-50 to-gray-100 py-12
      dark:from-gray-900 dark:to-gray-800
    "
  >
    <!-- Loading state -->
    <div
      v-if="loading" class="flex flex-col items-center justify-center space-y-4"
    >
      <div
        class="
          h-8 w-8 animate-spin rounded-full border-4 border-emerald-500
          border-t-transparent
        "
      />
      <p
        class="
          text-sm text-gray-500
          dark:text-gray-400
        "
      >
        Loading...
      </p>
    </div>

    <!-- Render Custom Markdown if Enabled -->
    <div
      v-else-if="enterpriseSettings.enabled && enterpriseSettings.content"
      class="
        mx-4 w-full max-w-3xl rounded-2xl border border-zinc-200 bg-white p-8
        shadow-xl
        dark:border-zinc-800 dark:bg-zinc-900
      "
    >
      <div class="markdown-body" v-html="renderedHtml" />
    </div>

    <!-- Fallback default layout -->
    <div
      v-else class="
        mx-4 max-w-2xl rounded-lg bg-white p-8 shadow-lg
        dark:bg-gray-800
      "
    >
      <h1
        class="
          mb-6 text-center text-3xl font-bold text-gray-900
          dark:text-gray-100
        "
      >
        {{ company?.name || 'Your Company Name' }}
      </h1>
      <h2
        v-if="company?.nameEnglish" class="
          mb-8 text-center text-xl font-semibold text-gray-700
          dark:text-gray-300
        "
      >
        {{ company.nameEnglish }}
      </h2>
      <div
        class="
          space-y-4 text-gray-700
          dark:text-gray-300
        "
      >
        <div
          v-if="company?.taxId" class="
            flex flex-col
            md:flex-row md:items-center
          "
        >
          <span
            class="
              mr-2 mb-1 font-semibold
              md:mb-0
            "
          >統編 (Tax ID)：</span>
          <span>{{ company.taxId }}</span>
        </div>
        <div
          v-if="company?.representative" class="
            flex flex-col
            md:flex-row md:items-center
          "
        >
          <span
            class="
              mr-2 mb-1 font-semibold
              md:mb-0
            "
          >代表人 (Representative)：</span>
          <span>{{ company.representative }}</span>
        </div>
        <div
          v-if="company?.address || company?.addressEnglish" class="
            flex flex-col
          "
        >
          <span class="mb-2 font-semibold">地址 (Address)：</span>
          <div
            class="
              ml-0 space-y-1
              md:ml-4
            "
          >
            <p v-if="company.address">
              {{ company.address }}
            </p>
            <p
              v-if="company.addressEnglish" class="
                text-sm text-gray-600
                dark:text-gray-400
              "
            >
              {{ company.addressEnglish }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </main>
</template>

<style scoped>
.markdown-body :deep(h1) {
  font-size: 2.25rem;
  font-weight: 800;
  margin-top: 2rem;
  margin-bottom: 1.25rem;
  text-align: center;
  border-bottom: 2px solid var(--border);
  padding-bottom: 0.5rem;
}
.markdown-body :deep(h2) {
  font-size: 1.75rem;
  font-weight: 700;
  margin-top: 1.75rem;
  margin-bottom: 1rem;
  border-bottom: 1px solid var(--border);
  padding-bottom: 0.25rem;
}
.markdown-body :deep(h3) {
  font-size: 1.35rem;
  font-weight: 600;
  margin-top: 1.5rem;
  margin-bottom: 0.75rem;
}
.markdown-body :deep(p) {
  margin-bottom: 1.25rem;
  line-height: 1.75;
}
.markdown-body :deep(ul) {
  list-style-type: disc;
  padding-left: 1.75rem;
  margin-bottom: 1.25rem;
}
.markdown-body :deep(ol) {
  list-style-type: decimal;
  padding-left: 1.75rem;
  margin-bottom: 1.25rem;
}
.markdown-body :deep(li) {
  margin-bottom: 0.5rem;
}
.markdown-body :deep(code) {
  font-family: monospace;
  font-size: 0.9em;
  background-color: oklch(0.97 0 0);
  padding: 0.2rem 0.4rem;
  border-radius: 0.25rem;
}
.dark .markdown-body :deep(code) {
  background-color: oklch(0.269 0 0);
}
.markdown-body :deep(pre) {
  background-color: oklch(0.97 0 0);
  padding: 1.25rem;
  border-radius: 0.75rem;
  overflow-x: auto;
  margin-bottom: 1.25rem;
}
.dark .markdown-body :deep(pre) {
  background-color: oklch(0.269 0 0);
}
.markdown-body :deep(pre code) {
  background-color: transparent;
  padding: 0;
  border-radius: 0;
}
.markdown-body :deep(a) {
  color: #10b981;
  text-decoration: underline;
  font-weight: 500;
}
.markdown-body :deep(blockquote) {
  border-left: 4px solid var(--border);
  padding-left: 1.25rem;
  color: var(--muted-foreground);
  font-style: italic;
  margin-bottom: 1.25rem;
}
.markdown-body :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 1.25rem;
}
.markdown-body :deep(th),
.markdown-body :deep(td) {
  border: 1px solid var(--border);
  padding: 0.75rem 1rem;
}
.markdown-body :deep(th) {
  background-color: oklch(0.97 0 0);
  font-weight: 600;
}
.dark .markdown-body :deep(th) {
  background-color: oklch(0.269 0 0);
}
</style>
