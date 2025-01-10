import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./config/query";
import { useThemeChanger } from "./features/themeChanger/hooks";
import { Toasts } from "./layout/toasts";
import { Router } from "./routes";

import "./App.css";
// Custom CSS can be found in index.css
import "react-datepicker/dist/react-datepicker.css";

function App() {
  // Update the theme
  useThemeChanger();

  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toasts />
    </QueryClientProvider>
  );
}

export default App;
