import React from 'react';

export default function FAQ() {
  const faqs = [
    {
      q: "How do I update my personal information?",
      a: "Once logged in, navigate to the 'Profile' section from your dashboard. There you can edit your details and click save to update your records securely."
    },
    {
      q: "Is my uploaded data secure?",
      a: "Absolutely. We use enterprise-grade encryption to ensure that all your documents and personal details are strictly confidential and protected."
    },
    {
      q: "How can I track my HR requests?",
      a: "Your dashboard features a 'Submission History' or 'Request Status' panel where you can see real-time updates on all your pending and approved requests."
    },
    {
      q: "What should I do if I forget my password?",
      a: "Click on the 'Forgot Password' link on the login page. You will receive an email with instructions to reset your password securely."
    }
  ];

  return (
    <section className="py-24 bg-[#f8fafd]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-extrabold text-[#0a192f] mb-4">Frequently Asked Questions</h2>
          <p className="text-gray-500 text-lg">Got questions? We've got answers.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {faqs.map((faq, index) => (
            <div key={index} className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition duration-300">
              <h3 className="text-lg font-bold text-[#0a192f] mb-3">{faq.q}</h3>
              <p className="text-gray-600 leading-relaxed text-sm">{faq.a}</p>
            </div>
          ))}
        </div>

      </div>
    </section>
  );
}