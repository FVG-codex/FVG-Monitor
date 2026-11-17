import { EconomiaPage } from "@/components/EconomiaPage";

import { metadataPagina } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return metadataPagina({ pathname: "/economia", locale });
}

export default function Page() {
  return <EconomiaPage />;
}
