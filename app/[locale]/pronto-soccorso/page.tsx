import { ProntoSoccorsoPage } from "@/components/ProntoSoccorsoPage";

import { metadataPagina } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return metadataPagina({ pathname: "/pronto-soccorso", locale });
}

export default function Page() {
  return <ProntoSoccorsoPage />;
}
