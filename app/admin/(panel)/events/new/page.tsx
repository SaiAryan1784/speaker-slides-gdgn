import { EventForm } from "@/components/admin/EventForm";

export const metadata = { title: "New event" };

export default function NewEventPage() {
  return (
    <>
      <h1 className="mb-8 text-3xl font-semibold tracking-tighter">New event</h1>
      <EventForm event={null} />
    </>
  );
}
