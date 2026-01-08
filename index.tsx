import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';

const rootElement = document.getElementById('root');

// Safety check for the root element itself
if (!rootElement) {
  const msg = "CRITICAL: Could not find 'root' element in DOM.";
  console.error(msg);
  document.body.innerHTML = `<div style="color:red; padding:20px; font-family:monospace; background:black; height:100vh;">${msg}</div>`;
  throw new Error(msg);
}

try {
  const root = ReactDOM.createRoot(rootElement);
  
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </React.StrictMode>
  );
  
  console.log("[System]: React Mount Successful");
} catch (error: any) {
  console.error("[System]: React Mount Failed", error);
  rootElement.innerHTML = `
    <div style="background:black; color:red; padding:20px; font-family:monospace; height:100vh;">
      <h2>INIT FAILURE</h2>
      <pre>${error?.message || "Unknown Error"}</pre>
      <pre>${error?.stack || ""}</pre>
    </div>
  `;
}