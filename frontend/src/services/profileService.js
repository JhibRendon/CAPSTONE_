import { axiosInstance } from './authService';

const API_BASE_URL = 'http://localhost:5000/api/profile';

class ProfileService {
  async checkCompletionStatus() {
    const response = await axiosInstance.get(`${API_BASE_URL}/completion-status`);
    return response.data;
  }

  async completeProfile(data) {
    const response = await axiosInstance.post(`${API_BASE_URL}/complete`, data, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    return response.data;
  }

  async getOffices() {
    const response = await axiosInstance.get(`${API_BASE_URL}/offices`);
    return response.data;
  }
}

export default new ProfileService();
