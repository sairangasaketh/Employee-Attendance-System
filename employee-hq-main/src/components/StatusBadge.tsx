import { Badge } from "@/components/ui/badge";
import { AttendanceStatus } from "@/types";

interface StatusBadgeProps {
  status: AttendanceStatus | 'not-marked';
}

export const StatusBadge = ({ status }: StatusBadgeProps) => {
  const variants: Record<AttendanceStatus | 'not-marked', { label: string; className: string }> = {
    present: { label: 'Present', className: 'bg-success/10 text-success hover:bg-success/20' },
    absent: { label: 'Absent', className: 'bg-destructive/10 text-destructive hover:bg-destructive/20' },
    late: { label: 'Late', className: 'bg-late/10 text-late hover:bg-late/20' },
    'half-day': { label: 'Half Day', className: 'bg-half-day/10 text-half-day hover:bg-half-day/20' },
    'not-marked': { label: 'Not Marked', className: 'bg-muted text-muted-foreground' },
  };

  const variant = variants[status];

  return (
    <Badge variant="outline" className={variant.className}>
      {variant.label}
    </Badge>
  );
};
