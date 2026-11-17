import { AviazionePage } from "@/components/AviazionePage";

import { metadataPagina } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return metadataPagina({ pathname: "/aviazione", locale });
}

export default function Page() {
  return <AviazionePage />;
}
