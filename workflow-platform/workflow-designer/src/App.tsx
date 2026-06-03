import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { ReactFlowProvider } from '@xyflow/react';
import { WorkflowDesignerPage } from './workflow-designer/WorkflowDesignerPage';
import { MarketplacePage }      from './marketplace/MarketplacePage';
import { TemplateDetailPage }   from './marketplace/TemplateDetailPage';
import { MyInstallsPage }       from './marketplace/MyInstallsPage';
import { AppShell }             from './shell/AppShell';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const theme = createTheme({
  palette: {
    background: { default: '#f8fafc' },
    primary:    { main: '#1976d2' },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", sans-serif',
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {/*
          ReactFlowProvider is placed at the root so that useReactFlow() is
          available in both the designer and the marketplace preview canvas.
        */}
        <ReactFlowProvider>
          <BrowserRouter>
            <Routes>
              {/* ── Workflow Designer (full-screen, no shell) ── */}
              <Route path="/designer" element={<WorkflowDesignerPage />} />

              {/* ── Marketplace (wrapped in navigation shell) ── */}
              <Route element={<AppShell />}>
                <Route path="/marketplace"                  element={<MarketplacePage />} />
                <Route path="/marketplace/my-installs"      element={<MyInstallsPage />} />
                <Route path="/marketplace/:id"              element={<TemplateDetailPage />} />
              </Route>

              {/* ── Default ── */}
              <Route path="*" element={<Navigate to="/marketplace" replace />} />
            </Routes>
          </BrowserRouter>
        </ReactFlowProvider>
      </ThemeProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
