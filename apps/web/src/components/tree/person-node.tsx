import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { Avatar, cn } from "@vamsa/ui";

export interface PersonNodeData extends Record<string, unknown> {
  person: {
    id: string;
    firstName: string;
    lastName: string;
    isLiving: boolean;
    photoUrl?: string | null;
  };
  onClick?: () => void;
  hasHiddenChildren?: boolean;
  hasHiddenParents?: boolean;
  hasHiddenSpouses?: boolean;
  isCurrentUser?: boolean;
}

export type PersonNodeType = Node<PersonNodeData, "person">;

export function PersonNode({ data }: NodeProps<PersonNodeType>) {
  const {
    person,
    onClick: _onClick,
    hasHiddenChildren,
    hasHiddenParents,
    hasHiddenSpouses,
    isCurrentUser,
  } = data;
  const initials =
    `${person.firstName.charAt(0)}${person.lastName.charAt(0)}`.toUpperCase();

  return (
    <>
      <Handle
        type="target"
        position={Position.Top}
        className={cn(
          "h-3! w-3! border-2! border-white! bg-primary!",
          hasHiddenParents && "h-4! w-4! bg-amber-500!"
        )}
      />
      <div
        className={cn(
          "min-w-50 bg-card hover:border-primary/50 flex cursor-pointer flex-col items-center rounded-xl border-2 px-4 py-4 shadow-md transition-all hover:shadow-lg",
          !person.isLiving && "bg-muted/50 border-muted",
          isCurrentUser &&
            "border-primary border-3 ring-primary/30 bg-primary/5 ring-2"
        )}
      >
        {isCurrentUser && (
          <div className="bg-primary text-primary-foreground absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-2 py-0.5 text-xs font-medium">
            You
          </div>
        )}
        <Avatar
          alt={`${person.firstName} ${person.lastName}`}
          src={person.photoUrl || undefined}
          fallback={initials}
          size="lg"
          className={cn(isCurrentUser && "ring-primary ring-2")}
        />
        <div className="mt-3 text-center">
          <p className="text-foreground text-base font-semibold leading-tight">
            {person.firstName}
          </p>
          <p className="text-foreground text-base font-semibold leading-tight">
            {person.lastName}
          </p>
          {!person.isLiving && (
            <p className="text-muted-foreground mt-1 text-sm font-medium">
              Deceased
            </p>
          )}
        </div>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className={cn(
          "h-3! w-3! border-2! border-white! bg-primary!",
          hasHiddenChildren && "h-4! w-4! bg-amber-500!"
        )}
      />
      {/* Right handle - source for spouse connections (left person connects FROM here) */}
      <Handle
        type="source"
        id="spouse-right"
        position={Position.Right}
        className={cn(
          "h-2! w-2! border-2! border-white! bg-primary/50!",
          hasHiddenSpouses && "h-3! w-3! bg-amber-500!"
        )}
      />
      {/* Left handle - target for spouse connections (right person connects TO here) */}
      <Handle
        type="target"
        id="spouse-left"
        position={Position.Left}
        className={cn(
          "h-2! w-2! border-2! border-white! bg-primary/50!",
          hasHiddenSpouses && "h-3! w-3! bg-amber-500!"
        )}
      />
    </>
  );
}
