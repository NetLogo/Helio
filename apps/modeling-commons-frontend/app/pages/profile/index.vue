<script setup lang="ts">
const parsed = await fetchCurrentUser();

await navigateTo(
  parsed.name ? createSlugPath("users", parsed.id, parsed.name) : `/users/${parsed.id}`,
  { redirectCode: 302 },
);
</script>
