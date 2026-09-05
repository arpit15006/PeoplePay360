import { Alert, AlertTitle } from '@/components/ui/alert'
import { IconAlertTriangle } from '@tabler/icons-react'

const AlertPureDestructiveDemo = () => {
  return (
    <Alert variant='destructive' className='border-destructive *:[svg]:row-span-1'>
      <IconAlertTriangle />
      <AlertTitle>Unable to process your payment.</AlertTitle>
    </Alert>
  )
}

export default AlertPureDestructiveDemo
