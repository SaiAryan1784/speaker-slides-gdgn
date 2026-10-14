import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRightIcon } from "@phosphor-icons/react/dist/ssr";
import { DeleteEventButton } from "@/components/admin/EventRowActions";
import { EventForm } from "@/components/admin/EventForm";
import { TalkManager } from "@/components/admin/TalkManager";
import { getEventForAdmin, listSpeakers } from "@/lib/queries";

export const metadata = { title: "Edit event" };

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const found = await getEventForAdmin(id);
  if (!found) notFound();
  const speakers = await listSpeakers();

  return (
    <>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tighter">{found.event.name}</h1>
        {found.event.published && (
          <Link href={`/events/${found.event.slug}`} target="_blank" className="inline-flex items-center gap-1.5 text-sm font-medium text-g-blue-ink">
            View public page <ArrowUpRightIcon size={16} weight="bold" aria-hidden />
          </Link>
        )}
      </div>
      <EventForm event={found.event} />

      <TalkManager eventId={found.event.id} talks={found.talks} speakers={speakers} />

      <div className="mt-12 border-t border-line pt-8">
        <h2 className="mb-3 text-lg font-semibold">Danger zone</h2>
        <DeleteEventButton id={found.event.id} name={found.event.name} redirectTo="/admin" />
      </div>
    </>
  );
}
