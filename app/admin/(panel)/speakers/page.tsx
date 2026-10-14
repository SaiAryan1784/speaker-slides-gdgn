import { SpeakerList } from "@/components/admin/SpeakerList";
import { listSpeakers } from "@/lib/queries";

export const metadata = { title: "Speakers" };

export default async function SpeakersPage() {
  const speakers = await listSpeakers();
  return (
    <>
      <h1 className="mb-8 text-3xl font-semibold tracking-tighter">Speakers</h1>
      <SpeakerList speakers={speakers} />
    </>
  );
}
