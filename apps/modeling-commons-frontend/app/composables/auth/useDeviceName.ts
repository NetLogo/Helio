export default function useDeviceName() {
  const deviceName = useState<string>("device-name", () => {
    const ua = import.meta.server
      ? useRequestHeaders(["user-agent"])["user-agent"]
      : navigator.userAgent;
    return parseDeviceName(ua);
  });

  onMounted(() => {
    deviceName.value = parseDeviceName(navigator.userAgent);
  });

  return { deviceName };
}
