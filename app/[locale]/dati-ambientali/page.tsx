import { DatiAmbientaliPage } from "@/components/DatiAmbientaliPage";

import { metadataPagina } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return metadataPagina({ pathname: "/dati-ambientali", locale });
}

export default function Page() {
  return <DatiAmbientaliPage />;
}
