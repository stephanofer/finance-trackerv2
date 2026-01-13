import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router";
import { useState } from "react";
import { Eye, EyeOff, Loader2, Wallet, Check } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

// ============================================
// Schema
// ============================================

const registerSchema = z
  .object({
    name: z
      .string()
      .min(1, "El nombre es requerido")
      .min(2, "Mínimo 2 caracteres"),
    email: z
      .string()
      .min(1, "El email es requerido")
      .email("Email inválido"),
    password: z
      .string()
      .min(1, "La contraseña es requerida")
      .min(8, "Mínimo 8 caracteres")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Debe incluir mayúscula, minúscula y número"
      ),
    confirmPassword: z.string().min(1, "Confirma tu contraseña"),
    currency: z.string().min(1, "Selecciona una moneda"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

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

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register: registerUser, isLoading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      currency: "USD",
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    setError(null);
    try {
      await registerUser({
        name: data.name,
        email: data.email,
        password: data.password,
        currency: data.currency,
      });
      navigate("/dashboard", { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Error de conexión. Intenta de nuevo.");
      }
    }
  };

  // Password strength indicator
  const password = form.watch("password");
  const passwordChecks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /\d/.test(password),
  };
  const passwordStrength = Object.values(passwordChecks).filter(Boolean).length;

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Left Panel - Branding (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-background via-card to-background relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0">
          <div className="absolute top-20 right-20 w-72 h-72 bg-primary/10 rounded-full blur-3xl" />
          <div className="absolute bottom-40 left-20 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute top-1/3 left-1/3 w-[500px] h-[500px] bg-income/5 rounded-full blur-3xl" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center p-12 xl:p-20">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center">
              <Wallet className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold tracking-tight">FinTrack</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl xl:text-5xl font-bold leading-tight mb-6">
            Comienza tu viaje hacia la{" "}
            <span className="text-gradient">libertad financiera</span>
          </h1>
          <p className="text-lg text-muted-foreground mb-12 max-w-md">
            Únete a miles de personas que ya están tomando el control de sus finanzas personales.
          </p>

          {/* Benefits */}
          <div className="space-y-4">
            {[
              "Dashboard personalizado con análisis en tiempo real",
              "Categorías y cuentas ilimitadas",
              "Metas de ahorro con seguimiento visual",
              "Pagos programados y recordatorios",
              "100% privado y seguro",
            ].map((benefit, index) => (
              <div key={index} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
                  <Check className="w-3.5 h-3.5 text-primary" />
                </div>
                <span className="text-muted-foreground">{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 lg:px-12 xl:px-20 overflow-y-auto">
        {/* Mobile logo */}
        <div className="flex items-center gap-3 mb-8 lg:hidden">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <Wallet className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold">FinTrack</span>
        </div>

        <div className="w-full max-w-sm mx-auto lg:mx-0">
          {/* Header */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-2">Crea tu cuenta</h2>
            <p className="text-muted-foreground">
              Completa tus datos para comenzar
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-xl">
              <p className="text-sm text-destructive font-medium">{error}</p>
            </div>
          )}

          {/* Form */}
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre completo</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="Tu nombre"
                        autoComplete="name"
                        className="h-12 rounded-xl bg-secondary/50 border-border/50 focus:bg-background transition-colors"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="tu@email.com"
                        autoComplete="email"
                        className="h-12 rounded-xl bg-secondary/50 border-border/50 focus:bg-background transition-colors"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contraseña</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          autoComplete="new-password"
                          className="h-12 rounded-xl bg-secondary/50 border-border/50 focus:bg-background transition-colors pr-12"
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showPassword ? (
                            <EyeOff className="w-5 h-5" />
                          ) : (
                            <Eye className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    {/* Password strength indicator */}
                    {password && (
                      <div className="mt-3 space-y-2">
                        <div className="flex gap-1">
                          {[1, 2, 3, 4].map((level) => (
                            <div
                              key={level}
                              className={`h-1 flex-1 rounded-full transition-colors ${
                                passwordStrength >= level
                                  ? level <= 2
                                    ? "bg-expense"
                                    : level === 3
                                    ? "bg-warning"
                                    : "bg-income"
                                  : "bg-muted"
                              }`}
                            />
                          ))}
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div
                            className={`flex items-center gap-1.5 ${
                              passwordChecks.length
                                ? "text-income"
                                : "text-muted-foreground"
                            }`}
                          >
                            <Check className="w-3 h-3" />
                            <span>8+ caracteres</span>
                          </div>
                          <div
                            className={`flex items-center gap-1.5 ${
                              passwordChecks.uppercase
                                ? "text-income"
                                : "text-muted-foreground"
                            }`}
                          >
                            <Check className="w-3 h-3" />
                            <span>Mayúscula</span>
                          </div>
                          <div
                            className={`flex items-center gap-1.5 ${
                              passwordChecks.lowercase
                                ? "text-income"
                                : "text-muted-foreground"
                            }`}
                          >
                            <Check className="w-3 h-3" />
                            <span>Minúscula</span>
                          </div>
                          <div
                            className={`flex items-center gap-1.5 ${
                              passwordChecks.number
                                ? "text-income"
                                : "text-muted-foreground"
                            }`}
                          >
                            <Check className="w-3 h-3" />
                            <span>Número</span>
                          </div>
                        </div>
                      </div>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmar contraseña</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="••••••••"
                          autoComplete="new-password"
                          className="h-12 rounded-xl bg-secondary/50 border-border/50 focus:bg-background transition-colors pr-12"
                          {...field}
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setShowConfirmPassword(!showConfirmPassword)
                          }
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="w-5 h-5" />
                          ) : (
                            <Eye className="w-5 h-5" />
                          )}
                        </button>
                      </div>
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
                    <FormLabel>Moneda principal</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger className="h-12 rounded-xl bg-secondary/50 border-border/50 focus:bg-background transition-colors">
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
                disabled={isLoading}
                className="w-full h-12 rounded-xl text-base font-semibold"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Creando cuenta...
                  </>
                ) : (
                  "Crear cuenta"
                )}
              </Button>
            </form>
          </Form>

          {/* Terms */}
          <p className="mt-6 text-xs text-center text-muted-foreground">
            Al crear una cuenta, aceptas nuestros{" "}
            <Link to="/terms" className="text-primary hover:underline">
              Términos de servicio
            </Link>{" "}
            y{" "}
            <Link to="/privacy" className="text-primary hover:underline">
              Política de privacidad
            </Link>
          </p>

          {/* Login link */}
          <p className="mt-6 text-center text-muted-foreground">
            ¿Ya tienes una cuenta?{" "}
            <Link
              to="/login"
              className="text-primary font-medium hover:text-primary/80 transition-colors"
            >
              Inicia sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
