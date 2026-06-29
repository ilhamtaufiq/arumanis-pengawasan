import { useState, type ReactNode } from 'react'
import { getHttpCatImageUrl, HTTP_CAT_ATTRIBUTION_URL } from '@/lib/http-cat'

type HttpCatImageProps = {
  status: number
  className?: string
  fallback?: ReactNode
  showAttribution?: boolean
}

export function HttpCatImage({
  status,
  className,
  fallback = null,
  showAttribution = true,
}: HttpCatImageProps) {
  const [failed, setFailed] = useState(false)
  const src = getHttpCatImageUrl(status)

  if (!src || failed) {
    return <>{fallback}</>
  }

  return (
    <div className={className ?? 'error-page-cat'}>
      <img
        src={src}
        alt={`HTTP ${status}`}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
      />
      {showAttribution ? (
        <p className="error-page-cat-credit">
          Ilustrasi dari{' '}
          <a href={HTTP_CAT_ATTRIBUTION_URL} target="_blank" rel="noopener noreferrer">
            HTTP Cats
          </a>
        </p>
      ) : null}
    </div>
  )
}