import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/StatusBadge";
import { ClipboardCheck, ArrowLeft, Search } from "lucide-react";
import { format, parseISO } from "date-fns";

export default function AllAttendance() {
  const navigate = useNavigate();
  const { user, role, loading: authLoading } = useAuthStore();
  const [attendance, setAttendance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    if (!authLoading && (!user || role !== 'manager')) {
      navigate("/auth");
    }
  }, [user, role, authLoading, navigate]);

  useEffect(() => {
    if (user && role === 'manager') {
      fetchAttendance();
    }
  }, [user, role]);

  const fetchAttendance = async () => {
    try {
      const { data, error } = await supabase
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
        .order('date', { ascending: false })
        .limit(100);

      if (error) throw error;
      
      const formattedData = data?.map((a: any) => ({
        ...a,
        profile: Array.isArray(a.profiles) ? a.profiles[0] : a.profiles
      })) || [];
      
      setAttendance(formattedData);
    } catch (error) {
      console.error('Error fetching attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredAttendance = attendance.filter((record) => {
    const matchesSearch = 
      record.profile.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.profile.employee_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.profile.department.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || record.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (authLoading || loading) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto flex h-16 items-center gap-4 px-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-3">
            <ClipboardCheck className="h-8 w-8 text-primary" />
            <h1 className="text-lg font-semibold">All Employees Attendance</h1>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 md:p-8">
        <Card>
          <CardHeader>
            <CardTitle>Attendance Records</CardTitle>
            <div className="flex flex-col md:flex-row gap-4 mt-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, employee ID, or department..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="present">Present</SelectItem>
                  <SelectItem value="absent">Absent</SelectItem>
                  <SelectItem value="late">Late</SelectItem>
                  <SelectItem value="half-day">Half Day</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Employee ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Check In</TableHead>
                    <TableHead>Check Out</TableHead>
                    <TableHead>Hours</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAttendance.length > 0 ? (
                    filteredAttendance.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>{format(parseISO(record.date), 'MMM d, yyyy')}</TableCell>
                        <TableCell className="font-medium">{record.profile.employee_id}</TableCell>
                        <TableCell>{record.profile.name}</TableCell>
                        <TableCell>{record.profile.department}</TableCell>
                        <TableCell>
                          {record.check_in_time ? format(parseISO(record.check_in_time), 'h:mm a') : '-'}
                        </TableCell>
                        <TableCell>
                          {record.check_out_time ? format(parseISO(record.check_out_time), 'h:mm a') : '-'}
                        </TableCell>
                        <TableCell>{record.total_hours.toFixed(2)}</TableCell>
                        <TableCell>
                          <StatusBadge status={record.status} />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                        No attendance records found
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
