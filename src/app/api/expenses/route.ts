import { NextRequest, NextResponse } from "next/server";
import { addExpense, getExpenses, deleteExpense } from "@/lib/notion";
import { detectRegion } from "@/lib/trip";
import { defaultTrip } from "@/lib/trip";

export async function GET() {
  try {
    const expenses = await getExpenses();
    return NextResponse.json(expenses);
  } catch (error) {
    console.error("GET expenses error:", error);
    return NextResponse.json({ error: "Failed to fetch expenses" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const region = detectRegion(body.date, defaultTrip);

    const result = await addExpense({
      ...body,
      region,
    });

    return NextResponse.json({ id: result.id });
  } catch (error) {
    console.error("POST expense error:", error);
    return NextResponse.json({ error: "Failed to save expense" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const pageId = searchParams.get("id");
    if (!pageId) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }
    await deleteExpense(pageId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE expense error:", error);
    return NextResponse.json({ error: "Failed to delete expense" }, { status: 500 });
  }
}
