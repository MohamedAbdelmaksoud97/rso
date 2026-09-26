import type { NextRequest } from "next/server"
import { updateSession } from "@/lib/middleware"

export async function proxy(request: NextRequest) {
  return updateSession(request)
}

export const config = {
  matcher: ["/dashboard/:path*", "/auth/update-password"],
}
