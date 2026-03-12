import type { UserData, Course, Task, Announcement } from '@/types';

/**
 * Connects to the existing Browserless browser session and scrapes
 * academic data from the AVA portal.
 *
 * CRITICAL RULE: Never invent data. If selectors don't match, return empty arrays.
 */
export async function scrapeAcademicData(wsEndpoint: string): Promise<UserData> {
  const puppeteer = await import('puppeteer-core');

  const browser = await puppeteer.connect({
    browserWSEndpoint: wsEndpoint,
    defaultViewport: null,
  });

  try {
    const pages = await browser.pages();
    const page = pages[0];

    if (!page) {
      return emptyUserData();
    }

    // Wait a moment for the page to stabilize
    await new Promise((r) => setTimeout(r, 2000));

    const data = await page.evaluate(() => {
      // ─── Helper: safe text extraction ───────────────────────────────────
      function safeText(el: Element | null): string {
        if (!el) return '';
        return (el.textContent || '').trim();
      }

      function safeAttr(el: Element | null, attr: string): string {
        if (!el) return '';
        return el.getAttribute(attr) || '';
      }

      // ─── Extract user name ───────────────────────────────────────────────
      let name = '';
      const nameSelectors = [
        '.usermenu .usertext',
        '.usertext',
        '[data-region="user-menu"] .userbutton span.login',
        '.login-info .username',
        '#user-menu-toggle',
        '.navbar-nav .usermenu span',
        'a.dropdown-toggle span',
        '[data-key="myprofile"] span',
      ];

      for (const sel of nameSelectors) {
        const el = document.querySelector(sel);
        if (el && el.textContent?.trim()) {
          name = el.textContent.trim();
          break;
        }
      }

      // ─── Extract courses/disciplines ─────────────────────────────────────
      const courses: Array<{ id: string; name: string; teacher?: string }> = [];

      const courseSelectors = [
        '.coursebox .coursename a',
        '.course-info-container .course-name',
        '[data-region="course-content"] .media-body h4 a',
        '.card-title a',
        '.course-listitem .coursename a',
        '[class*="course"] [class*="name"] a',
        '.frontpage-course-list-enrolled .coursebox h3.coursename a',
        '.my-overview-courses .card-title a',
        '.course-card-title',
        'a[href*="/course/view.php"]',
      ];

      for (const sel of courseSelectors) {
        const elements = document.querySelectorAll(sel);
        if (elements.length > 0) {
          elements.forEach((el, index) => {
            const courseName = safeText(el);
            if (!courseName) return;

            // Avoid duplicates
            const alreadyAdded = courses.some((c) => c.name === courseName);
            if (alreadyAdded) return;

            // Try to find teacher info near this element
            const parent = el.closest('.coursebox, .card, [data-region], .course-listitem');
            let teacher = '';
            if (parent) {
              const teacherEl = parent.querySelector(
                '.teachers a, .course-contacts a, .teacher, [class*="teacher"]'
              );
              teacher = safeText(teacherEl);
            }

            courses.push({
              id: `course-${index}`,
              name: courseName,
              teacher: teacher || undefined,
            });
          });
          if (courses.length > 0) break;
        }
      }

      // ─── Extract tasks/assignments ────────────────────────────────────────
      const tasks: Array<{ id: string; title: string; dueDate?: string; urgent: boolean }> = [];

      const taskSelectors = [
        '[data-region="event-list-item"]',
        '.event',
        '.calendarwrapper .event',
        '[class*="assignment"] [class*="name"]',
        '.todo-list .todo-item',
        '[data-region="upcoming-event"]',
        '.block_myoverview .card-deck .card',
      ];

      for (const sel of taskSelectors) {
        const elements = document.querySelectorAll(sel);
        if (elements.length > 0) {
          elements.forEach((el, index) => {
            const titleEl = el.querySelector(
              'a, [data-region="event-name"], .event-name, h4, h3, .name'
            );
            const title = safeText(titleEl || el);
            if (!title) return;

            const alreadyAdded = tasks.some((t) => t.title === title);
            if (alreadyAdded) return;

            // Try to find due date
            const dateEl = el.querySelector(
              '.event-time, time, .date, [data-region="event-time"]'
            );
            const dueDateRaw = safeText(dateEl) || safeAttr(dateEl, 'datetime') || '';

            // Parse urgency: if due within 2 days, mark urgent
            let urgent = false;
            if (dueDateRaw) {
              const dueMs = new Date(dueDateRaw).getTime();
              const nowMs = Date.now();
              const diffDays = (dueMs - nowMs) / (1000 * 60 * 60 * 24);
              if (diffDays >= 0 && diffDays <= 2) urgent = true;
              if (diffDays < 0) urgent = false; // past due, not urgent label
            }

            tasks.push({
              id: `task-${index}`,
              title,
              dueDate: dueDateRaw || undefined,
              urgent,
            });
          });
          if (tasks.length > 0) break;
        }
      }

      // ─── Extract announcements/notices ────────────────────────────────────
      const announcements: Array<{
        id: string;
        title: string;
        content: string;
        date?: string;
      }> = [];

      const announcementSelectors = [
        '.block_news .block-news .news-item',
        '.forumpost',
        '[data-region="message"]',
        '.message-body',
        '.block_community .block_community_item',
        '.block_news_items .news-item',
        'article.post',
      ];

      for (const sel of announcementSelectors) {
        const elements = document.querySelectorAll(sel);
        if (elements.length > 0) {
          elements.forEach((el, index) => {
            const titleEl = el.querySelector(
              '.subject, h4, h3, .news-title, .post-title, .title'
            );
            const contentEl = el.querySelector(
              '.post-content, .news-body, .content, p, .message'
            );
            const dateEl = el.querySelector('.date, time, .post-date, .news-date');

            const title = safeText(titleEl);
            const content = safeText(contentEl);
            if (!title && !content) return;

            const alreadyAdded = announcements.some(
              (a) => a.title === title && a.content === content
            );
            if (alreadyAdded) return;

            announcements.push({
              id: `ann-${index}`,
              title: title || 'Aviso',
              content: content || '',
              date: safeText(dateEl) || undefined,
            });
          });
          if (announcements.length > 0) break;
        }
      }

      return { name, courses, tasks, announcements };
    });

    return {
      name: data.name || '',
      courses: data.courses as Course[],
      tasks: data.tasks as Task[],
      announcements: data.announcements as Announcement[],
      scrapedAt: new Date().toISOString(),
    };
  } finally {
    await browser.disconnect();
  }
}

function emptyUserData(): UserData {
  return {
    name: '',
    courses: [],
    tasks: [],
    announcements: [],
    scrapedAt: new Date().toISOString(),
  };
}
