import * as React from "react";
import {
  Dialog as AriaDialog,
  Modal,
  ModalOverlay,
} from "react-aria-components";
import { cn } from "../lib/utils";

// Context to pass close function down to DialogClose
const DialogCloseContext = React.createContext<(() => void) | null>(null);

// Context to pass open/onOpenChange state down from Dialog root to DialogContent
interface DialogStateContext {
  open: boolean;
  setOpen: (open: boolean) => void;
}
const DialogRootContext = React.createContext<DialogStateContext | null>(null);

function useDialogRootContext() {
  const context = React.useContext(DialogRootContext);
  if (!context) {
    throw new Error("Dialog components must be used within <Dialog>");
  }
  return context;
}

// Dialog root: accepts open/onOpenChange for controlled usage
interface DialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  defaultOpen?: boolean;
  children?: React.ReactNode;
}

function Dialog({ open, onOpenChange, defaultOpen, children }: DialogProps) {
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
    <DialogRootContext.Provider value={{ open: resolvedOpen, setOpen }}>
      {children}
    </DialogRootContext.Provider>
  );
}
Dialog.displayName = "Dialog";

// DialogTrigger: renders the trigger element
// asChild is accepted for backwards compatibility
interface DialogTriggerProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  children?: React.ReactNode;
}

function DialogTrigger({
  asChild = false,
  children,
  onClick,
  ...htmlProps
}: DialogTriggerProps) {
  const { setOpen } = useDialogRootContext();

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
    <button type="button" onClick={handleClick} {...htmlProps}>
      {children}
    </button>
  );
}
DialogTrigger.displayName = "DialogTrigger";

// DialogPortal: stub for backwards compat (React Aria handles portaling internally)
function DialogPortal({ children }: { children?: React.ReactNode }) {
  return <>{children}</>;
}
DialogPortal.displayName = "DialogPortal";

// DialogOverlay: stub for backwards compat
const DialogOverlay = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("fixed inset-0 z-50 bg-black/50 backdrop-blur-sm", className)}
    {...props}
  />
));
DialogOverlay.displayName = "DialogOverlay";

// Props for DialogContent: extends HTML element attributes
// role is narrowed to valid dialog roles accepted by React Aria's Dialog component
interface DialogContentProps extends React.HTMLAttributes<HTMLElement> {
  role?: "alertdialog" | "dialog";
  [key: `data-${string}`]: string | undefined;
}

// DialogContent: renders ModalOverlay (backdrop) + Modal + AriaDialog
const DialogContent = React.forwardRef<HTMLElement, DialogContentProps>(
  ({ className, children, role, ...props }, ref) => {
    const { open, setOpen } = useDialogRootContext();
    // Extract data-* attributes to forward to AriaDialog for test accessibility
    const dataProps = Object.fromEntries(
      Object.entries(props).filter(([k]) => k.startsWith("data-"))
    );

    return (
      <ModalOverlay
        isOpen={open}
        onOpenChange={setOpen}
        isDismissable={true}
        className={cn(
          "data-[entering]:animate-in data-[exiting]:animate-out data-[exiting]:fade-out-0 data-[entering]:fade-in-0 fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
        )}
      >
        <Modal className="fixed top-[50%] left-[50%] translate-x-[-50%] translate-y-[-50%]">
          <AriaDialog
            ref={ref}
            role={role}
            className={cn(
              "bg-background data-[entering]:animate-in data-[exiting]:animate-out data-[exiting]:fade-out-0 data-[entering]:fade-in-0 data-[exiting]:zoom-out-95 data-[entering]:zoom-in-95 grid w-full max-w-lg gap-4 border p-6 shadow-lg duration-200 sm:rounded-lg",
              className
            )}
            {...dataProps}
          >
            {({ close }) => (
              <DialogCloseContext.Provider value={close}>
                {children}
                <button
                  onClick={close}
                  className="ring-offset-background focus:ring-ring absolute top-4 right-4 rounded-sm opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-none disabled:pointer-events-none"
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
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                  <span className="sr-only">Close</span>
                </button>
              </DialogCloseContext.Provider>
            )}
          </AriaDialog>
        </Modal>
      </ModalOverlay>
    );
  }
);
DialogContent.displayName = "DialogContent";

// DialogClose: button that closes the dialog via context
const DialogClose = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ onClick, children, ...props }, ref) => {
  const close = React.useContext(DialogCloseContext);
  return (
    <button
      ref={ref}
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
DialogClose.displayName = "DialogClose";

// DialogHeader: pure HTML div
const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "flex flex-col space-y-1.5 text-center sm:text-left",
      className
    )}
    {...props}
  />
);
DialogHeader.displayName = "DialogHeader";

// DialogFooter: pure HTML div
const DialogFooter = ({
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
DialogFooter.displayName = "DialogFooter";

// DialogTitle: renders as h2 heading
const DialogTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, children, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn(
      "text-lg leading-none font-semibold tracking-tight",
      className
    )}
    {...props}
  >
    {children}
  </h2>
));
DialogTitle.displayName = "DialogTitle";

// DialogDescription: renders as paragraph
const DialogDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("text-muted-foreground text-sm", className)}
    {...props}
  />
));
DialogDescription.displayName = "DialogDescription";

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
