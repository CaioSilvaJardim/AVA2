export interface SessionData {
  visitorId: string;
  wsEndpoint: string;
  status: 'pending' | 'extracting' | 'complete' | 'error';
  createdAt: string;
  error?: string;
}

export interface UserData {
  name: string;
  courses: Course[];
  tasks: Task[];
  announcements: Announcement[];
  scrapedAt: string;
}

export interface Course {
  id: string;
  name: string;
  teacher?: string;
}

export interface Task {
  id: string;
  title: string;
  dueDate?: string;
  urgent: boolean;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  date?: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
