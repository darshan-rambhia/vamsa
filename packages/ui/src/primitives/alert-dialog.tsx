import * as React from "react";
import {
  Dialog as AriaDialog,
  Modal,
  ModalOverlay,
} from "react-aria-components";
import { cn } from "../lib/utils";
import { buttonVariants } from "./button";

// Context to pass close function to AlertDialogCancel and AlertDialogAction
const AlertDialogCloseContext = React.createContext<(() => void) | null>(null);

// Context to pass open/onOpenChange from root to content
interface AlertDialogStateContext {
  open: boolean;
  setOpen: (open: boolean) => void;
}
const AlertDialogRootContext =
  React.createContext<AlertDialogStateContext | null>(null);

function useAlertDialogRootContext() {
  const context = React.useContext(AlertDialogRootContext);
  if (!context) {
    throw new Error("AlertDialog components must be used within <AlertDialog>");
  }
  return context;
}

// AlertDialog root: accepts open/onOpenChange for controlled usage
interface AlertDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
  children?: React.ReactNode;
}

function AlertDialog({
  open,
  onOpenChange,
  defaultOpen,
  children,
}: AlertDialogProps) {
  const isControlled = open !== undefined;
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(
    defaultOpen ?? false
  );
  const resolvedOpen = isControlled ? open : uncontrolledOpen;

  const setOpen = React.useCallback(
    (nextOpen: boolean) => {
      if (!isControlled) {
        setUncontrolledOpen(nextOpen);
      }
      onOpenChange?.(nextOpen);
    },
    [isControlled, onOpenChange]
  );

  return (
    <AlertDialogRootContext.Provider value={{ open: resolvedOpen, setOpen }}>
      {children}
    </AlertDialogRootContext.Provider>
  );
}
AlertDialog.displayName = "AlertDialog";

// AlertDialogTrigger: renders trigger element
interface AlertDialogTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  children?: React.ReactNode;
}

function AlertDialogTrigger({
  asChild = false,
  children,
  onClick,
  ...htmlProps
}: AlertDialogTriggerProps) {
  const { setOpen } = useAlertDialogRootContext();

  const handleClick: React.MouseEventHandler<HTMLElement> = (event) => {
    onClick?.(event as React.MouseEvent<HTMLButtonElement>);
    if (!event.defaultPrevented) {
      setOpen(true);
    }
  };

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children, {
      ...htmlProps,
      onClick: handleClick,
    } as React.HTMLAttributes<HTMLElement>);
  }

  return (
    <button
      type="button"
      onClick={handleClick as React.MouseEventHandler<HTMLButtonElement>}
      {...htmlProps}
    >
      {children}
    </button>
  );
}
AlertDialogTrigger.displayName = "AlertDialogTrigger";

// AlertDialogPortal: stub for backwards compat
function AlertDialogPortal({ children }: { children?: React.ReactNode }) {
  return <>{children}</>;
}
AlertDialogPortal.displayName = "AlertDialogPortal";

// AlertDialogOverlay: stub for backwards compat
const AlertDialogOverlay = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("fixed inset-0 z-50 bg-black/50 backdrop-blur-sm", className)}
    {...props}
  />
));
AlertDialogOverlay.displayName = "AlertDialogOverlay";

// Props for AlertDialogContent: extends HTML element attributes
interface AlertDialogContentProps extends React.HTMLAttributes<HTMLElement> {
  [key: `data-${string}`]: string | undefined;
}

// AlertDialogContent: renders ModalOverlay + Modal + AriaDialog with role="alertdialog"
const AlertDialogContent = React.forwardRef<
  HTMLElement,
  AlertDialogContentProps
>(({ className, children, ...props }, ref) => {
  const { open, setOpen } = useAlertDialogRootContext();
  // Extract data-* attributes to forward to AriaDialog for test accessibility
  const dataProps = Object.fromEntries(
    Object.entries(props).filter(([k]) => k.startsWith("data-"))
  );

  return (
    <ModalOverlay
      isOpen={open}
      onOpenChange={setOpen}
      className={cn(
        "data-[entering]:animate-in data-[exiting]:animate-out data-[exiting]:fade-out-0 data-[entering]:fade-in-0 fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
      )}
    >
      <Modal className="fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%]">
        <AriaDialog
          ref={ref}
          role="alertdialog"
          className={cn(
            "bg-background data-[entering]:animate-in data-[exiting]:animate-out data-[exiting]:fade-out-0 data-[entering]:fade-in-0 data-[exiting]:zoom-out-95 data-[entering]:zoom-in-95 grid w-full max-w-lg gap-4 border p-6 shadow-lg duration-200 sm:rounded-lg",
            className
          )}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          {...(dataProps as any)}
        >
          {({ close }) => (
            <AlertDialogCloseContext.Provider value={close}>
              {children}
            </AlertDialogCloseContext.Provider>
          )}
        </AriaDialog>
      </Modal>
    </ModalOverlay>
  );
});
AlertDialogContent.displayName = "AlertDialogContent";

// AlertDialogHeader
const AlertDialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-2 text-center sm:text-left",
      className
    )}
    {...props}
  />
);
AlertDialogHeader.displayName = "AlertDialogHeader";

// AlertDialogFooter
const AlertDialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2",
      className
    )}
    {...props}
  />
);
AlertDialogFooter.displayName = "AlertDialogFooter";

// AlertDialogTitle: h2 heading
const AlertDialogTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, children, ...props }, ref) => (
  <h2 ref={ref} className={cn("text-lg font-semibold", className)} {...props}>
    {children}
  </h2>
));
AlertDialogTitle.displayName = "AlertDialogTitle";

// AlertDialogDescription: paragraph
const AlertDialogDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-muted-foreground text-sm", className)}
    {...props}
  />
));
AlertDialogDescription.displayName = "AlertDialogDescription";

// AlertDialogAction: primary action button — closes the dialog automatically
const AlertDialogAction = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, onClick, children, ...props }, ref) => {
  const close = React.useContext(AlertDialogCloseContext);
  return (
    <button
      ref={ref}
      className={cn(buttonVariants(), className)}
      onClick={(e) => {
        onClick?.(e);
        close?.();
      }}
      {...props}
    >
      {children}
    </button>
  );
});
AlertDialogAction.displayName = "AlertDialogAction";

// AlertDialogCancel: cancel button — closes the dialog
const AlertDialogCancel = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, onClick, children, ...props }, ref) => {
  const close = React.useContext(AlertDialogCloseContext);
  return (
    <button
      ref={ref}
      className={cn(
        buttonVariants({ variant: "outline" }),
        "mt-2 sm:mt-0",
        className
      )}
      onClick={(e) => {
        close?.();
        onClick?.(e);
      }}
      {...props}
    >
      {children}
    </button>
  );
});
AlertDialogCancel.displayName = "AlertDialogCancel";

export {
  AlertDialog,
  AlertDialogPortal,
  AlertDialogOverlay,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
};
