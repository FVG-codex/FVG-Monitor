import { BlsdPage } from "@/components/BlsdPage";

import { metadataPagina } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return metadataPagina({ pathname: "/blsd", locale });
}

export default function Page() {
  return <BlsdPage />;
}
