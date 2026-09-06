import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { avatarFor } from '@/lib/avatars'
import { initialsOf } from '@/types/employee'

interface PersonAvatarProps {
  /** The person's full name — also the key the picture is chosen from. */
  name?: string | null
  className?: string
  size?: 'sm' | 'default' | 'lg'
  /** Extra classes for the initials, for the few places that restyle them. */
  fallbackClassName?: string
}

/**
 * One person's avatar: their picture, with their initials underneath it.
 *
 * Radix swaps to the fallback on its own if the image fails to load, so the
 * initials remain a real fallback rather than dead markup.
 *
 * The crop is anchored to the top because these are standing portraits — a
 * centred square crop of a 744x900 photo cuts the head off and leaves a circle
 * of torso.
 */
export function PersonAvatar({ name, className, size, fallbackClassName }: PersonAvatarProps) {
  const label = name?.trim() || '?'

  return (
    <Avatar className={className} size={size}>
      <AvatarImage src={avatarFor(name)} alt={label} loading='lazy' className='object-top' />
      <AvatarFallback className={fallbackClassName}>{initialsOf(label)}</AvatarFallback>
    </Avatar>
  )
}
