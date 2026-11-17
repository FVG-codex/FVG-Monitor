import { FvgInImmaginiPage } from "@/components/FvgInImmaginiPage";

import { metadataPagina } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return metadataPagina({ pathname: "/fvg-in-immagini", locale });
}

export default function Page() {
  return <FvgInImmaginiPage />;
}
