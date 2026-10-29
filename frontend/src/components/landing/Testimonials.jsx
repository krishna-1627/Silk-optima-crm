import React from 'react';

export default function Testimonials() {
  const reviews = [
    {
      name: "Aman Verma",
      role: "Software Engineer",
      text: "SilkOptima has completely changed how I manage my HR requests. The UI is incredibly smooth, and I can track my submission status in real-time."
    },
    {
      name: "Neha Sharma",
      role: "Marketing Manager",
      text: "Updating my profile and uploading documents used to be a hassle. Now, it takes just two clicks. Truly a seamless experience!"
    },
    {
      name: "Vikram Singh",
      role: "Operations Head",
      text: "The security and efficiency of this portal are top-notch. It has saved our team countless hours of manual data entry."
    }
  ];

  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-3xl md:text-4xl font-extrabold text-[#0a192f] mb-4">Loved by Employees</h2>
          <p className="text-gray-500 text-lg">See what our team members have to say about their experience with the SilkOptima portal.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {reviews.map((review, index) => (
            <div key={index} className="bg-[#f8fafd] p-8 rounded-3xl border border-gray-100 hover:shadow-xl transition duration-300">
              {/* Quote Icon */}
              <div className="text-[#0052cc] opacity-20 mb-6">
                <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24"><path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" /></svg>
              </div>
              <p className="text-gray-700 italic mb-8">"{review.text}"</p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 text-[#0052cc] rounded-full flex items-center justify-center font-bold text-xl">
                  {review.name.charAt(0)}
                </div>
                <div>
                  <h4 className="font-bold text-[#0a192f]">{review.name}</h4>
                  <p className="text-sm text-gray-500">{review.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}