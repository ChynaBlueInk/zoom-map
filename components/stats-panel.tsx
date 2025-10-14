"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { LocationPin } from "@/lib/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users } from "lucide-react"

export function StatsPanel() {
  const [pins, setPins] = useState<LocationPin[]>([])
  const [totalPins, setTotalPins] = useState(0)

  useEffect(() => {
    const supabase = createClient()

    // Fetch initial pins
    const fetchPins = async () => {
      const { data, error } = await supabase.from("location_pins").select("*").order("created_at", { ascending: false })

      if (error) {
        console.error("[v0] Error fetching pins:", error)
        return
      }

      setPins(data || [])
      setTotalPins(data?.length || 0)
    }

    fetchPins()

    // Subscribe to real-time changes
    const channel = supabase
      .channel("stats_pins_changes")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "location_pins" }, (payload) => {
        setPins((current) => [payload.new as LocationPin, ...current])
        setTotalPins((current) => current + 1)
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "location_pins" }, (payload) => {
        setPins((current) => current.filter((pin) => pin.id !== (payload.old as LocationPin).id))
        setTotalPins((current) => Math.max(0, current - 1))
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const uniqueCountries = new Set(pins.filter((p) => p.country).map((p) => p.country)).size

  return (
    <div className="absolute top-4 right-4 z-[1000] space-y-2">
      <Card className="bg-white/95 backdrop-blur shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Users className="h-4 w-4 text-blue-600" />
            Live Stats
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Total Participants</span>
            <span className="text-2xl font-bold text-blue-600">{totalPins}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Countries</span>
            <span className="text-2xl font-bold text-teal-600">{uniqueCountries}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
