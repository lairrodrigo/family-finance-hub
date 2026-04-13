import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Diagnóstico de variáveis de ambiente
console.log("=== DIAGNÓSTICO ENV ===");
console.log("import.meta.env:", import.meta.env);
console.log("VITE_SUPABASE_URL:", import.meta.env.VITE_SUPABASE_URL);
console.log("VITE_SUPABASE_PUBLISHABLE_KEY:", import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
console.log("=== FIM DIAGNÓSTICO ===");

createRoot(document.getElementById("root")!).render(<App />);
