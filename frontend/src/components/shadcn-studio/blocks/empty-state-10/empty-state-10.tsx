import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Card, CardContent } from '@/components/ui/card'

const allProjectCards = Array.from({ length: 6 }, (_, index) => index + 1)
const advanceProjectCards = Array.from({ length: 2 }, (_, index) => index + 1)

export const skeletonClass =
  'border-card-foreground/10 rounded-md border bg-[repeating-linear-gradient(135deg,color-mix(in_oklab,var(--card-foreground)8%,transparent),color-mix(in_oklab,var(--card-foreground)8%,transparent)_1px,var(--card)_2px,var(--card)_10px)]'

function EmptyStateAllProjects() {
  return (
    <Accordion
      type='single'
      collapsible
      defaultValue='item-1'
      className='w-full space-y-2 overflow-visible border-0 [&>*>[data-slot="accordion-content"]]:px-0'
    >
      <AccordionItem value={`item-1`} className='rounded-lg border bg-transparent'>
        <AccordionTrigger className='px-5'>All (6)</AccordionTrigger>
        <AccordionContent className='mt-1 grid grid-cols-1 gap-6 px-5 lg:grid-cols-3'>
          {allProjectCards.map(item => (
            <Card key={item}>
              <CardContent className='h-full space-y-3'>
                <div className={`${skeletonClass} h-22`} />
                <div>
                  <h3 className='text-base font-medium'>Project Name</h3>
                  <p className='text-muted-foreground text-sm'>Description</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value={`item-2`} className='rounded-lg border bg-transparent'>
        <AccordionTrigger className='px-5'>Recent (3)</AccordionTrigger>
        <AccordionContent className='mt-1 grid grid-cols-1 gap-6 px-5 lg:grid-cols-3'>
          <Card>
            <CardContent className='h-full space-y-3'>
              <div className={`${skeletonClass} h-22`} />
              <div>
                <h3 className='text-base font-medium'>Project Name</h3>
                <p className='text-muted-foreground text-sm'>Description</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className='h-full space-y-3'>
              <div className={`${skeletonClass} h-22`} />
              <div>
                <h3 className='text-base font-medium'>Project Name</h3>
                <p className='text-muted-foreground text-sm'>Description</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className='h-full space-y-3'>
              <div className={`${skeletonClass} h-22`} />
              <div>
                <h3 className='text-base font-medium'>Project Name</h3>
                <p className='text-muted-foreground text-sm'>Description</p>
              </div>
            </CardContent>
          </Card>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value={`item-3`} className='rounded-lg border bg-transparent'>
        <AccordionTrigger className='px-5'>Advance Projects (2)</AccordionTrigger>
        <AccordionContent className='mt-1 grid grid-cols-1 gap-6 px-5 lg:grid-cols-3'>
          {advanceProjectCards.map(item => (
            <Card key={item}>
              <CardContent className='h-full space-y-3'>
                <div className={`${skeletonClass} h-22`} />
                <div>
                  <h3 className='text-base font-medium'>Project Name</h3>
                  <p className='text-muted-foreground text-sm'>Description</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  )
}

export default EmptyStateAllProjects
