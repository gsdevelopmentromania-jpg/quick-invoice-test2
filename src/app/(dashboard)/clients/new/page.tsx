import type { Metadata } from "next";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardBody } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "New Client",
};

export default function NewClientPage(): React.ReactElement {
  return (
    <div className="p-6 max-w-xl mx-auto">
      {/* Back link + heading */}
      <div className="mb-6">
        <Link
          href="/clients"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-3"
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Back to clients
        </Link>
        <h1 className="text-2xl font-semibold text-gray-900">Add Client</h1>
        <p className="mt-1 text-sm text-gray-500">
          Save client details to reuse across invoices.
        </p>
      </div>

      {/* Placeholder card */}
      <Card>
        <CardHeader>
          <h2 className="text-base font-semibold text-gray-900">Client details</h2>
        </CardHeader>
        <CardBody>
          <p className="text-sm text-gray-500">
            The client form will be built in the next feature task.
          </p>
        </CardBody>
      </Card>

      {/* Action row */}
      <div className="mt-6 flex justify-end gap-3">
        <Link href="/clients">
          <Button variant="outline" size="md">
            Cancel
          </Button>
        </Link>
        <Button variant="primary" size="md" disabled>
          Save Client
        </Button>
      </div>
    </div>
  );
}
