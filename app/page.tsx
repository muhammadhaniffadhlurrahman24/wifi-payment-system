import Dashboard from "@/components/dashboard"
import { PaymentProvider } from "@/context/payment-context"

export default function Home() {
  return (
    <PaymentProvider>
      <Dashboard />
    </PaymentProvider>
  )
}
