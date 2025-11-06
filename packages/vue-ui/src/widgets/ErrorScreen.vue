<script setup lang="ts">
import { computed } from 'vue'

type Props = {
  errorCode: number
  errorDetails?: string
}

const props = withDefaults(defineProps<Props>(), {
  errorDetails: '',
})

defineEmits<{
  handle: []
}>()

const errorMeta = {
  400: {
    message: 'Bad Request',
    details: 'The server could not understand the request due to invalid syntax.',
  },
  401: {
    message: 'Unauthorized',
    details: 'You are not authorized to access this resource.',
  },
  403: {
    message: 'Forbidden',
    details: 'Access to this resource is forbidden.',
  },
  404: {
    message: 'Page Not Found',
    details:
      'Hmm. Looks like the page you were looking for does not exist. It might have been moved or deleted. Please check the URL or return to the homepage.',
  },
  500: {
    message: 'Internal Server Error',
    details: 'An internal server error occurred.',
  },
  502: {
    message: 'Bad Gateway',
    details: 'The server received an invalid response from an upstream server.',
  },
  503: {
    message: 'Service Unavailable',
    details: 'The server is temporarily unable to handle the request.',
  },
  504: {
    message: 'Gateway Timeout',
    details: 'The server did not receive a timely response from an upstream server.',
  },
}

const errorMessage = computed(() => {
  return props.errorCode in errorMeta ? errorMeta[props.errorCode as keyof typeof errorMeta].message : 'Unknown Error'
})

export type { Props }
</script>

<template>
  <div class="flex flex-col prose">
    <h1 class="text-4xl bg-red-500 mt-0 w-full text-left">{{ errorCode }} - {{ errorMessage }}</h1>
    <p v-if="errorDetails" class="mt-4 text-md text-gray-600 max-w-[80ch]">
      {{ errorDetails }}
    </p>
    <slot name="actions">
      <div v-if="$slots['actions']">
        <slot name="actions" />
      </div>
      <div v-else class="mt-6 flex gap-4">
        <Button variant="default" @click="$emit('handle')"> Go to Home </Button>
        <Button variant="outline" as-child>
          <NuxtLink to="https://www.netlogo.org"> Go to NetLogo's Website </NuxtLink>
        </Button>
      </div>
    </slot>
  </div>
</template>
