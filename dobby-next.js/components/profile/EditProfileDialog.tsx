"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { UserProfile } from "@/lib/types/UserProfile";

interface EditProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: UserProfile;
  updatedProfile: Partial<UserProfile>;
  onUpdateProfile: (updates: Partial<UserProfile>) => void;
  onSave: () => void;
}

export function EditProfileDialog({
  open,
  onOpenChange,
  profile,
  updatedProfile,
  onUpdateProfile,
  onSave,
}: EditProfileDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-zinc-900 border border-zinc-700 text-gray-200">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-2xl font-semibold text-white text-left">
            Edit Profile
          </DialogTitle>
          <DialogDescription className="text-gray-400 text-sm text-center max-w-sm mx-auto">
            Update your profile info and save changes.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <div className="grid gap-2.5">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              className="bg-zinc-900 border-zinc-700 text-gray-200"
              value={updatedProfile.username ?? profile.username ?? ""}
              onChange={(e) => onUpdateProfile({ ...updatedProfile, username: e.target.value })}
            />
          </div>
          <div className="grid gap-2.5">
            <Label htmlFor="first_name">First name</Label>
            <Input
              id="first_name"
              className="bg-zinc-900 border-zinc-700 text-gray-200"
              value={updatedProfile.first_name ?? profile.first_name ?? ""}
              onChange={(e) => onUpdateProfile({ ...updatedProfile, first_name: e.target.value })}
            />
          </div>
          <div className="grid gap-2.5">
            <Label htmlFor="last_name">Last name</Label>
            <Input
              id="last_name"
              className="bg-zinc-900 border-zinc-700 text-gray-200"
              value={updatedProfile.last_name ?? profile.last_name ?? ""}
              onChange={(e) => onUpdateProfile({ ...updatedProfile, last_name: e.target.value })}
            />
          </div>
          <div className="grid gap-2.5">
            <Label htmlFor="age">Age</Label>
            <Input
              id="age"
              type="number"
              min="1"
              className="bg-zinc-900 border-zinc-700 text-gray-200"
              value={updatedProfile.age ?? profile.age ?? ""}
              onChange={(e) =>
                onUpdateProfile({
                  ...updatedProfile,
                  age: e.target.value === "" ? undefined : Number(e.target.value),
                })
              }
            />
          </div>
          <div className="grid gap-2.5">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              rows={3}
              className="bg-zinc-900 border-zinc-700 text-gray-200"
              value={updatedProfile.bio ?? profile.bio ?? ""}
              onChange={(e) => onUpdateProfile({ ...updatedProfile, bio: e.target.value })}
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <button
            onClick={() => onOpenChange(false)}
            className="px-3 py-1.5 rounded-md bg-zinc-800/80 border border-zinc-700 text-gray-300 hover:bg-zinc-800 transition"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            className="px-3 py-1.5 rounded-md bg-purple-600/80 border border-purple-400 text-white hover:bg-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-400/60 transition"
          >
            Save Changes
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}