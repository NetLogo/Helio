<template>
  <UContainer>
    <section id="buttons" class="flex gap-15 flex-col">
      <h2>Buttons</h2>
      <div class="flex flex-col gap-10">
        <div class="flex gap-4">
          <UButton variant="solid" color="primary" size="md">Button</UButton>
          <UButton variant="outline" color="primary" size="md">Button</UButton>
          <UButton variant="ghost" color="primary" size="md">Button</UButton>
          <UButton variant="link" color="primary" size="md">Button</UButton>
        </div>

        <div class="flex gap-4">
          <UButton variant="solid" color="primary" size="sm">Button</UButton>
          <UButton variant="outline" color="primary" size="sm">Button</UButton>
          <UButton variant="ghost" color="primary" size="sm">Button</UButton>
          <UButton variant="link" color="primary" size="sm">Button</UButton>
        </div>
      </div>

      <div class="flex flex-col gap-10">
        <div class="flex gap-4">
          <UButton variant="solid" color="primary" size="md" icon="i-lucide-box">Button</UButton>
          <UButton variant="outline" color="primary" size="md" icon="i-lucide-box">Button</UButton>
          <UButton variant="ghost" color="primary" size="md" icon="i-lucide-box">Button</UButton>
          <UButton variant="link" color="primary" size="md" icon="i-lucide-box">Button</UButton>
        </div>

        <div class="flex gap-4">
          <UButton variant="solid" color="primary" size="sm" icon="i-lucide-box">Button</UButton>
          <UButton variant="outline" color="primary" size="sm" icon="i-lucide-box">Button</UButton>
          <UButton variant="ghost" color="primary" size="sm" icon="i-lucide-box">Button</UButton>
          <UButton variant="link" color="primary" size="sm" icon="i-lucide-box">Button</UButton>
        </div>
      </div>

      <div class="flex flex-col gap-10">
        <div class="flex gap-4">
          <UButton variant="solid" color="primary" size="md" square icon="i-lucide-box" />
          <UButton variant="outline" color="primary" size="md" square icon="i-lucide-box" />
          <UButton variant="ghost" color="primary" size="md" square icon="i-lucide-box" />
          <UButton variant="link" color="primary" size="md" square icon="i-lucide-box" />
        </div>

        <div class="flex gap-4">
          <UButton variant="solid" color="primary" size="sm" square icon="i-lucide-box" />
          <UButton variant="outline" color="primary" size="sm" square icon="i-lucide-box" />
          <UButton variant="ghost" color="primary" size="sm" square icon="i-lucide-box" />
          <UButton variant="link" color="primary" size="sm" square icon="i-lucide-box" />
        </div>
      </div>
    </section>

    <section id="inputs" class="flex gap-15 flex-col mt-10">
      <h2>Inputs</h2>

      <h3>Text Inputs</h3>
      <div class="flex flex-col gap-5">
        <UInput placeholder="Placeholder" />
        <UInput placeholder="Placeholder" trailing-icon="i-lucide-circle-question-mark" />
        <UInput
          placeholder="Placeholder"
          icon="i-lucide-credit-card"
          trailing-icon="i-lucide-circle-question-mark"
        />
        <UInput placeholder="Search" icon="i-lucide-search" />
        <UInput placeholder="Disabled input" disabled />

        <UFieldGroup>
          <USelectMenu v-model="USD" :items="['USD', 'EUR']" />
          <UInput placeholder="Placeholder" />
        </UFieldGroup>

        <UFieldGroup>
          <UInput disabled placeholder="http://" class="w-20" />
          <UInput placeholder="Placeholder" />
        </UFieldGroup>
      </div>

      <h3>Textarea</h3>
      <div class="flex flex-col gap-5">
        <UTextarea placeholder="Placeholder" />
        <UTextarea placeholder="Placeholder" :rows="10">
          <template #default>
            <UButton
              variant="solid"
              size="sm"
              icon="i-lucide-send"
              class="absolute bottom-2 right-2"
              >Post</UButton
            >
          </template>
        </UTextarea>
      </div>

      <h3>Select Menu</h3>
      <div class="flex flex-col gap-5">
        <USelectMenu v-model="USD" :items="['USD', 'EUR']" />
        <USelectMenu v-model="USD" :items="['USD', 'EUR']" icon="i-lucide-euro" />
        <UInputMenu v-model="USD" :items="['USD', 'EUR']" icon="i-lucide-euro" />
      </div>

      <h3>Checkbox</h3>
      <div class="flex flex-col gap-5">
        <UCheckbox label="Checkbox" />
        <UCheckbox
          variant="card"
          label="Checkbox"
          description="Lorem ipsum dolor sit amet, consectetur adipiscing elit."
        />
      </div>

      <h3>Radio</h3>
      <div class="flex flex-col gap-5">
        <URadioGroup v-model="USD" :items="['USD', 'EUR']" />
        <URadioGroup
          v-model="USD"
          variant="card"
          :items="[
            {
              label: 'USD',
              value: 'USD',
              description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
            },
            {
              label: 'EUR',
              value: 'EUR',
              description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit.',
            },
          ]"
        />
      </div>

      <h3>Toggle</h3>
      <div class="flex flex-col gap-5">
        <USwitch label="Toggle" />
        <USwitch v-model="TRUE" label="Toggle" />
      </div>
    </section>

    <section class="flex gap-15 flex-col mt-10">
      <h3>Tooltips</h3>
      <UTooltip>
        <UButton
          variant="outline"
          color="primary"
          size="md"
          square
          icon="i-lucide-circle-question-mark"
          class="w-fit"
        />
        <template #content>
          <p class="text-sm">Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
        </template>
      </UTooltip>
    </section>

    <section class="flex gap-15 flex-col mt-10">
      <h3>Table</h3>

      <UStripedTable :data="tableData" />
      <UTable :data="tableData" />
    </section>

    <section class="flex gap-15 flex-col mt-10">
      <h3>Avatars</h3>

      <div class="flex gap-4">
        <UAvatar name="John Doe" image="https://i.pravatar.cc/150" />
        <UAvatar name="Bob Brown" alt="Bob Brown" />
      </div>

      <div class="flex gap-4">
        <UAvatarGroup>
          <UAvatar name="John Doe" image="https://i.pravatar.cc/150" />
          <UAvatar name="Bob Brown" alt="Bob Brown" />
          <UAvatar name="John Doe" image="https://i.pravatar.cc/150" />
          <UAvatar name="Bob Brown" alt="Bob Brown" />
        </UAvatarGroup>
      </div>
    </section>

    <section class="flex gap-15 flex-col mt-10">
      <h3>Various Components</h3>

      <TagCard name="Food" description="Tagged 12 times in the past 2 weeks" />
      <div class="space-y-5">
        <UAlert
          variant="subtle"
          color="primary"
          title="Success Alert"
          description="This is a success alert."
        />
        <UAlert
          variant="subtle"
          color="secondary"
          title="Success Alert"
          description="This is a success alert."
        />
        <UAlert
          variant="subtle"
          color="neutral"
          title="Success Alert"
          description="This is a success alert."
        />
      </div>
    </section>

    <section class="flex gap-15 flex-col mt-10">
      <h3>Avatar</h3>
      <UserAvatar
        src="https://i.pravatar.cc/150"
        alt="John Doe"
        initials="JD"
        email="johndoe@email.com"
        variant="default"
      />
      <UserAvatar
        src="https://i.pravatar.cc/150"
        alt="John Doe"
        initials="JD"
        email="johndoe@email.com"
        variant="headline"
      />
      <UserAvatar
        src="https://i.pravatar.cc/150"
        alt="John Doe"
        initials="JD"
        email="johndoe@email.com"
        variant="compact"
      />
    </section>

    <section class="flex gap-15 flex-col mt-10">
      <h3>Theme</h3>
      <Loader />
      <FallbackThumbnail />
    </section>
  </UContainer>
</template>

<script lang="ts" setup>
if (!import.meta.dev) {
  navigateTo("/");
}

const USD = ref("USD");
const TRUE = ref(true);

const tableData = ref([
  {
    id: "4600",
    date: "2024-03-11T15:30:00",
    status: "paid",
    email: "james.anderson@example.com",
    amount: 594,
  },
  {
    id: "4599",
    date: "2024-03-11T10:10:00",
    status: "failed",
    email: "mia.white@example.com",
    amount: 276,
  },
  {
    id: "4598",
    date: "2024-03-11T08:50:00",
    status: "refunded",
    email: "william.brown@example.com",
    amount: 315,
  },
  {
    id: "4597",
    date: "2024-03-10T19:45:00",
    status: "paid",
    email: "emma.davis@example.com",
    amount: 529,
  },
  {
    id: "4596",
    date: "2024-03-10T15:55:00",
    status: "paid",
    email: "ethan.harris@example.com",
    amount: 639,
  },
]);
</script>
