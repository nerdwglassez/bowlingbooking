'use client'

import { getPasswordRequirements } from '@/lib/passwordRequirements'

interface PasswordRequirementsProps {
  password: string
  className?: string
}

export default function PasswordRequirements({ password, className = '' }: PasswordRequirementsProps) {
  const requirements = getPasswordRequirements(password)

  return (
    <ul className={`text-sm space-y-1 ${className}`}>
      {requirements.map((req) => (
        <li
          key={req.id}
          className={req.met ? 'text-green-600' : 'text-gray-500'}
        >
          <span className="inline-block w-4" aria-hidden>
            {req.met ? '✓' : '○'}
          </span>
          {req.label}
        </li>
      ))}
    </ul>
  )
}
