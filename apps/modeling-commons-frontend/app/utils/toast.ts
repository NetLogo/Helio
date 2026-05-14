export function showRequiresLoginToast(what: string = "perform this action") {
  const toast = useToast();

  toast.add({
    title: "Login Required",
    description: `You need to be logged in to ${what}.`,
    color: "warning",
    icon: "i-lucide-key-round",
  });
}
