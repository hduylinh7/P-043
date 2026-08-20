import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Link } from 'react-router-dom';
import { ExportOutlined } from '@ant-design/icons';

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
    return <p className="m-0 font-sans leading-normal text-white">{content}</p>;
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
    <div className="markdown-content text-sm leading-normal text-slate-900 dark:text-slate-100 font-sans space-y-0.5">
      <ReactMarkdown
        components={{
          p: ({ children }) => <p className="m-0 mb-0.5 last:mb-0 leading-normal text-slate-900 dark:text-slate-100">{children}</p>,
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
              return (
                <Link
                  to={targetPath}
                  className="text-blue-600 dark:text-blue-400 font-semibold hover:underline inline-flex items-center gap-0.5 no-underline"
                  title="Bấm để xem chi tiết"
                >
                  <span>{children}</span>
                  <ExportOutlined className="text-[10px] shrink-0" />
                </Link>
              );
            }

            return (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-blue-400 font-medium underline hover:text-blue-500"
              >
                {children}
              </a>
            );
          },
          strong: ({ children }) => {
            const rawStr = typeof children === 'string' ? children : String(children);
            const match = matchEntity(rawStr);

            if (match) {
              return (
                <Link
                  to={match.link}
                  className="text-blue-600 dark:text-blue-400 font-semibold hover:underline inline-flex items-center gap-0.5 no-underline"
                  title={`Xem chi tiết ${rawStr}`}
                >
                  <span>{children}</span>
                  <ExportOutlined className="text-[10px] shrink-0" />
                </Link>
              );
            }

            return (
              <strong className="font-bold text-slate-900 dark:text-white">
                {children}
              </strong>
            );
          },
          em: ({ children }) => <em className="italic">{children}</em>,
          ul: ({ children }) => <ul className="list-disc pl-5 my-0.5 space-y-0.5 text-slate-900 dark:text-slate-100">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 my-0.5 space-y-0.5 text-slate-900 dark:text-slate-100">{children}</ol>,
          li: ({ children }) => (
            <li className="leading-normal my-0.5 [&>p]:inline [&>p]:m-0 [&>p]:leading-normal text-slate-900 dark:text-slate-100">
              {children}
            </li>
          ),
          h1: ({ children }) => <h1 className="text-base font-bold my-1 text-slate-900 dark:text-white pb-0.5 border-b border-slate-200 dark:border-slate-800">{children}</h1>,
          h2: ({ children }) => <h2 className="text-sm font-bold my-1 text-slate-900 dark:text-white">{children}</h2>,
          h3: ({ children }) => <h3 className="text-xs font-bold my-1 text-slate-900 dark:text-white">{children}</h3>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-slate-300 dark:border-slate-700 pl-3 my-0.5 italic text-slate-700 dark:text-slate-300">
              {children}
            </blockquote>
          ),
          code: ({ children }) => (
            <code className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-1 py-0.5 rounded text-slate-800 dark:text-slate-200">
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
