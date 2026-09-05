import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { IconEdit, IconUpload, IconTrash } from '@tabler/icons-react'

const DropdownMenuAlignStartDemo = () => {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='outline'>Align Start</Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className='w-34'>
        <DropdownMenuGroup>
          <DropdownMenuItem>
            <IconEdit />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem>
            <IconUpload />
            Share
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant='destructive'>
            <IconTrash />
            <span>Delete</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default DropdownMenuAlignStartDemo
