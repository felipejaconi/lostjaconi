import axios from "axios";

const api = axios.create({ baseURL: "https://jsonplaceholder.typicode.com" });
const requestCache = new Map();
const originalGet = api.get;

api.get = async function (url: string, config?: any) {
  const key = url + (config?.params ? JSON.stringify(config.params) : '');
  if (requestCache.has(key)) {
    const cached = requestCache.get(key);
    if (Date.now() - cached.timestamp < 30000) {
       console.log("CACHE HIT");
       return Promise.resolve(cached.response);
    }
  }
  console.log("CACHE MISS");
  const response = await originalGet.call(this, url, config);
  requestCache.set(key, { timestamp: Date.now(), response });
  return response;
};

async function run() {
   await api.get("/todos/1");
   await api.get("/todos/1");
}
run();
