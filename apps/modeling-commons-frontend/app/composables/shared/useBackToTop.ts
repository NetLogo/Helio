export function useBackToTop(threshold = 600) {
  const show = ref(false);

  const update = () => {
    show.value = window.scrollY > threshold;
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  onMounted(() => {
    window.addEventListener("scroll", update, { passive: true });
    update();
  });

  onBeforeUnmount(() => {
    window.removeEventListener("scroll", update);
  });

  return { show, scrollToTop };
}
