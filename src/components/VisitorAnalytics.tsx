import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { getUmamiConfig, loadUmamiScript, trackUmamiPageview } from '@/lib/analytics/umami'
import { getPengawasPublicPath } from '@/lib/sso-token'

export function VisitorAnalytics() {
  const location = useLocation()
  const config = getUmamiConfig()
  const pageUrl = getPengawasPublicPath(location.pathname, location.search)

  useEffect(() => {
    if (!config) {
      return
    }

    const scriptOrigin = new URL(config.scriptUrl).origin
    const existing = document.querySelector(`link[data-umami-preconnect="${scriptOrigin}"]`)

    if (!existing) {
      const link = document.createElement('link')
      link.rel = 'preconnect'
      link.href = scriptOrigin
      link.crossOrigin = 'anonymous'
      link.dataset.umamiPreconnect = scriptOrigin
      document.head.appendChild(link)
    }

    void loadUmamiScript(config).catch(() => {
      // Ignore — analytics is optional
    })
  }, [config])

  useEffect(() => {
    if (!config) {
      return
    }

    void loadUmamiScript(config)
      .then(() => {
        trackUmamiPageview(pageUrl)
      })
      .catch(() => {
        // Ignore — analytics is optional
      })
  }, [config, pageUrl])

  return null
}