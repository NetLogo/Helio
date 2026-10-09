<template>
  <UContentNavigation 
    :navigation="navigation.sidebarLinks.value"
    class="hidden lg:block"
    :collapsible="false" 
    :ui="{
      root: 'lg:sticky lg:top-(--ui-header-height) h-fit',
    }" 
  />
</template>

<script lang="ts" setup>
const navigation = useNavigation();
</script>
