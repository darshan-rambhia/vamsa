"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MoreHorizontal, Trash2, Shield, User, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent } from "@/components/ui/card";
import { updateUser, deleteUser } from "@/actions/user";
import { toast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/utils";
import type { UserRole } from "@prisma/client";

interface UserItem {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  isActive: boolean;
  personId: string | null;
  createdAt: Date;
  lastLoginAt: Date | null;
  person: { id: string; firstName: string; lastName: string } | null;
}

interface UsersTableProps {
  users: UserItem[];
}

export function UsersTable({ users }: UsersTableProps) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  async function handleRoleChange(userId: string, role: UserRole) {
    setLoading(userId);
    try {
      await updateUser(userId, { role });
      toast({ title: `Role updated to ${role}` });
      router.refresh();
    } catch (err) {
      toast({
        title: "Failed to update role",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  }

  async function handleToggleActive(userId: string, isActive: boolean) {
    setLoading(userId);
    try {
      await updateUser(userId, { isActive: !isActive });
      toast({ title: isActive ? "User deactivated" : "User activated" });
      router.refresh();
    } catch (err) {
      toast({
        title: "Failed to update user",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  }

  async function handleDelete(userId: string) {
    if (!confirm("Are you sure you want to delete this user?")) return;

    setLoading(userId);
    try {
      await deleteUser(userId);
      toast({ title: "User deleted" });
      router.refresh();
    } catch (err) {
      toast({
        title: "Failed to delete user",
        description: err instanceof Error ? err.message : "Unknown error",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  }

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case "ADMIN":
        return <Shield className="h-4 w-4 text-red-500" />;
      case "MEMBER":
        return <User className="h-4 w-4 text-blue-500" />;
      default:
        return <Eye className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="space-y-4">
      {users.map((user) => (
        <Card key={user.id}>
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-4">
              <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-full">
                {getRoleIcon(user.role)}
              </div>
              <div>
                <p className="font-medium">
                  {user.name || user.email}
                  {!user.isActive && (
                    <span className="text-muted-foreground ml-2 text-sm">
                      (Inactive)
                    </span>
                  )}
                </p>
                <p className="text-muted-foreground text-sm">{user.email}</p>
                {user.person && (
                  <p className="text-muted-foreground text-sm">
                    Linked to: {user.person.firstName} {user.person.lastName}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-muted-foreground text-right text-sm">
                <p>Role: {user.role}</p>
                {user.lastLoginAt && (
                  <p>Last login: {formatDate(user.lastLoginAt)}</p>
                )}
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={loading === user.id}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => handleRoleChange(user.id, "ADMIN")}
                    disabled={user.role === "ADMIN"}
                  >
                    <Shield className="mr-2 h-4 w-4" />
                    Make Admin
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleRoleChange(user.id, "MEMBER")}
                    disabled={user.role === "MEMBER"}
                  >
                    <User className="mr-2 h-4 w-4" />
                    Make Member
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleRoleChange(user.id, "VIEWER")}
                    disabled={user.role === "VIEWER"}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    Make Viewer
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => handleToggleActive(user.id, user.isActive)}
                  >
                    {user.isActive ? "Deactivate" : "Activate"}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => handleDelete(user.id)}
                    className="text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
