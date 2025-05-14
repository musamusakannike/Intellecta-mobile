export const API_URL = "http://192.168.131.29:5000/api/v1";

export const API_ROUTES = {
  AUTH: {
    LOGIN: `${API_URL}/auth/login`,
    REGISTER: `${API_URL}/auth/register`,
    FORGOT_PASSWORD: `${API_URL}/auth/forgot-password`,
    RESET_PASSWORD: `${API_URL}/auth/reset-password`,
    REQUEST_VERIFY_EMAIL: `${API_URL}/auth/request-verify-email`,
  },
  USERS: {
    GET_USER: `${API_URL}/users/me`,
    UPDATE_USER: `${API_URL}/users/me`,
    DELETE_USER: `${API_URL}/users/me`,
    UPDATE_PROFILE: `${API_URL}/users/me/`,
  },
  COURSES: {
    GET_COURSES: `${API_URL}/courses`,
    GET_COURSE_BY_ID: `${API_URL}/courses`,
    CREATE_COURSE: `${API_URL}/courses`,
    UPDATE_COURSE: `${API_URL}/courses/:id`,
    DELETE_COURSE: `${API_URL}/courses/:id`,
    GET_TOPIC_BY_ID: `${API_URL}/courses/topics`,
    UPDATE_REVIEW: `${API_URL}/courses/reviews`,
    CREATE_REVIEW: `${API_URL}/courses`,
    DELETE_REVIEW: `${API_URL}/courses/reviews`,
  },
  LESSONS: {
    GET_LESSONS: `${API_URL}/courses/lessons`,
    GET_LESSON_BY_ID: `${API_URL}/courses/lesson`,
    SUBMIT_QUIZ: `${API_URL}/courses/lessons`,
  },
  NOTIFICATIONS: {
    GET_NOTIFICATIONS: `${API_URL}/notifications`,
    CREATE_NOTIFICATION: `${API_URL}/notifications`,
    MARK_AS_READ: `${API_URL}/notifications`,
    GET_UNREAD: `${API_URL}/notifications/unread`,
    MARK_ALL_AS_READ: `${API_URL}/notifications/mark-all-read`,
  },
};
