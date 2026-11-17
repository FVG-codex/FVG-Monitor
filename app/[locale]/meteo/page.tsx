import { MeteoPage } from "@/components/MeteoPage";

import { metadataPagina } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return metadataPagina({ pathname: "/meteo", locale });
}

export default function Page() {
  return <MeteoPage />;
}
