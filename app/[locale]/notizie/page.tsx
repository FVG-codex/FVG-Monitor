import { NotizieProvinciaPage } from "@/components/NotizieProvinciaPage";

import { metadataPagina } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return metadataPagina({ pathname: "/notizie", locale });
}

export default function Page() {
  return <NotizieProvinciaPage />;
}
