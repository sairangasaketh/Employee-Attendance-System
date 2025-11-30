import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Attendance, AttendanceStatus } from "@/types";
import { format, startOfMonth, endOfMonth, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { StatusBadge } from "./StatusBadge";

interface AttendanceCalendarProps {
  attendance: Attendance[];
}

export const AttendanceCalendar = ({ attendance }: AttendanceCalendarProps) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedAttendance, setSelectedAttendance] = useState<Attendance | null>(null);

  const attendanceMap = new Map(
    attendance.map((a) => [a.date, a])
  );

  const getStatusColor = (status: AttendanceStatus) => {
    const colors = {
      present: 'bg-success',
      absent: 'bg-destructive',
      late: 'bg-late',
      'half-day': 'bg-half-day',
    };
    return colors[status];
  };

  const modifiers = {
    present: attendance.filter(a => a.status === 'present').map(a => parseISO(a.date)),
    absent: attendance.filter(a => a.status === 'absent').map(a => parseISO(a.date)),
    late: attendance.filter(a => a.status === 'late').map(a => parseISO(a.date)),
    halfDay: attendance.filter(a => a.status === 'half-day').map(a => parseISO(a.date)),
  };

  const modifiersClassNames = {
    present: 'bg-success/20 text-success',
    absent: 'bg-destructive/20 text-destructive',
    late: 'bg-late/20 text-late',
    halfDay: 'bg-half-day/20 text-half-day',
  };

  const handleDateSelect = (date: Date | undefined) => {
    if (!date) return;
    setSelectedDate(date);
    const dateStr = format(date, 'yyyy-MM-dd');
    const record = attendanceMap.get(dateStr);
    setSelectedAttendance(record || null);
  };

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_300px]">
      <Card>
        <CardHeader>
          <CardTitle>Attendance Calendar</CardTitle>
        </CardHeader>
        <CardContent>
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            modifiers={modifiers}
            modifiersClassNames={modifiersClassNames}
            className="rounded-md border"
          />
          
          <div className="mt-6 flex flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <div className={cn("h-3 w-3 rounded-full", getStatusColor('present'))} />
              <span className="text-sm">Present</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={cn("h-3 w-3 rounded-full", getStatusColor('absent'))} />
              <span className="text-sm">Absent</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={cn("h-3 w-3 rounded-full", getStatusColor('late'))} />
              <span className="text-sm">Late</span>
            </div>
            <div className="flex items-center gap-2">
              <div className={cn("h-3 w-3 rounded-full", getStatusColor('half-day'))} />
              <span className="text-sm">Half Day</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedDate && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {format(selectedDate, 'MMMM d, yyyy')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {selectedAttendance ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Status</p>
                  <StatusBadge status={selectedAttendance.status} />
                </div>
                
                {selectedAttendance.check_in_time && (
                  <div>
                    <p className="text-sm text-muted-foreground">Check In</p>
                    <p className="font-medium">
                      {format(parseISO(selectedAttendance.check_in_time), 'h:mm a')}
                    </p>
                  </div>
                )}
                
                {selectedAttendance.check_out_time && (
                  <div>
                    <p className="text-sm text-muted-foreground">Check Out</p>
                    <p className="font-medium">
                      {format(parseISO(selectedAttendance.check_out_time), 'h:mm a')}
                    </p>
                  </div>
                )}
                
                <div>
                  <p className="text-sm text-muted-foreground">Total Hours</p>
                  <p className="font-medium">{selectedAttendance.total_hours.toFixed(2)} hrs</p>
                </div>

                {selectedAttendance.notes && (
                  <div>
                    <p className="text-sm text-muted-foreground">Notes</p>
                    <p className="text-sm">{selectedAttendance.notes}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No attendance record for this date</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
