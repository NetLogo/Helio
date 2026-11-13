export async function navigateToRandomModel() {
  const partialModel = await getRandomModelId();
  console.log("Fetched random model ID:", partialModel);
  if (partialModel) {
    navigateTo(createModelPath(partialModel.id, partialModel.title));
  } else {
    console.error("Could not fetch random model ID");
  }
}
