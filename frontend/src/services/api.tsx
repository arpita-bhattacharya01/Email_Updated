// src/services/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: '/api/auth', // Will be proxied to http://localhost:5000/api/auth
  withCredentials: true,
});

export default api;
