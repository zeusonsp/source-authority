import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-8">
        <Link href="/" className="block text-center">
          <h1 className="font-sans text-3xl font-bold tracking-tight">
            Source<span className="text-accent">.</span>Authority
          </h1>
        </Link>
        {children}
      </div>
    </div>
  );
}
