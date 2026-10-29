import React from 'react';

export default function AdminSettingsPage() {
  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden min-h-[60vh]">
      <div className="px-8 py-6 border-b border-slate-100">
        <h3 className="text-xl font-bold text-slate-800">System Settings</h3>
        <p className="text-sm text-slate-500 mt-1">Configure your portal preferences and admin details.</p>
      </div>
      
      <div className="p-8">
        <div className="max-w-xl">
          <div className="mb-6">
            <label className="block text-sm font-semibold text-slate-700 mb-2">Portal Name</label>
            <input 
              type="text" 
              defaultValue="SilkOptima Admin Portal" 
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#0052cc]/50 outline-none transition-all text-slate-800" 
            />
          </div>
          <div className="mb-8">
            <label className="block text-sm font-semibold text-slate-700 mb-2">Admin Contact Email</label>
            <input 
              type="email" 
              defaultValue="admin@silkoptima.com" 
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-[#0052cc]/50 outline-none transition-all text-slate-800" 
            />
          </div>
          <button className="bg-[#0052cc] text-white px-6 py-3 rounded-xl text-sm font-bold shadow-md hover:bg-[#003d99] transition-all focus:ring-4 focus:ring-blue-500/30">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}