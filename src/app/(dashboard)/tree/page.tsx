import { Suspense } from "react";
import { getTreeData } from "@/actions/person";
import { FamilyTree } from "@/components/tree/family-tree";

export default async function TreePage() {
  const { persons, relationships } = await getTreeData();

  return (
    <div className="h-[calc(100vh-8rem)]">
      <Suspense fallback={<TreeSkeleton />}>
        <FamilyTree persons={persons} relationships={relationships} />
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
