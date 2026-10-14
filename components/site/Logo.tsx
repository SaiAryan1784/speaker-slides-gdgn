import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react/dist/ssr";

/** GDG-style angle brackets in two Google colors, set beside the chapter name. */
export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-semibold tracking-tight ${className}`}>
      <span className="inline-flex items-center" aria-hidden>
        <CaretLeftIcon size={20} weight="bold" className="-mr-1.5 text-g-red" />
        <CaretRightIcon size={20} weight="bold" className="text-g-blue" />
      </span>
      <span>
        GDG <span className="text-muted">Noida</span>
      </span>
    </span>
  );
}
