import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-nuanu-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 pl-16">
        <Header />
        <main className="flex-1 py-8 pr-12">{children}</main>
      </div>
    </div>
  );
}
