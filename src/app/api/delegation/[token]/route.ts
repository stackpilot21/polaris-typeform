import { NextResponse } from "next/server";
import { validateToken } from "@/lib/tokens";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const data = await validateToken(token);

  if (!data) {
    return NextResponse.json(
      { error: "Token is invalid, expired, or already used" },
      { status: 400 }
    );
  }

  return NextResponse.json({
    principal_id: data.principal_id,
    principal_name: data.principals?.name,
    token_id: data.id,
  });
}
