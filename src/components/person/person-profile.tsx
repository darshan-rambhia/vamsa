"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Calendar,
  MapPin,
  Briefcase,
  Mail,
  Phone,
  Edit,
  Users,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PersonForm } from "@/components/forms/person-form";
import { RelationshipsList } from "./relationships-list";
import { AddRelationshipButton } from "./add-relationship-button";
import { formatDate, calculateAge, getInitials } from "@/lib/utils";
import type { Person, Relationship, User } from "@prisma/client";

type PersonWithRelations = Person & {
  relationshipsFrom: (Relationship & { relatedPerson: Person })[];
  relationshipsTo: (Relationship & { person: Person })[];
  createdBy: Pick<User, "id" | "name" | "email"> | null;
};

interface PersonProfileProps {
  person: PersonWithRelations;
  canEdit: boolean;
  isAdmin: boolean;
}

export function PersonProfile({
  person,
  canEdit,
  isAdmin,
}: PersonProfileProps) {
  const [editOpen, setEditOpen] = useState(false);
  const initials = getInitials(person.firstName, person.lastName);
  const age = calculateAge(person.dateOfBirth, person.dateOfPassing);

  const fromRelationships = person.relationshipsFrom.map((r) => ({
    id: r.id,
    type: r.type,
    person: r.relatedPerson,
    marriageDate: r.marriageDate,
    divorceDate: r.divorceDate,
    isActive: r.isActive,
  }));

  const toRelationships = person.relationshipsTo.map((r) => ({
    id: r.id,
    type: getInverseType(r.type),
    person: r.person,
    marriageDate: r.marriageDate,
    divorceDate: r.divorceDate,
    isActive: r.isActive,
  }));

  // Symmetric relationships (SPOUSE, SIBLING) are stored bidirectionally - dedupe by person ID
  const seenPersonIds = new Set<string>();
  const allRelationships = [...fromRelationships, ...toRelationships].filter(
    (r) => {
      const isSymmetric = r.type === "SPOUSE" || r.type === "SIBLING";
      if (isSymmetric) {
        if (seenPersonIds.has(r.person.id)) return false;
        seenPersonIds.add(r.person.id);
      }
      return true;
    }
  );

  const parents = allRelationships.filter((r) => r.type === "PARENT");
  const children = allRelationships.filter((r) => r.type === "CHILD");
  const spouses = allRelationships.filter((r) => r.type === "SPOUSE");
  const siblings = allRelationships.filter((r) => r.type === "SIBLING");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/people">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-2xl font-bold">Profile</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center">
              <Avatar className="h-32 w-32">
                {person.photoUrl && <AvatarImage src={person.photoUrl} />}
                <AvatarFallback className="text-3xl">{initials}</AvatarFallback>
              </Avatar>
              <h2 className="mt-4 text-2xl font-bold">
                {person.firstName} {person.lastName}
              </h2>
              {person.maidenName && (
                <p className="text-muted-foreground">née {person.maidenName}</p>
              )}
              {!person.isLiving && (
                <span className="mt-2 rounded-full bg-muted px-3 py-1 text-sm">
                  Deceased
                </span>
              )}
              {canEdit && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setEditOpen(true)}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit Profile
                </Button>
              )}
            </div>

            <Separator className="my-6" />

            <div className="space-y-4">
              {person.dateOfBirth && (
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Born</p>
                    <p>{formatDate(person.dateOfBirth)}</p>
                    {person.isLiving && age !== null && (
                      <p className="text-sm text-muted-foreground">Age {age}</p>
                    )}
                  </div>
                </div>
              )}
              {person.dateOfPassing && (
                <div className="flex items-center gap-3">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Passed</p>
                    <p>{formatDate(person.dateOfPassing)}</p>
                    {age !== null && (
                      <p className="text-sm text-muted-foreground">Age {age}</p>
                    )}
                  </div>
                </div>
              )}
              {(person.birthPlace || person.nativePlace) && (
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <div>
                    {person.birthPlace && (
                      <>
                        <p className="text-sm text-muted-foreground">
                          Birth Place
                        </p>
                        <p>{person.birthPlace}</p>
                      </>
                    )}
                    {person.nativePlace && (
                      <>
                        <p className="text-sm text-muted-foreground">
                          Native Place
                        </p>
                        <p>{person.nativePlace}</p>
                      </>
                    )}
                  </div>
                </div>
              )}
              {person.profession && (
                <div className="flex items-center gap-3">
                  <Briefcase className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Profession</p>
                    <p>{person.profession}</p>
                    {person.employer && (
                      <p className="text-sm text-muted-foreground">
                        at {person.employer}
                      </p>
                    )}
                  </div>
                </div>
              )}
              {person.email && (
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={`mailto:${person.email}`}
                    className="text-primary hover:underline"
                  >
                    {person.email}
                  </a>
                </div>
              )}
              {person.phone && (
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a
                    href={`tel:${person.phone}`}
                    className="text-primary hover:underline"
                  >
                    {person.phone}
                  </a>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6 lg:col-span-2">
          {person.bio && (
            <Card>
              <CardHeader>
                <CardTitle>About</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{person.bio}</p>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Relationships
                </CardTitle>
                <CardDescription>
                  Family connections and relationships
                </CardDescription>
              </div>
              {canEdit && <AddRelationshipButton personId={person.id} />}
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="parents">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="parents">
                    Parents ({parents.length})
                  </TabsTrigger>
                  <TabsTrigger value="spouse">
                    Spouse ({spouses.length})
                  </TabsTrigger>
                  <TabsTrigger value="children">
                    Children ({children.length})
                  </TabsTrigger>
                  <TabsTrigger value="siblings">
                    Siblings ({siblings.length})
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="parents">
                  <RelationshipsList
                    relationships={parents}
                    emptyMessage="No parents added"
                    canEdit={canEdit}
                  />
                </TabsContent>
                <TabsContent value="spouse">
                  <RelationshipsList
                    relationships={spouses}
                    emptyMessage="No spouse added"
                    showMarriageInfo
                    canEdit={canEdit}
                  />
                </TabsContent>
                <TabsContent value="children">
                  <RelationshipsList
                    relationships={children}
                    emptyMessage="No children added"
                    canEdit={canEdit}
                  />
                </TabsContent>
                <TabsContent value="siblings">
                  <RelationshipsList
                    relationships={siblings}
                    emptyMessage="No siblings added"
                    canEdit={canEdit}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
          <PersonForm person={person} onSuccess={() => setEditOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function getInverseType(type: string): string {
  switch (type) {
    case "PARENT":
      return "CHILD";
    case "CHILD":
      return "PARENT";
    default:
      return type;
  }
}
