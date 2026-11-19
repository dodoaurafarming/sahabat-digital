export type UserRole = 'guest' | 'student' | 'teacher' | 'admin';

export type SDClass = 1 | 2 | 3 | 4 | 5 | 6;

export type IncidentRole = 'korban' | 'saksi';

export interface StudentAccount {
  id: string;
  name: string;
  kelas: SDClass;
  username: string;
}

export interface TeacherAccount {
  id: string;
  name: string;
  subjectOrClass: string;
  accessCode: string; // 6 digit angka random dari Admin/Pengembang
}

export interface UserSession {
  role: UserRole;
  id?: string;
  name: string;
  kelas?: SDClass;
  accessCode?: string;
}

export interface MaterialLevel {
  id: string;
  level: number;
  title: string;
  summary: string;
  examples: string[];
  targetMinClass: SDClass;
}

export interface QuizOption {
  label: 'A' | 'B' | 'C';
  text: string;
  isCorrect: boolean;
  consequence: string; // Risiko jika salah, atau alasan tepat jika benar
}

export interface QuizQuestion {
  id: string;
  level: number;
  scenario: string;
  options: QuizOption[];
}

export interface ChatMessage {
  id: string;
  senderRole: 'student' | 'teacher';
  senderName: string;
  text: string;
  timestamp: string;
}

export interface CurhatThread {
  id: string;
  studentId: string;
  studentName: string;
  kelas: SDClass;
  incidentRole: IncidentRole;
  updatedAt: string;
  messages: ChatMessage[];
}

export interface PosterInfo {
  id: string;
  title: string;
  description: string;
  tag: string;
}