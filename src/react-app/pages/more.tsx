import { Link } from "react-router";
import {
  User,
  Settings,
  Wallet,
  Tags,
  PiggyBank,
  CreditCard,
  FileText,
  HelpCircle,
  LogOut,
  ChevronRight,
  Moon,
  Sun,
} from "lucide-react";
import { useAuth, getUserInitials } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";

// ============================================
// Menu Items
// ============================================

const menuSections = [
  {
    title: "Finanzas",
    items: [
      {
        to: "/accounts",
        icon: Wallet,
        label: "Cuentas",
        description: "Administra tus cuentas bancarias",
      },
      {
        to: "/categories",
        icon: Tags,
        label: "Categorías",
        description: "Personaliza tus categorías",
      },
      {
        to: "/goals",
        icon: PiggyBank,
        label: "Metas de ahorro",
        description: "Configura objetivos financieros",
      },
      {
        to: "/loans",
        icon: CreditCard,
        label: "Préstamos",
        description: "Gestiona tus préstamos",
      },
    ],
  },
  {
    title: "Configuración",
    items: [
      {
        to: "/settings",
        icon: Settings,
        label: "Ajustes",
        description: "Preferencias de la aplicación",
      },
      {
        to: "/profile",
        icon: User,
        label: "Mi perfil",
        description: "Edita tu información personal",
      },
    ],
  },
  {
    title: "Soporte",
    items: [
      {
        to: "/reports",
        icon: FileText,
        label: "Reportes",
        description: "Exporta tus datos financieros",
      },
      {
        to: "/help",
        icon: HelpCircle,
        label: "Ayuda",
        description: "Centro de ayuda y FAQ",
      },
    ],
  },
];

// ============================================
// More Page Component
// ============================================

export default function MorePage() {
  const { user, logout } = useAuth();
  const [isDark, setIsDark] = useState(() => 
    typeof document !== "undefined" 
      ? document.documentElement.classList.contains("dark") 
      : false
  );

  // Toggle theme
  const toggleTheme = () => {
    const newIsDark = !isDark;
    setIsDark(newIsDark);
    document.documentElement.classList.toggle("dark", newIsDark);
    localStorage.setItem("theme", newIsDark ? "dark" : "light");
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="px-4 pt-6 pb-24 page-transition">
      {/* Profile Card */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <Link
            to="/profile"
            className="flex items-center gap-4 hover:opacity-80 transition-opacity"
          >
            <Avatar className="w-16 h-16 border-2 border-primary/20">
              <AvatarImage src={user?.avatarUrl || undefined} />
              <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                {getUserInitials(user?.name || "")}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-lg font-semibold">{user?.name}</h2>
              <p className="text-sm text-muted-foreground">{user?.email}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </Link>
        </CardContent>
      </Card>

      {/* Theme Toggle */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {isDark ? (
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Moon className="w-5 h-5 text-primary" />
                </div>
              ) : (
                <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
                  <Sun className="w-5 h-5 text-warning" />
                </div>
              )}
              <div>
                <p className="font-medium">Modo oscuro</p>
                <p className="text-sm text-muted-foreground">
                  {isDark ? "Activado" : "Desactivado"}
                </p>
              </div>
            </div>
            <Switch checked={isDark} onCheckedChange={toggleTheme} />
          </div>
        </CardContent>
      </Card>

      {/* Menu Sections */}
      {menuSections.map((section) => (
        <div key={section.title} className="mb-6">
          <h3 className="text-sm font-medium text-muted-foreground mb-3 px-1">
            {section.title}
          </h3>
          <Card>
            <CardContent className="p-2">
              {section.items.map((item, itemIndex) => (
                <div key={item.to}>
                  <Link
                    to={item.to}
                    className="flex items-center gap-4 p-3 rounded-xl hover:bg-muted/50 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                      <item.icon className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{item.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.description}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  </Link>
                  {itemIndex < section.items.length - 1 && (
                    <Separator className="my-1 mx-3" />
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      ))}

      {/* Logout Button */}
      <Card className="border-destructive/20">
        <CardContent className="p-2">
          <button
            onClick={handleLogout}
            className="flex items-center gap-4 p-3 rounded-xl w-full hover:bg-destructive/10 transition-colors text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
              <LogOut className="w-5 h-5 text-destructive" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-destructive">Cerrar sesión</p>
              <p className="text-xs text-muted-foreground">
                Salir de tu cuenta
              </p>
            </div>
          </button>
        </CardContent>
      </Card>

      {/* App Version */}
      <p className="text-center text-xs text-muted-foreground mt-8">
        FinTrack v1.0.0
      </p>
    </div>
  );
}
