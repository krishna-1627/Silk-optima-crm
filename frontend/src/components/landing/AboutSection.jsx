import React from 'react';

export default function AboutSection() {
  return (
    <section className="py-20 bg-[#f8fafd]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          
          {/* Left Text Content */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="w-8 h-0.5 bg-[#0052cc]"></span>
              <span className="text-[#0052cc] font-semibold tracking-wider text-sm uppercase">About SilkOptima</span>
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold text-[#0a192f] mb-6 leading-tight">
              Streamlining Your <br/> Workplace Experience
            </h2>
            <p className="text-gray-600 text-lg mb-6 leading-relaxed">
              Our intuitive Employee Information Portal is designed to bridge the gap between HR and employees. We provide a centralized, secure, and user-friendly platform to manage everything from personal details to complex HR requests.
            </p>
            <p className="text-gray-600 text-lg mb-8 leading-relaxed">
              No more endless email threads or lost documents. With SilkOptima, you have full control over your professional profile, all in one place.
            </p>
            
            <ul className="space-y-4">
              {['100% Secure Data Encryption', 'Real-time HR Approvals', '24/7 Portal Access'].map((item, index) => (
                <li key={index} className="flex items-center gap-3 text-[#0a192f] font-medium">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-[#0052cc] flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                  </div>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Right Image/Stats Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white p-8 rounded-3xl shadow-lg border border-gray-100 text-center transform transition duration-300 hover:-translate-y-2">
              <h3 className="text-4xl font-black text-[#0052cc] mb-2">99%</h3>
              <p className="text-gray-500 font-medium text-sm">Uptime Reliability</p>
            </div>
            <div className="bg-[#0052cc] p-8 rounded-3xl shadow-lg border border-blue-600 text-center transform transition duration-300 hover:-translate-y-2 mt-8">
              <h3 className="text-4xl font-black text-white mb-2">24/7</h3>
              <p className="text-blue-200 font-medium text-sm">Secure Access</p>
            </div>
            <div className="bg-white p-8 rounded-3xl shadow-lg border border-gray-100 text-center transform transition duration-300 hover:-translate-y-2">
              <h3 className="text-4xl font-black text-[#0052cc] mb-2">Zero</h3>
              <p className="text-gray-500 font-medium text-sm">Paperwork Required</p>
            </div>
            <div className="bg-white p-8 rounded-3xl shadow-lg border border-gray-100 text-center transform transition duration-300 hover:-translate-y-2 mt-8">
              <h3 className="text-4xl font-black text-[#0052cc] mb-2">Fast</h3>
              <p className="text-gray-500 font-medium text-sm">HR Processing</p>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}