import { ComuniPage } from "@/components/ComuniPage";

import { metadataPagina } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return metadataPagina({ pathname: "/comuni", locale });
}

export default function Page() {
  return <ComuniPage />;
}
