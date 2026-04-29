export default defineEventHandler(async (event) => {
  const legacyId = getRouterParam(event, "id");

  if (!legacyId) {
    throw createError({ statusCode: 400, statusMessage: "Missing id" });
  }

  const config = useRuntimeConfig();

  const { id } = await $fetch<{ id: string }>(
    `${config.public.apiBase}/api/v1/legacy/models/${encodeURIComponent(legacyId)}/resolve`,
  );

  return sendRedirect(event, `/models/${id}`, 301);
});
