import ReduxProvider from '@/store/Provider'
import AuthInitializer from '@/store/AuthInitializer'
import CartDrawer from '@/components/CartDrawer'
import './globals.css'

export const metadata = {
  title: 'NexonEcom — Smart Home Appliances',
  description: 'Shop the latest smart home appliances at NexonEcom',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <ReduxProvider>
          <AuthInitializer />
          <CartDrawer />
          {children}
        </ReduxProvider>
      </body>
    </html>
  )
}
