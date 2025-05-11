export const API_URL = "https://intellecta-server-h5ug.onrender.com/api/v1";

export const API_ROUTES = {
  AUTH: {
    LOGIN: `${API_URL}/auth/login`,
    REGISTER: `${API_URL}/auth/register`,
    FORGOT_PASSWORD: `${API_URL}/auth/forgot-password`,
    RESET_PASSWORD: `${API_URL}/auth/reset-password`,
    VERIFY_EMAIL: `${API_URL}/auth/verify-email`,
  },
  USERS: {
    GET_USER: `${API_URL}/users/me`,
    UPDATE_USER: `${API_URL}/users/me`,
    DELETE_USER: `${API_URL}/users/me`,
    UPDATE_PROFILE: `${API_URL}/users/me/`,
  },
  COURSES: {
    GET_COURSES: `${API_URL}/courses`,
    GET_COURSE: `${API_URL}/courses/:id`,
    CREATE_COURSE: `${API_URL}/courses`,
    UPDATE_COURSE: `${API_URL}/courses/:id`,
    DELETE_COURSE: `${API_URL}/courses/:id`,
  },
};
