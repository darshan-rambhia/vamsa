import { Suspense } from "react";
import { getTreeData } from "@/actions/person";
import { FamilyTree } from "@/components/tree/family-tree";
import { getSession } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function TreePage() {
  const { persons, relationships } = await getTreeData();
  const session = await getSession();

  let currentPersonId: string | undefined;
  if (session?.user?.id) {
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { personId: true },
    });
    currentPersonId = user?.personId ?? undefined;
  }

  return (
    <div className="h-[calc(100vh-8rem)]">
      <Suspense fallback={<TreeSkeleton />}>
        <FamilyTree
          persons={persons}
          relationships={relationships}
          currentPersonId={currentPersonId}
        />
      </Suspense>
    </div>
  );
}

function TreeSkeleton() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-muted-foreground">Loading family tree...</div>
    </div>
  );
}
