"use client"

import {useEffect, useMemo, useRef, useState} from "react"
import {MapContainer, TileLayer, Marker, Tooltip, useMapEvents} from "react-leaflet"
import type {LeafletMouseEvent, DragEndEvent} from "leaflet"
import "leaflet/dist/leaflet.css"
import L from "leaflet"
import {LocationDialog} from "./location-dialog"
import {createClient} from "../lib/supabase/client"

// Fix Leaflet marker icons in Vite
import marker2x from "leaflet/dist/images/marker-icon-2x.png"
import marker1x from "leaflet/dist/images/marker-icon.png"
import markerShadow from "leaflet/dist/images/marker-shadow.png"
L.Icon.Default.mergeOptions({iconRetinaUrl:marker2x, iconUrl:marker1x, shadowUrl:markerShadow})

type Pin={
  lat:number; lng:number; name:string;
  city?:string; country?:string; weather?:string;
  userId?:string;
}
type Props={ pins:Pin[]; setPins:(pins:Pin[])=>void }

function ClickToSelect({onSelect}:{onSelect:(lat:number, lng:number)=>void}){
  useMapEvents({ click:(e:LeafletMouseEvent)=>onSelect(e.latlng.lat, e.latlng.lng) })
  return null
}

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

export function MapView({pins, setPins}:Props){
  const supabase=useMemo(()=>createClient(), [])
  const [selected, setSelected]=useState<{lat:number; lng:number}|null>(null)
  const center={lat:0, lng:0}
  const sessionId=getSessionId()
  const userId=getClientId()
  const pollRef=useRef<number|undefined>(undefined)
  const channelRef=useRef<ReturnType<typeof supabase.channel>|null>(null)

  // Keep only newest row per user_id to avoid "bounce back"
  const mapRowsToPins=(rows:any[])=>{
    const byUser=new Map<string, any>()
    for(const r of rows||[]){
      const uid=r.user_id as string
      const prev=byUser.get(uid)
      if(!prev || new Date(r.created_at)>new Date(prev.created_at)){ byUser.set(uid, r) }
    }
    return Array.from(byUser.values()).map((r)=>({
      lat:r.latitude, lng:r.longitude, name:r.name||"Participant",
      city:r.city||undefined, country:r.country||undefined, weather:r.weather_note||undefined,
      userId:r.user_id as string|undefined
    }))
  }

  const loadPins=async()=>{
    const {data, error}=await supabase
      .from("location_pins")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", {ascending:false})
    if(error){ console.error("Load pins error:", error.message); return }
    setPins(mapRowsToPins(data||[]))
  }

  useEffect(()=>{
    let mounted=true
    const setup=async()=>{
      await loadPins()
      // Realtime broadcast (doesn't require DB replication)
      const ch=supabase
        .channel(`pins_broadcast_${sessionId}`)
        .on("broadcast", {event:"reload"}, (_msg)=>{ if(mounted){ loadPins() } })
        .subscribe()
      channelRef.current=ch
      // Poll every 3s as a safety net
      pollRef.current=window.setInterval(loadPins, 3000) as unknown as number
    }
    setup()
    return ()=>{
      mounted=false
      if(channelRef.current){ supabase.removeChannel(channelRef.current) }
      if(pollRef.current){ clearInterval(pollRef.current) }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId])

  const handleSelect=(lat:number, lng:number)=>{ setSelected({lat, lng}) }

  const notifyOthers=()=>{
    try{ channelRef.current?.send({type:"broadcast", event:"reload", payload:{ts:Date.now()}}) }catch{}
  }

  // Dialog submit → upsert (one pin per person) + bump created_at so newest wins
  const handleSubmit=async(data:{name:string; city?:string; country?:string; weatherNote:string})=>{
    if(!selected){ return }
    const row={
      session_id:sessionId,
      user_id:userId,
      latitude:selected.lat,
      longitude:selected.lng,
      name:data.name,
      city:data.city||null,
      country:data.country||null,
      weather_note:data.weatherNote,
      created_at:new Date().toISOString()
    }
    const {error}=await supabase.from("location_pins").upsert(row, {onConflict:"session_id, user_id"}).select()
    if(error){ console.error("Upsert error:", error.message) }
    setSelected(null)
    await loadPins()
    notifyOthers()
  }

  // Drag your own pin to move it (also bump created_at)
  const handleDragEnd=async(pin:Pin, e:DragEndEvent)=>{
    const ll=(e.target as any)?.getLatLng?.()
    if(!ll){ return }
    const row={
      session_id:sessionId,
      user_id:userId,
      latitude:ll.lat,
      longitude:ll.lng,
      name:pin.name,
      city:pin.city||null,
      country:pin.country||null,
      weather_note:pin.weather||null,
      created_at:new Date().toISOString()
    }
    const {error}=await supabase.from("location_pins").upsert(row, {onConflict:"session_id, user_id"}).select()
    if(error){ console.error("Move error:", error.message) }
    await loadPins()
    notifyOthers()
  }

  return (
    <>
      <div style={{position:"absolute", inset:0}}>
        <MapContainer center={[center.lat, center.lng]} zoom={2} style={{height:"100%", width:"100%"}}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                     attribution='&copy; <a href="https://osm.org/copyright">OSM</a> contributors'/>
          <ClickToSelect onSelect={handleSelect}/>
          {pins?.map((pin, i)=>(
            <Marker
              key={i}
              position={[pin.lat, pin.lng]}
              draggable={pin.userId===userId}
              eventHandlers={{ dragend:(e)=>handleDragEnd(pin, e as any) }}
            >
              <Tooltip>
                {`${pin.name}${pin.city?`, ${pin.city}`:""}${pin.country?` • ${pin.country}`:""}${pin.weather?` • ${pin.weather}`:""}`}{pin.userId===userId?" • (you)":""}
              </Tooltip>
            </Marker>
          ))}
        </MapContainer>
      </div>

      {selected&&(
        <LocationDialog
          location={{lat:selected.lat, lng:selected.lng}}
          onSubmit={handleSubmit}
          onClose={()=>setSelected(null)}
        />
      )}
    </>
  )
}
