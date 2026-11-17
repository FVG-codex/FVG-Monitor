import { ParchiGiardiniPage } from "@/components/ParchiGiardiniPage";

import { metadataPagina } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return metadataPagina({ pathname: "/parchi-giardini", locale });
}

export default function Page() {
  return <ParchiGiardiniPage />;
}
