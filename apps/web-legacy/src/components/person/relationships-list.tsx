"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Trash2, Pencil } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  formatDate,
  formatDateForInput,
  getInitials,
  parseDateString,
} from "@/lib/utils";
import { deleteRelationship, updateRelationship } from "@/actions/relationship";
import { toast } from "@/hooks/use-toast";
import type { Person } from "@prisma/client";

interface RelationshipItem {
  id: string;
  type: string;
  person: Person;
  marriageDate?: Date | null;
  divorceDate?: Date | null;
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
  const [editingRel, setEditingRel] = useState<RelationshipItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [marriageDate, setMarriageDate] = useState("");
  const [divorceDate, setDivorceDate] = useState("");

  function openEditDialog(rel: RelationshipItem) {
    setEditingRel(rel);
    setMarriageDate(formatDateForInput(rel.marriageDate));
    setDivorceDate(formatDateForInput(rel.divorceDate));
  }

  async function handleUpdate() {
    if (!editingRel) return;
    setIsLoading(true);
    try {
      await updateRelationship(editingRel.id, {
        marriageDate: parseDateString(marriageDate),
        divorceDate: parseDateString(divorceDate),
        isActive: !divorceDate,
      });
      router.refresh();
      toast({ title: "Relationship updated" });
      setEditingRel(null);
    } catch (err) {
      toast({
        title: "Failed to update relationship",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

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
    <>
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
                {rel.person.photoUrl && (
                  <AvatarImage src={rel.person.photoUrl} />
                )}
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
                {showMarriageInfo && rel.divorceDate && (
                  <p className="text-sm text-muted-foreground">
                    Divorced {formatDate(rel.divorceDate)}
                  </p>
                )}
                {!rel.person.isLiving && (
                  <p className="text-sm text-muted-foreground">Deceased</p>
                )}
              </div>
            </Link>
            {canEdit && (
              <div className="flex gap-1">
                {showMarriageInfo && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => openEditDialog(rel)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDelete(rel.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      <Dialog
        open={!!editingRel}
        onOpenChange={(open) => !open && setEditingRel(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Edit Marriage Details
              {editingRel &&
                ` - ${editingRel.person.firstName} ${editingRel.person.lastName}`}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="marriageDate">Marriage Date</Label>
              <Input
                id="marriageDate"
                type="date"
                value={marriageDate}
                onChange={(e) => setMarriageDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="divorceDate">Divorce Date (if applicable)</Label>
              <Input
                id="divorceDate"
                type="date"
                value={divorceDate}
                onChange={(e) => setDivorceDate(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditingRel(null)}>
                Cancel
              </Button>
              <Button onClick={handleUpdate} disabled={isLoading}>
                {isLoading ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
