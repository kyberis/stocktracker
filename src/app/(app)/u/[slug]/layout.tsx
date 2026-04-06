import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return {
    title: `@${slug} — trefolio`,
    description: `View ${slug}'s investment profile and posts on trefolio.`,
    openGraph: {
      title: `@${slug} — trefolio`,
      description: `View ${slug}'s investment profile and posts on trefolio.`,
      type: "profile",
      url: `https://trefolio.app/u/${slug}`,
    },
  };
}

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
