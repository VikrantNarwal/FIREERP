import './globals.css'
import { Providers } from './providers'
import { AuthProvider } from '@/context/AuthContext'
import { Toaster } from 'sonner'

export const metadata = {
  title: 'Manufacturing ERP - Production Operating System',
  description: 'Complete manufacturing ERP system for fireplace production',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <script dangerouslySetInnerHTML={{__html:'window.addEventListener("error",function(e){if(e.error instanceof DOMException&&e.error.name==="DataCloneError"&&e.message&&e.message.includes("PerformanceServerTiming")){e.stopImmediatePropagation();e.preventDefault()}},true);'}} />
      </head>
      <body>
        <Providers>
          <AuthProvider>
            {children}
            <Toaster position="top-right" richColors />
          </AuthProvider>
        </Providers>
      </body>
    </html>
  )
}