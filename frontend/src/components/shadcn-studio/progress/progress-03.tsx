'use client'

import { useEffect, useState } from 'react'

import { Field, FieldLabel } from '@/components/ui/field'
import { Progress } from '@/components/ui/progress'

const ProgressLoadingDemo = () => {
  const [value, setValue] = useState(20)

  useEffect(() => {
    const interval = setInterval(() => {
      setValue(current => Math.min(100, Math.round(current + Math.random() * 25)))
    }, 1000)

    return () => clearInterval(interval)
  }, [])

  return (
    <Field className='w-full'>
      <FieldLabel htmlFor='progress-loading'>
        <span>{value >= 100 ? 'Complete' : 'Loading...'}</span>
        <span className='ml-auto'>{value}%</span>
      </FieldLabel>
      <Progress value={value} id='progress-loading' className='transition-all duration-300' />
    </Field>
  )
}

export default ProgressLoadingDemo
