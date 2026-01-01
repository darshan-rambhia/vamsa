"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { formatDate, getInitials } from "@/lib/utils";
import { deleteRelationship } from "@/actions/relationship";
import { toast } from "@/hooks/use-toast";
import type { Person } from "@prisma/client";

interface RelationshipItem {
  id: string;
  type: string;
  person: Person;
  marriageDate?: Date | null;
  isActive?: boolean;
}

interface RelationshipsListProps {
  relationships: RelationshipItem[];
  emptyMessage: string;
  showMarriageInfo?: boolean;
  canEdit?: boolean;
}

export function RelationshipsList({
  relationships,
  emptyMessage,
  showMarriageInfo,
  canEdit,
}: RelationshipsListProps) {
  const router = useRouter();

  async function handleDelete(id: string) {
    try {
      await deleteRelationship(id);
      router.refresh();
      toast({ title: "Relationship removed" });
    } catch (err) {
      toast({
        title: "Failed to remove relationship",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    }
  }

  if (relationships.length === 0) {
    return (
      <p className="py-4 text-center text-muted-foreground">{emptyMessage}</p>
    );
  }

  return (
    <div className="space-y-2 py-2">
      {relationships.map((rel) => (
        <div
          key={rel.id}
          className="flex items-center justify-between rounded-lg border p-3"
        >
          <Link
            href={`/people/${rel.person.id}`}
            className="flex items-center gap-3 hover:opacity-80"
          >
            <Avatar>
              {rel.person.photoUrl && <AvatarImage src={rel.person.photoUrl} />}
              <AvatarFallback>
                {getInitials(rel.person.firstName, rel.person.lastName)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-medium">
                {rel.person.firstName} {rel.person.lastName}
              </p>
              {showMarriageInfo && rel.marriageDate && (
                <p className="text-sm text-muted-foreground">
                  Married {formatDate(rel.marriageDate)}
                </p>
              )}
              {!rel.person.isLiving && (
                <p className="text-sm text-muted-foreground">Deceased</p>
              )}
            </div>
          </Link>
          {canEdit && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDelete(rel.id)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
