<script setup>
import { TransitionModeSchema } from '@@/schemas/settings'
import { marked } from 'marked'
import { toast } from 'vue-sonner'

// Enterprise settings
const enabled = ref(false)
const companyName = ref('')
const content = ref('')
const loadingEnterprise = ref(false)

// Transition settings
const transitionMode = ref('disabled')
const transitionContent = ref('')
const loadingTransition = ref(false)
const transitionEnabled = computed(() => transitionMode.value !== 'disabled')
const transitionModeOptions = TransitionModeSchema.options

const loading = computed(() => loadingEnterprise.value || loadingTransition.value)

async function fetchEnterpriseSettings() {
  loadingEnterprise.value = true
  try {
    const data = await useAPI('/api/public/settings/enterprise')
    enabled.value = data?.enabled || false
    companyName.value = data?.companyName || ''
    content.value = data?.content || ''
  }
  catch (error) {
    console.error('Failed to fetch enterprise settings:', error)
    toast.error('Failed to load enterprise settings')
  }
  finally {
    loadingEnterprise.value = false
  }
}

async function saveEnterpriseSettings() {
  loadingEnterprise.value = true
  try {
    await useAPI('/api/settings/enterprise', {
      method: 'POST',
      body: {
        enabled: enabled.value,
        companyName: companyName.value,
        content: content.value,
      },
    })
    toast.success('Enterprise settings saved successfully')
  }
  catch (error) {
    console.error('Failed to save enterprise settings:', error)
    toast.error('Failed to save enterprise settings')
  }
  finally {
    loadingEnterprise.value = false
  }
}

async function fetchTransitionSettings() {
  loadingTransition.value = true
  try {
    const data = await useAPI('/api/public/settings/transition')
    transitionMode.value = data?.mode || 'disabled'
    transitionContent.value = data?.content || ''
  }
  catch (error) {
    console.error('Failed to fetch transition settings:', error)
    toast.error('Failed to load transition settings')
  }
  finally {
    loadingTransition.value = false
  }
}

async function saveTransitionSettings() {
  loadingTransition.value = true
  try {
    await useAPI('/api/settings/transition', {
      method: 'POST',
      body: {
        mode: transitionMode.value,
        content: transitionContent.value,
      },
    })
    toast.success('Transition settings saved successfully')
  }
  catch (error) {
    console.error('Failed to save transition settings:', error)
    toast.error('Failed to save transition settings')
  }
  finally {
    loadingTransition.value = false
  }
}

const previewHtml = computed(() => {
  try {
    return marked.parse(content.value || '')
  }
  catch {
    return content.value
  }
})

const previewTransitionHtml = computed(() => {
  try {
    return marked.parse(transitionContent.value || '')
  }
  catch {
    return transitionContent.value
  }
})

onMounted(() => {
  fetchEnterpriseSettings()
  fetchTransitionSettings()
})
</script>

<template>
  <div class="space-y-6">
    <DashboardNav />

    <Tabs
      default-value="enterprise"
      class="w-full"
    >
      <TabsList class="grid max-w-[400px] grid-cols-2">
        <TabsTrigger value="enterprise">
          Enterprise Panel
        </TabsTrigger>
        <TabsTrigger value="transition">
          Transition Page
        </TabsTrigger>
      </TabsList>

      <!-- Enterprise Panel Tab Content -->
      <TabsContent
        value="enterprise"
        class="mt-6"
      >
        <div
          class="
            grid grid-cols-1 gap-6
            lg:grid-cols-12
          "
        >
          <!-- Left Config Card -->
          <Card
            class="
              flex h-full flex-col overflow-hidden rounded-xl border
              border-zinc-200 bg-white shadow-md
              lg:col-span-7
              dark:border-zinc-800 dark:bg-zinc-900
            "
          >
            <CardHeader
              class="
                border-b border-zinc-200 px-6 py-4
                dark:border-zinc-800
              "
            >
              <CardTitle class="text-xl font-bold tracking-tight">
                Enterprise Panel Settings
              </CardTitle>
              <CardDescription
                class="
                  text-zinc-500
                  dark:text-zinc-400
                "
              >
                Customize the homepage layout and corporate profile display.
              </CardDescription>
            </CardHeader>

            <CardContent class="flex-1 space-y-6 p-6">
              <!-- Toggle Field -->
              <div
                class="
                  flex items-center justify-between rounded-xl border
                  border-zinc-100 bg-zinc-50 p-4
                  dark:border-zinc-800 dark:bg-zinc-950
                "
              >
                <div class="space-y-0.5 pr-4">
                  <label
                    for="enable-panel" class="
                      cursor-pointer text-sm font-semibold tracking-wide
                    "
                  >Enable Enterprise Panel</label>
                  <p
                    class="
                      text-xs text-zinc-500
                      dark:text-zinc-400
                    "
                  >
                    Replace the default app introduction page with a custom corporate information page.
                  </p>
                </div>
                <button
                  id="enable-panel"
                  type="button"
                  role="switch"
                  :aria-checked="enabled"
                  :disabled="loading"
                  class="
                    relative inline-flex h-6 w-11 shrink-0 cursor-pointer
                    rounded-full border-2 border-transparent transition-colors
                    duration-200 ease-in-out
                    focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2
                    focus:outline-none
                    disabled:cursor-not-allowed disabled:opacity-50
                  "
                  :class="enabled ? `
                    bg-emerald-500
                    dark:bg-emerald-600
                  ` : `
                    bg-zinc-200
                    dark:bg-zinc-800
                  `"
                  @click="enabled = !enabled"
                >
                  <span
                    aria-hidden="true"
                    class="
                      pointer-events-none inline-block h-5 w-5 transform
                      rounded-full bg-white shadow ring-0 transition
                      duration-200 ease-in-out
                    "
                    :class="enabled ? 'translate-x-5' : 'translate-x-0'"
                  />
                </button>
              </div>

              <!-- Company Name Input -->
              <div class="flex flex-col space-y-2">
                <label class="text-sm font-semibold tracking-wide">Company Name (公司名稱)</label>
                <input
                  v-model="companyName"
                  type="text"
                  class="
                    w-full rounded-xl border border-zinc-200 bg-zinc-50 p-3
                    text-sm
                    focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500
                    focus:outline-none
                    dark:border-zinc-800 dark:bg-zinc-950
                  "
                  placeholder="e.g., 資旅軟體開發有限公司"
                  :disabled="loading || !enabled"
                >
              </div>

              <!-- Markdown Editor Field -->
              <div class="flex flex-1 flex-col space-y-2">
                <div class="flex items-center justify-between">
                  <label class="text-sm font-semibold tracking-wide">Homepage Content (Markdown)</label>
                  <span class="text-xs text-zinc-400">Supports Github Flavored Markdown</span>
                </div>
                <textarea
                  v-model="content"
                  class="
                    min-h-[350px] w-full flex-1 resize-y rounded-xl border
                    border-zinc-200 bg-zinc-50 p-4 font-mono text-sm
                    leading-relaxed transition duration-150
                    focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500
                    focus:outline-none
                    dark:border-zinc-800 dark:bg-zinc-950
                  "
                  placeholder="Type your company information or custom markdown here..."
                  :disabled="loading || !enabled"
                />
              </div>
            </CardContent>

            <CardFooter
              class="
                flex justify-end border-t border-zinc-200 px-6 py-4
                dark:border-zinc-800
              "
            >
              <Button
                :disabled="loading"
                class="
                  bg-emerald-500 px-6 py-2 font-medium text-white shadow-sm
                  transition
                  hover:bg-emerald-600
                  dark:bg-emerald-600 dark:hover:bg-emerald-500
                "
                @click="saveEnterpriseSettings"
              >
                <span
                  v-if="loadingEnterprise" class="
                    mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white
                    border-t-transparent
                  "
                />
                Save Settings
              </Button>
            </CardFooter>
          </Card>

          <!-- Right Live Preview Card -->
          <Card
            class="
              flex h-[580px] flex-col overflow-hidden rounded-xl border
              border-zinc-200 bg-white shadow-md
              lg:col-span-5
              dark:border-zinc-800 dark:bg-zinc-900
            "
          >
            <CardHeader
              class="
                border-b border-zinc-200 bg-zinc-50/50 px-6 py-4
                dark:border-zinc-800 dark:bg-zinc-950/20
              "
            >
              <CardTitle class="text-lg font-bold tracking-tight">
                Live Preview
              </CardTitle>
              <CardDescription
                class="
                  text-zinc-500
                  dark:text-zinc-400
                "
              >
                Real-time preview of how the homepage content will render.
              </CardDescription>
            </CardHeader>

            <CardContent
              class="
                flex-1 overflow-y-auto bg-zinc-50/30 p-6
                dark:bg-zinc-950/10
              "
            >
              <div
                v-if="!enabled" class="
                  flex h-full flex-col items-center justify-center space-y-3 p-8
                  text-center
                "
              >
                <div
                  class="
                    rounded-full bg-zinc-100 p-3 text-zinc-400
                    dark:bg-zinc-800
                  "
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="
                      h-8 w-8
                    "
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                </div>
                <h3
                  class="
                    text-sm font-semibold text-zinc-700
                    dark:text-zinc-300
                  "
                >
                  Enterprise Panel Disabled
                </h3>
                <p class="max-w-xs text-xs text-zinc-400">
                  Preview will only update and be shown on the homepage when the toggle is enabled.
                </p>
              </div>
              <div
                v-else-if="!content" class="
                  flex h-full flex-col items-center justify-center text-center
                  text-zinc-400
                "
              >
                Type something on the left to see the preview.
              </div>
              <div
                v-else
                class="markdown-preview"
                v-html="previewHtml"
              />
            </CardContent>
          </Card>
        </div>
      </TabsContent>

      <!-- Global Transition Page Tab Content -->
      <TabsContent
        value="transition"
        class="mt-6"
      >
        <div
          class="
            grid grid-cols-1 gap-6
            lg:grid-cols-12
          "
        >
          <!-- Left Config Card -->
          <Card
            class="
              flex h-full flex-col overflow-hidden rounded-xl border
              border-zinc-200 bg-white shadow-md
              lg:col-span-7
              dark:border-zinc-800 dark:bg-zinc-900
            "
          >
            <CardHeader
              class="
                border-b border-zinc-200 px-6 py-4
                dark:border-zinc-800
              "
            >
              <CardTitle class="text-xl font-bold tracking-tight">
                Global Transition Page Settings
              </CardTitle>
              <CardDescription
                class="
                  text-zinc-500
                  dark:text-zinc-400
                "
              >
                Configure default intermediate warning or landing pages for short URLs.
              </CardDescription>
            </CardHeader>

            <CardContent class="flex-1 space-y-6 p-6">
              <div
                class="
                  flex flex-col gap-4 rounded-xl border border-zinc-100
                  bg-zinc-50 p-4
                  dark:border-zinc-800 dark:bg-zinc-950
                "
              >
                <div class="space-y-0.5">
                  <label class="text-sm font-semibold tracking-wide">Global Transition Mode</label>
                  <p
                    class="
                      text-xs text-zinc-500
                      dark:text-zinc-400
                    "
                  >
                    `Disabled` means no global transition page. `Default` lets each short link use `inherit/on/off`. `Force All Links` ignores per-link opt-out.
                  </p>
                </div>
                <select
                  v-model="transitionMode"
                  class="
                    w-full rounded-xl border border-zinc-200 bg-white p-3
                    text-sm
                    focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500
                    focus:outline-none
                    disabled:cursor-not-allowed disabled:opacity-50
                    dark:border-zinc-800 dark:bg-zinc-900
                  "
                  :disabled="loading"
                >
                  <option value="disabled">
                    Disabled
                  </option>
                  <option
                    v-if="transitionModeOptions.includes('inherit')"
                    value="inherit"
                  >
                    Default
                  </option>
                  <option
                    v-if="transitionModeOptions.includes('force')"
                    value="force"
                  >
                    Force All Links
                  </option>
                </select>
              </div>

              <!-- HTML/Markdown Editor Field -->
              <div class="flex flex-1 flex-col space-y-2">
                <div class="flex items-center justify-between">
                  <label class="text-sm font-semibold tracking-wide">Transition Page Content (HTML/Markdown)</label>
                  <span class="text-xs text-zinc-400">Supports custom HTML (e.g. Google Ads, warning labels)</span>
                </div>
                <textarea
                  v-model="transitionContent"
                  class="
                    min-h-[350px] w-full flex-1 resize-y rounded-xl border
                    border-zinc-200 bg-zinc-50 p-4 font-mono text-sm
                    leading-relaxed transition duration-150
                    focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500
                    focus:outline-none
                    dark:border-zinc-800 dark:bg-zinc-950
                  "
                  placeholder="Leave empty to use the default 'Leaving current site' warning alert..."
                  :disabled="loading || !transitionEnabled"
                />
              </div>
            </CardContent>

            <CardFooter
              class="
                flex justify-end border-t border-zinc-200 px-6 py-4
                dark:border-zinc-800
              "
            >
              <Button
                :disabled="loading"
                class="
                  bg-emerald-500 px-6 py-2 font-medium text-white shadow-sm
                  transition
                  hover:bg-emerald-600
                  dark:bg-emerald-600 dark:hover:bg-emerald-500
                "
                @click="saveTransitionSettings"
              >
                <span
                  v-if="loadingTransition" class="
                    mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white
                    border-t-transparent
                  "
                />
                Save Settings
              </Button>
            </CardFooter>
          </Card>

          <!-- Right Live Preview Card -->
          <Card
            class="
              flex h-[580px] flex-col overflow-hidden rounded-xl border
              border-zinc-200 bg-white shadow-md
              lg:col-span-5
              dark:border-zinc-800 dark:bg-zinc-900
            "
          >
            <CardHeader
              class="
                border-b border-zinc-200 bg-zinc-50/50 px-6 py-4
                dark:border-zinc-800 dark:bg-zinc-950/20
              "
            >
              <CardTitle class="text-lg font-bold tracking-tight">
                Live Preview
              </CardTitle>
              <CardDescription
                class="
                  text-zinc-500
                  dark:text-zinc-400
                "
              >
                Mockup of the transition page displaying to visitors.
              </CardDescription>
            </CardHeader>

            <CardContent
              class="
                flex-1 overflow-y-auto bg-zinc-50/30 p-6
                dark:bg-zinc-950/10
              "
            >
              <div
                v-if="!transitionEnabled" class="
                  flex h-full flex-col items-center justify-center space-y-3 p-8
                  text-center
                "
              >
                <div
                  class="
                    rounded-full bg-zinc-100 p-3 text-zinc-400
                    dark:bg-zinc-800
                  "
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="
                      h-8 w-8
                    "
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                </div>
                <h3
                  class="
                    text-sm font-semibold text-zinc-700
                    dark:text-zinc-300
                  "
                >
                  Transition Page Disabled
                </h3>
                <p class="max-w-xs text-xs text-zinc-400">
                  Global transition page is disabled. Only links explicitly set to `on` will show the transition page.
                </p>
              </div>
              <div
                v-else
                class="space-y-6"
              >
                <!-- Transition Page Card Mockup -->
                <div
                  class="
                    flex flex-col items-center space-y-4 rounded-xl border
                    border-slate-200 bg-white p-5 text-xs shadow-lg
                    dark:border-slate-800 dark:bg-slate-900
                  "
                >
                  <div
                    v-if="transitionContent"
                    class="
                      w-full text-slate-800
                      dark:text-slate-100
                    "
                    v-html="previewTransitionHtml"
                  />
                  <div
                    v-else
                    class="flex flex-col items-center space-y-2 text-center"
                  >
                    <div
                      class="
                        rounded-full bg-emerald-50 p-2 text-emerald-500
                        dark:bg-emerald-900/20
                      "
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="
                          h-6 w-6
                        "
                      >
                        <path stroke-linecap="round" stroke-linejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                      </svg>
                    </div>
                    <h4 class="font-bold">
                      Leaving Current Site
                    </h4>
                    <p class="text-[10px] text-slate-400">
                      You are being redirected to an external site. Please make sure the destination URL is safe.
                    </p>
                  </div>

                  <div
                    class="
                      w-full rounded-lg border border-slate-100 bg-slate-50
                      p-2.5 text-center font-mono text-[10px] break-all
                      text-emerald-500
                      dark:border-slate-800 dark:bg-slate-950
                    "
                  >
                    https://example.com/destination-url
                  </div>

                  <div class="flex w-full flex-col items-center space-y-2">
                    <span class="text-slate-400">Redirecting in 5 seconds...</span>
                    <div
                      class="
                        h-1 w-full overflow-hidden rounded-full bg-slate-100
                        dark:bg-slate-800
                      "
                    >
                      <div class="h-full w-3/4 bg-emerald-500" />
                    </div>
                    <div class="flex w-full space-x-2 pt-1">
                      <button
                        class="
                          flex-1 rounded-lg bg-slate-100 py-1.5 text-[10px]
                          font-medium
                          dark:bg-slate-800
                        "
                        disabled
                      >
                        Stop
                      </button>
                      <button
                        class="
                          flex-1 rounded-lg bg-emerald-500 py-1.5 text-[10px]
                          font-medium text-white
                        "
                        disabled
                      >
                        Go
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </TabsContent>
    </Tabs>
  </div>
</template>

<style scoped>
.markdown-preview :deep(h1),
.markdown-preview :deep(h2),
.markdown-preview :deep(h3),
.markdown-preview :deep(p),
.markdown-preview :deep(ul),
.markdown-preview :deep(ol),
.markdown-preview :deep(li),
.markdown-preview :deep(code),
.markdown-preview :deep(pre),
.markdown-preview :deep(a),
.markdown-preview :deep(blockquote),
.markdown-preview :deep(table),
.markdown-preview :deep(th),
.markdown-preview :deep(td) {
  margin: inherit;
  padding: inherit;
  border: inherit;
  font: inherit;
  vertical-align: inherit;
}

.markdown-preview :deep(h1) {
  font-size: 1.875rem;
  font-weight: 800;
  margin-top: 1.5rem;
  margin-bottom: 1rem;
  border-bottom: 1px solid var(--border);
  padding-bottom: 0.25rem;
}
.markdown-preview :deep(h2) {
  font-size: 1.5rem;
  font-weight: 700;
  margin-top: 1.5rem;
  margin-bottom: 0.75rem;
}
.markdown-preview :deep(h3) {
  font-size: 1.25rem;
  font-weight: 600;
  margin-top: 1.25rem;
  margin-bottom: 0.5rem;
}
.markdown-preview :deep(p) {
  margin-bottom: 1rem;
  line-height: 1.625;
}
.markdown-preview :deep(ul) {
  list-style-type: disc;
  padding-left: 1.5rem;
  margin-bottom: 1rem;
}
.markdown-preview :deep(ol) {
  list-style-type: decimal;
  padding-left: 1.5rem;
  margin-bottom: 1rem;
}
.markdown-preview :deep(li) {
  margin-bottom: 0.25rem;
}
.markdown-preview :deep(code) {
  font-family: monospace;
  font-size: 0.875em;
  background-color: oklch(0.97 0 0);
  padding: 0.2rem 0.4rem;
  border-radius: 0.25rem;
}
.dark .markdown-preview :deep(code) {
  background-color: oklch(0.269 0 0);
}
.markdown-preview :deep(pre) {
  background-color: oklch(0.97 0 0);
  padding: 1rem;
  border-radius: 0.5rem;
  overflow-x: auto;
  margin-bottom: 1rem;
}
.dark .markdown-preview :deep(pre) {
  background-color: oklch(0.269 0 0);
}
.markdown-preview :deep(pre code) {
  background-color: transparent;
  padding: 0;
  border-radius: 0;
}
.markdown-preview :deep(a) {
  color: #10b981;
  text-decoration: underline;
}
.markdown-preview :deep(blockquote) {
  border-left: 4px solid var(--border);
  padding-left: 1rem;
  color: var(--muted-foreground);
  font-style: italic;
  margin-bottom: 1rem;
}
.markdown-preview :deep(table) {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 1rem;
}
.markdown-preview :deep(th),
.markdown-preview :deep(td) {
  border: 1px solid var(--border);
  padding: 0.5rem 0.75rem;
}
.markdown-preview :deep(th) {
  background-color: oklch(0.97 0 0);
  font-weight: 600;
}
.dark .markdown-preview :deep(th) {
  background-color: oklch(0.269 0 0);
}
</style>
