export interface CourseMaterial {
  id: string;
  course_id: string;
  title: string;
  file_name: string;
  file_url: string;
  type: string;
  uploaded_by?: string | null;
  uploader_name?: string | null;
  created_at: string;
}
