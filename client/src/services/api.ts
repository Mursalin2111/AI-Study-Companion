const API_BASE = '/api';

export function getAuthToken(): string | null {
  return localStorage.getItem('study_companion_token');
}

export function setAuthToken(token: string): void {
  localStorage.setItem('study_companion_token', token);
}

export function removeAuthToken(): void {
  localStorage.removeItem('study_companion_token');
}

async function request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMsg = 'An unexpected server error occurred.';
    try {
      const errData = await response.json();
      errorMsg = errData.error || errorMsg;
    } catch {
      errorMsg = `Server error (${response.status}): ${response.statusText}`;
    }
    throw new Error(errorMsg);
  }

  return response.json() as Promise<T>;
}

export const api = {
  // Auth
  login: (credentials: any) => request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
  register: (data: any) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  getMe: () => request('/auth/me'),
  updateProfile: (data: any) => request('/auth/profile', { method: 'PUT', body: JSON.stringify(data) }),
  changePassword: (data: any) => request('/auth/change-password', { method: 'POST', body: JSON.stringify(data) }),

  // Subjects
  getSubjects: (includeArchived = false) => request(`/subjects?includeArchived=${includeArchived}`),
  getSubject: (id: string) => request(`/subjects/${id}`),
  createSubject: (data: any) => request('/subjects', { method: 'POST', body: JSON.stringify(data) }),
  updateSubject: (id: string, data: any) => request(`/subjects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  archiveSubject: (id: string) => request(`/subjects/${id}/archive`, { method: 'PUT' }),
  deleteSubject: (id: string) => request(`/subjects/${id}`, { method: 'DELETE' }),

  // Materials
  getMaterials: (subjectId?: string) => request(`/materials${subjectId ? `?subjectId=${subjectId}` : ''}`),
  getMaterial: (id: string) => request(`/materials/${id}`),
  uploadMaterial: (formData: FormData) => request('/materials/upload', { method: 'POST', body: formData }),
  reprocessMaterial: (id: string) => request(`/materials/${id}/reprocess`, { method: 'POST' }),
  deleteMaterial: (id: string) => request(`/materials/${id}`, { method: 'DELETE' }),

  // AI & RAG
  askAi: (data: any) => request('/ai/chat', { method: 'POST', body: JSON.stringify(data) }),
  getConversations: (params?: { subjectId?: string; materialId?: string }) => {
    const q = new URLSearchParams(params as any).toString();
    return request(`/ai/conversations${q ? `?${q}` : ''}`);
  },
  getConversationMessages: (id: string) => request(`/ai/conversations/${id}/messages`),
  deleteConversation: (id: string) => request(`/ai/conversations/${id}`, { method: 'DELETE' }),
  summarizeMaterial: (data: { materialId: string; type?: string; language?: string }) =>
    request('/ai/summarize', { method: 'POST', body: JSON.stringify(data) }),
  getMaterialSummaries: (materialId: string) => request(`/ai/materials/${materialId}/summaries`),
  generateQuestions: (data: { materialId: string; language?: string }) =>
    request('/ai/generate-questions', { method: 'POST', body: JSON.stringify(data) }),
  getMaterialQuestions: (materialId: string) => request(`/ai/materials/${materialId}/questions`),

  // Quizzes & Mock Exams
  getQuizzes: (subjectId?: string) => request(`/quizzes${subjectId ? `?subjectId=${subjectId}` : ''}`),
  getQuiz: (id: string) => request(`/quizzes/${id}`),
  generateQuiz: (data: any) => request('/quizzes/generate', { method: 'POST', body: JSON.stringify(data) }),
  submitQuiz: (id: string, data: { answers: Record<string, string>; timeSpentSecs: number }) =>
    request(`/quizzes/${id}/submit`, { method: 'POST', body: JSON.stringify(data) }),
  getRecentAttempts: () => request('/quizzes/attempts/recent'),

  // Flashcards
  getDecks: (subjectId?: string) => request(`/flashcards/decks${subjectId ? `?subjectId=${subjectId}` : ''}`),
  getDeck: (id: string, dueOnly = false) => request(`/flashcards/decks/${id}?dueOnly=${dueOnly}`),
  createDeck: (data: any) => request('/flashcards/decks', { method: 'POST', body: JSON.stringify(data) }),
  generateFlashcards: (data: any) => request('/flashcards/generate', { method: 'POST', body: JSON.stringify(data) }),
  addFlashcard: (data: any) => request('/flashcards', { method: 'POST', body: JSON.stringify(data) }),
  reviewFlashcard: (id: string, rating: 'again' | 'hard' | 'good' | 'easy') =>
    request(`/flashcards/${id}/review`, { method: 'POST', body: JSON.stringify({ rating }) }),
  bookmarkFlashcard: (id: string) => request(`/flashcards/${id}/bookmark`, { method: 'PUT' }),
  deleteFlashcard: (id: string) => request(`/flashcards/${id}`, { method: 'DELETE' }),

  // Study Plans
  getStudyPlans: () => request('/study-plans'),
  getStudyPlan: (id: string) => request(`/study-plans/${id}`),
  generateStudyPlan: (data: any) => request('/study-plans/generate', { method: 'POST', body: JSON.stringify(data) }),
  toggleStudyTask: (id: string) => request(`/study-plans/tasks/${id}/toggle`, { method: 'PUT' }),
  deleteStudyPlan: (id: string) => request(`/study-plans/${id}`, { method: 'DELETE' }),

  // Notes
  getNotes: (subjectId?: string) => request(`/notes${subjectId ? `?subjectId=${subjectId}` : ''}`),
  getNote: (id: string) => request(`/notes/${id}`),
  createNote: (data: any) => request('/notes', { method: 'POST', body: JSON.stringify(data) }),
  updateNote: (id: string, data: any) => request(`/notes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteNote: (id: string) => request(`/notes/${id}`, { method: 'DELETE' }),
  runNoteAiAction: (id: string, data: { action: string; language?: string }) =>
    request(`/notes/${id}/ai-action`, { method: 'POST', body: JSON.stringify(data) }),

  // Search & Analytics
  search: (q: string) => request(`/search?q=${encodeURIComponent(q)}`),
  getAnalytics: () => request('/analytics'),

  // Notifications
  getNotifications: () => request('/notifications'),
  markNotificationRead: (id: string) => request(`/notifications/${id}/read`, { method: 'PUT' }),
  markAllNotificationsRead: () => request('/notifications/read-all', { method: 'PUT' }),

  // Admin
  getAdminOverview: () => request('/admin/overview'),
  getAdminUsers: () => request('/admin/users'),
  deleteAdminUser: (id: string) => request(`/admin/users/${id}`, { method: 'DELETE' }),

  // Seed
  seedDatabase: () => request('/seed', { method: 'POST' }),
  getHealth: () => request('/health'),
};
