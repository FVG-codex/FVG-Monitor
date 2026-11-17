import { ViabilitaPage } from "@/components/ViabilitaPage";

import { metadataPagina } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return metadataPagina({ pathname: "/viabilita", locale });
}

export default function Page() {
  return <ViabilitaPage />;
}
