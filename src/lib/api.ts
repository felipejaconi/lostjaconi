import axios from "axios";

const api = axios.create({
  baseURL: "/api",
});

const requestCache = new Map();

api.interceptors.request.use((config) => {
  const token = sessionStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (
      error.response &&
      (error.response.status === 401 || error.response.status === 403)
    ) {
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("user");
      window.location.href = "/";
    }
    return Promise.reject(error);
  },
);

const originalGet = api.get;
api.get = async function (url: string, config?: any) {
  const key = url + (config?.params ? JSON.stringify(config.params) : '');
  
  if (requestCache.has(key)) {
    const cached = requestCache.get(key);
    // Cache for 60 seconds
    if (Date.now() - cached.timestamp < 60000) {
       return Promise.resolve(cached.response);
    }
  }

  const response = await originalGet.call(this, url, config);
  requestCache.set(key, { timestamp: Date.now(), response });
  return response;
};

const methodsToOverride = ['post', 'put', 'patch', 'delete'];
methodsToOverride.forEach(method => {
  const original = (api as any)[method];
  (api as any)[method] = async function (...args: any[]) {
    // Clear cache on any mutation so next GET fetches fresh data
    requestCache.clear();
    return original.apply(this, args);
  }
});

export default api;
