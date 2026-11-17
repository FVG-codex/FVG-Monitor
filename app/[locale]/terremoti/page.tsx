import { TerremotiPage } from "@/components/TerremotiPage";

import { metadataPagina } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return metadataPagina({ pathname: "/terremoti", locale });
}

export default function Page() {
  return <TerremotiPage />;
}
