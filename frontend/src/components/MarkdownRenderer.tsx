import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Link } from 'react-router-dom';
import { ExportOutlined, BookOutlined, AimOutlined } from '@ant-design/icons';

export interface EntityAssignment {
  id: string;
  title: string;
  course_id: string;
  course_name?: string;
}

export interface EntityCourse {
  id: string;
  code?: string;
  name: string;
}

export interface EntityGoal {
  id: string;
  title: string;
}

export interface EntityContext {
  assignments?: EntityAssignment[];
  courses?: EntityCourse[];
  goals?: EntityGoal[];
}

interface MarkdownRendererProps {
  content: string;
  isUser?: boolean;
  entityContext?: EntityContext;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, isUser, entityContext }) => {
  if (isUser) {
    return <p className="whitespace-pre-wrap m-0 font-sans">{content}</p>;
  }

  // Lookup helper to match entity name against authenticated student's data
  const matchEntity = (text: string) => {
    if (!text || !entityContext) return null;
    let cleanText = text.trim();
    cleanText = cleanText.replace(/^["'“«»”]|["'“«»”]$/g, '').trim();
    cleanText = cleanText.replace(/^(Bài tập|Khóa học|Môn học|Assignment|Course)\s+/i, '').replace(/^["'“«»”]|["'“«»”]$/g, '').trim();

    if (!cleanText) return null;

    // 1. Check Assignments first (exact or case-insensitive title match)
    if (entityContext.assignments) {
      const foundAss = entityContext.assignments.find(
        (a) =>
          a.title.toLowerCase() === cleanText.toLowerCase() ||
          cleanText.toLowerCase().includes(a.title.toLowerCase()) ||
          a.title.toLowerCase().includes(cleanText.toLowerCase())
      );
      if (foundAss) {
        return {
          type: 'assignment' as const,
          data: foundAss,
          link: `/courses/${foundAss.course_id}?assignment=${foundAss.id}`,
        };
      }
    }

    // 2. Check Courses (name or code match)
    if (entityContext.courses) {
      const foundCourse = entityContext.courses.find(
        (c) =>
          c.name.toLowerCase() === cleanText.toLowerCase() ||
          (c.code && c.code.toLowerCase() === cleanText.toLowerCase()) ||
          cleanText.toLowerCase().includes(c.name.toLowerCase())
      );
      if (foundCourse) {
        return {
          type: 'course' as const,
          data: foundCourse,
          link: `/courses/${foundCourse.id}`,
        };
      }
    }

    // 3. Check Goals (title match)
    if (entityContext.goals) {
      const foundGoal = entityContext.goals.find(
        (g) =>
          g.title.toLowerCase() === cleanText.toLowerCase() ||
          cleanText.toLowerCase().includes(g.title.toLowerCase())
      );
      if (foundGoal) {
        return {
          type: 'goal' as const,
          data: foundGoal,
          link: '/goals',
        };
      }
    }

    return null;
  };

  return (
    <div className="markdown-content text-sm leading-relaxed font-sans space-y-2">
      <ReactMarkdown
        components={{
          p: ({ children }) => <p className="m-0 mb-2 last:mb-0 leading-relaxed">{children}</p>,
          a: ({ href, children }) => {
            const linkStr = href || '';
            const isInternal = linkStr.startsWith('/') || linkStr.includes('/courses/') || linkStr.includes('/goals');
            let targetPath = linkStr;
            if (linkStr.includes('/courses/')) {
              targetPath = linkStr.substring(linkStr.indexOf('/courses/'));
            } else if (linkStr.includes('/goals')) {
              targetPath = linkStr.substring(linkStr.indexOf('/goals'));
            }

            if (isInternal) {
              const isAssignment = targetPath.includes('assignment=') || targetPath.includes('assignmentId=');
              return (
                <Link
                  to={targetPath}
                  className={`font-bold px-2 py-0.5 rounded cursor-pointer transition-colors inline-flex items-center gap-1 border no-underline ${
                    isAssignment
                      ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/80 border-emerald-200 dark:border-emerald-800/80'
                      : 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/80 border-blue-200 dark:border-blue-800/80'
                  }`}
                  title="Bấm để xem chi tiết"
                >
                  <span>{children}</span>
                  {isAssignment ? <ExportOutlined className="text-[10px] shrink-0" /> : <BookOutlined className="text-[10px] shrink-0" />}
                </Link>
              );
            }

            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-600 dark:text-emerald-400 underline hover:text-emerald-500 font-medium"
              >
                {children}
              </a>
            );
          },
          strong: ({ children }) => {
            const rawStr = typeof children === 'string' ? children : String(children);
            const match = matchEntity(rawStr);

            if (match) {
              let badgeStyle = '';
              let icon = null;

              if (match.type === 'assignment') {
                badgeStyle =
                  'font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/80 px-1.5 py-0.5 rounded cursor-pointer transition-colors inline-flex items-center gap-1 border border-emerald-200 dark:border-emerald-800/80 no-underline';
                icon = <ExportOutlined className="text-[10px] shrink-0" />;
              } else if (match.type === 'course') {
                badgeStyle =
                  'font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/80 px-1.5 py-0.5 rounded cursor-pointer transition-colors inline-flex items-center gap-1 border border-blue-200 dark:border-blue-800/80 no-underline';
                icon = <BookOutlined className="text-[10px] shrink-0" />;
              } else if (match.type === 'goal') {
                badgeStyle =
                  'font-bold text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/80 px-1.5 py-0.5 rounded cursor-pointer transition-colors inline-flex items-center gap-1 border border-purple-200 dark:border-purple-800/80 no-underline';
                icon = <AimOutlined className="text-[10px] shrink-0" />;
              }

              return (
                <Link to={match.link} className={badgeStyle} title={`Xem chi tiết ${rawStr}`}>
                  <span>{children}</span>
                  {icon}
                </Link>
              );
            }

            return (
              <strong className="font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-1 py-0.5 rounded">
                {children}
              </strong>
            );
          },
          em: ({ children }) => <em className="italic">{children}</em>,
          ul: ({ children }) => <ul className="list-disc pl-5 my-2 space-y-1 text-slate-800 dark:text-slate-200">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 my-2 space-y-1 text-slate-800 dark:text-slate-200">{children}</ol>,
          li: ({ children }) => <li className="leading-snug">{children}</li>,
          h1: ({ children }) => <h1 className="text-lg font-extrabold my-2 text-slate-900 dark:text-white pb-1 border-b border-slate-200 dark:border-slate-800">{children}</h1>,
          h2: ({ children }) => <h2 className="text-base font-bold my-2 text-slate-900 dark:text-white">{children}</h2>,
          h3: ({ children }) => <h3 className="text-sm font-bold my-1 text-slate-900 dark:text-white">{children}</h3>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-emerald-500 pl-3 my-2 italic text-slate-600 dark:text-slate-400 bg-emerald-50/50 dark:bg-emerald-950/20 py-1 rounded-r-lg">
              {children}
            </blockquote>
          ),
          code: ({ children }) => (
            <code className="font-mono text-xs bg-slate-200/70 dark:bg-slate-800 px-1.5 py-0.5 rounded text-indigo-600 dark:text-indigo-400">
              {children}
            </code>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};
