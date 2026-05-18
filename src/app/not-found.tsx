import Link from "next/link";
import Image from "next/image";

export default function NotFound() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #0A1628 0%, #0D1B2A 100%)",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "24px", textAlign: "center",
    }}>
      <Image src="/nuanu-logo.png" alt="Nuanu" width={64} height={64}
        style={{ borderRadius: "16px", marginBottom: "32px" }} />
      <h1 style={{ fontSize: "96px", fontWeight: 900, color: "#10B981", margin: 0, lineHeight: 1 }}>404</h1>
      <h2 style={{ fontSize: "24px", fontWeight: 700, color: "#ffffff", margin: "16px 0 8px" }}>
        Page Not Found
      </h2>
      <p style={{ color: "rgba(255,255,255,0.4)", fontSize: "15px", marginBottom: "32px", maxWidth: "400px" }}>
        The page you are looking for does not exist or has been moved.
      </p>
      <Link href="/dashboard" style={{
        display: "inline-flex", alignItems: "center", gap: "8px",
        background: "linear-gradient(135deg, #10B981, #059669)",
        color: "#ffffff", textDecoration: "none",
        padding: "14px 32px", borderRadius: "12px",
        fontWeight: 700, fontSize: "15px",
      }}>
        ← Back to Dashboard
      </Link>
    </div>
  );
}
