export async function useLearningPathsInfo({
  family,
  level,
}: { family?: 'educators' | 'students' | 'researchers'; level?: 'novice' | 'intermediate' | 'advanced' } = {}) {
  const { data, error } = await useAsyncData(
    ['learning-paths-info', family, level].filter(Boolean).join('-'),
    async () => {
      let query = queryCollection('learningPaths').select(
        'id',
        'title',
        'stem',
        'thumbnail',
        'subtitle',
        'description',
      );
      if (family) {
        query = query.where('family', '=', family);
      }
      if (level) {
        query = query.where('level', '=', level);
      }
      return await query.all();
    },
  );

  if (error.value || !data.value) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to fetch learning paths info. Error: ${error.value?.message || 'Unknown error'}`,
    });
  }

  return data!;
}
