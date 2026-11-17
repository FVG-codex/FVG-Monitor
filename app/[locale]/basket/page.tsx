import { BasketPage } from "@/components/BasketPage";

import { metadataPagina } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return metadataPagina({ pathname: "/basket", locale });
}

export default function Page() {
  return <BasketPage />;
}
