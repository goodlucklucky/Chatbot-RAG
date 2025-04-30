// app/api/apply/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  // TODO: Implement your logic here (e.g., fetch or update something based on id)
  return NextResponse.json({ message: `Received id: ${id}` });
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const { id } = params;
  const body = await request.json();
  // TODO: Implement your logic here (e.g., apply changes based on id and body)
  return NextResponse.json({ message: `Applied changes to id: ${id}`, data: body });
}