import { api } from './api';
import {
  Assignment,
  AssignmentAnalytics,
  AssignmentCreatePayload,
  AssignmentQuestion,
  AssignmentQuestionPayload,
  AssignmentQuestionReorderItem,
  AssignmentSubmissionsOverview,
  AssignmentUpdatePayload,
  Checklist,
  ChecklistCreatePayload,
  ChecklistReorderItem,
  ChecklistUpdatePayload,
  GradeSubmissionPayload,
  ProgressStatus,
  Submission,
} from '../types/assignment';

export const assignmentService = {
  async getCourseAssignments(courseId: string): Promise<Assignment[]> {
    const response = await api.get<Assignment[]>(`/courses/${courseId}/assignments`);
    return response.data;
  },

  async createAssignment(courseId: string, payload: AssignmentCreatePayload): Promise<Assignment> {
    const response = await api.post<Assignment>(`/courses/${courseId}/assignments`, payload);
    return response.data;
  },

  async uploadAttachment(assignmentId: string, file: File): Promise<Assignment> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post<Assignment>(`/assignments/${assignmentId}/attachment`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  async downloadAttachment(assignmentId: string, fileName: string): Promise<void> {
    const response = await api.get(`/assignments/${assignmentId}/download-attachment`, {
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  async getAssignmentDetail(assignmentId: string): Promise<Assignment> {
    const response = await api.get<Assignment>(`/assignments/${assignmentId}`);
    return response.data;
  },

  async updateAssignment(assignmentId: string, payload: AssignmentUpdatePayload): Promise<Assignment> {
    const response = await api.put<Assignment>(`/assignments/${assignmentId}`, payload);
    return response.data;
  },

  async deleteAssignment(assignmentId: string): Promise<void> {
    await api.delete(`/assignments/${assignmentId}`);
  },

  async updateProgress(assignmentId: string, progress_status: ProgressStatus): Promise<Assignment> {
    const response = await api.patch<Assignment>(`/assignments/${assignmentId}/progress`, {
      progress_status,
    });
    return response.data;
  },

  // Question Management Methods

  async addQuestion(assignmentId: string, payload: AssignmentQuestionPayload): Promise<AssignmentQuestion> {
    const response = await api.post<AssignmentQuestion>(`/assignments/${assignmentId}/questions`, payload);
    return response.data;
  },

  async updateQuestion(questionId: string, payload: Partial<AssignmentQuestionPayload>): Promise<AssignmentQuestion> {
    const response = await api.put<AssignmentQuestion>(`/questions/${questionId}`, payload);
    return response.data;
  },

  async deleteQuestion(questionId: string): Promise<void> {
    await api.delete(`/questions/${questionId}`);
  },

  async reorderQuestions(items: AssignmentQuestionReorderItem[]): Promise<void> {
    await api.patch('/questions/reorder', { items });
  },

  async importQuestions(assignmentId: string, file: File): Promise<AssignmentQuestion[]> {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post<AssignmentQuestion[]>(`/assignments/${assignmentId}/import-questions`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  // Student Submissions API Methods

  async submitAssignment(assignmentId: string, file?: File | null, submissionText?: string): Promise<Submission> {
    const formData = new FormData();
    if (file) {
      formData.append('file', file);
    }
    if (submissionText) {
      formData.append('submission_text', submissionText);
    }
    const response = await api.post<Submission>(`/assignments/${assignmentId}/submit`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  async getMySubmission(assignmentId: string): Promise<Submission | null> {
    const response = await api.get<Submission | null>(`/assignments/${assignmentId}/my-submission`);
    return response.data;
  },

  async undoTurnIn(assignmentId: string): Promise<Submission> {
    const response = await api.post<Submission>(`/assignments/${assignmentId}/undo-turn-in`);
    return response.data;
  },

  async getAssignmentSubmissions(assignmentId: string): Promise<AssignmentSubmissionsOverview> {
    const response = await api.get<AssignmentSubmissionsOverview>(`/assignments/${assignmentId}/submissions`);
    return response.data;
  },

  async gradeSubmission(submissionId: string, payload: GradeSubmissionPayload): Promise<Submission> {
    const response = await api.put<Submission>(`/submissions/${submissionId}/grade`, payload);
    return response.data;
  },

  async downloadSubmissionFile(submissionId: string, fileName: string): Promise<void> {
    const response = await api.get(`/submissions/${submissionId}/download`, {
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  // Checklist & Analytics Methods

  async getChecklists(assignmentId: string): Promise<Checklist[]> {
    const response = await api.get<Checklist[]>(`/assignments/${assignmentId}/checklists`);
    return response.data;
  },

  async createChecklist(assignmentId: string, payload: ChecklistCreatePayload): Promise<Checklist> {
    const response = await api.post<Checklist>(`/assignments/${assignmentId}/checklists`, payload);
    return response.data;
  },

  async updateChecklist(checklistId: string, payload: ChecklistUpdatePayload): Promise<Checklist> {
    const response = await api.put<Checklist>(`/checklists/${checklistId}`, payload);
    return response.data;
  },

  async deleteChecklist(checklistId: string): Promise<void> {
    await api.delete(`/checklists/${checklistId}`);
  },

  async reorderChecklists(items: ChecklistReorderItem[]): Promise<void> {
    await api.patch('/checklists/reorder', { items });
  },

  async completeChecklist(checklistId: string): Promise<Checklist> {
    const response = await api.patch<Checklist>(`/checklists/${checklistId}/complete`);
    return response.data;
  },

  async uncompleteChecklist(checklistId: string): Promise<Checklist> {
    const response = await api.patch<Checklist>(`/checklists/${checklistId}/uncomplete`);
    return response.data;
  },

  async getAssignmentAnalytics(assignmentId: string): Promise<AssignmentAnalytics> {
    const response = await api.get<AssignmentAnalytics>(`/assignments/${assignmentId}/analytics`);
    return response.data;
  },
};

