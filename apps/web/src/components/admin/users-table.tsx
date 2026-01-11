"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  Button,
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@vamsa/ui/primitives";
import { updateUserRole, toggleUserActive, deleteUser } from "~/server/users";
import { formatDate } from "@vamsa/lib";
import { LinkPersonDialog } from "./link-person-dialog";

interface UserItem {
  id: string;
  email: string;
  name: string | null;
  role: "ADMIN" | "MEMBER" | "VIEWER";
  isActive: boolean;
  personId: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  person: { id: string; firstName: string; lastName: string } | null;
}

interface UsersTableProps {
  users: UserItem[];
  currentUserId: string;
  onUserUpdated?: () => void;
}

export function UsersTable({
  users,
  currentUserId,
  onUserUpdated,
}: UsersTableProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [linkDialogUser, setLinkDialogUser] = useState<UserItem | null>(null);
  const [deleteDialogUser, setDeleteDialogUser] = useState<UserItem | null>(
    null
  );

  async function handleRoleChange(
    userId: string,
    role: "ADMIN" | "MEMBER" | "VIEWER"
  ) {
    setLoading(userId);
    setError(null);
    try {
      await updateUserRole({ data: { userId, role } });
      onUserUpdated?.();
      setOpenMenu(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update role");
    } finally {
      setLoading(null);
    }
  }

  async function handleToggleActive(userId: string, isActive: boolean) {
    setLoading(userId);
    setError(null);
    try {
      await toggleUserActive({ data: { userId, isActive } });
      onUserUpdated?.();
      setOpenMenu(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update user status"
      );
    } finally {
      setLoading(null);
    }
  }

  async function handleDelete(userId: string) {
    setLoading(userId);
    setError(null);
    try {
      await deleteUser({ data: { userId } });
      onUserUpdated?.();
      setDeleteDialogUser(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete user");
    } finally {
      setLoading(null);
    }
  }

  // Role icons as inline SVGs (Shield for ADMIN, User for MEMBER, Eye for VIEWER)
  const getRoleIcon = (role: string) => {
    if (role === "ADMIN") {
      return (
        <svg
          className="h-4 w-4 text-red-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z"
          />
        </svg>
      );
    }
    if (role === "MEMBER") {
      return (
        <svg
          className="h-4 w-4 text-blue-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
          />
        </svg>
      );
    }
    return (
      <svg
        className="h-4 w-4 text-gray-500"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z"
        />
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
    );
  };

  const getRoleBadgeColor = (role: string) => {
    if (role === "ADMIN")
      return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
    if (role === "MEMBER")
      return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    return "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400";
  };

  if (users.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">No users found</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {error && (
        <div
          className="bg-destructive/10 text-destructive rounded-md p-3 text-sm"
          data-testid="users-error"
        >
          {error}
        </div>
      )}
      {users.map((user) => (
        <Card
          key={user.id}
          data-testid={`user-card-${user.id}`}
          className={!user.isActive ? "opacity-60" : ""}
        >
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
                  {user.id === currentUserId && (
                    <span className="text-primary ml-2 text-sm">(You)</span>
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
              <div className="text-right">
                <div
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ${getRoleBadgeColor(user.role)}`}
                >
                  {getRoleIcon(user.role)}
                  {user.role}
                </div>
                <p className="text-muted-foreground mt-1 text-xs">
                  {user.lastLoginAt
                    ? `Last login: ${formatDate(user.lastLoginAt)}`
                    : "Never logged in"}
                </p>
              </div>
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  disabled={loading === user.id}
                  onClick={() =>
                    setOpenMenu(openMenu === user.id ? null : user.id)
                  }
                  data-testid={`user-menu-${user.id}`}
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z"
                    />
                  </svg>
                </Button>
                {openMenu === user.id && (
                  <div className="bg-popover border-border absolute right-0 top-full z-50 mt-1 w-48 rounded-md border shadow-lg">
                    <div className="p-1">
                      <p className="text-muted-foreground px-2 py-1.5 text-xs font-medium">
                        Change Role
                      </p>
                      <button
                        className="hover:bg-accent flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm disabled:opacity-50"
                        onClick={() => handleRoleChange(user.id, "ADMIN")}
                        disabled={user.role === "ADMIN" || loading === user.id}
                        data-testid={`make-admin-${user.id}`}
                      >
                        {getRoleIcon("ADMIN")}
                        Make Admin
                      </button>
                      <button
                        className="hover:bg-accent flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm disabled:opacity-50"
                        onClick={() => handleRoleChange(user.id, "MEMBER")}
                        disabled={
                          user.role === "MEMBER" ||
                          loading === user.id ||
                          user.id === currentUserId
                        }
                        data-testid={`make-member-${user.id}`}
                      >
                        {getRoleIcon("MEMBER")}
                        Make Member
                      </button>
                      <button
                        className="hover:bg-accent flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm disabled:opacity-50"
                        onClick={() => handleRoleChange(user.id, "VIEWER")}
                        disabled={
                          user.role === "VIEWER" ||
                          loading === user.id ||
                          user.id === currentUserId
                        }
                        data-testid={`make-viewer-${user.id}`}
                      >
                        {getRoleIcon("VIEWER")}
                        Make Viewer
                      </button>
                      <div className="border-border my-1 border-t" />
                      <button
                        className={`hover:bg-accent flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm disabled:opacity-50 ${
                          user.isActive
                            ? "text-destructive"
                            : "text-green-600 dark:text-green-400"
                        }`}
                        onClick={() =>
                          handleToggleActive(user.id, !user.isActive)
                        }
                        disabled={
                          loading === user.id || user.id === currentUserId
                        }
                        data-testid={`toggle-active-${user.id}`}
                      >
                        {user.isActive ? (
                          <>
                            <svg
                              className="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
                              />
                            </svg>
                            Deactivate
                          </>
                        ) : (
                          <>
                            <svg
                              className="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                              />
                            </svg>
                            Activate
                          </>
                        )}
                      </button>
                      <div className="border-border my-1 border-t" />
                      <button
                        className="hover:bg-accent flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm disabled:opacity-50"
                        onClick={() => {
                          setLinkDialogUser(user);
                          setOpenMenu(null);
                        }}
                        disabled={loading === user.id}
                        data-testid={`link-person-${user.id}`}
                      >
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244"
                          />
                        </svg>
                        {user.person ? "Change Link" : "Link to Person"}
                      </button>
                      {user.id !== currentUserId && (
                        <>
                          <div className="border-border my-1 border-t" />
                          <button
                            className="text-destructive hover:bg-destructive/10 flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm disabled:opacity-50"
                            onClick={() => {
                              setDeleteDialogUser(user);
                              setOpenMenu(null);
                            }}
                            disabled={loading === user.id}
                            data-testid={`delete-user-${user.id}`}
                          >
                            <svg
                              className="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                              />
                            </svg>
                            Delete User
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Link Person Dialog */}
      {linkDialogUser && (
        <LinkPersonDialog
          open={!!linkDialogUser}
          onOpenChange={(open) => {
            if (!open) setLinkDialogUser(null);
          }}
          userId={linkDialogUser.id}
          userName={linkDialogUser.name || linkDialogUser.email}
          currentPerson={linkDialogUser.person}
          onSuccess={onUserUpdated}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteDialogUser}
        onOpenChange={(open) => {
          if (!open) setDeleteDialogUser(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <strong>
                {deleteDialogUser?.name || deleteDialogUser?.email}
              </strong>
              ? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading === deleteDialogUser?.id}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() =>
                deleteDialogUser && handleDelete(deleteDialogUser.id)
              }
              disabled={loading === deleteDialogUser?.id}
            >
              {loading === deleteDialogUser?.id ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
