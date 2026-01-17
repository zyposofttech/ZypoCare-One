import { LoadingScreen } from "@/components/LoadingScreen";

export default function Loading() {
  return (
    <LoadingScreen
      mode="fullscreen"
      label="Loading…"
      sublabel="Securing permissions, fetching data, and preparing your dashboard."
      interactive
    />
  );
}
