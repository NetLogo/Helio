<script setup lang="ts">
const { GET } = useApi();

const { data, error } = await GET("/api/v1/users/whoami");
const parsed = handleApiError(data, error, "fetching current user info");

await navigateTo(
  parsed.name ? createSlugPath("users", parsed.id, parsed.name) : `/users/${parsed.id}`,
  { redirectCode: 302 },
);
</script>
