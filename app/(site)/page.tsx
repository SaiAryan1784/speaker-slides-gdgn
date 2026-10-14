import { Suspense } from "react";
import { HomeClient } from "@/components/site/HomeClient";
import { getSearchIndex, listPublishedEvents } from "@/lib/queries";

export const revalidate = 300;

export default async function HomePage() {
  const [events, docs] = await Promise.all([listPublishedEvents(), getSearchIndex()]);
  return (
    <Suspense fallback={<div className="skeleton mt-16 h-64 rounded-[var(--radius-card)]" />}>
      <HomeClient events={events} docs={docs} />
    </Suspense>
  );
}
