import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = params;

  try {
    const body = await request.json();
    const { asset_name, serial_number, assigned_date, notes, status, received_date, returned_date } = body;

    const updateData: Record<string, any> = {};
    if (asset_name !== undefined) updateData.assetName = asset_name;
    if (serial_number !== undefined) updateData.serialNumber = serial_number;
    if (assigned_date !== undefined) updateData.assignedDate = assigned_date ? new Date(assigned_date) : null;
    if (notes !== undefined) updateData.notes = notes;
    if (status !== undefined) updateData.status = status;
    if (received_date !== undefined) updateData.receivedDate = received_date ? new Date(received_date) : null;
    if (returned_date !== undefined) updateData.returnedDate = returned_date ? new Date(returned_date) : null;

    await prisma.employeeAsset.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ updated: true }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ error: "Failed to update asset" }, { status: 500 });
  }
}
