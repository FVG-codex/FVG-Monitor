import { ContattiPage } from "@/components/ContattiPage";

import { metadataPagina } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return metadataPagina({ pathname: "/contatti", locale });
}

export default function Page() {
  return <ContattiPage />;
}
