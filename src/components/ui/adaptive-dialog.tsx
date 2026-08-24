import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { XIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { useIsMobile } from "@/hooks/use-mobile"
import {
  Dialog,
  DialogClose,
  DialogContent as DesktopDialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

/**
 * Drop-in replacement for `@/components/ui/dialog`.
 *
 * - `md` and above: renders the untouched shadcn `DialogContent`.
 * - below `md`: renders the same children as a bottom sheet (Radix keeps the
 *   focus trap and Escape-to-close; both variants are the same primitive).
 *
 * Width classes a caller passes (`max-w-2xl`, `sm:max-w-lg`, …) are appended
 * *after* the caller's `className` on the mobile branch, so `twMerge` strips
 * them and an unprefixed `max-w-*` can never blow out the sheet.
 */
function AdaptiveDialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean
}) {
  const isMobile = useIsMobile()

  if (!isMobile) {
    return (
      <DesktopDialogContent
        className={className}
        showCloseButton={showCloseButton}
        {...props}
      >
        {children}
      </DesktopDialogContent>
    )
  }

  return (
    <DialogPortal data-slot="dialog-portal">
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom fixed inset-x-0 bottom-0 z-50 flex max-h-[90vh] w-full flex-col gap-4 overflow-y-auto rounded-t-2xl border-t p-6 shadow-lg duration-300 outline-none",
          className,
          // Neutralise caller classes that would break the sheet.
          "max-w-none overflow-y-auto rounded-b-none sm:max-w-none sm:rounded-b-none"
        )}
        {...props}
      >
        {children}
        {/* Guarantees clearance of the home indicator regardless of caller padding. */}
        <div className="h-[var(--safe-bottom)] shrink-0" aria-hidden="true" />
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            className="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
          >
            <XIcon />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}

export {
  Dialog,
  DialogClose,
  AdaptiveDialogContent as DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
