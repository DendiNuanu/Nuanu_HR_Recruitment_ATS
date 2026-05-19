import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const events: Array<{ date: string; icon: string; description: string; timestamp: number }> = [];

    const employee = await prisma.employee.findUnique({
      where: { id: params.id },
      include: {
        employeeContract: true,
        memoHires: true,
        onboarding: true,
        employeeDocuments: true,
        employeeAssets: true,
      }
    });

    if (!employee) return NextResponse.json({ error: "Not found" }, { status: 404 });

    // Join date event
    events.push({
      date: employee.createdAt.toISOString(),
      timestamp: employee.createdAt.getTime(),
      icon: "user_plus",
      description: "Employee record created"
    });

    if (employee.employeeContract) {
      events.push({
        date: employee.employeeContract.createdAt.toISOString(),
        timestamp: employee.employeeContract.createdAt.getTime(),
        icon: "file_signature",
        description: "New Hire Confirmation form completed"
      });
    }

    if (employee.memoHires && employee.memoHires.length > 0) {
      employee.memoHires.forEach(memo => {
        events.push({
          date: memo.createdAt.toISOString(),
          timestamp: memo.createdAt.getTime(),
          icon: "file_text",
          description: `Memo Hire generated: ${memo.memoNumber}`
        });
      });
    }

    // Documents verified
    if (employee.employeeDocuments && employee.employeeDocuments.length === 8) {
      const allVerified = employee.employeeDocuments.every(d => d.verificationStatus === "verified");
      if (allVerified) {
        // Find the latest verification date
        const lastUpdated = employee.employeeDocuments.reduce((latest, doc) => doc.updatedAt > latest ? doc.updatedAt : latest, employee.employeeDocuments[0].updatedAt);
        events.push({
          date: lastUpdated.toISOString(),
          timestamp: lastUpdated.getTime(),
          icon: "check_circle",
          description: "All 8 onboarding documents verified"
        });
      }
    }

    // Assets assigned
    if (employee.employeeAssets && employee.employeeAssets.length > 0) {
      const allAssigned = employee.employeeAssets.every(a => a.status === "assigned" || a.status === "received" || a.status === "returned");
      if (allAssigned) {
        const lastAssigned = employee.employeeAssets.reduce((latest, a) => (a.assignedDate && a.assignedDate > latest) ? a.assignedDate : latest, employee.employeeAssets[0].assignedDate || employee.employeeAssets[0].updatedAt);
        events.push({
          date: lastAssigned.toISOString(),
          timestamp: lastAssigned.getTime(),
          icon: "monitor",
          description: "All required assets assigned"
        });
      }
    }

    // Probation end date
    if (employee.probationEndDate) {
      events.push({
        date: employee.probationEndDate.toISOString(),
        timestamp: employee.probationEndDate.getTime(),
        icon: "calendar",
        description: "Probation period ends"
      });
    }

    // Sort descending
    events.sort((a, b) => b.timestamp - a.timestamp);

    return NextResponse.json({ events }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
