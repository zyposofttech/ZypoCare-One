import PolicyDetails from "./details";

export default async function PolicyDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <PolicyDetails id={id} />;
}
