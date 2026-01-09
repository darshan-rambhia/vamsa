"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  personCreateSchema,
  PersonCreateInput,
  PersonCreateFormInput,
} from "@/schemas/person";
import { createPerson, updatePerson } from "@/actions/person";
import { formatDateForInput } from "@/lib/utils";
import type { Person } from "@prisma/client";
import type { Gender } from "@prisma/client";

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
  } = useForm<PersonCreateFormInput>({
    resolver: zodResolver(personCreateSchema),
    defaultValues: person
      ? {
          firstName: person.firstName,
          lastName: person.lastName,
          maidenName: person.maidenName || undefined,
          dateOfBirth: person.dateOfBirth
            ? formatDateForInput(person.dateOfBirth)
            : undefined,
          dateOfPassing: person.dateOfPassing
            ? formatDateForInput(person.dateOfPassing)
            : undefined,
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
      : {
          firstName: "",
          lastName: "",
          isLiving: true,
          maidenName: "",
          dateOfBirth: "",
          dateOfPassing: "",
          birthPlace: "",
          nativePlace: "",
          bio: "",
          email: "",
          phone: "",
          profession: "",
          employer: "",
        },
  });

  const isLiving = watch("isLiving");

  async function onSubmit(formData: PersonCreateInput) {
    setIsLoading(true);
    setError(null);

    try {
      // The formData is already validated and transformed by zodResolver
      if (person) {
        await updatePerson(person.id, formData);
      } else {
        await createPerson(formData);
      }
      router.refresh();
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setIsLoading(false);
    }
  }

  // We need to cast onSubmit because react-hook-form's handleSubmit
  // expects a function that takes the form input type, but with zodResolver,
  // our onSubmit receives the transformed output type.
  // This is a known typing pattern with zodResolver.
  const processSubmit = handleSubmit(onSubmit as any);

  return (
    <form onSubmit={processSubmit} className="space-y-6">
      {error && (
        <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
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
                <p className="text-destructive text-sm">
                  {errors.firstName.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input id="lastName" {...register("lastName")} />
              {errors.lastName && (
                <p className="text-destructive text-sm">
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
                onValueChange={(value) => setValue("gender", value as Gender)}
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
              {errors.dateOfBirth && (
                <p className="text-destructive text-sm">
                  {errors.dateOfBirth.message}
                </p>
              )}
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
              {errors.dateOfPassing && (
                <p className="text-destructive text-sm">
                  {errors.dateOfPassing.message}
                </p>
              )}
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
            <Textarea
              id="bio"
              {...register("bio")}
              className="min-h-[100px]"
              placeholder="Brief biography or notes..."
            />
          </div>
        </TabsContent>

        <TabsContent value="contact" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register("email")} />
              {errors.email && (
                <p className="text-destructive text-sm">
                  {errors.email.message}
                </p>
              )}
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
