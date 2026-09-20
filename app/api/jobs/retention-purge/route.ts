import { NextResponse } from "next/server";
import { dbConnect } from "@/lib/db/mongoose";
import { runDataRetentionJob } from "@/lib/jobs/enforceDataRetention";

export async function POST(req: Request) {
  try {
    await dbConnect();
    const summaries = await runDataRetentionJob();

    return NextResponse.json({
      success: true,
      message: "Data retention archiving job executed successfully!",
      summaries,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to execute data retention job" },
      { status: 500 }
    );
  }
}
