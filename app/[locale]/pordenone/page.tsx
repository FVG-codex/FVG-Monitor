import { ProvinciaPage } from "@/components/ProvinciaPage";

import { metadataPagina } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return metadataPagina({ pathname: "/pordenone", locale });
}

export default function Page() {
  return <ProvinciaPage slug="pordenone" />;
}
