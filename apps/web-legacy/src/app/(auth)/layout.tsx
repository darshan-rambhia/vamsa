import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (session) {
    redirect("/tree");
  }

  return (
    <div className="bg-muted/50 flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}
