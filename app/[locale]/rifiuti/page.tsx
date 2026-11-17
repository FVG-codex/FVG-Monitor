import { RifiutiPage } from "@/components/RifiutiPage";

import { metadataPagina } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return metadataPagina({ pathname: "/rifiuti", locale });
}

export default function Page() {
  return <RifiutiPage />;
}
