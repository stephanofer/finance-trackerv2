import { useQuery } from "@tanstack/react-query";
import { 
  TrendingDown, 
  ArrowUpRight, 
  ArrowDownRight,
  ChevronRight,
  Bell,
  Calendar,
  Eye,
  EyeOff,
  Plus,
  PiggyBank
} from "lucide-react";
import { useState } from "react";
import { useAuth, getGreeting, getUserInitials } from "@/hooks/use-auth";
import { dashboardApi } from "@/lib/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router";

// ============================================
// Currency formatter
// ============================================

function formatCurrency(amount: number, currency: string = "USD"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatPercentage(value: number): string {
  return `${Math.abs(value).toFixed(1)}%`;
}

// ============================================
// Skeleton with shimmer effect
// ============================================

function SkeletonBox({ className }: { className?: string }) {
  return (
    <div className={`skeleton-shimmer rounded-xl ${className}`} />
  );
}

function DashboardSkeleton() {
  return (
    <div className="px-4 pt-6 pb-24 page-transition">
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <SkeletonBox className="w-12 h-12 rounded-full" />
          <div className="space-y-2">
            <SkeletonBox className="h-5 w-28" />
            <SkeletonBox className="h-4 w-32" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <SkeletonBox className="w-10 h-10 rounded-full" />
          <SkeletonBox className="w-10 h-10 rounded-full" />
        </div>
      </div>

      {/* Balance card skeleton */}
      <SkeletonBox className="h-44 w-full rounded-3xl mb-6" />

      {/* Action buttons skeleton */}
      <div className="flex gap-3 mb-8">
        <SkeletonBox className="flex-1 h-12 rounded-full" />
        <SkeletonBox className="flex-1 h-12 rounded-full" />
      </div>

      {/* Savings section skeleton */}
      <div className="mb-6">
        <div className="flex justify-between mb-4">
          <SkeletonBox className="h-5 w-20" />
          <SkeletonBox className="h-4 w-16" />
        </div>
        <SkeletonBox className="h-28 rounded-2xl" />
      </div>

      {/* Recent activity skeleton */}
      <div>
        <div className="flex justify-between mb-4">
          <SkeletonBox className="h-5 w-32" />
          <SkeletonBox className="h-4 w-16" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <SkeletonBox className="w-12 h-12 rounded-xl" />
              <div className="flex-1 space-y-2">
                <SkeletonBox className="h-4 w-3/4" />
                <SkeletonBox className="h-3 w-1/2" />
              </div>
              <SkeletonBox className="h-5 w-16" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================
// Main Dashboard Component
// ============================================

export default function DashboardPage() {
  const { user } = useAuth();
  const [showBalance, setShowBalance] = useState(true);

  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: () => dashboardApi.getSummary("month"),
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: true,
  });

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="px-4 pt-6 pb-24">
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
            <TrendingDown className="w-8 h-8 text-destructive" />
          </div>
          <h2 className="text-xl font-semibold mb-2">Error al cargar</h2>
          <p className="text-muted-foreground mb-4">
            No pudimos cargar tu información financiera
          </p>
          <Button onClick={() => window.location.reload()} variant="outline">
            Intentar de nuevo
          </Button>
        </div>
      </div>
    );
  }

  const dashboard = data?.data;
  const currency = user?.currency || "USD";

  if (!dashboard) {
    return <DashboardSkeleton />;
  }

  // Calculate percentage changes (mock for now, should come from API)
  const incomeChange = 3.1;
  const expenseChange = 4.2;

  const today = new Date();
  const formattedDate = today.toLocaleDateString("en-US", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="px-4 pt-6 pb-24 page-transition">
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Avatar className="w-12 h-12 ring-2 ring-border">
            <AvatarImage src={user?.avatarUrl || undefined} />
            <AvatarFallback className="bg-muted text-foreground font-semibold">
              {getUserInitials(user?.name || "")}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-lg font-semibold">
              {getGreeting()} {user?.name?.split(" ")[0]}!
            </h1>
            <p className="text-sm text-muted-foreground">{formattedDate}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="rounded-full">
            <Bell className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="rounded-full">
            <Calendar className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Balance Card */}
      <div className="bg-card rounded-3xl p-6 mb-6 border border-border">
        <div className="flex items-center justify-between mb-2">
          <span className="text-muted-foreground text-sm font-medium">
            Total Balance
          </span>
          <button 
            onClick={() => setShowBalance(!showBalance)}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            {showBalance ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
          </button>
        </div>
        
        <h2 className="text-4xl font-bold mb-6 amount-display">
          {showBalance ? formatCurrency(dashboard.balance.total, currency) : "••••••"}
        </h2>

        {/* Income / Expense Row */}
        <div className="grid grid-cols-2 gap-4">
          {/* Income */}
          <div>
            <span className="text-muted-foreground text-sm">Income</span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-lg font-semibold text-income">
                {showBalance ? formatCurrency(dashboard.income.total, currency) : "••••"}
              </span>
              <div className="flex items-center gap-0.5 text-income">
                <ArrowDownRight className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">{formatPercentage(incomeChange)}</span>
              </div>
            </div>
          </div>
          
          {/* Expense */}
          <div>
            <span className="text-muted-foreground text-sm">Expense</span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-lg font-semibold text-expense">
                {showBalance ? formatCurrency(dashboard.expenses.total, currency) : "••••"}
              </span>
              <div className="flex items-center gap-0.5 text-expense">
                <ArrowUpRight className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">{formatPercentage(expenseChange)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 mb-8">
        <Link to="/transactions/new" className="flex-1">
          <Button className="w-full h-12 rounded-full text-base font-medium gap-2">
            <ArrowUpRight className="w-5 h-5" />
            Add
          </Button>
        </Link>
        <Link to="/goals/new" className="flex-1">
          <Button variant="secondary" className="w-full h-12 rounded-full text-base font-medium gap-2">
            <Plus className="w-5 h-5" />
            Saving
          </Button>
        </Link>
      </div>

      {/* Savings Section */}
      {dashboard.goals.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Savings</h3>
            <Link to="/goals" className="text-primary text-sm font-medium">
              See all
            </Link>
          </div>

          <div className="bg-card rounded-2xl p-5 border border-border">
            {dashboard.goals.slice(0, 1).map((goal) => (
              <div key={goal.id}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                    <span className="text-xl">{goal.icon || "🎯"}</span>
                  </div>
                  <span className="font-medium flex-1">{goal.name}</span>
                  <span className="font-semibold">
                    {formatCurrency(goal.currentAmount, currency)} / {formatCurrency(goal.targetAmount, currency)}
                  </span>
                </div>
                <Progress value={goal.progress} className="h-2 mb-2" />
                <p className="text-sm text-muted-foreground">
                  {formatCurrency(goal.targetAmount - goal.currentAmount, currency)} {currency} remaining to achieve your goals
                </p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recent Activity */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Recent Activity</h3>
          <Link to="/transactions" className="text-primary text-sm font-medium">
            See all
          </Link>
        </div>

        {dashboard.recentTransactions.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-2xl border border-border">
            <PiggyBank className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground mb-2">No transactions yet</p>
            <Link to="/transactions/new">
              <Button variant="outline" size="sm">
                Add your first transaction
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-1">
            {/* Group by date */}
            <p className="text-sm text-muted-foreground mb-3 font-medium">Today</p>
            
            {dashboard.recentTransactions.slice(0, 6).map((tx) => (
              <Link
                key={tx.id}
                to={`/transactions/${tx.id}`}
                className="flex items-center gap-3 p-3 -mx-1 rounded-xl hover:bg-muted/50 transition-colors group"
              >
                {/* Icon */}
                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-xl">
                  {tx.categoryIcon || (tx.type === "income" ? "💰" : "💳")}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {tx.description || tx.categoryName || "Transaction"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {tx.categoryName} • {new Date(tx.date).toLocaleTimeString("en-US", {
                      hour: "numeric",
                      minute: "2-digit",
                      hour12: true,
                    })}
                  </p>
                </div>

                {/* Amount */}
                <div className="text-right">
                  <p className={`font-semibold ${tx.type === "income" ? "text-income" : "text-expense"}`}>
                    {tx.type === "income" ? "+" : "-"}{formatCurrency(tx.amount, currency)}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize">
                    {tx.type === "income" ? "Income" : "Expense"}
                  </p>
                </div>

                <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
