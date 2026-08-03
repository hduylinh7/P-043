import React from 'react';
import { Link } from 'react-router-dom';
import { BookOutlined, GithubOutlined, HeartFilled } from '@ant-design/icons';
import { useTheme } from '../../context/ThemeContext';

export const LandingFooter: React.FC = () => {
  const { themeMode } = useTheme();

  return (
    <footer id="about" className={`border-t transition-colors duration-300 ${
      themeMode === 'dark'
        ? 'bg-slate-950 border-slate-800 text-slate-400'
        : 'bg-white border-slate-200 text-slate-600'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 mb-12">
          
          {/* Col 1 & 2: Logo & Brand Summary */}
          <div className="md:col-span-2 space-y-4">
            <Link to="/" className="flex items-center gap-2.5 font-bold text-xl tracking-tight">
              <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
                <BookOutlined className="text-lg" />
              </div>
              <span className={themeMode === 'dark' ? 'text-white font-extrabold' : 'text-slate-900 font-extrabold'}>
                AI Learning <span className="text-indigo-600">Companion</span>
              </span>
            </Link>
            <p className="text-sm leading-relaxed max-w-sm">
              Your all-in-one AI study assistant. Empowering students to plan smarter, learn faster, and reach academic goals with state-of-the-art AI.
            </p>
          </div>

          {/* Col 3: Product Links */}
          <div>
            <h5 className={`text-sm font-bold uppercase tracking-wider mb-4 ${
              themeMode === 'dark' ? 'text-white' : 'text-slate-900'
            }`}>
              Product
            </h5>
            <ul className="space-y-2.5 text-sm list-none p-0">
              <li>
                <a href="#features" className="hover:text-indigo-600 transition-colors">Features</a>
              </li>
              <li>
                <a href="#how-it-works" className="hover:text-indigo-600 transition-colors">How It Works</a>
              </li>
              <li>
                <a href="#testimonials" className="hover:text-indigo-600 transition-colors">Testimonials</a>
              </li>
            </ul>
          </div>

          {/* Col 4: Legal & Company */}
          <div>
            <h5 className={`text-sm font-bold uppercase tracking-wider mb-4 ${
              themeMode === 'dark' ? 'text-white' : 'text-slate-900'
            }`}>
              Company & Legal
            </h5>
            <ul className="space-y-2.5 text-sm list-none p-0">
              <li>
                <a href="#about" className="hover:text-indigo-600 transition-colors">About Us</a>
              </li>
              <li>
                <a href="#privacy" className="hover:text-indigo-600 transition-colors">Privacy Policy</a>
              </li>
              <li>
                <a href="#terms" className="hover:text-indigo-600 transition-colors">Terms of Service</a>
              </li>
            </ul>
          </div>

          {/* Col 5: Contact & Connect */}
          <div>
            <h5 className={`text-sm font-bold uppercase tracking-wider mb-4 ${
              themeMode === 'dark' ? 'text-white' : 'text-slate-900'
            }`}>
              Connect
            </h5>
            <ul className="space-y-3 text-sm list-none p-0">
              <li>
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 hover:text-indigo-600 transition-colors"
                >
                  <GithubOutlined className="text-lg" />
                  <span>GitHub Repository</span>
                </a>
              </li>
              <li>
                <a href="mailto:support@ailearningcompanion.com" className="hover:text-indigo-600 transition-colors">
                  Contact Support
                </a>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-slate-200 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-xs gap-4">
          <p className="m-0">
            © {new Date().getFullYear()} AI Learning Companion. All rights reserved.
          </p>
          <p className="m-0 flex items-center gap-1">
            Built with <HeartFilled className="text-rose-500" /> for university students.
          </p>
        </div>

      </div>
    </footer>
  );
};
