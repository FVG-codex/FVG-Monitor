import { SitiInquinatiPage } from "@/components/SitiInquinatiPage";

import { metadataPagina } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return metadataPagina({ pathname: "/siti-inquinati", locale });
}

export default function Page() {
  return <SitiInquinatiPage />;
}
