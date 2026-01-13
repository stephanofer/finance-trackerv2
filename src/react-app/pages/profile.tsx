import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Camera,
  Loader2,
  ArrowLeft,
  User,
  Mail,
  Coins,
  Trash2,
} from "lucide-react";
import { Link } from "react-router";
import { toast } from "sonner";
import { useAuth, getUserInitials } from "@/hooks/use-auth";
import { authApi, ApiError } from "@/lib/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

// ============================================
// Schema
// ============================================

const profileSchema = z.object({
  name: z.string().min(2, "Mínimo 2 caracteres"),
  currency: z.string().min(1, "Selecciona una moneda"),
});

type ProfileFormData = z.infer<typeof profileSchema>;

// ============================================
// Currency options
// ============================================

const currencies = [
  { value: "USD", label: "USD - Dólar estadounidense", symbol: "$" },
  { value: "EUR", label: "EUR - Euro", symbol: "€" },
  { value: "MXN", label: "MXN - Peso mexicano", symbol: "$" },
  { value: "COP", label: "COP - Peso colombiano", symbol: "$" },
  { value: "ARS", label: "ARS - Peso argentino", symbol: "$" },
  { value: "CLP", label: "CLP - Peso chileno", symbol: "$" },
  { value: "PEN", label: "PEN - Sol peruano", symbol: "S/" },
  { value: "BRL", label: "BRL - Real brasileño", symbol: "R$" },
  { value: "GBP", label: "GBP - Libra esterlina", symbol: "£" },
];

// ============================================
// Component
// ============================================

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || "",
      currency: user?.currency || "USD",
    },
  });

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: (data: ProfileFormData) => authApi.updateProfile(data),
    onSuccess: () => {
      toast.success("Perfil actualizado correctamente");
      refreshUser();
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        toast.error(error.message);
      } else {
        toast.error("Error al actualizar el perfil");
      }
    },
  });

  // Delete avatar mutation
  const deleteAvatarMutation = useMutation({
    mutationFn: () => authApi.deleteAvatar(),
    onSuccess: () => {
      toast.success("Avatar eliminado");
      refreshUser();
    },
    onError: () => {
      toast.error("Error al eliminar el avatar");
    },
  });

  const onSubmit = (data: ProfileFormData) => {
    updateProfileMutation.mutate(data);
  };

  // Handle file selection
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Tipo de archivo no permitido. Usa JPEG, PNG, WebP o GIF");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("El archivo es muy grande. Máximo 5MB");
      return;
    }

    setIsUploading(true);
    try {
      await authApi.uploadAvatar(file);
      toast.success("Avatar actualizado correctamente");
      await refreshUser();
    } catch (error) {
      if (error instanceof ApiError) {
        toast.error(error.message);
      } else {
        toast.error("Error al subir el avatar");
      }
    } finally {
      setIsUploading(false);
      // Reset input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="px-4 pt-6 pb-24 page-transition">
      {/* Header */}
      <header className="flex items-center gap-4 mb-6">
        <Link
          to="/more"
          className="w-10 h-10 rounded-full bg-secondary/50 flex items-center justify-center hover:bg-secondary transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold">Mi Perfil</h1>
      </header>

      {/* Avatar Section */}
      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="flex flex-col items-center">
            {/* Avatar with upload button */}
            <div className="relative mb-4">
              <Avatar className="w-24 h-24 border-4 border-primary/20">
                <AvatarImage src={user?.avatarUrl || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-2xl font-bold">
                  {getUserInitials(user?.name || "")}
                </AvatarFallback>
              </Avatar>

              {/* Upload button overlay */}
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {isUploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
              </button>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            <h2 className="text-lg font-semibold">{user?.name}</h2>
            <p className="text-sm text-muted-foreground">{user?.email}</p>

            {/* Delete avatar button */}
            {user?.avatarUrl && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="mt-3 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Eliminar foto
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>¿Eliminar foto de perfil?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta acción no se puede deshacer. Se mostrará un avatar con tus iniciales.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteAvatarMutation.mutate()}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Eliminar
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Profile Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Información personal</CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              {/* Email (read-only) */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  Email
                </label>
                <Input
                  value={user?.email || ""}
                  disabled
                  className="h-12 rounded-xl bg-secondary/30"
                />
                <p className="text-xs text-muted-foreground">
                  El email no se puede cambiar
                </p>
              </div>

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      Nombre completo
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Tu nombre"
                        className="h-12 rounded-xl bg-secondary/50 border-border/50"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-2">
                      <Coins className="w-4 h-4 text-muted-foreground" />
                      Moneda principal
                    </FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="h-12 rounded-xl bg-secondary/50 border-border/50">
                          <SelectValue placeholder="Selecciona tu moneda" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {currencies.map((currency) => (
                          <SelectItem key={currency.value} value={currency.value}>
                            <span className="flex items-center gap-2">
                              <span className="w-6 text-center font-mono text-muted-foreground">
                                {currency.symbol}
                              </span>
                              {currency.label}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                disabled={updateProfileMutation.isPending}
                className="w-full h-12 rounded-xl text-base font-semibold"
              >
                {updateProfileMutation.isPending ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  "Guardar cambios"
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Account info */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Información de la cuenta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between py-2">
            <span className="text-muted-foreground">Miembro desde</span>
            <span className="font-medium">
              {user?.createdAt
                ? new Date(user.createdAt).toLocaleDateString("es-ES", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })
                : "-"}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
