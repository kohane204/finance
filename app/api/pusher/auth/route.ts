import { pusherServer } from "@/lib/pusher";
import { auth } from "@/auth";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.id;
  const username = session.user.name || session.user.email || "Unknown";

  const body = await req.formData();
  const socketId = body.get("socket_id") as string;
  const channel = body.get("channel_name") as string;

  const presenceData = {
    user_id: userId,
    user_info: {
      name: username,
      image: session.user.image,
    },
  };

  const authResponse = pusherServer.authorizeChannel(socketId, channel, presenceData);
  return NextResponse.json(authResponse);
}
