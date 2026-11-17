import { WebcamPage } from "@/components/WebcamPage";

import { metadataPagina } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return metadataPagina({ pathname: "/webcam", locale });
}

export default function Page() {
  return <WebcamPage />;
}
