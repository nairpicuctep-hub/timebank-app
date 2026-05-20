// This file is intentionally minimal - OAuth is handled client-side
// The actual callback handling is in /auth/confirm for magic links
export async function GET(request: Request) {
  const { origin } = new URL(request.url)
  return Response.redirect(`${origin}/auth/confirm${new URL(request.url).search}`)
}
