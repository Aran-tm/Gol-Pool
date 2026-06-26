import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { SolanaProviders } from './solana/WalletContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SolanaProviders>
      <App />
    </SolanaProviders>
  </StrictMode>,
)
