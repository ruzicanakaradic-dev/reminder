import { STATUS_LABEL, type Status } from "@/lib/types";

export function StatusBadge({ status }: { status: Status }) {
  return (
    <span className={`chip status-${status}`}>
      <span className="chip-dot" />
      {STATUS_LABEL[status]}
    </span>
  );
}
