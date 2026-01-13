"use client";

import { useState } from "react";
import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@vamsa/ui";
import { createPerson, updatePerson } from "~/server/persons";

interface PersonFormProps {
  person?: {
    id: string;
    firstName: string;
    lastName: string;
    maidenName?: string | null;
    dateOfBirth?: string | null;
    dateOfPassing?: string | null;
    birthPlace?: string | null;
    nativePlace?: string | null;
    gender?: "MALE" | "FEMALE" | "OTHER" | "PREFER_NOT_TO_SAY" | null;
    bio?: string | null;
    email?: string | null;
    phone?: string | null;
    profession?: string | null;
    employer?: string | null;
    isLiving: boolean;
  };
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function PersonForm({ person, onSuccess, onCancel }: PersonFormProps) {
  const [formData, setFormData] = useState({
    firstName: person?.firstName || "",
    lastName: person?.lastName || "",
    maidenName: person?.maidenName || "",
    dateOfBirth: person?.dateOfBirth || "",
    dateOfPassing: person?.dateOfPassing || "",
    birthPlace: person?.birthPlace || "",
    nativePlace: person?.nativePlace || "",
    gender: person?.gender || undefined,
    bio: person?.bio || "",
    email: person?.email || "",
    phone: person?.phone || "",
    profession: person?.profession || "",
    employer: person?.employer || "",
    isLiving: person?.isLiving ?? true,
  });

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    if (type === "checkbox") {
      setFormData({
        ...formData,
        [name]: (e.target as HTMLInputElement).checked,
      });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleGenderChange = (value: string) => {
    setFormData({
      ...formData,
      gender: value as "MALE" | "FEMALE" | "OTHER" | "PREFER_NOT_TO_SAY",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // Prepare the data for submission
      const submitData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        maidenName: formData.maidenName || undefined,
        dateOfBirth: formData.dateOfBirth || undefined,
        dateOfPassing: formData.dateOfPassing || undefined,
        birthPlace: formData.birthPlace || undefined,
        nativePlace: formData.nativePlace || undefined,
        gender: formData.gender,
        bio: formData.bio || undefined,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        profession: formData.profession || undefined,
        employer: formData.employer || undefined,
        isLiving: formData.isLiving,
      };

      if (person) {
        // Update existing person
        await updatePerson({ data: { id: person.id, ...submitData } });
      } else {
        // Create new person
        await createPerson({ data: submitData });
      }
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
      setIsLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      data-testid="person-form"
      className="space-y-6"
    >
      {error && (
        <div
          data-testid="person-form-error"
          className="bg-destructive/10 text-destructive rounded-md p-3 text-sm"
        >
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
              <Input
                id="firstName"
                name="firstName"
                data-testid="person-form-firstName"
                value={formData.firstName}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input
                id="lastName"
                name="lastName"
                data-testid="person-form-lastName"
                value={formData.lastName}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="maidenName">Maiden Name</Label>
            <Input
              id="maidenName"
              name="maidenName"
              data-testid="person-form-maidenName"
              value={formData.maidenName}
              onChange={handleChange}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="gender">Gender</Label>
              <Select
                value={formData.gender}
                onValueChange={handleGenderChange}
              >
                <SelectTrigger data-testid="person-form-gender">
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
                name="dateOfBirth"
                type="date"
                data-testid="person-form-dateOfBirth"
                value={formData.dateOfBirth}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="isLiving"
              name="isLiving"
              data-testid="person-form-isLiving"
              checked={formData.isLiving}
              onChange={handleChange}
              className="h-4 w-4 rounded border-gray-300"
            />
            <Label htmlFor="isLiving">Living</Label>
          </div>

          {!formData.isLiving && (
            <div className="space-y-2">
              <Label htmlFor="dateOfPassing">Date of Passing</Label>
              <Input
                id="dateOfPassing"
                name="dateOfPassing"
                type="date"
                data-testid="person-form-dateOfPassing"
                value={formData.dateOfPassing}
                onChange={handleChange}
              />
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="birthPlace">Birth Place</Label>
              <Input
                id="birthPlace"
                name="birthPlace"
                data-testid="person-form-birthPlace"
                value={formData.birthPlace}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nativePlace">Native Place</Label>
              <Input
                id="nativePlace"
                name="nativePlace"
                data-testid="person-form-nativePlace"
                value={formData.nativePlace}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">About</Label>
            <textarea
              id="bio"
              name="bio"
              data-testid="person-form-bio"
              value={formData.bio}
              onChange={handleChange}
              className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-25 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="Brief biography or notes..."
            />
          </div>
        </TabsContent>

        <TabsContent value="contact" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                data-testid="person-form-email"
                value={formData.email}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                name="phone"
                data-testid="person-form-phone"
                value={formData.phone}
                onChange={handleChange}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="professional" className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="profession">Profession</Label>
              <Input
                id="profession"
                name="profession"
                data-testid="person-form-profession"
                value={formData.profession}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="employer">Employer</Label>
              <Input
                id="employer"
                name="employer"
                data-testid="person-form-employer"
                value={formData.employer}
                onChange={handleChange}
              />
            </div>
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
            data-testid="person-form-cancel"
          >
            Cancel
          </Button>
        )}
        <Button
          type="submit"
          disabled={isLoading}
          data-testid="person-form-submit"
        >
          {isLoading ? "Saving..." : person ? "Update" : "Create"}
        </Button>
      </div>
    </form>
  );
}
