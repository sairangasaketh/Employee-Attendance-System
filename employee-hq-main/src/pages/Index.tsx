import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "@/stores/authStore";

const Index = () => {
  const navigate = useNavigate();
  const { user, role, loading } = useAuthStore();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate("/auth");
      } else if (role === "manager") {
        navigate("/manager");
      } else {
        navigate("/employee");
      }
    }
  }, [user, role, loading, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">Loading...</h1>
        </div>
      </div>
    );
  }

  return null;
};

export default Index;
