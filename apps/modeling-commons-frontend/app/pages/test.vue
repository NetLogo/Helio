<template>
  <div class="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
    <div class="mx-auto max-w-2xl">
      <div class="rounded-lg bg-white shadow-lg">
        <div class="border-b border-slate-200 bg-slate-50 px-8 py-6">
          <h1 class="text-3xl font-bold text-slate-900">API Test</h1>
          <p class="mt-2 text-slate-600">Testing the backend connection</p>
        </div>

        <div class="p-8">
          <!-- Loading State -->
          <div v-if="loading" class="text-center">
            <div
              class="inline-block h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-blue-600"
            />
            <p class="mt-4 text-slate-600">Loading...</p>
          </div>

          <!-- Error State -->
          <div v-else-if="error" class="rounded-lg bg-red-50 p-4">
            <p class="font-semibold text-red-900">Error</p>
            <p class="mt-2 text-red-700">{{ error }}</p>
            <button
              class="mt-4 rounded bg-red-600 px-4 py-2 text-white hover:bg-red-700"
              @click="fetchData"
            >
              Retry
            </button>
          </div>

          <!-- Success State -->
          <div v-else-if="data" class="space-y-6">
            <div class="rounded-lg bg-green-50 p-4">
              <p class="text-sm font-semibold text-green-900">✓ Connected</p>
              <p class="mt-1 text-green-700">Backend is responding</p>
            </div>

            <div class="space-y-4">
              <div>
                <h2 class="text-sm font-semibold uppercase text-slate-500">Message</h2>
                <p class="mt-1 text-lg text-slate-900">{{ data.message }}</p>
              </div>

              <div>
                <h2 class="text-sm font-semibold uppercase text-slate-500">Data</h2>
                <div class="mt-3 space-y-2 rounded-lg bg-slate-50 p-4 font-mono text-sm">
                  <div>
                    <span class="text-slate-500">greeting:</span>
                    <span class="ml-2 text-blue-600">"{{ data.greeting }}"</span>
                  </div>
                  <div>
                    <span class="text-slate-500">version:</span>
                    <span class="ml-2 text-blue-600">"{{ data.version }}"</span>
                  </div>
                  <div>
                    <span class="text-slate-500">environment:</span>
                    <span class="ml-2 text-blue-600">"{{ data.environment }}"</span>
                  </div>
                </div>
              </div>

              <div>
                <h2 class="text-sm font-semibold uppercase text-slate-500">Timestamp</h2>
                <p class="mt-1 text-slate-600">
                  {{ formatTime(data.timestamp ?? new Date().toISOString()) }}
                </p>
              </div>
            </div>

            <button
              class="w-full rounded bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700"
              @click="fetchData"
            >
              Refresh
            </button>
          </div>
        </div>
      </div>

      <!-- API Info -->
      <div class="mt-8 rounded-lg bg-white p-6 shadow-md">
        <h3 class="font-semibold text-slate-900">API Configuration</h3>
        <div class="mt-3 space-y-2 font-mono text-sm text-slate-600">
          <p>
            Base URL: <span class="text-slate-900">{{ apiBase }}</span>
          </p>
          <p>Endpoint: <span class="text-slate-900">GET /v1/test</span></p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface TestData {
  greeting: string;
  version: string;
  environment: string;
  timestamp?: string;
  message?: string;
}

const { get } = useApi();
const config = useRuntimeConfig();
const apiBase = config.public.apiBase;

const data = ref<TestData | null>(null);
const loading = ref(false);
const error = ref<string | null>(null);

async function fetchData() {
  loading.value = true;
  error.value = null;
  data.value = null;

  try {
    const response = await get<TestData>("/v1/test");
    data.value = response;
  } catch (err) {
    error.value = err instanceof Error ? err.message : "Failed to fetch test data";
    console.error("Test API error:", err);
  } finally {
    loading.value = false;
  }
}

function formatTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleString();
}

onMounted(() => {
  fetchData();
});
</script>
