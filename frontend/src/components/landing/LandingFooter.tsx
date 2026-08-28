import React from 'react';
import { Link } from 'react-router-dom';
import { GithubOutlined, HeartFilled } from '@ant-design/icons';
import { useTheme } from '../../context/ThemeContext';
import { LitaLogo } from '../common/LitaLogo';

export const LandingFooter: React.FC = () => {
  const { themeMode } = useTheme();

  return (
    <footer id="about" className={`border-t transition-colors duration-300 ${
      themeMode === 'dark'
        ? 'bg-[#0F1710] border-minecraft-obsidianBorder text-slate-400'
        : 'bg-[#FDFBF7] border-amber-900/10 text-slate-600'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 mb-12">
          
          {/* Col 1 & 2: Logo & Brand Summary */}
          <div className="md:col-span-2 space-y-4">
            <Link to="/" className="inline-block">
              <LitaLogo size="md" />
            </Link>
            <p className="text-sm leading-relaxed max-w-sm">
              Trợ lý học tập AI cá nhân hóa toàn diện. Giúp học sinh, sinh viên lập kế hoạch thông minh, tiếp thu kiến thức nhanh hơn và chinh phục đỉnh cao học tập.
            </p>
          </div>

          {/* Col 3: Product Links */}
          <div>
            <h5 className={`text-sm font-bold uppercase tracking-wider mb-4 ${
              themeMode === 'dark' ? 'text-white' : 'text-slate-900'
            }`}>
              Sản Phẩm
            </h5>
            <ul className="space-y-2.5 text-sm list-none p-0">
              <li>
                <a href="#features" className="hover:text-emerald-600 transition-colors">Tính Năng</a>
              </li>
              <li>
                <a href="#how-it-works" className="hover:text-emerald-600 transition-colors">Cách Hoạt Động</a>
              </li>
            </ul>
          </div>

          {/* Col 4: Legal & Company */}
          <div>
            <h5 className={`text-sm font-bold uppercase tracking-wider mb-4 ${
              themeMode === 'dark' ? 'text-white' : 'text-slate-900'
            }`}>
              Thông Tin &amp; Điều Khoản
            </h5>
            <ul className="space-y-2.5 text-sm list-none p-0">
              <li>
                <a href="#about" className="hover:text-emerald-600 transition-colors">Về Chúng Tôi</a>
              </li>
              <li>
                <a href="#privacy" className="hover:text-emerald-600 transition-colors">Chính Sách Bảo Mật</a>
              </li>
              <li>
                <a href="#terms" className="hover:text-emerald-600 transition-colors">Điều Khoản Sử Dụng</a>
              </li>
            </ul>
          </div>

          {/* Col 5: Contact & Connect */}
          <div>
            <h5 className={`text-sm font-bold uppercase tracking-wider mb-4 ${
              themeMode === 'dark' ? 'text-white' : 'text-slate-900'
            }`}>
              Liên Hệ &amp; Kết Nối
            </h5>
            <ul className="space-y-3 text-sm list-none p-0">
              <li>
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 hover:text-emerald-600 transition-colors"
                >
                  <GithubOutlined className="text-lg" />
                  <span>Mã nguồn GitHub</span>
                </a>
              </li>
              <li>
                <a href="mailto:support@ailearningcompanion.com" className="hover:text-emerald-600 transition-colors">
                  Hỗ Trợ Người Dùng
                </a>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-slate-200 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-xs gap-4">
          <p className="m-0">
            © {new Date().getFullYear()} Lita Learning. Bản quyền đã được bảo lưu.
          </p>
          <p className="m-0 flex items-center gap-1">
            Được xây dựng với <HeartFilled className="text-emerald-500" /> dành cho sinh viên &amp; người học.
          </p>
        </div>

      </div>
    </footer>
  );
};
