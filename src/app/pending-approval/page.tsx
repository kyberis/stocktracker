export const metadata = {
  title: "Waiting for approval · trefolio",
  robots: { index: false, follow: false },
};

export default function PendingApprovalPage() {
  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-xl font-semibold">Your account is waiting</h1>
      <p className="mt-3 text-sm opacity-80">
        We received your signup. An administrator has to enable the account
        before you can use trefolio. We will email you when it is ready.
      </p>
    </main>
  );
}
