<script setup>
import { LinkSchema, nanoid } from '@@/schemas/link'
import { toTypedSchema } from '@vee-validate/zod'
import { Shuffle, Sparkles } from 'lucide-vue-next'
import { getQuery } from 'ufo'
import { useForm } from 'vee-validate'
import { toast } from 'vue-sonner'
import { z } from 'zod'
import { DependencyType } from '@/components/ui/auto-form/interface'

const props = defineProps({
  link: {
    type: Object,
    default: () => ({}),
  },
})

const emit = defineEmits(['update:link'])

const { t } = useI18n()
const link = ref(props.link)
const dialogOpen = ref(false)

const isEdit = !!props.link.id

const EditLinkSchema = LinkSchema.pick({
  url: true,
  slug: true,
}).extend({
  optional: LinkSchema.omit({
    id: true,
    url: true,
    slug: true,
    createdAt: true,
    updatedAt: true,
    title: true,
    description: true,
    image: true,
  }).extend({
    expiration: z.coerce.date().optional(),
    utm_source: z.string().trim().max(2048).optional(),
    utm_medium: z.string().trim().max(2048).optional(),
    utm_campaign: z.string().trim().max(2048).optional(),
    utm_term: z.string().trim().max(2048).optional(),
    utm_content: z.string().trim().max(2048).optional(),
  }).optional(),
})

const fieldConfig = {
  slug: {
    disabled: isEdit,
  },
  optional: {
    comment: {
      component: 'textarea',
    },
    transitionMode: {
      label: 'Interstitial Page Mode',
      description: 'Choose whether this link shows the transition/warning page. "Inherit" follows the global mode; Default redirects directly, Force All Links still shows it.',
    },
    transitionHtml: {
      component: 'textarea',
      label: 'Transition Page HTML',
      description: 'Custom HTML to display on the transition page (e.g. advertisements, safety notices, or site info).',
    },
    utm_source: {
      label: 'UTM Source',
      description: 'e.g., google, newsletter4',
    },
    utm_medium: {
      label: 'UTM Medium',
      description: 'e.g., cpc, email',
    },
    utm_campaign: {
      label: 'UTM Campaign',
      description: 'e.g., spring_sale',
    },
    utm_term: {
      label: 'UTM Term',
      description: 'e.g., running+shoes',
    },
    utm_content: {
      label: 'UTM Content',
      description: 'e.g., logolink or textlink',
    },
  },
}

const dependencies = [
  {
    sourceField: 'slug',
    type: DependencyType.DISABLES,
    targetField: 'slug',
    when: () => isEdit,
  },
  {
    sourceField: 'optional.transitionMode',
    type: DependencyType.HIDES,
    targetField: 'optional.transitionHtml',
    when: mode => mode === 'off',
  },
]

function getInitialUTMs(urlStr) {
  try {
    const q = getQuery(urlStr || '')
    return {
      utm_source: q.utm_source || undefined,
      utm_medium: q.utm_medium || undefined,
      utm_campaign: q.utm_campaign || undefined,
      utm_term: q.utm_term || undefined,
      utm_content: q.utm_content || undefined,
    }
  }
  catch { return {} }
}

const form = useForm({
  validationSchema: toTypedSchema(EditLinkSchema),
  initialValues: {
    slug: link.value.slug,
    url: link.value.url,
    optional: {
      comment: link.value.comment,
      transitionMode: link.value.transitionMode || 'inherit',
      transitionHtml: link.value.transitionHtml || '',
      ...getInitialUTMs(link.value.url),
    },
  },
  validateOnMount: isEdit,
  keepValuesOnUnmount: isEdit,
})

watch(() => form.values.url, (newUrl) => {
  if (!newUrl)
    return
  try {
    const q = getQuery(newUrl)
    if (q.utm_source !== form.values.optional?.utm_source)
      form.setFieldValue('optional.utm_source', q.utm_source)
    if (q.utm_medium !== form.values.optional?.utm_medium)
      form.setFieldValue('optional.utm_medium', q.utm_medium)
    if (q.utm_campaign !== form.values.optional?.utm_campaign)
      form.setFieldValue('optional.utm_campaign', q.utm_campaign)
    if (q.utm_term !== form.values.optional?.utm_term)
      form.setFieldValue('optional.utm_term', q.utm_term)
    if (q.utm_content !== form.values.optional?.utm_content)
      form.setFieldValue('optional.utm_content', q.utm_content)
  }
  catch {}
})

watch(() => [
  form.values.optional?.utm_source,
  form.values.optional?.utm_medium,
  form.values.optional?.utm_campaign,
  form.values.optional?.utm_term,
  form.values.optional?.utm_content,
], ([source, medium, campaign, term, content]) => {
  if (!form.values.url)
    return
  try {
    const urlObj = new URL(form.values.url)
    if (source) {
      urlObj.searchParams.set('utm_source', source.trim())
    }
    else {
      urlObj.searchParams.delete('utm_source')
    }
    if (medium) {
      urlObj.searchParams.set('utm_medium', medium.trim())
    }
    else {
      urlObj.searchParams.delete('utm_medium')
    }
    if (campaign) {
      urlObj.searchParams.set('utm_campaign', campaign.trim())
    }
    else {
      urlObj.searchParams.delete('utm_campaign')
    }
    if (term) {
      urlObj.searchParams.set('utm_term', term.trim())
    }
    else {
      urlObj.searchParams.delete('utm_term')
    }
    if (content) {
      urlObj.searchParams.set('utm_content', content.trim())
    }
    else {
      urlObj.searchParams.delete('utm_content')
    }
    const newUrlString = urlObj.toString()
    if (form.values.url !== newUrlString) {
      form.setFieldValue('url', newUrlString)
    }
  }
  catch {}
}, { deep: true })

function randomSlug() {
  form.setFieldValue('slug', nanoid()())
}

const aiSlugPending = ref(false)
async function aiSlug() {
  if (!form.values.url)
    return

  aiSlugPending.value = true
  try {
    const { slug } = await useAPI('/api/link/ai', {
      query: {
        url: form.values.url,
      },
    })
    form.setFieldValue('slug', slug)
  }
  catch (error) {
    console.log(error)
  }
  aiSlugPending.value = false
}

onMounted(() => {
  if (link.value.expiration) {
    form.setFieldValue('optional.expiration', unix2date(link.value.expiration))
  }
})

async function onSubmit(formData) {
  const link = {
    url: formData.url,
    slug: formData.slug,
    ...(formData.optional || []),
    transitionMode: formData.optional?.transitionMode || 'inherit',
    transitionHtml: formData.optional?.transitionHtml || '',
    expiration: formData.optional?.expiration ? date2unix(formData.optional?.expiration, 'end') : undefined,
  }
  const { link: newLink } = await useAPI(isEdit ? '/api/link/edit' : '/api/link/create', {
    method: isEdit ? 'PUT' : 'POST',
    body: link,
  })
  dialogOpen.value = false
  emit('update:link', newLink, isEdit ? 'edit' : 'create')
  if (isEdit) {
    toast(t('links.update_success'))
  }
  else {
    toast(t('links.create_success'))
  }
}

const { previewMode } = useRuntimeConfig().public
</script>

<template>
  <Dialog v-model:open="dialogOpen">
    <DialogTrigger as-child>
      <slot>
        <Button
          class="ml-2"
          variant="outline"
          @click="randomSlug"
        >
          {{ $t('links.create') }}
        </Button>
      </slot>
    </DialogTrigger>
    <DialogContent
      class="
        max-h-[95svh] max-w-[95svw] grid-rows-[auto_minmax(0,1fr)_auto]
        md:max-w-lg
      "
    >
      <DialogHeader>
        <DialogTitle>{{ link.id ? $t('links.edit') : $t('links.create') }}</DialogTitle>
      </DialogHeader>
      <p
        v-if="previewMode"
        class="text-sm text-muted-foreground"
      >
        {{ $t('links.preview_mode_tip') }}
      </p>
      <AutoForm
        class="space-y-2 overflow-y-auto px-2"
        :schema="EditLinkSchema"
        :form="form"
        :field-config="fieldConfig"
        :dependencies="dependencies"
        @submit="onSubmit"
      >
        <template #slug="slotProps">
          <div
            v-if="!isEdit"
            class="relative"
          >
            <div class="absolute top-0 right-0 flex space-x-3">
              <Shuffle
                class="h-4 w-4 cursor-pointer"
                @click="randomSlug"
              />
              <Sparkles
                class="h-4 w-4 cursor-pointer"
                :class="{ 'animate-bounce': aiSlugPending }"
                @click="aiSlug"
              />
            </div>
            <AutoFormField
              v-bind="slotProps"
            />
          </div>
        </template>
        <DialogFooter>
          <DialogClose as-child>
            <Button
              type="button"
              variant="secondary"
              class="
                mt-2
                sm:mt-0
              "
            >
              {{ $t('common.close') }}
            </Button>
          </DialogClose>
          <Button type="submit">
            {{ $t('common.save') }}
          </Button>
        </DialogFooter>
      </AutoForm>
    </DialogContent>
  </Dialog>
</template>
