import { NextResponse, type NextRequest } from "next/server";

export async function GET(_request: NextRequest) {
  const notes = [{ id: 1, title: "Note 1", content: "This is the first note." }];
  return NextResponse.json(notes);
}

