import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  ArrowLeft, 
  Target, 
  Palette, 
  Bell, 
  Calendar,
  DollarSign,
  Languages,
  ChevronRight,
  Check,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { settingsApi, goalsApi, UserSettings, Goal, DashboardConfig } from "@/lib/api";

// ============================================
// Settings Page Component
// ============================================

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [goalSheetOpen, setGoalSheetOpen] = useState(false);

  // Fetch settings
  const { data: settingsData, isLoading: settingsLoading } = useQuery({
    queryKey: ["settings"],
    queryFn: () => settingsApi.get(),
  });

  // Fetch goals for selection
  const { data: goalsData } = useQuery({
    queryKey: ["goals", "active"],
    queryFn: () => goalsApi.getAll(),
  });

  const settings = settingsData?.data as UserSettings | undefined;
  const goals = (goalsData?.data || []) as Goal[];

  // Mutation to update settings
  const updateSettings = useMutation({
    mutationFn: (data: Partial<UserSettings>) => settingsApi.update(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      toast.success("Configuración actualizada");
    },
    onError: () => {
      toast.error("Error al actualizar configuración");
    },
  });

  // Update dashboard config
  const updateDashboardConfig = useMutation({
    mutationFn: (data: Partial<DashboardConfig>) => settingsApi.updateDashboard(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success("Dashboard actualizado");
    },
    onError: () => {
      toast.error("Error al actualizar dashboard");
    },
  });

  const handleFeaturedGoalChange = (goalId: string | null) => {
    updateDashboardConfig.mutate({ featuredGoalId: goalId });
    setGoalSheetOpen(false);
  };

  const selectedGoal = goals.find(g => g.id === settings?.dashboardConfig?.featuredGoalId);

  if (settingsLoading) {
    return (
      <div className="px-4 pt-6 pb-24 page-transition">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-32 page-transition">
      {/* Header */}
      <header className="flex items-center gap-4 mb-6">
        <Link to="/more">
          <Button variant="ghost" size="icon" className="rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Ajustes</h1>
          <p className="text-sm text-muted-foreground">Configura tu experiencia</p>
        </div>
      </header>

      {/* Dashboard Settings */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 px-1">
          Dashboard
        </h2>

        <Card className="premium-card">
          <CardContent className="p-0">
            {/* Featured Goal */}
            <Sheet open={goalSheetOpen} onOpenChange={setGoalSheetOpen}>
              <SheetTrigger asChild>
                <button className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-primary" />
                    </div>
                    <div className="text-left">
                      <p className="font-medium">Meta destacada</p>
                      <p className="text-sm text-muted-foreground">
                        {selectedGoal ? selectedGoal.name : "Automático (más reciente)"}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </button>
              </SheetTrigger>
              <SheetContent side="bottom" className="rounded-t-3xl border-t border-border bg-card">
                <SheetHeader className="pb-4">
                  <SheetTitle className="text-left text-lg flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-primary" />
                    Seleccionar meta destacada
                  </SheetTitle>
                </SheetHeader>
                <div className="space-y-2 pb-8 max-h-[60vh] overflow-y-auto">
                  {/* Auto option */}
                  <button
                    onClick={() => handleFeaturedGoalChange(null)}
                    className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center">
                        <Target className="w-6 h-6 text-muted-foreground" />
                      </div>
                      <div className="text-left">
                        <p className="font-semibold">Automático</p>
                        <p className="text-sm text-muted-foreground">
                          Mostrar la meta más reciente activa
                        </p>
                      </div>
                    </div>
                    {!settings?.dashboardConfig?.featuredGoalId && (
                      <Check className="w-5 h-5 text-primary" />
                    )}
                  </button>

                  <Separator />

                  {/* Goal list */}
                  {goals.map((goal, index) => (
                    <button
                      key={goal.id}
                      onClick={() => handleFeaturedGoalChange(goal.id)}
                      className="w-full flex items-center justify-between p-4 rounded-2xl hover:bg-muted/50 transition-all duration-200 animate-in fade-in slide-in-from-bottom-2"
                      style={{ animationDelay: `${index * 0.05}s` }}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-xl">
                          {goal.icon || "🎯"}
                        </div>
                        <div className="text-left">
                          <p className="font-semibold">{goal.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {goal.progress.toFixed(0)}% completado
                          </p>
                        </div>
                      </div>
                      {settings?.dashboardConfig?.featuredGoalId === goal.id && (
                        <Check className="w-5 h-5 text-primary" />
                      )}
                    </button>
                  ))}

                  {goals.length === 0 && (
                    <div className="text-center py-8">
                      <Target className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                      <p className="text-muted-foreground">No tienes metas activas</p>
                      <Link to="/goals/new">
                        <Button variant="outline" size="sm" className="mt-4">
                          Crear meta
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>

            <Separator />

            {/* Show Scheduled Payments */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-chart-3/10 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-chart-3" />
                </div>
                <div>
                  <p className="font-medium">Pagos programados</p>
                  <p className="text-sm text-muted-foreground">
                    Mostrar en dashboard
                  </p>
                </div>
              </div>
              <Switch 
                checked={settings?.dashboardConfig?.showScheduledPayments ?? true}
                onCheckedChange={(checked) => 
                  updateDashboardConfig.mutate({ showScheduledPayments: checked })
                }
              />
            </div>

            <Separator />

            {/* Recent Transactions Limit */}
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-chart-1/10 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-chart-1" />
                </div>
                <div>
                  <p className="font-medium">Transacciones recientes</p>
                  <p className="text-sm text-muted-foreground">
                    Cantidad a mostrar
                  </p>
                </div>
              </div>
              <Select
                value={String(settings?.dashboardConfig?.recentTransactionsLimit || 5)}
                onValueChange={(value) => 
                  updateDashboardConfig.mutate({ recentTransactionsLimit: parseInt(value) })
                }
              >
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[3, 5, 7, 10, 15, 20].map((n) => (
                    <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Notifications Settings */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 px-1">
          Notificaciones
        </h2>

        <Card className="premium-card">
          <CardContent className="p-0">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                  <Bell className="w-5 h-5 text-destructive" />
                </div>
                <div>
                  <p className="font-medium">Pagos por vencer</p>
                  <p className="text-sm text-muted-foreground">
                    Recordatorios de pagos
                  </p>
                </div>
              </div>
              <Switch 
                checked={settings?.notifyOnDuePayments ?? true}
                onCheckedChange={(checked) => 
                  updateSettings.mutate({ notifyOnDuePayments: checked })
                }
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-income/10 flex items-center justify-center">
                  <Target className="w-5 h-5 text-income" />
                </div>
                <div>
                  <p className="font-medium">Progreso de metas</p>
                  <p className="text-sm text-muted-foreground">
                    Notificar avances
                  </p>
                </div>
              </div>
              <Switch 
                checked={settings?.notifyOnGoalProgress ?? true}
                onCheckedChange={(checked) => 
                  updateSettings.mutate({ notifyOnGoalProgress: checked })
                }
              />
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Display Settings */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4 px-1">
          Visualización
        </h2>

        <Card className="premium-card">
          <CardContent className="p-0">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-chart-4/10 flex items-center justify-center">
                  <Palette className="w-5 h-5 text-chart-4" />
                </div>
                <div>
                  <p className="font-medium">Tema</p>
                  <p className="text-sm text-muted-foreground">
                    Apariencia de la app
                  </p>
                </div>
              </div>
              <Select
                value={settings?.theme || "system"}
                onValueChange={(value: "light" | "dark" | "system") => 
                  updateSettings.mutate({ theme: value })
                }
              >
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="system">Sistema</SelectItem>
                  <SelectItem value="light">Claro</SelectItem>
                  <SelectItem value="dark">Oscuro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                  <Languages className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">Idioma</p>
                  <p className="text-sm text-muted-foreground">
                    {settings?.language === "es" ? "Español" : "English"}
                  </p>
                </div>
              </div>
              <Select
                value={settings?.language || "es"}
                onValueChange={(value) => 
                  updateSettings.mutate({ language: value })
                }
              >
                <SelectTrigger className="w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="es">Español</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Separator />

            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-income/10 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-income" />
                </div>
                <div>
                  <p className="font-medium">Mostrar centavos</p>
                  <p className="text-sm text-muted-foreground">
                    En cantidades de dinero
                  </p>
                </div>
              </div>
              <Switch 
                checked={settings?.showCentsInAmounts ?? true}
                onCheckedChange={(checked) => 
                  updateSettings.mutate({ showCentsInAmounts: checked })
                }
              />
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
