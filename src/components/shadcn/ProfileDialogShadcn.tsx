import { UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

const PROFILE_EMAIL = 'collector@geniussports.com'

export function ProfileDialogShadcn() {
  return (
    <Dialog>
      <DialogTrigger render={<Button variant="outline" size="icon" />}>
        <UserRound />
        <span className="sr-only">User profile</span>
      </DialogTrigger>

      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Profile</DialogTitle>
          <DialogDescription>Signed in as</DialogDescription>
        </DialogHeader>
        <p className="text-sm font-medium text-foreground">{PROFILE_EMAIL}</p>
      </DialogContent>
    </Dialog>
  )
}
