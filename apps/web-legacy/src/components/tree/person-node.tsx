"use client";

import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { Person } from "@prisma/client";

export interface PersonNodeData extends Record<string, unknown> {
  person: Person;
  onClick?: () => void;
  hasHiddenChildren?: boolean;
  hasHiddenParents?: boolean;
}

export type PersonNodeType = Node<PersonNodeData, "person">;

export function PersonNode({ data }: NodeProps<PersonNodeType>) {
  const {
    person,
    onClick: _onClick,
    hasHiddenChildren,
    hasHiddenParents,
  } = data;
  const initials =
    `${person.firstName.charAt(0)}${person.lastName.charAt(0)}`.toUpperCase();

  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        className={cn(
          "!bg-primary",
          hasHiddenParents && "!h-3 !w-3 !bg-yellow-500"
        )}
      />
      <div
        className={cn(
          "bg-card flex cursor-pointer flex-col items-center rounded-lg border p-3 shadow-sm transition-shadow hover:shadow-md",
          !person.isLiving && "opacity-75"
        )}
      >
        <Avatar className="h-12 w-12">
          {person.photoUrl && <AvatarImage src={person.photoUrl} />}
          <AvatarFallback className="text-sm">{initials}</AvatarFallback>
        </Avatar>
        <div className="mt-2 text-center">
          <p className="text-sm font-medium leading-tight">
            {person.firstName}
          </p>
          <p className="text-sm font-medium leading-tight">{person.lastName}</p>
          {!person.isLiving && (
            <p className="text-muted-foreground text-xs">Deceased</p>
          )}
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className={cn(
          "!bg-primary",
          hasHiddenChildren && "!h-3 !w-3 !bg-yellow-500"
        )}
      />
    </>
  );
}
