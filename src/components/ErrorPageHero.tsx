import type { ReactNode } from 'react'
import { HttpCatImage } from '@/components/HttpCatImage'

type ErrorPageHeroProps = {
  status: number
  icon: ReactNode
  iconClassName?: string
}

export function ErrorPageHero({ status, icon, iconClassName }: ErrorPageHeroProps) {
  return (
    <HttpCatImage
      status={status}
      fallback={(
        <>
          <div className={`error-page-icon${iconClassName ? ` ${iconClassName}` : ''}`}>
            {icon}
          </div>
          <div className="error-page-code">{status}</div>
        </>
      )}
    />
  )
}