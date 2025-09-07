import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Menu, X, User, LogOut, Settings, BookOpen } from 'lucide-react';
import ThemeToggle from './../ThemeToggle';
import { useAuth } from './../context/AuthContext';

const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b py-2 px-4 sm:px-6 border-gray-200 dark:border-gray-700 sticky top-0 z-50">
      <div className="flex justify-between items-center relative">
        {/* Hamburger - visible on small screens only */}
        <div className="sm:hidden z-10">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="text-green-600 focus:outline-none"
          >
            {isOpen ? <X size={28} /> : <Menu size={28} />}
          </button>
        </div>

        {/* Logo - center on mobile, left on desktop */}
        <a href="/" className="absolute inset-0 flex justify-center sm:static sm:justify-start">
          <img src="/logo.jpg" alt="Logo" className="h-10 sm:h-12" />
        </a>

        {/* Desktop Nav */}
        <nav className="hidden sm:flex gap-5 items-center text-sm sm:text-base font-medium text-gray-800 dark:text-white ml-20">
          <a href="#home" className="hover:text-green-600 transition">Home</a>
          <a href="#about" className="hover:text-green-600 transition">About</a>
          <a href="#services" className="hover:text-green-600 transition">Services</a>
          <a href="#testimonials" className="hover:text-green-600 transition">Testimonials</a>
          <a href="#plans" className="hover:text-green-600 transition">Plans</a>
          <a href="#contact" className="hover:text-green-600 transition">Contact Us</a>
        </nav>

        {/* Right Section: Profile + Theme */}
        <div className="flex items-center gap-4 z-10">
          {user ? (
            <div className="relative">
              <button
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className="text-green-700 dark:text-white p-2 border border-green-500 rounded-full"
              >
                <User />
              </button>
              {profileMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:text-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50">
                  <Link to="/profile" className="flex items-center px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm gap-2">
                    <Settings size={16} /> Profile
                  </Link>
                  <Link to="/dashboard" className="flex items-center px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm gap-2">
                    <BookOpen size={16} /> My Bookings
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left flex items-center px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 text-sm gap-2"
                  >
                    <LogOut size={16} /> Logout
                  </button>
                  <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700">
                    <ThemeToggle />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link
              to="/login"
              className="bg-gradient-to-r from-green-400 to-green-600 text-white px-5 py-2 rounded-lg font-semibold hover:from-green-500 hover:to-green-700 transition"
            >
              Login
            </Link>
          )}
        </div>
      </div>

      {/* Mobile Nav Menu */}
      {isOpen && (
        <div className="sm:hidden flex flex-col mt-4 space-y-3 text-gray-800 dark:text-white font-medium">
          <a href="#home" className="hover:text-green-600 transition">Home</a>
          <a href="#about" className="hover:text-green-600 transition">About</a>
          <a href="#services" className="hover:text-green-600 transition">Services</a>
          <a href="#testimonials" className="hover:text-green-600 transition">Testimonials</a>
          <a href="#plans" className="hover:text-green-600 transition">Plans</a>
          <a href="#contact" className="hover:text-green-600 transition">Contact Us</a>
        </div>
      )}
    </header>
  );
};

export default Navbar;
