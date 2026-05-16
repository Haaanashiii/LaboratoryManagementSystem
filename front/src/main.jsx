import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { LangProvider } from './components/i18n/LangContext'
import { AuthProvider } from './components/hooks/AuthProvider'
import { ThemeProvider } from './components/hooks/ThemeContext'
import './index.css'
import App from './App.jsx'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        // Never retry auth errors — retrying would hammer the backend and trigger rate limiting
        const status = error?.status;
        if (status === 401 || status === 403 || status === 429) return false;
        return failureCount < 1;
      },
    },
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <LangProvider>
          <ThemeProvider>
            <App />
          </ThemeProvider>
        </LangProvider>
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
)
