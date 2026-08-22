import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
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

export const cleanErrorMessage = (text: string): string => {
  if (!text || typeof text !== 'string') return text;

  // Only intercept if the text matches explicit backend error wrapper signatures or exception dumps
  const isBackendErrorWrapper =
    text.startsWith('Xin lỗi, tôi gặp sự cố khi xử lý câu hỏi:') ||
    text.includes('Error code: 429') ||
    text.includes('rate_limit_exceeded') ||
    text.includes("{'error':") ||
    text.includes('{"error":');

  if (!isBackendErrorWrapper) {
    return text;
  }

  // 1. Quota / Rate limit error (HTTP 429)
  if (text.includes('429') || text.includes('rate_limit_exceeded') || text.includes('TPD') || text.includes('tokens')) {
    const timeMatch = text.match(/try again in ([0-9]+[m|s|h|\.|\s]+[0-9]*[s]?)/i);
    if (timeMatch) {
      let timeStr = timeMatch[1].trim();
      timeStr = timeStr.replace(/([0-9]+)m/g, '$1 phút ').replace(/([0-9]+(?:\.[0-9]+)?)s/g, '$1 giây');
      return `⚠️ Trợ lý AI đang xử lý quá nhiều câu hỏi cùng lúc.\n\n⏱️ Vui lòng quay lại đặt câu hỏi sau khoảng **${timeStr}** bạn nhé!`;
    }
    return '⚠️ Trợ lý AI hiện đang tạm thời quá tải lượt phản hồi trong ngày. Vui lòng quay lại đặt câu hỏi sau ít phút bạn nhé!';
  }

  // 2. System configuration / Authentication failure
  if (text.includes('invalid_api_key') || text.includes('GROQ_API_KEY') || text.includes('401')) {
    return '⚠️ Trợ lý AI hiện chưa thể kết nối. Vui lòng thử lại sau ít phút hoặc liên hệ quản trị viên!';
  }

  // 3. General backend exception dump
  return '⚠️ Trợ lý AI gặp sự cố gián đoạn tạm thời. Vui lòng gửi lại câu hỏi sau giây lát bạn nhé!';
};

export const preprocessMarkdown = (text: string): string => {
  if (!text || typeof text !== 'string') return text;

  let cleaned = text;

  // 1. Replace HTML line breaks <br>, <br/>, <br /> with actual newlines
  cleaned = cleaned.replace(/<br\s*\/?>/gi, '\n');

  // 2. Fix malformed double/triple pipes in markdown tables e.g. "||----------||" -> "|----------|"
  cleaned = cleaned.replace(/\|{2,}/g, '|');

  // 3. Ensure markdown tables have a newline before header line | ... |
  cleaned = cleaned.replace(/([^\n])\s*(\|[\s\S]+?\|[\r\n]+\|[-:\s|]+\|)/g, '$1\n\n$2');

  return cleaned;
};

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, isUser, entityContext }) => {
  const cleanedContent = cleanErrorMessage(content || '');
  const displayContent = preprocessMarkdown(cleanedContent);

  if (isUser) {
    return <p className="m-0 font-sans leading-relaxed text-white whitespace-pre-wrap">{displayContent}</p>;
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
    <div className="markdown-content text-sm leading-relaxed text-slate-900 dark:text-slate-100 font-sans space-y-1 overflow-hidden">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="m-0 mb-1.5 last:mb-0 leading-relaxed text-slate-900 dark:text-slate-100">{children}</p>,
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
          ul: ({ children }) => <ul className="list-disc pl-5 my-1.5 space-y-1 text-slate-900 dark:text-slate-100">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-5 my-1.5 space-y-1 text-slate-900 dark:text-slate-100">{children}</ol>,
          li: ({ children }) => (
            <li className="leading-relaxed my-0.5 [&>p]:inline [&>p]:m-0 text-slate-900 dark:text-slate-100">
              {children}
            </li>
          ),
          h1: ({ children }) => <h1 className="text-base font-bold my-2 text-slate-900 dark:text-white pb-1 border-b border-slate-200 dark:border-slate-800">{children}</h1>,
          h2: ({ children }) => <h2 className="text-sm font-bold my-1.5 text-slate-900 dark:text-white">{children}</h2>,
          h3: ({ children }) => <h3 className="text-xs font-bold my-1 text-slate-900 dark:text-white">{children}</h3>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-3 border-emerald-500 pl-3 my-2 italic text-slate-700 dark:text-slate-300 bg-emerald-500/5 py-1 rounded-r-md">
              {children}
            </blockquote>
          ),
          code: ({ children }) => (
            <code className="font-mono text-xs bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-pink-600 dark:text-pink-400 font-medium">
              {children}
            </code>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-950">
              <table className="w-full text-xs text-left border-collapse">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-slate-100/90 dark:bg-slate-800/90 text-slate-800 dark:text-slate-200 font-semibold border-b border-slate-200 dark:border-slate-800">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 bg-white dark:bg-slate-900/30">
              {children}
            </tbody>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
              {children}
            </tr>
          ),
          th: ({ children }) => (
            <th className="px-3.5 py-2.5 font-semibold text-slate-900 dark:text-slate-100 border-r last:border-r-0 border-slate-200 dark:border-slate-800">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-3.5 py-2 text-slate-700 dark:text-slate-300 border-r last:border-r-0 border-slate-100 dark:border-slate-800/60 leading-normal">
              {children}
            </td>
          ),
        }}
      >
        {displayContent}
      </ReactMarkdown>
    </div>
  );
};

