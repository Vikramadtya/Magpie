import { Target, Plus, TrendingUp, MoreHorizontal, ArrowRight } from "lucide-react";
import { useSettingsStore, formatCurrencyGlobal } from '../../store/useSettingsStore';

export default function SavingsGoalsPage() {
  const { settings } = useSettingsStore();

  const goals = [
    { id: 1, name: "Emergency Fund", target: 50000000, current: 35000000, color: "bg-emerald-500", shadow: "shadow-emerald-500/20", date: "2026-12-31" },
    { id: 2, name: "New Laptop", target: 12000000, current: 4500000, color: "bg-purple-500", shadow: "shadow-purple-500/20", date: "2026-09-15" },
    { id: 3, name: "Europe Vacation", target: 30000000, current: 1500000, color: "bg-blue-500", shadow: "shadow-blue-500/20", date: "2027-05-01" }
  ];

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Savings Goals</h1>
          <p className="text-gray-500 mt-1 font-medium">Set targets and track your progress automatically.</p>
        </div>
        <button className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-[0_4px_14px_rgba(37,99,235,0.3)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.4)] hover:-translate-y-0.5 flex items-center shrink-0">
          <Plus className="h-4 w-4 mr-2" />
          New Goal
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {goals.map((goal) => {
          const progress = Math.min(100, (goal.current / goal.target) * 100);
          return (
            <div key={goal.id} className="bg-white border border-gray-100 rounded-3xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] transition-shadow group relative overflow-hidden flex flex-col">
              
              <div className="flex justify-between items-start mb-6">
                <div className={`p-3 rounded-2xl text-white ${goal.color} shadow-lg ${goal.shadow}`}>
                  <Target className="h-6 w-6" />
                </div>
                <button className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-xl transition-colors">
                  <MoreHorizontal className="h-5 w-5" />
                </button>
              </div>
              
              <div className="flex-1">
                <h3 className="text-xl font-extrabold text-gray-900 mb-1 tracking-tight">{goal.name}</h3>
                <p className="text-sm text-gray-500 font-medium mb-6">Due {new Date(goal.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</p>

                <div className="space-y-3 mb-6">
                  <div className="flex justify-between text-sm items-end">
                    <div>
                      <div className="text-gray-900 font-extrabold text-lg">
                        {formatCurrencyGlobal(goal.current, settings.currency)}
                      </div>
                      <div className="text-gray-400 font-medium text-xs uppercase tracking-wider mt-0.5">
                        of {formatCurrencyGlobal(goal.target, settings.currency)}
                      </div>
                    </div>
                    <span className="text-gray-900 font-bold bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
                      {Math.round(progress)}%
                    </span>
                  </div>
                  <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden shadow-inner">
                    <div 
                      className={`h-full ${goal.color} rounded-full transition-all duration-1000 ease-out`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>
              
              <div className="pt-5 border-t border-gray-100 flex justify-between items-center mt-auto">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-emerald-50 flex items-center justify-center border border-emerald-100">
                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                  </div>
                  <span className="text-xs font-bold text-gray-500">On Track</span>
                </div>
                <button className="text-sm text-blue-600 hover:text-blue-700 font-bold transition-colors flex items-center group-hover:underline">
                  Fund Goal
                  <ArrowRight className="w-4 h-4 ml-1 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
