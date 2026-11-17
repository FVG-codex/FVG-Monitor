import { MuseiPage } from "@/components/MuseiPage";

import { metadataPagina } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return metadataPagina({ pathname: "/musei", locale });
}

export default function Page() {
  return <MuseiPage />;
}
