import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// /api, /static 요청은 FastAPI(8000)로 전달
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true, // 유튜브 로그인에 등록한 주소(localhost:5173)가 바뀌지 않도록 고정
    proxy: {
      "/api": "http://127.0.0.1:8000",
      "/static": "http://127.0.0.1:8000",
    },
  },
});
