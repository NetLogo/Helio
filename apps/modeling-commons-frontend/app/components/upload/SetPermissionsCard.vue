<template>
  <UCard
    :ui="{
      root: 'rounded-2xl ring-0 border-0 shadow-none',
      body: 'p-8 sm:p-8',
    }"
  >
    <div class="flex flex-col gap-8">
      <div class="section-title">
        <h5>Set Permissions</h5>
        <p class="text-sm text-neutral-darkest-60">
          Required fields are marked with an asterisk (<span class="text-coral">*</span>)
        </p>
      </div>

      <div class="flex flex-col sm:flex-row gap-8">
        <UFormField class="flex-1">
          <template #label>
            <span class="upload-label">Read Permission <span class="text-coral">*</span></span>
          </template>
          <URadioGroup
            v-model="readPermission"
            :items="readOptions"
            class="mt-2"
          />
        </UFormField>

        <UFormField class="flex-1">
          <template #label>
            <span class="upload-label">Write Permission <span class="text-coral">*</span></span>
          </template>
          <URadioGroup
            v-model="writePermission"
            :items="writeOptions"
            class="mt-2"
          />
        </UFormField>
      </div>

      <button
        type="button"
        class="inline-flex items-center gap-2 text-royal-blue font-medium cursor-pointer bg-transparent border-0 p-0"
        @click="showAdvanced = !showAdvanced"
      >
        Set Advanced Permissions
        <UIcon
          :name="showAdvanced ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
          class="size-5"
        />
      </button>

      <div v-if="showAdvanced" class="flex flex-col gap-8">
        <UFormField>
          <template #label>
            <span class="upload-label">File Upload <span class="text-coral">*</span></span>
          </template>
          <URadioGroup
            v-model="fileUploadPermission"
            :items="fileUploadOptions"
            class="mt-2"
          />
        </UFormField>

        <UFormField>
          <template #label>
            <span class="upload-label">Select a group to have access to this model</span>
          </template>
          <USelectMenu
            v-model="selectedGroup"
            :items="groupOptions"
            placeholder="Select one..."
            class="w-full"
            size="lg"
          />
          <p class="text-sm italic text-neutral-darkest-60 mt-2">
            All members of the group will have read, write, and file upload permissions to this model
          </p>
        </UFormField>

        <UFormField>
          <template #label>
            <span class="upload-label">Invite specific people to your model</span>
          </template>
          <UInput
            v-model="emailInput"
            icon="i-lucide-user"
            placeholder="email@example.com"
            size="lg"
            class="w-full"
            @keydown.enter.prevent="addInvite"
          />
          <p class="text-sm italic text-neutral-darkest-60 mt-2">
            People invited will have read, write, and file upload permissions to this model
          </p>
          <div v-if="invitedPeople.length" class="flex flex-wrap gap-2.5 pt-2">
            <UBadge
              v-for="person in invitedPeople"
              :key="person"
              variant="outline"
              color="neutral"
              size="lg"
              class="gap-2 px-2 py-1.5"
            >
              <UIcon name="i-lucide-circle-user" class="size-5" />
              {{ person }}
              <UIcon
                name="i-lucide-x"
                class="size-3.5 cursor-pointer"
                @click="removeInvite(person)"
              />
            </UBadge>
          </div>
        </UFormField>

        <UFormField>
          <template #label>
            <span class="upload-label">Ask for Collaborators?</span>
          </template>
          <URadioGroup
            v-model="askCollaborators"
            :items="collaboratorOptions"
            class="mt-2"
          />
          <p class="text-sm italic text-neutral-darkest-60 mt-1">
            This will make your model visible in the Explore page as well as adding a banner to your model page.
          </p>
        </UFormField>
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
const showAdvanced = ref(false);

const readPermission = ref("everyone");
const writePermission = ref("everyone");
const fileUploadPermission = ref("everyone");
const selectedGroup = ref<string>();
const emailInput = ref("");
const invitedPeople = ref<string[]>([]);
const askCollaborators = ref<string>();

const readOptions = [
  { value: "everyone", label: "Everyone can see this model" },
  { value: "only-me", label: "Only I can see this model" },
];

const writeOptions = [
  { value: "everyone", label: "Everyone can modify this model" },
  { value: "only-me", label: "Only I can modify this model" },
];

const fileUploadOptions = [
  { value: "everyone", label: "Everyone can upload files for this model" },
  { value: "only-me", label: "Only I can upload files for this model" },
];

const groupOptions = [
  { value: "group-1", label: "Group 1" },
  { value: "group-2", label: "Group 2" },
];

const collaboratorOptions = [
  { value: "yes", label: "Yes, please add my model to the list of models looking for collaborators" },
];

function addInvite() {
  const value = emailInput.value.trim();
  if (value && !invitedPeople.value.includes(value)) {
    invitedPeople.value.push(value);
  }
  emailInput.value = "";
}

function removeInvite(person: string) {
  invitedPeople.value = invitedPeople.value.filter((p) => p !== person);
}
</script>

<style lang="scss" scoped>
.section-title {
  display: flex;
  flex-direction: column;
  gap: 2px;

  h5 {
    font-family: var(--font-heading);
    font-weight: 500;
    line-height: var(--line-height-subheading);
    letter-spacing: -0.28px;
  }
}

.upload-label {
  font-family: var(--font-sans);
  font-size: var(--text-base);
  font-weight: 500;
  line-height: 1.5;
  color: var(--color-text);
}
</style>
