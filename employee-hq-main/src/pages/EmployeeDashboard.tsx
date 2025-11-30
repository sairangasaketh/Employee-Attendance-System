import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/StatCard";
import { StatusBadge } from "@/components/StatusBadge";
import { useToast } from "@/hooks/use-toast";
import { ClipboardCheck, Clock, Calendar, TrendingUp, LogOut, User, History } from "lucide-react";
import { format, startOfMonth, parseISO } from "date-fns";
import { Attendance, MonthlySummary, TodayStatus } from "@/types";

export default function EmployeeDashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, profile, signOut, loading: authLoading } = useAuthStore();
  
  const [todayStatus, setTodayStatus] = useState<TodayStatus>({
    status: 'not-marked',
    checkInTime: null,
    checkOutTime: null,
    totalHours: 0,
  });
  const [monthlySummary, setMonthlySummary] = useState<MonthlySummary>({
    present: 0,
    absent: 0,
    late: 0,
    halfDay: 0,
    totalHours: 0,
  });
  const [recentAttendance, setRecentAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user) return;

    try {
      const today = format(new Date(), 'yyyy-MM-dd');
      const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd');

      // Fetch today's status
      const { data: todayData } = await supabase
        .from('attendance')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .maybeSingle();

      if (todayData) {
        setTodayStatus({
          status: todayData.status as any,
          checkInTime: todayData.check_in_time,
          checkOutTime: todayData.check_out_time,
          totalHours: todayData.total_hours,
        });
      }

      // Fetch monthly summary
      const { data: monthlyData } = await supabase
        .from('attendance')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', monthStart);

      if (monthlyData) {
        const summary: MonthlySummary = {
          present: monthlyData.filter(a => a.status === 'present').length,
          absent: monthlyData.filter(a => a.status === 'absent').length,
          late: monthlyData.filter(a => a.status === 'late').length,
          halfDay: monthlyData.filter(a => a.status === 'half-day').length,
          totalHours: monthlyData.reduce((sum, a) => sum + (a.total_hours || 0), 0),
        };
        setMonthlySummary(summary);
      }

      // Fetch recent 7 days
      const { data: recentData } = await supabase
        .from('attendance')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .limit(7);

      setRecentAttendance(recentData as any || []);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const handleCheckIn = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const now = new Date();
      const today = format(now, 'yyyy-MM-dd');
      const checkInTime = now.toISOString();

      // Determine status based on time (9 AM cutoff for late)
      const hour = now.getHours();
      const status = hour > 9 ? 'late' : 'present';

      const { error } = await supabase
        .from('attendance')
        .insert({
          user_id: user.id,
          date: today,
          check_in_time: checkInTime,
          status,
        });

      if (error) throw error;

      toast({
        title: "Checked In!",
        description: `You have successfully checked in at ${format(now, 'h:mm a')}`,
      });

      fetchDashboardData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const now = new Date();
      const today = format(now, 'yyyy-MM-dd');
      const checkOutTime = now.toISOString();

      // Get today's record
      const { data: todayRecord } = await supabase
        .from('attendance')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .single();

      if (!todayRecord) {
        throw new Error('Please check in first');
      }

      // Calculate hours
      const checkIn = parseISO(todayRecord.check_in_time);
      const checkOut = parseISO(checkOutTime);
      const hours = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);

      // Update status if needed
      let status = todayRecord.status;
      if (hours < 4) {
        status = 'half-day';
      }

      const { error } = await supabase
        .from('attendance')
        .update({
          check_out_time: checkOutTime,
          total_hours: hours,
          status,
        })
        .eq('id', todayRecord.id);

      if (error) throw error;

      toast({
        title: "Checked Out!",
        description: `You worked ${hours.toFixed(2)} hours today`,
      });

      fetchDashboardData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <ClipboardCheck className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-lg font-semibold">Employee Portal</h1>
              <p className="text-xs text-muted-foreground">{profile?.name} • {profile?.employee_id}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate("/attendance")}>
              <History className="h-4 w-4 mr-2" />
              History
            </Button>
            <Button variant="outline" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 md:p-8 space-y-8">
        {/* Quick Actions */}
        <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent">
          <CardHeader>
            <CardTitle>Today's Status</CardTitle>
            <CardDescription>{format(new Date(), 'EEEE, MMMM d, yyyy')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              <div className="space-y-2">
                <StatusBadge status={todayStatus.status} />
                {todayStatus.checkInTime && (
                  <p className="text-sm text-muted-foreground">
                    Checked in at {format(parseISO(todayStatus.checkInTime), 'h:mm a')}
                  </p>
                )}
                {todayStatus.checkOutTime && (
                  <p className="text-sm text-muted-foreground">
                    Checked out at {format(parseISO(todayStatus.checkOutTime), 'h:mm a')}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                {!todayStatus.checkInTime && (
                  <Button onClick={handleCheckIn} disabled={loading} size="lg">
                    <Clock className="mr-2 h-4 w-4" />
                    Check In
                  </Button>
                )}
                {todayStatus.checkInTime && !todayStatus.checkOutTime && (
                  <Button onClick={handleCheckOut} disabled={loading} variant="secondary" size="lg">
                    <Clock className="mr-2 h-4 w-4" />
                    Check Out
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Present Days"
            value={monthlySummary.present}
            icon={ClipboardCheck}
            description="This month"
          />
          <StatCard
            title="Absent Days"
            value={monthlySummary.absent}
            icon={Calendar}
            description="This month"
          />
          <StatCard
            title="Late Arrivals"
            value={monthlySummary.late}
            icon={Clock}
            description="This month"
          />
          <StatCard
            title="Total Hours"
            value={monthlySummary.totalHours.toFixed(1)}
            icon={TrendingUp}
            description="This month"
          />
        </div>

        {/* Recent Attendance */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Attendance (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentAttendance.map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div>
                    <p className="font-medium">{format(parseISO(record.date), 'EEEE, MMM d')}</p>
                    <p className="text-sm text-muted-foreground">
                      {record.check_in_time && format(parseISO(record.check_in_time), 'h:mm a')}
                      {record.check_out_time && ` - ${format(parseISO(record.check_out_time), 'h:mm a')}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium">{record.total_hours.toFixed(1)} hrs</span>
                    <StatusBadge status={record.status} />
                  </div>
                </div>
              ))}
              {recentAttendance.length === 0 && (
                <p className="text-center text-muted-foreground py-8">No recent attendance records</p>
              )}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
