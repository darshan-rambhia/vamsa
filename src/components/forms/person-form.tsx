"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { personCreateSchema, type PersonCreateInput } from "@/schemas/person";
import { createPerson, updatePerson } from "@/actions/person";
import type { Person } from "@prisma/client";

interface PersonFormProps {
  person?: Person;
  onSuccess?: () => void;
}

export function PersonForm({ person, onSuccess }: PersonFormProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<PersonCreateInput>({
    resolver: zodResolver(personCreateSchema),
    defaultValues: person
      ? {
          firstName: person.firstName,
          lastName: person.lastName,
          maidenName: person.maidenName || undefined,
          dateOfBirth: person.dateOfBirth || undefined,
          dateOfPassing: person.dateOfPassing || undefined,
          birthPlace: person.birthPlace || undefined,
          nativePlace: person.nativePlace || undefined,
          gender: person.gender || undefined,
          bio: person.bio || undefined,
          email: person.email || undefined,
          phone: person.phone || undefined,
          profession: person.profession || undefined,
          employer: person.employer || undefined,
          isLiving: person.isLiving,
        }
      : { isLiving: true },
  });

  const isLiving = watch("isLiving");

  async function onSubmit(data: PersonCreateInput) {
    setIsLoading(true);
    setError(null);

    try {
      if (person) {
        await updatePerson(person.id, data);
      } else {
        await createPerson(data);
      }
      router.refresh();
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {error && (
        <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="basic">Basic Info</TabsTrigger>
          <TabsTrigger value="contact">Contact</TabsTrigger>
          <TabsTrigger value="professional">Professional</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input id="firstName" {...register("firstName")} />
              {errors.firstName && (
                <p className="text-sm text-destructive">
                  {errors.firstName.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input id="lastName" {...register("lastName")} />
              {errors.lastName && (
                <p className="text-sm text-destructive">
                  {errors.lastName.message}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="maidenName">Maiden Name</Label>
            <Input id="maidenName" {...register("maidenName")} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="gender">Gender</Label>
              <Select
                onValueChange={(value) =>
                  setValue("gender", value as PersonCreateInput["gender"])
                }
                defaultValue={person?.gender || undefined}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MALE">Male</SelectItem>
                  <SelectItem value="FEMALE">Female</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                  <SelectItem value="PREFER_NOT_TO_SAY">
                    Prefer not to say
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dateOfBirth">Date of Birth</Label>
              <Input
                id="dateOfBirth"
                type="date"
                {...register("dateOfBirth")}
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isLiving"
              {...register("isLiving")}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="isLiving">Living</Label>
          </div>

          {!isLiving && (
            <div className="space-y-2">
              <Label htmlFor="dateOfPassing">Date of Passing</Label>
              <Input
                id="dateOfPassing"
                type="date"
                {...register("dateOfPassing")}
              />
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="birthPlace">Birth Place</Label>
              <Input id="birthPlace" {...register("birthPlace")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nativePlace">Native Place</Label>
              <Input id="nativePlace" {...register("nativePlace")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">About</Label>
            <textarea
              id="bio"
              {...register("bio")}
              className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              placeholder="Brief biography or notes..."
            />
          </div>
        </TabsContent>

        <TabsContent value="contact" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" {...register("phone")} />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="professional" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="profession">Profession</Label>
              <Input id="profession" {...register("profession")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="employer">Employer</Label>
              <Input id="employer" {...register("employer")} />
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading ? "Saving..." : person ? "Update" : "Create"}
        </Button>
      </div>
    </form>
  );
}
