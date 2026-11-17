import { BaseballPage } from "@/components/BaseballPage";

import { metadataPagina } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return metadataPagina({ pathname: "/baseball", locale });
}

export default function Page() {
  return <BaseballPage />;
}
