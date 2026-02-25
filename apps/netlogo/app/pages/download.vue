<template>
  <UContainer>
    <p class="py-8 text-lg">Redirecting to your device's download page...</p>
  </UContainer>
</template>

<script setup lang="ts">
useHead({
  title: "Redirecting...",
  titleTemplate: "%s",
});

onMounted(() => {
  ///I need to make sure it has got to browser from SSR before I can access navigator (onMounted)
  // rest is pretty much similar to old implementation
  const userAgent = navigator.userAgent;
  let os: string | null = null;

  if (userAgent.includes("Win")) os = "windows";
  else if (userAgent.includes("Mac")) os = "mac";
  else if (userAgent.includes("Linux")) os = "linux";

  if (os) {
    window.location.href = `/downloads/${os}`;
  } else {
    window.location.href = `/downloads/options`;
  }
});
</script>
