import { TrasportiPage } from "@/components/TrasportiPage";

import { metadataPagina } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return metadataPagina({ pathname: "/trasporti", locale });
}

export default function Page() {
  return <TrasportiPage />;
}
