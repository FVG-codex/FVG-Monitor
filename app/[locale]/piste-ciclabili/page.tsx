import { PisteCiclabiliPage } from "@/components/PisteCiclabiliPage";

import { metadataPagina } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return metadataPagina({ pathname: "/piste-ciclabili", locale });
}

export default function Page() {
  return <PisteCiclabiliPage />;
}
