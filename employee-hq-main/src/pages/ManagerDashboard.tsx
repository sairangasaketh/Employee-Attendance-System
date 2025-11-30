import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { useToast } from "@/hooks/use-toast";
import { ClipboardCheck, Users, UserCheck, UserX, Clock, LogOut, FileDown, List } from "lucide-react";
import { format, parseISO } from "date-fns";
import { AttendanceWithProfile } from "@/types";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function ManagerDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, profile, role, signOut, loading: authLoading } = useAuthStore();
  
  const [stats, setStats] = useState({
    totalEmployees: 0,
    presentToday: 0,
    absentToday: 0,
  });
  const [lateArrivals, setLateArrivals] = useState<AttendanceWithProfile[]>([]);
  const [absentEmployees, setAbsentEmployees] = useState<any[]>([]);
  const [weeklyTrend, setWeeklyTrend] = useState<any[]>([]);

  useEffect(() => {
    if (!authLoading && (!user || role !== 'manager')) {
      navigate("/auth");
    }
  }, [user, role, authLoading, navigate]);

  useEffect(() => {
    if (user && role === 'manager') {
      fetchDashboardData();
    }
  }, [user, role]);

  const fetchDashboardData = async () => {
    try {
      const today = format(new Date(), 'yyyy-MM-dd');

      // Total employees
      const { count: totalEmployees } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      // Today's attendance
      const { data: todayAttendance } = await supabase
        .from('attendance')
        .select(`
          *,
          profiles (
            id,
            employee_id,
            name,
            department
          )
        `)
        .eq('date', today);

      const presentToday = todayAttendance?.filter(a => a.status === 'present' || a.status === 'late').length || 0;
      const absentToday = (totalEmployees || 0) - presentToday;

      setStats({
        totalEmployees: totalEmployees || 0,
        presentToday,
        absentToday,
      });

      // Late arrivals today - transform data
      const lateToday = todayAttendance?.filter(a => a.status === 'late').map(a => ({
        ...a,
        profile: Array.isArray(a.profiles) ? a.profiles[0] : a.profiles
      })) || [];
      setLateArrivals(lateToday as any);

      // Absent employees (all employees not in today's attendance)
      const { data: allProfiles } = await supabase
        .from('profiles')
        .select('*');

      const presentIds = new Set(todayAttendance?.map(a => a.user_id));
      const absent = allProfiles?.filter(p => !presentIds.has(p.id)) || [];
      setAbsentEmployees(absent);

      // Weekly trend (last 7 days)
      const dates = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - i);
        return format(date, 'yyyy-MM-dd');
      }).reverse();

      const trendData = await Promise.all(
        dates.map(async (date) => {
          const { data } = await supabase
            .from('attendance')
            .select('status')
            .eq('date', date);

          return {
            date: format(parseISO(date), 'MMM d'),
            present: data?.filter(a => a.status === 'present').length || 0,
            late: data?.filter(a => a.status === 'late').length || 0,
            absent: data?.filter(a => a.status === 'absent').length || 0,
          };
        })
      );

      setWeeklyTrend(trendData);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const exportToCSV = async () => {
    try {
      const { data: allAttendance } = await supabase
        .from('attendance')
        .select(`
          *,
          profiles (
            id,
            employee_id,
            name,
            department
          )
        `)
        .order('date', { ascending: false });

      if (!allAttendance) return;

      const csv = [
        ['Date', 'Employee ID', 'Name', 'Department', 'Status', 'Check In', 'Check Out', 'Total Hours'].join(','),
        ...allAttendance.map((a: any) => {
          const profile = Array.isArray(a.profiles) ? a.profiles[0] : a.profiles;
          return [
            a.date,
            profile.employee_id,
            profile.name,
            profile.department,
            a.status,
            a.check_in_time ? format(parseISO(a.check_in_time), 'HH:mm') : '',
            a.check_out_time ? format(parseISO(a.check_out_time), 'HH:mm') : '',
            a.total_hours,
          ].join(',');
        })
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance_${format(new Date(), 'yyyy-MM-dd')}.csv`;
      a.click();

      toast({
        title: "Export successful",
        description: "Attendance data has been exported to CSV",
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "Unable to export attendance data",
        variant: "destructive",
      });
    }
  };

  if (authLoading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <ClipboardCheck className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-lg font-semibold">Manager Dashboard</h1>
              <p className="text-xs text-muted-foreground">{profile?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/all-attendance")}>
              <List className="h-4 w-4 mr-2" />
              All Attendance
            </Button>
            <Button variant="outline" size="sm" onClick={exportToCSV}>
              <FileDown className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 md:p-8 space-y-8">
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            title="Total Employees"
            value={stats.totalEmployees}
            icon={Users}
            description="In your organization"
          />
          <StatCard
            title="Present Today"
            value={stats.presentToday}
            icon={UserCheck}
            description={format(new Date(), 'MMM d, yyyy')}
          />
          <StatCard
            title="Absent Today"
            value={stats.absentToday}
            icon={UserX}
            description={format(new Date(), 'MMM d, yyyy')}
          />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Late Arrivals Today</CardTitle>
              <CardDescription>{lateArrivals.length} employees arrived late</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {lateArrivals.map((record) => (
                  <div
                    key={record.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div>
                      <p className="font-medium">{record.profile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {record.profile.employee_id} • {record.profile.department}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {record.check_in_time && format(parseISO(record.check_in_time), 'h:mm a')}
                      </p>
                      <StatusBadge status={record.status} />
                    </div>
                  </div>
                ))}
                {lateArrivals.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">No late arrivals today</p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Absent Today</CardTitle>
              <CardDescription>{absentEmployees.length} employees are absent</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {absentEmployees.map((emp) => (
                  <div
                    key={emp.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div>
                      <p className="font-medium">{emp.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {emp.employee_id} • {emp.department}
                      </p>
                    </div>
                    <StatusBadge status="absent" />
                  </div>
                ))}
                {absentEmployees.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">All employees are present!</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Weekly Attendance Trend</CardTitle>
            <CardDescription>Last 7 days attendance overview</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={weeklyTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="present" stroke="hsl(var(--success))" strokeWidth={2} />
                <Line type="monotone" dataKey="late" stroke="hsl(var(--late))" strokeWidth={2} />
                <Line type="monotone" dataKey="absent" stroke="hsl(var(--destructive))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
