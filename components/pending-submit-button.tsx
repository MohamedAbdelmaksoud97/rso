"use client"

import { useFormStatus } from "react-dom"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

type PendingSubmitButtonProps = React.ComponentProps<typeof Button> & {
  pendingText: string
}

export function PendingSubmitButton({ children, pendingText, ...props }: PendingSubmitButtonProps) {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" disabled={pending} aria-busy={pending} {...props}>
      {pending ? <><Spinner data-icon="inline-start" />{pendingText}</> : children}
    </Button>
  )
}
