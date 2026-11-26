import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Hover lift is opt-in: only cards that actually do something on click move.
 * A card is treated as interactive when it has an `onClick`, an interactive
 * `role`, `data-interactive`, or sits directly inside a link/button. Static
 * cards staying still is what makes the interactive ones read as tappable.
 */
const interactiveCardClasses =
  "cursor-pointer hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 motion-reduce:hover:translate-y-0"

const parentHoverClasses =
  "[@media(hover:hover)]:[:is(a,button):hover>&]:-translate-y-0.5 [@media(hover:hover)]:[:is(a,button):hover>&]:shadow-md motion-reduce:[:is(a,button):hover>&]:translate-y-0"

function Card({
  className,
  ...props
}: React.ComponentProps<"div"> & { "data-interactive"?: boolean | "true" | "false" }) {
  const dataInteractive = props["data-interactive"]
  const interactive =
    dataInteractive === true ||
    dataInteractive === "true" ||
    (dataInteractive !== false &&
      dataInteractive !== "false" &&
      (typeof props.onClick === "function" ||
        props.role === "button" ||
        props.role === "link"))

  return (
    <div
      data-slot="card"
      className={cn(
        "bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm transition-[translate,box-shadow] duration-200 ease-out",
        parentHoverClasses,
        interactive && interactiveCardClasses,
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("leading-none font-semibold", className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-6", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-6 [.border-t]:pt-6", className)}
      {...props}
    />
  )
}

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
