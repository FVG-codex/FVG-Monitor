import { NeveImpiantiPage } from "@/components/NeveImpiantiPage";

import { metadataPagina } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return metadataPagina({ pathname: "/neve-impianti", locale });
}

export default function Page() {
  return <NeveImpiantiPage />;
}
