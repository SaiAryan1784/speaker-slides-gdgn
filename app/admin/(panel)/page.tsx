import Link from "next/link";
import { PlusIcon, WarningIcon } from "@phosphor-icons/react/dist/ssr";
import { DeleteEventButton, PublishToggle } from "@/components/admin/EventRowActions";
import { EVENT_TYPE_STYLES, formatDate } from "@/lib/event-types";
import { listAllEvents } from "@/lib/queries";

export default async function AdminHome() {
  const events = await listAllEvents();
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-semibold tracking-tighter">Events</h1>
        <Link href="/admin/events/new" className="inline-flex min-h-11 items-center gap-2 rounded-full bg-g-blue px-6 text-sm font-medium text-white">
          <PlusIcon size={18} weight="bold" aria-hidden /> New event
        </Link>
      </div>

      {events.length === 0 ? (
        <div className="mt-8 rounded-[var(--radius-card)] border border-dashed border-line-strong p-10 text-center text-muted">
          No events yet. Create the first one to start adding talks.
        </div>
      ) : (
        <ul className="mt-8 grid grid-cols-[minmax(0,1fr)] gap-3">
          {events.map((e) => (
            <li key={e.id} className="flex flex-col gap-4 rounded-[var(--radius-card)] border border-line bg-surface p-5 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${EVENT_TYPE_STYLES[e.type].chip}`}>{EVENT_TYPE_STYLES[e.type].label}</span>
                  <span className="text-xs text-muted">{formatDate(e.date)}</span>
                </div>
                <Link href={`/admin/events/${e.id}`} className="mt-1 block truncate text-lg font-semibold hover:text-g-blue-ink">
                  {e.name}
                </Link>
                <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
                  <span>
                    {e.talkCount} {e.talkCount === 1 ? "talk" : "talks"}
                  </span>
                  {e.warningCount > 0 && (
                    <span className="inline-flex items-center gap-1 text-g-yellow-ink">
                      <WarningIcon size={16} weight="fill" aria-hidden /> {e.warningCount} private {e.warningCount === 1 ? "link" : "links"}
                    </span>
                  )}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-sm">
                  <PublishToggle id={e.id} published={e.published} name={e.name} />
                  {e.published ? "Published" : "Draft"}
                </label>
                <Link href={`/admin/events/${e.id}`} className="inline-flex min-h-11 items-center rounded-full border border-line-strong px-5 text-sm font-medium hover:border-ink">
                  Edit
                </Link>
                <DeleteEventButton id={e.id} name={e.name} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
