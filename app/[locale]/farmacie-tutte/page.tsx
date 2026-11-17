import { FarmaciePage } from "@/components/FarmaciePage";

import { metadataPagina } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return metadataPagina({ pathname: "/farmacie-tutte", locale });
}

export default function Page() {
  return <FarmaciePage soloTurno={false} />;
}
