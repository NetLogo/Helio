<template>
  <UContentNavigation :navigation="navigation.sidebarLinks.value" class="hidden lg:block" :collapsible="false" />
</template>

<script lang="ts" setup>
const navigation = useNavigation();
</script>
