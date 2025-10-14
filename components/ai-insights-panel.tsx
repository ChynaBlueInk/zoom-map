"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"

interface AIInsights {
  summary: string
  tagline: string
}

export function AIInsightsPanel() {
  const [insights, setInsights] = useState<AIInsights | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const fetchInsights = async () => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/ai-insights")
      const data = await response.json()
      setInsights(data)
    } catch (error) {
      console.error("[v0] Error fetching AI insights:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // Fetch insights on mount
    fetchInsights()

    // Refresh insights every 30 seconds
    const interval = setInterval(fetchInsights, 30000)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="absolute top-4 left-4 z-[1000] max-w-md">
      <Card className="bg-white/95 backdrop-blur shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-600" />
            AI Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="text-sm text-muted-foreground animate-pulse">Generating insights...</div>
          ) : insights ? (
            <>
              <div className="space-y-2">
                <p className="text-sm font-medium text-foreground">{insights.summary}</p>
                <p className="text-sm text-purple-600 italic">{insights.tagline}</p>
              </div>
              <Button variant="outline" size="sm" onClick={fetchInsights} className="w-full bg-transparent">
                Refresh Insights
              </Button>
            </>
          ) : (
            <div className="text-sm text-muted-foreground">Loading insights...</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
