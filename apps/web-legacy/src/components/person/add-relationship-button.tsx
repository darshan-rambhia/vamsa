"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  relationshipCreateSchema,
  type RelationshipCreateInput,
} from "@/schemas/relationship";
import { createRelationship } from "@/actions/relationship";
import { searchPersons } from "@/actions/person";
import { toast } from "@/hooks/use-toast";
import type { Person } from "@prisma/client";

interface AddRelationshipButtonProps {
  personId: string;
}

export function AddRelationshipButton({
  personId,
}: AddRelationshipButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    Pick<Person, "id" | "firstName" | "lastName" | "photoUrl" | "isLiving">[]
  >([]);

  const {
    setValue,
    watch,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<RelationshipCreateInput>({
    resolver: zodResolver(relationshipCreateSchema),
    defaultValues: {
      personId,
      isActive: true,
    },
  });

  const selectedType = watch("type");
  const selectedRelatedPerson = watch("relatedPersonId");

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.length >= 2) {
        const results = await searchPersons(searchQuery);
        setSearchResults(results.filter((p) => p.id !== personId));
      } else {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, personId]);

  async function onSubmit(data: RelationshipCreateInput) {
    setIsLoading(true);
    try {
      await createRelationship(data);
      toast({ title: "Relationship added" });
      router.refresh();
      setOpen(false);
      reset();
    } catch (err) {
      toast({
        title: "Failed to add relationship",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) {
          reset();
          setSearchQuery("");
          setSearchResults([]);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Relationship</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Relationship Type</Label>
            <Select
              onValueChange={(value) =>
                setValue("type", value as RelationshipCreateInput["type"])
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PARENT">Parent</SelectItem>
                <SelectItem value="CHILD">Child</SelectItem>
                <SelectItem value="SPOUSE">Spouse</SelectItem>
                <SelectItem value="SIBLING">Sibling</SelectItem>
              </SelectContent>
            </Select>
            {errors.type && (
              <p className="text-destructive text-sm">{errors.type.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Search Person</Label>
            <Input
              placeholder="Type a name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchResults.length > 0 && (
              <div className="max-h-40 overflow-y-auto rounded-md border">
                {searchResults.map((person) => (
                  <button
                    key={person.id}
                    type="button"
                    className={`hover:bg-muted w-full px-3 py-2 text-left ${
                      selectedRelatedPerson === person.id ? "bg-muted" : ""
                    }`}
                    onClick={() => {
                      setValue("relatedPersonId", person.id);
                      setSearchQuery(`${person.firstName} ${person.lastName}`);
                      setSearchResults([]);
                    }}
                  >
                    {person.firstName} {person.lastName}
                    {!person.isLiving && (
                      <span className="text-muted-foreground ml-2">
                        (Deceased)
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
            {errors.relatedPersonId && (
              <p className="text-destructive text-sm">
                {errors.relatedPersonId.message}
              </p>
            )}
          </div>

          {selectedType === "SPOUSE" && (
            <div className="space-y-2">
              <Label>Marriage Date</Label>
              <Input
                type="date"
                onChange={(e) =>
                  setValue(
                    "marriageDate",
                    e.target.value ? new Date(e.target.value) : null
                  )
                }
              />
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Adding..." : "Add Relationship"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
