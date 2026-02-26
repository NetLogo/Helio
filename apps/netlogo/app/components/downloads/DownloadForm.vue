<template>
  <div class="download-form">
    <form @submit.prevent="handleFormSubmission" class="mt-1">
      <div class="grid grid-cols-12 items-center gap-x-4 my-4">
        <label for="first_name" class="text-lg font-semibold whitespace-nowrap sm:col-span-3">
          First Name<span v-if="formData.subscribe" class="text-red-500 ms-1">*</span>
        </label>
        <input
          id="first_name"
          v-model="formData.first_name"
          type="text"
          class="form-input sm:col-span-9"
          :required="formData.subscribe"
        />
      </div>

      <div class="grid grid-cols-12 items-center gap-x-4 my-4">
        <label for="last_name" class="text-lg font-semibold whitespace-nowrap sm:col-span-3">
          Last Name<span v-if="formData.subscribe" class="text-red-500 ms-1">*</span>
        </label>
        <input
          id="last_name"
          v-model="formData.last_name"
          type="text"
          class="form-input sm:col-span-9"
        />
      </div>

      <div class="grid grid-cols-12 items-center gap-x-4 my-4">
        <label for="email" class="text-lg font-semibold whitespace-nowrap sm:col-span-3">
          Email<span v-if="formData.subscribe" class="text-red-500 ms-1">*</span>
        </label>
        <div class="sm:col-span-9">
          <input
            id="email"
            v-model="formData.email"
            type="email"
            class="form-input"
            :required="formData.subscribe"
          />
          <div class="flex items-center mt-2">
            <input id="subscribe" v-model="formData.subscribe" type="checkbox" class="mr-2" />
            <label for="subscribe" class="text-sm">
              Update me on NetLogo news (including new releases)
            </label>
          </div>
        </div>
      </div>

      <div class="grid grid-cols-12 items-center gap-x-4 my-4">
        <label for="organization" class="text-lg font-semibold whitespace-nowrap sm:col-span-3"
          >Organization</label
        >
        <input
          id="organization"
          v-model="formData.organization"
          type="text"
          class="form-input sm:col-span-9"
        />
      </div>

      <div class="grid grid-cols-12 items-start gap-x-4 my-4">
        <label for="comments" class="text-lg font-semibold whitespace-nowrap sm:col-span-3 mt-1"
          >Comments</label
        >
        <div class="sm:col-span-9">
          <textarea id="comments" v-model="formData.comments" class="form-input w-full" rows="2" />
          <p class="text-sm text-gray-500 mt-1">
            For a response, write
            <a class="underline text-blue-600 ms-1" href="mailto:feedback@ccl.northwestern.edu">
              feedback@ccl.northwestern.edu
            </a>
          </p>
        </div>
      </div>

      <div class="mt-2">
        <span class="mr-4 font-bold">Version {{ formData.version }}</span>
        <span class="text-sm text-gray-500 mx-2">
          previous versions
          <a
            target="_blank"
            class="underline text-blue-600"
            href="https://ccl.northwestern.edu/netlogo/oldversions.shtml"
            >here</a
          >
        </span>
      </div>

      <div class="flex flex-row flex-wrap gap-2 mt-4 mb-3 items-center">
        <template v-for="link in filteredPlatforms" :key="link.platform">
          <button
            v-if="link.primary"
            type="submit"
            class="px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-lg font-semibold flex items-center gap-2"
            @click="selectedPlatform = link.platform"
          >
            <img :src="createImageURL(link.platform_icon.icon.id)" class="w-5 h-5" alt="" />
            Download {{ link.subplatform }}
          </button>

          <button
            v-else-if="!link.subplatform.includes('32-bit')"
            type="submit"
            class="px-5 py-3 border border-blue-600 text-blue-600 hover:bg-blue-50 rounded-lg text-lg font-semibold flex items-center gap-2"
            @click="selectedPlatform = link.platform"
          >
            <img :src="createImageURL(link.platform_icon.icon.id)" class="w-5 h-5" alt="" />
            Download {{ link.subplatform }}
          </button>

          <button
            v-else
            type="submit"
            class="p-0 m-0 border-0 bg-transparent mx-4 mt-2 text-blue-600 flex items-center gap-1 cursor-pointer"
            @click="selectedPlatform = link.platform"
          >
            <img :src="createImageURL(link.platform_icon.icon.id)" class="w-5 h-5" alt="" />
            Download {{ link.subplatform }} <span class="text-gray-500">(rare)</span>
          </button>
        </template>
      </div>
    </form>
  </div>
</template>

<script setup lang="ts">
import type { DownloadLink, NetLogoVersion } from "~/utils/api";

const props = defineProps<{
  versions: NetLogoVersion[];
  devOs: string;
}>();

const config = useRuntimeConfig();
const backendUrl = config.public.backendUrl as string;

const createImageURL = (imageId: string) => `${backendUrl}/assets/${imageId}`;

// Form data
const formData = reactive({
  version: "",
  platform: "",
  first_name: "",
  last_name: "",
  organization: "",
  email: "",
  subscribe: false,
  comments: "",
  ip: "",
  country: "",
  time_stamp: "",
});

// Track which download button was clicked
const selectedPlatform = ref("");

// Set default version on mount
onMounted(() => {
  if (props.versions.length > 0) {
    formData.version = props.versions[0].version;
  }
});

// Also handle if versions load after mount (SSR hydration)
watch(
  () => props.versions,
  (newVersions) => {
    if (newVersions.length > 0 && !formData.version) {
      formData.version = newVersions[0].version;
    }
  },
  { immediate: true },
);

// Compute download links filtered by the current OS
const filteredPlatforms = computed<DownloadLink[]>(() => {
  const version = props.versions.find((v) => v.version === formData.version);
  if (!version) return [];
  return version.download_links.filter((link) => link.platform.includes(props.devOs));
});

const submitToMautic = (data: typeof formData) => {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = "https://ccl.northwestern.edu/mautic/form/submit?formId=2";
  form.target = "mautic-hidden-iframe";
  form.style.display = "none";

  const fields: Record<string, string> = {
    "mauticform[first_name]": data.first_name,
    "mauticform[last_name]": data.last_name,
    "mauticform[email]": data.email,
    "mauticform[formId]": "2",
    "mauticform[return]": "",
    "mauticform[formName]": "emaillistsignup",
  };

  Object.entries(fields).forEach(([name, value]) => {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    form.appendChild(input);
  });

  let iframe = document.querySelector(
    'iframe[name="mautic-hidden-iframe"]',
  ) as HTMLIFrameElement | null;
  if (!iframe) {
    iframe = document.createElement("iframe");
    iframe.name = "mautic-hidden-iframe";
    iframe.style.display = "none";
    document.body.appendChild(iframe);
  }

  document.body.appendChild(form);
  form.submit();
};

const getFormattedTimestamp = () => {
  return new Date().toISOString();
};

const handleFormSubmission = async () => {
  // Update the platform from the clicked button
  formData.platform = selectedPlatform.value;

  if (formData.subscribe) {
    submitToMautic(formData);
  }

  // Fetch IP and country
  try {
    const res = await fetch("https://ipapi.co/json/");
    const data = await res.json();
    formData.ip = data.ip;
    formData.country = data.country_name;
  } catch {
    // Silently fail — IP/country are optional
  }

  formData.time_stamp = getFormattedTimestamp();

  // Send form data to backend (currently commented out in api.ts)
  // const api = new NetLogoAPI(backendUrl);
  // await api.sendDownloadForm(formData);

  // Find the download URL for the selected platform
  const downloadVersion = props.versions.find((version) => version.version === formData.version);

  const downloadUrl = downloadVersion?.download_links.find(
    (link) => link.platform === formData.platform,
  )?.download_url;

  if (!downloadUrl) {
    alert("Download link not found");
    return;
  }

  const encodedURL = btoa(downloadUrl);
  navigateTo(`/thankyou?download_url=${encodedURL}&signed_up=${formData.subscribe}`);
};
</script>

<style scoped>
.form-input {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 0.375rem;
  font-size: 1rem;
  outline: none;
  transition: border-color 0.15s;
}
.form-input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}
</style>
