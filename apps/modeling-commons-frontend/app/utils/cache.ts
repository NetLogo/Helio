export const getNuxtPayloadData = (key: string) => {
  const cached = useNuxtApp().payload.data[key];
  if (cached) {
    return cached;
  }
  return undefined;
};
