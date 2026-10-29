import { Outlet } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';

function CandidateLayout({ children }) {
  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-slate-100 text-slate-800">
      <Navbar title="Employee Portal" />
      <main className="w-full max-w-full overflow-x-hidden px-2 pb-4 pt-1 sm:px-4 sm:pt-2 md:px-6 lg:px-8">
        {children || <Outlet />}
      </main>
    </div>
  );
}

export default CandidateLayout;
