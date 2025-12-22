import runDocsAutogen from '~~/lib/docs/runDocsAutogen';
export default defineEventHandler(async () => {
  try {
    return await runDocsAutogen();
  } catch (error: unknown) {
    console.error('Error in autogen API:', error);
    return {
      error: String(error),
    };
  }
});
