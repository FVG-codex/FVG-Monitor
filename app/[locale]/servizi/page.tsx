import { ServiziPage } from "@/components/ServiziPage";

import { metadataPagina } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return metadataPagina({ pathname: "/servizi", locale });
}

export default function Page() {
  return <ServiziPage />;
}
