interface PackageLineItem {
  id?: string
  name: string
  description?: string | null
  price: number
}

interface BookingPackageListProps {
  title?: string
  items?: PackageLineItem[]
  packages?: PackageLineItem[]
  inline?: boolean
  className?: string
}

export default function BookingPackageList({
  title = 'Packages',
  items,
  packages,
  inline = false,
  className = '',
}: BookingPackageListProps) {
  const resolvedItems = items ?? packages ?? []
  if (resolvedItems.length === 0) return null

  return (
    <div className={className}>
      {!inline ? <h2 className="mb-2 font-semibold">{title}</h2> : null}
      <div className={inline ? 'space-y-1' : 'space-y-2'}>
        {resolvedItems.map((item, index) => (
          <div key={item.id ?? `${item.name}-${index}`} className="flex items-start justify-between">
            <div>
              <p className={inline ? 'text-gray-600' : 'font-medium'}>{item.name}</p>
              {item.description ? <p className="text-sm text-gray-600">{item.description}</p> : null}
            </div>
            {!inline ? <p className="font-semibold">${Number(item.price).toFixed(2)}</p> : null}
          </div>
        ))}
      </div>
    </div>
  )
}
