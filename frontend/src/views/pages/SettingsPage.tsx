import { Settings2, Shield, Bell, User, Database, CreditCard, AlertCircle } from 'lucide-react';
import { cn } from '../../utils/cn';
import { StateView } from '../../components/ui/StateView';
import { SUPPORTED_CURRENCIES } from '../../store/useSettingsStore';
import { useSettingsViewModel } from '../../features/settings/hooks/useSettingsViewModel';

export default function SettingsPage() {
  const vm = useSettingsViewModel();

  const sections = [
    { id: 'profile', icon: User, title: 'Profile', desc: 'Manage your personal information' },
    { id: 'preferences', icon: Settings2, title: 'Preferences', desc: 'App behavior and appearance' },
    { id: 'security', icon: Shield, title: 'Security', desc: 'Password and two-factor authentication' },
    { id: 'notifications', icon: Bell, title: 'Notifications', desc: 'Email and push alerts' },
    { id: 'data', icon: Database, title: 'Data Export', desc: 'Export to CSV, OFX, or JSON' },
    { id: 'billing', icon: CreditCard, title: 'Billing', desc: 'Manage your Keeper subscription' },
  ];

  return (
    <StateView state={vm.stateStatus} error={vm.error?.message || null} onRetry={() => vm.refetch()} title="Settings Error">
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full space-y-8">
      <header className="mb-10">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Settings</h1>
        <p className="text-gray-500 mt-1 font-medium">Configure your workspace and personal preferences.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Navigation Sidebar */}
        <div className="lg:col-span-1 space-y-2">
          {sections.map((sec) => {
            const isActive = vm.activeTab === sec.id;
            return (
              <button
                key={sec.id}
                onClick={() => vm.setActiveTab(sec.id)}
                className={cn(
                  "w-full flex items-start gap-4 p-4 rounded-xl text-left transition-all duration-200",
                  isActive 
                    ? "bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 translate-x-1" 
                    : "hover:bg-gray-50 border border-transparent text-gray-600 hover:text-gray-900"
                )}
              >
                <sec.icon className={cn("w-5 h-5 mt-0.5", isActive ? "text-blue-600" : "text-gray-400")} />
                <div>
                  <div className={cn("font-bold", isActive ? "text-gray-900" : "text-gray-700")}>{sec.title}</div>
                  <div className={cn("text-xs mt-0.5 font-medium", isActive ? "text-gray-500" : "text-gray-400")}>{sec.desc}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Content Area */}
        <div className="lg:col-span-3">
          {vm.error && (
            <div className="mb-6 bg-rose-50 text-rose-600 p-4 rounded-xl flex items-center gap-3 shadow-sm border border-rose-100">
              <AlertCircle className="w-5 h-5" />
              <span className="font-bold">{vm.error.message}</span>
            </div>
          )}
          
          {vm.successMsg && (
            <div className="mb-6 bg-emerald-50 text-emerald-600 p-4 rounded-xl flex items-center gap-3 shadow-sm border border-emerald-100">
              <Shield className="w-5 h-5" />
              <span className="font-bold">{vm.successMsg}</span>
            </div>
          )}

          <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 p-8 min-h-[500px]">
            {vm.settings && (
              <form onSubmit={vm.handleSave}>
                
                {/* PROFILE TAB */}
                {vm.activeTab === 'profile' && (
                  <div className="space-y-8 animate-in fade-in duration-300">
                    <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Profile Settings</h2>
                    <div className="flex items-center gap-6 pb-6 border-b border-gray-100">
                      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center text-blue-700 text-3xl font-extrabold shadow-inner border border-white">
                        {(vm.settings?.firstName || 'U').charAt(0)}{(vm.settings?.lastName || 'U').charAt(0)}
                      </div>
                      <button type="button" className="px-5 py-2.5 text-sm font-bold bg-white border border-gray-200 rounded-xl hover:bg-gray-50 hover:shadow-sm transition-all text-gray-700">
                        Upload Avatar
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">First Name</label>
                        <input 
                          type="text" 
                          value={vm.settings?.firstName || ''} 
                          onChange={e => vm.handleChange('firstName', e.target.value)}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-900 transition-shadow focus:bg-white focus:shadow-[0_8px_30px_rgb(37,99,235,0.08)]" 
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-gray-700">Last Name</label>
                        <input 
                          type="text" 
                          value={vm.settings?.lastName || ''} 
                          onChange={e => vm.handleChange('lastName', e.target.value)}
                          className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-900 transition-shadow focus:bg-white focus:shadow-[0_8px_30px_rgb(37,99,235,0.08)]" 
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700">Email Address</label>
                      <input 
                        type="email" 
                        value={vm.settings?.email || ''} 
                        onChange={e => vm.handleChange('email', e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-900 transition-shadow focus:bg-white focus:shadow-[0_8px_30px_rgb(37,99,235,0.08)]" 
                      />
                    </div>
                  </div>
                )}

                {/* PREFERENCES TAB */}
                {vm.activeTab === 'preferences' && (
                  <div className="space-y-8 animate-in fade-in duration-300">
                    <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">App Preferences</h2>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700">Interface Theme</label>
                      <select 
                        value={vm.settings.theme}
                        onChange={e => vm.handleChange('theme', e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-900">
                        <option value="system">System Default</option>
                        <option value="light">Light Mode</option>
                        <option value="dark">Dark Mode</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700">Normalised Currency (Base Currency)</label>
                      <select 
                        value={vm.settings.currency}
                        onChange={e => vm.handleChange('currency', e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-900">
                        {SUPPORTED_CURRENCIES.map(c => (
                           <option key={c.code} value={c.code}>{c.label}</option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">This currency will be used to normalize all your cross-currency accounts and transactions in the dashboard.</p>
                    </div>
                  </div>
                )}

                {/* SECURITY TAB */}
                {vm.activeTab === 'security' && (
                  <div className="space-y-8 animate-in fade-in duration-300">
                    <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Security Settings</h2>
                    
                    <div className="flex items-center justify-between p-5 bg-gray-50 border border-gray-200 rounded-2xl">
                      <div>
                        <h3 className="font-bold text-gray-900">Two-Factor Authentication</h3>
                        <p className="text-sm text-gray-500 font-medium mt-0.5">Add an extra layer of security to your account.</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input 
                          type="checkbox" 
                          className="sr-only peer" 
                          checked={vm.settings?.twoFactorEnabled || false}
                          onChange={e => vm.handleChange('twoFactorEnabled', e.target.checked)}
                        />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>
                )}

                {/* NOTIFICATIONS TAB */}
                {vm.activeTab === 'notifications' && (
                  <div className="space-y-8 animate-in fade-in duration-300">
                    <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Notification Alerts</h2>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-5 bg-gray-50 border border-gray-200 rounded-2xl">
                        <div>
                          <h3 className="font-bold text-gray-900">Email Notifications</h3>
                          <p className="text-sm text-gray-500 font-medium mt-0.5">Receive weekly summaries and important alerts via email.</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="sr-only peer" 
                            checked={vm.settings?.emailNotifications || false}
                            onChange={e => vm.handleChange('emailNotifications', e.target.checked)}
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between p-5 bg-gray-50 border border-gray-200 rounded-2xl">
                        <div>
                          <h3 className="font-bold text-gray-900">Push Notifications</h3>
                          <p className="text-sm text-gray-500 font-medium mt-0.5">Receive real-time alerts for large transactions.</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            className="sr-only peer" 
                            checked={vm.settings?.pushNotifications || false}
                            onChange={e => vm.handleChange('pushNotifications', e.target.checked)}
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {/* DATA EXPORT TAB */}
                {vm.activeTab === 'data' && (
                  <div className="space-y-8 animate-in fade-in duration-300">
                    <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Data Management</h2>
                    <div className="space-y-4">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 bg-gray-50 rounded-2xl border border-gray-200 gap-4">
                        <div className="flex items-center space-x-4">
                          <div className="p-3 bg-emerald-100 rounded-xl shadow-inner">
                            <Database className="h-6 w-6 text-emerald-600" />
                          </div>
                          <div>
                            <h3 className="text-gray-900 font-bold text-lg">Export Data (CSV)</h3>
                            <p className="text-sm text-gray-500 font-medium">Download all your transactions and accounts in CSV format.</p>
                          </div>
                        </div>
                        <button 
                          type="button"
                          onClick={() => vm.handleExport('csv')}
                          className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 text-sm font-bold rounded-xl shadow-sm hover:bg-gray-50 transition-colors w-full sm:w-auto text-center"
                        >
                          Download CSV
                        </button>
                      </div>

                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 bg-gray-50 rounded-2xl border border-gray-200 gap-4">
                        <div className="flex items-center space-x-4">
                          <div className="p-3 bg-blue-100 rounded-xl shadow-inner">
                            <Database className="h-6 w-6 text-blue-600" />
                          </div>
                          <div>
                            <h3 className="text-gray-900 font-bold text-lg">Export Data (JSON)</h3>
                            <p className="text-sm text-gray-500 font-medium">Download a complete backup of your workspace.</p>
                          </div>
                        </div>
                        <button 
                          type="button"
                          onClick={() => vm.handleExport('json')}
                          className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 text-sm font-bold rounded-xl shadow-sm hover:bg-gray-50 transition-colors w-full sm:w-auto text-center"
                        >
                          Download JSON
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* BILLING TAB */}
                {vm.activeTab === 'billing' && (
                  <div className="space-y-8 animate-in fade-in duration-300">
                    <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Subscription Plan</h2>
                    
                    <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 text-white relative overflow-hidden shadow-2xl">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>
                      
                      <div className="relative z-10">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-xs font-bold uppercase tracking-wider mb-6 border border-white/20 shadow-inner">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"></span>
                          Pro Plan Active
                        </div>
                        
                        <div className="flex items-end gap-2 mb-2">
                          <span className="text-5xl font-extrabold tracking-tight">$9.99</span>
                          <span className="text-gray-400 font-medium mb-1">/month</span>
                        </div>
                        
                        <p className="text-gray-400 font-medium max-w-sm mb-8">
                          You have access to all premium features including multi-currency, smart categorization, and unlimited workspaces.
                        </p>
                        
                        <div className="flex gap-4">
                          <button type="button" className="px-6 py-3 bg-white text-gray-900 text-sm font-bold rounded-xl hover:bg-gray-50 transition-colors shadow-lg shadow-black/20">
                            Manage Billing
                          </button>
                          <button type="button" className="px-6 py-3 bg-transparent border border-white/20 text-white text-sm font-bold rounded-xl hover:bg-white/10 transition-colors">
                            View Invoices
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {vm.activeTab !== 'data' && vm.activeTab !== 'billing' && (
                  <div className="mt-10 pt-6 border-t border-gray-100 flex justify-end">
                    <button
                      type="submit"
                      disabled={vm.saving}
                      className={cn(
                        "px-8 py-3 bg-blue-600 text-white text-sm font-bold rounded-xl transition-all shadow-[0_4px_14px_rgba(37,99,235,0.3)] hover:shadow-[0_6px_20px_rgba(37,99,235,0.4)] hover:-translate-y-0.5",
                        vm.saving && "opacity-70 cursor-not-allowed hover:transform-none hover:shadow-none"
                      )}
                    >
                      {vm.saving ? 'Saving Changes...' : 'Save Changes'}
                    </button>
                  </div>
                )}
              </form>
            )}
          </div>
        </div>
      </div>
      </div>
    </StateView>
  );
}
