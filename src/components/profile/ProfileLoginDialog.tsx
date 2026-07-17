import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useProfile, type ProfileName } from "@/contexts/ProfileContext";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  profile: ProfileName | null;
}

export function ProfileLoginDialog({ open, onOpenChange, profile }: Props) {
  const { login } = useProfile();
  const [key, setKey] = useState("");

  const handleSubmit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!profile) return;
    const ok = login(profile, key);
    if (ok) {
      toast.success(`Perfil ${profile} activado`);
      setKey("");
      onOpenChange(false);
    } else {
      toast.error("Clave incorrecta");
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) setKey("");
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-sm">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Ingresar a Perfil {profile}</DialogTitle>
            <DialogDescription>
              Ingresa la clave para habilitar las opciones de edición.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <Label htmlFor="profile-key">Clave</Label>
            <Input
              id="profile-key"
              type="password"
              autoFocus
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="••••••"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={!key.trim()}>
              Ingresar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
