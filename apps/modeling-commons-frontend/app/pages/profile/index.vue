<script setup lang="ts">
const { GET } = useApi();
const router = useRouter();

const { data, error } = await GET("/api/v1/users/whoami");
const parsed = handleApiError(data, error, "fetching current user info");
router.push(parsed.name ? createSlugPath("users", parsed.id, parsed.name) : `users/${parsed.id}`);
</script>
