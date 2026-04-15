import type { ChangeEvent } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/shadcn/ui/input'
import { cn } from '@/lib/utils'

type ManagementSearchFieldProps = {
  value: string
  placeholder?: string
  className?: string
  inputClassName?: string
  onChange: (value: string, event: ChangeEvent<HTMLInputElement>) => void
}

export default function ManagementSearchField({
  value,
  placeholder = 'Search...',
  className,
  inputClassName,
  onChange,
}: ManagementSearchFieldProps) {
  return (
    <div className={cn('relative w-full sm:w-72', className)}>
      <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value, event)}
        placeholder={placeholder}
        className={cn('min-h-[42px] rounded-xl border-2 border-slate-200 bg-white py-2 pl-10 pr-3 text-sm focus-visible:ring-indigo-400', inputClassName)}
      />
    </div>
  )
}
