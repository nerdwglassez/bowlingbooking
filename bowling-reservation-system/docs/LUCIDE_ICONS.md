# Lucide React Icons

This project uses [Lucide React](https://lucide.dev/guide/packages/lucide) for icons. Lucide is tree-shakeable: only the icons you import are bundled.

## Installation

Already installed:

```bash
npm install lucide-react
```

## Usage

Import only the icons you need (recommended for smaller bundles):

```tsx
import { Calendar, ChevronLeft, X, Check } from 'lucide-react'

<Calendar className="h-5 w-5" stroke="#0F172A" />
<ChevronLeft className="w-5 h-5" stroke="currentColor" />
<X className="h-5 w-5" aria-label="Close" />
<Check className="h-3 w-3" strokeWidth={3} />
```

## Props

- **className** – Tailwind or CSS (e.g. `h-5 w-5`, `text-gray-500`)
- **stroke** – Color (`currentColor`, hex, etc.)
- **strokeWidth** – Default is 2; use 2.5 or 3 for bolder lines
- **size** – Number (replaces width/height in some cases)
- **aria-hidden** / **aria-label** – For accessibility (decorative vs meaningful)

## Where we use Lucide

- **DateAndTimeStepOne**: `Calendar`, `ChevronLeft`, `ChevronRight`, `Clock`, `CalendarX`
- **BookingSummary**: `CalendarDays`, `Clock3`, `Package`, `ChevronDown`, `Trash2`
- **AuthModal**: `X` (close)
- **AppExperienceHeader**: `Settings`

Browse all icons: [lucide.dev/icons](https://lucide.dev/icons)
