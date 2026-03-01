export const env = {
  backend: process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000",
  timeout: Number(process.env.NEXT_PUBLIC_TIMEOUT || 90000),
}