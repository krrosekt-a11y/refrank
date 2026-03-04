
import React from 'react';
import { NavLink, Outlet, useLocation } from 'react-router';
import { Home, Trophy, Star, User, Search, SlidersHorizontal } from 'lucide-react';
import clsx from 'clsx';

export const Layout = () => {
  const location = useLocation();
  const isVoting = location.pathname.includes('/vote');

  // Hide bottom nav on voting screen if desired, or keep it.
  // Based on the screenshots, the voting screen seems to be a modal or a full screen page.
  // But for better navigation, I'll keep it unless it distracts.
  // Actually, standard pattern is to hide bottom nav on detailed flow. 
  // Let's keep it simple for now and show it everywhere, 
  // but maybe hide the header on specific pages if needed.

  return (
    <div className="bg-black min-h-screen text-white font-sans overflow-x-hidden flex flex-col max-w-md mx-auto shadow-2xl relative">
      {/* Header */}
      {!isVoting && (
        <header className="p-4 flex items-center justify-between sticky top-0 z-10 bg-black/80 backdrop-blur-md border-b border-gray-800">
          <div className="flex items-center gap-1">
            <h1 className="text-2xl font-black italic tracking-tighter">
              REF<span className="text-[#ccff00]">SCORE</span>
            </h1>
          </div>
          
          <div className="flex items-center gap-3">
             <div className="relative">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search Referees..." 
                  className="bg-gray-900 border border-gray-800 rounded-full py-1.5 pl-8 pr-4 text-sm text-white focus:outline-none focus:border-[#ccff00] w-36 transition-all"
                />
             </div>
             <button className="p-2 bg-gray-900 rounded-full border border-gray-800 hover:border-[#ccff00] transition-colors">
               <SlidersHorizontal className="w-4 h-4 text-white" />
             </button>
          </div>
        </header>
      )}

      {/* Main Content */}
      <main className="flex-1 pb-24">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-black border-t border-gray-800 pb-safe max-w-md mx-auto">
        <div className="flex justify-around items-center h-16">
          <NavItem to="/" icon={Home} label="Home" />
          <NavItem to="/leagues" icon={Trophy} label="Leagues" />
          <NavItem to="/top-rated" icon={Star} label="Top Rated" />
          <NavItem to="/profile" icon={User} label="Profile" />
        </div>
      </nav>
    </div>
  );
};

const NavItem = ({ to, icon: Icon, label }: { to: string; icon: any; label: string }) => {
  return (
    <NavLink 
      to={to} 
      className={({ isActive }) => clsx(
        "flex flex-col items-center justify-center w-full h-full gap-1 transition-colors duration-200",
        isActive ? "text-[#ccff00]" : "text-gray-500 hover:text-gray-300"
      )}
    >
      <Icon className="w-6 h-6" strokeWidth={2} />
      <span className="text-[10px] font-medium">{label}</span>
    </NavLink>
  );
};
