import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-nuanu-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 bg-nuanu-gray-50 relative">
        <Header />
        <main className="flex-1 py-8 !pl-10 !pr-6 w-full relative z-0">{children}</main>
      </div>
    </div>
  );
}
