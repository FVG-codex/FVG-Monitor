import { SciPage } from "@/components/SciPage";

import { metadataPagina } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return metadataPagina({ pathname: "/sci", locale });
}

export default function Page() {
  return <SciPage />;
}
