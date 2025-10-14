"use client"

import { useEffect, useMemo, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import type { LocationPin } from "@/lib/types"
import { LocationDialog } from "./location-dialog"
import { MapPin } from "lucide-react"

const MAP_BOUNDS={ north:20, south:-50, west:90, east:180 }

const latLngToPosition=(lat:number, lng:number)=>{
  const x=((lng-MAP_BOUNDS.west)/(MAP_BOUNDS.east-MAP_BOUNDS.west))*100
  const y=((MAP_BOUNDS.north-lat)/(MAP_BOUNDS.north-MAP_BOUNDS.south))*100
  return { x:Math.max(0, Math.min(100, x)), y:Math.max(0, Math.min(100, y)) }
}

const positionToLatLng=(x:number, y:number)=>{
  const lng=MAP_BOUNDS.west+(x/100)*(MAP_BOUNDS.east-MAP_BOUNDS.west)
  const lat=MAP_BOUNDS.north-(y/100)*(MAP_BOUNDS.north-MAP_BOUNDS.south)
  return { lat, lng }
}

// inline helpers so no extra files needed
const getClientId=()=>{
  if(typeof window==="undefined"){ return "server" }
  const k="zoom_map_client_id"
  let id=localStorage.getItem(k)
  if(!id){ id=crypto.randomUUID(); localStorage.setItem(k, id) }
  return id!
}
const getSessionId=()=>{
  if(typeof window==="undefined"){ return "default" }
  const u=new URL(window.location.href)
  return u.searchParams.get("session")||"default"
}

export function MapView(){
  const supabase=useMemo(()=>createClient(), [])
  const [selectedLocation, setSelectedLocation]=useState<{ lat:number; lng:number }|null>(null)
  const [pins, setPins]=useState<LocationPin[]>([])
  const [hoveredPin, setHoveredPin]=useState<LocationPin|null>(null)

  useEffect(()=>{
    const load=async()=>{
      const { data, error }=await supabase.from("location_pins").select("*").order("created_at", { ascending:false })
      if(!error&&data){ setPins(data as LocationPin[]) }
    }
    load()

    const channel=supabase
      .channel("location_pins_changes")
      .on("postgres_changes", { event:"INSERT", schema:"public", table:"location_pins" }, (payload)=>{
        setPins((curr)=>[payload.new as LocationPin, ...curr.filter((p)=>p.id!==(payload.new as LocationPin).id)])
      })
      .on("postgres_changes", { event:"UPDATE", schema:"public", table:"location_pins" }, (payload)=>{
        setPins((curr)=>[payload.new as LocationPin, ...curr.filter((p)=>p.id!==(payload.new as LocationPin).id)])
      })
      .on("postgres_changes", { event:"DELETE", schema:"public", table:"location_pins" }, (payload)=>{
        setPins((curr)=>curr.filter((p)=>p.id!==(payload.old as LocationPin).id))
      })
      .subscribe()

    return ()=>{ supabase.removeChannel(channel) }
  }, [supabase])

  const handleMapClick=(e:React.MouseEvent<HTMLDivElement>)=>{
    const rect=e.currentTarget.getBoundingClientRect()
    const x=((e.clientX-rect.left)/rect.width)*100
    const y=((e.clientY-rect.top)/rect.height)*100
    setSelectedLocation(positionToLatLng(x, y))
  }

  const handleLocationSubmit=async(data:{ name:string; city?:string; country?:string; weatherNote:string })=>{
    if(!selectedLocation){ return }
    const session_id=getSessionId()
    const user_id=getClientId()

    const row={
      session_id,
      user_id,
      latitude:selectedLocation.lat,
      longitude:selectedLocation.lng,
      name:data.name,
      city:data.city||null,
      country:data.country||null,
      weather_note:data.weatherNote
    }

    const { error }=await supabase.from("location_pins")
      .upsert(row, { onConflict:"session_id, user_id" })
      .select()

    if(error){ console.error("Upsert error:", error) }
    setSelectedLocation(null)
  }

  return (
    <>
      <div className="relative w-full h-full bg-gradient-to-br from-blue-100 to-teal-50 overflow-hidden">
        <div
          className="absolute inset-0 cursor-crosshair"
          onClick={handleMapClick}
          style={{
            backgroundImage:`url('/map-of-australasia-southeast-asia-pacific-islands-.jpg')`,
            backgroundSize:"cover",
            backgroundPosition:"center"
          }}
        >
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <div className="grid grid-cols-10 grid-rows-10 h-full w-full">
              {Array.from({ length:100 }).map((_, i)=>(<div key={i} className="border border-gray-400" />))}
            </div>
          </div>

          {pins.map((pin)=>{
            const pos=latLngToPosition(pin.latitude, pin.longitude)
            return (
              <div
                key={pin.id}
                className="absolute -translate-x-1/2 -translate-y-full hover:scale-125 transition-transform cursor-pointer z-10"
                style={{ left:`${pos.x}%`, top:`${pos.y}%` }}
                onMouseEnter={()=>setHoveredPin(pin)}
                onMouseLeave={()=>setHoveredPin(null)}
                onClick={(e)=>e.stopPropagation()} // don’t re-open dialog when clicking a pin
                title={`${pin.name||"Someone"}${pin.city?", "+pin.city:""}${pin.country?" • "+pin.country:""}`}
              >
                <MapPin className="w-8 h-8 text-red-600 drop-shadow-lg" fill="currentColor"/>
              </div>
            )
          })}

          {hoveredPin&&(
            <div
              className="absolute bg-white rounded-lg shadow-xl p-3 min-w-[220px] z-20 pointer-events-none"
              style={{
                left:`${latLngToPosition(hoveredPin.latitude, hoveredPin.longitude).x}%`,
                top:`${latLngToPosition(hoveredPin.latitude, hoveredPin.longitude).y}%`,
                transform:"translate(-50%, -120%)"
              }}
            >
              <div className="font-bold">{hoveredPin.name||"Participant"}</div>
              {(hoveredPin.city||hoveredPin.country)&&(
                <div className="text-gray-600 text-sm">{[hoveredPin.city, hoveredPin.country].filter(Boolean).join(", ")}</div>
              )}
              {hoveredPin.weather_note&&(<div className="text-blue-600 mt-1 text-sm italic">Weather: {hoveredPin.weather_note}</div>)}
            </div>
          )}
        </div>
      </div>

      {selectedLocation&&(
        <LocationDialog
          location={selectedLocation}
          onSubmit={handleLocationSubmit}
          onClose={()=>setSelectedLocation(null)}
        />
      )}
    </>
  )
}
