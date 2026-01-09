"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { claimProfileSchema, type ClaimProfileInput } from "@/schemas/user";
import { claimProfile, getUnclaimedProfiles } from "@/actions/user";

type UnclaimedProfile = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
};

export default function ClaimProfilePage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [profiles, setProfiles] = useState<UnclaimedProfile[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(true);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<ClaimProfileInput>({
    resolver: zodResolver(claimProfileSchema),
  });

  useEffect(() => {
    async function loadProfiles() {
      try {
        const data = await getUnclaimedProfiles();
        setProfiles(data);
      } catch {
        setError("Failed to load profiles");
      } finally {
        setLoadingProfiles(false);
      }
    }
    loadProfiles();
  }, []);

  async function onSubmit(data: ClaimProfileInput) {
    setIsLoading(true);
    setError(null);

    try {
      await claimProfile(data);
      router.push("/login?claimed=true");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to claim profile");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Claim Your Profile</CardTitle>
        <CardDescription>
          If you&apos;re already in the family tree, claim your profile to get
          full access
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit(onSubmit)}>
        <CardContent className="space-y-4">
          {error && (
            <div className="bg-destructive/10 text-destructive rounded-md p-3 text-sm">
              {error}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="profile">Select Your Profile</Label>
            {loadingProfiles ? (
              <p className="text-muted-foreground text-sm">Loading...</p>
            ) : profiles.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No unclaimed profiles available
              </p>
            ) : (
              <Select onValueChange={(value) => setValue("personId", value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose your name" />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map((profile) => (
                    <SelectItem key={profile.id} value={profile.id}>
                      {profile.firstName} {profile.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {errors.personId && (
              <p className="text-destructive text-sm">
                {errors.personId.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Your Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              {...register("email")}
            />
            {errors.email && (
              <p className="text-destructive text-sm">{errors.email.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Create Password</Label>
            <Input id="password" type="password" {...register("password")} />
            {errors.password && (
              <p className="text-destructive text-sm">
                {errors.password.message}
              </p>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button
            type="submit"
            className="w-full"
            disabled={isLoading || profiles.length === 0}
          >
            {isLoading ? "Claiming..." : "Claim Profile"}
          </Button>
          <div className="text-muted-foreground text-center text-sm">
            Not in the tree yet?{" "}
            <Link href="/register" className="text-primary hover:underline">
              Register as new
            </Link>
            {" or "}
            <Link href="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}
