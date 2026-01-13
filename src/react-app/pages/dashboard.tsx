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
  PiggyBank,
} from "lucide-react";
import { useState } from "react";
import { useAuth, getGreeting, getUserInitials } from "@/hooks/use-auth";
import { dashboardApi } from "@/lib/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
    <div className="px-4 pt-6 pb-32 page-transition">
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Avatar className="w-12 h-12 ring-2 ring-primary/20 transition-all duration-300 hover:ring-primary/40">
            <AvatarImage src={user?.avatarUrl || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {getUserInitials(user?.name || "")}
            </AvatarFallback>
          </Avatar>
          <div>
            <h1 className="text-lg font-bold tracking-tight">
              {getGreeting()} {user?.name?.split(" ")[0]}!
            </h1>
            <p className="text-sm text-muted-foreground">{formattedDate}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="rounded-full hover:bg-muted/80">
            <Bell className="w-5 h-5" />
          </Button>
          <Button variant="ghost" size="icon" className="rounded-full hover:bg-muted/80">
            <Calendar className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Balance Card - Premium Glass Design */}
      <div className="premium-card p-6 mb-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center justify-between mb-2">
          <span className="text-muted-foreground text-sm font-medium">
            Total Balance
          </span>
          <button 
            onClick={() => setShowBalance(!showBalance)}
            className="text-muted-foreground hover:text-foreground transition-colors p-1.5 rounded-lg hover:bg-muted/50"
          >
            {showBalance ? <Eye className="w-5 h-5" /> : <EyeOff className="w-5 h-5" />}
          </button>
        </div>
        
        <h2 className="text-4xl font-bold mb-6 tracking-tight tabular-nums">
          {showBalance ? formatCurrency(dashboard.balance.total, currency) : "••••••"}
        </h2>

        {/* Income / Expense Row */}
        <div className="grid grid-cols-2 gap-4">
          {/* Income */}
          <div className="p-3 rounded-xl bg-income/5 border border-income/10">
            <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Income</span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-lg font-bold text-income tabular-nums">
                {showBalance ? formatCurrency(dashboard.income.total, currency) : "••••"}
              </span>
              <div className="flex items-center gap-0.5 text-income bg-income/10 px-1.5 py-0.5 rounded-full">
                <ArrowDownRight className="w-3 h-3" />
                <span className="text-[10px] font-semibold">{formatPercentage(incomeChange)}</span>
              </div>
            </div>
          </div>
          
          {/* Expense */}
          <div className="p-3 rounded-xl bg-expense/5 border border-expense/10">
            <span className="text-muted-foreground text-xs font-medium uppercase tracking-wide">Expense</span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-lg font-bold text-expense tabular-nums">
                {showBalance ? formatCurrency(dashboard.expenses.total, currency) : "••••"}
              </span>
              <div className="flex items-center gap-0.5 text-expense bg-expense/10 px-1.5 py-0.5 rounded-full">
                <ArrowUpRight className="w-3 h-3" />
                <span className="text-[10px] font-semibold">{formatPercentage(expenseChange)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Savings Section - Clean Minimal Design */}
      {dashboard.goals.length > 0 && (
        <section className="mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: "0.1s" }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Savings</h3>
            <Link 
              to="/goals" 
              className="text-primary text-sm font-medium hover:underline transition-all duration-200"
            >
              See all
            </Link>
          </div>

          <div className="premium-card p-5">
            {dashboard.goals.slice(0, 1).map((goal) => {
              const remaining = goal.targetAmount - goal.currentAmount;
              
              return (
                <Link 
                  key={goal.id} 
                  to={`/goals/${goal.id}`}
                  className="block group"
                >
                  {/* Goal Name & Amount */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-semibold text-base">{goal.name}</span>
                    <div className="text-right">
                      <span className="font-bold tabular-nums">
                        {formatCurrency(goal.currentAmount, currency)}
                      </span>
                      <span className="text-muted-foreground font-medium">
                        {" "}/ {formatCurrency(goal.targetAmount, currency)}
                      </span>
                    </div>
                  </div>
                  
                  {/* Progress Bar - Simple blue style like image */}
                  <div className="relative h-1.5 bg-muted rounded-full overflow-hidden mb-3">
                    <div 
                      className="absolute left-0 top-0 h-full bg-blue-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(goal.progress, 100)}%` }}
                    />
                  </div>
                  
                  {/* Remaining text */}
                  <p className="text-sm text-muted-foreground">
                    <span className="tabular-nums">
                      {formatCurrency(remaining, currency)}
                    </span>
                    {" "}USD remaining to achieve your goals
                  </p>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* Savings Section - Empty State Mockup */}
      {dashboard.goals.length === 0 && (
        <section className="mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: "0.1s" }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Savings</h3>
            <Link 
              to="/goals/new" 
              className="text-primary text-sm font-medium hover:underline transition-all duration-200"
            >
              Create goal
            </Link>
          </div>

          <Link to="/goals/new" className="block">
            <div className="premium-card p-5 relative overflow-hidden border-dashed border-2 border-border/50 hover:border-primary/30 transition-colors cursor-pointer group">
              {/* Example badge */}
              <div className="absolute top-3 right-3 bg-muted text-muted-foreground text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full">
                Example
              </div>
              
              {/* Mock Goal Content */}
              <div className="opacity-60 group-hover:opacity-80 transition-opacity">
                {/* Goal Name & Amount */}
                <div className="flex items-center justify-between mb-3">
                  <span className="font-semibold text-base">PC Gaming</span>
                  <div className="text-right">
                    <span className="font-bold tabular-nums">
                      {formatCurrency(21291, currency)}
                    </span>
                    <span className="text-muted-foreground font-medium">
                      {" "}/ {formatCurrency(150000, currency)}
                    </span>
                  </div>
                </div>
                
                {/* Progress Bar */}
                <div className="relative h-1.5 bg-muted rounded-full overflow-hidden mb-3">
                  <div 
                    className="absolute left-0 top-0 h-full bg-blue-500/70 rounded-full"
                    style={{ width: "14%" }}
                  />
                </div>
                
                {/* Remaining text */}
                <p className="text-sm text-muted-foreground">
                  <span className="tabular-nums">
                    {formatCurrency(128709, currency)}
                  </span>
                  {" "}USD remaining to achieve your goals
                </p>
              </div>
              
              {/* CTA Overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity">
                <span className="text-sm font-semibold text-primary">
                  + Create your first goal
                </span>
              </div>
            </div>
          </Link>
        </section>
      )}

      {/* Recent Activity */}
      <section className="animate-in fade-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: "0.2s" }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Recent Activity</h3>
          <Link 
            to="/transactions" 
            className="text-primary text-sm font-medium flex items-center gap-1 hover:gap-2 transition-all duration-200"
          >
            See all
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {dashboard.recentTransactions.length === 0 ? (
          <div className="text-center py-12 premium-card">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <PiggyBank className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground mb-2 font-medium">No transactions yet</p>
            <p className="text-sm text-muted-foreground/70 mb-4">Start tracking your finances</p>
            <Link to="/transactions/new">
              <Button size="sm" className="rounded-full px-6">
                Add your first transaction
              </Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-1">
            {/* Group by date */}
            <p className="text-xs text-muted-foreground mb-3 font-semibold uppercase tracking-wider">Today</p>
            
            {dashboard.recentTransactions.slice(0, 6).map((tx, index) => (
              <Link
                key={tx.id}
                to={`/transactions/${tx.id}`}
                className="flex items-center gap-3 p-3 -mx-1 rounded-xl hover:bg-muted/50 transition-all duration-200 group animate-in fade-in slide-in-from-bottom-2"
                style={{ animationDelay: `${0.3 + index * 0.05}s` }}
              >
                {/* Icon */}
                <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-xl group-hover:scale-105 transition-transform duration-200">
                  {tx.categoryIcon || (tx.type === "income" ? "💰" : "💳")}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate group-hover:text-primary transition-colors">
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
                  <p className={`font-bold tabular-nums ${tx.type === "income" ? "text-income" : "text-expense"}`}>
                    {tx.type === "income" ? "+" : "-"}{formatCurrency(tx.amount, currency)}
                  </p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">
                    {tx.type === "income" ? "Income" : "Expense"}
                  </p>
                </div>

                <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all duration-200 group-hover:translate-x-0.5" />
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
