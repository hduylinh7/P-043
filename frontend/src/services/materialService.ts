import { api } from './api';
import { CourseMaterial } from '../types/material';

export const materialService = {
  async uploadMaterial(
    courseId: string,
    file: File,
    title: string,
    materialType: string
  ): Promise<CourseMaterial> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title);
    formData.append('material_type', materialType);

    const response = await api.post<CourseMaterial>(
      `/courses/${courseId}/materials`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  async getCourseMaterials(courseId: string): Promise<CourseMaterial[]> {
    const response = await api.get<CourseMaterial[]>(`/courses/${courseId}/materials`);
    return response.data;
  },

  async downloadMaterial(courseId: string, materialId: string, fileName: string): Promise<void> {
    const response = await api.get(`/courses/${courseId}/materials/${materialId}/download`, {
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

  async deleteMaterial(courseId: string, materialId: string): Promise<void> {
    await api.delete(`/courses/${courseId}/materials/${materialId}`);
  },
};
