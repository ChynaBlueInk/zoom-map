"use client"

import {useEffect, useMemo, useRef, useState} from "react"
import {MapContainer, TileLayer, Marker, Tooltip, useMapEvents} from "react-leaflet"
import type {LeafletMouseEvent, DragEndEvent} from "leaflet"
import "leaflet/dist/leaflet.css"
import L from "leaflet"
import {LocationDialog} from "./location-dialog"
import {createClient} from "../lib/supabase/client"

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

/* ---------- Inline SVG Icons (no external images) ---------- */
const pinSvg=(fill:string="#ef4444")=>`
<svg xmlns="http://www.w3.org/2000/svg" width="28" height="40" viewBox="0 0 24 24">
  <path d="M12 2C8.14 2 5 5.14 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.86-3.14-7-7-7z" fill="${fill}"/>
  <circle cx="12" cy="9" r="3.2" fill="white"/>
</svg>
`
const myIcon=L.divIcon({
  className:"custom-pin",
  html:pinSvg("#14b8a6"),          // teal for "you"
  iconSize:[28, 40],
  iconAnchor:[14, 40],
  popupAnchor:[0, -40],
})
const defaultIcon=L.divIcon({
  className:"custom-pin",
  html:pinSvg("#ef4444"),          // red for others
  iconSize:[28, 40],
  iconAnchor:[14, 40],
  popupAnchor:[0, -40],
})
/* ----------------------------------------------------------- */

export function MapView({pins, setPins}:Props){
  const supabase=useMemo(()=>createClient(), [])
  const [selected, setSelected]=useState<{lat:number; lng:number}|null>(null)
  const [editing, setEditing]=useState<Pin|null>(null)
  const center={lat:0, lng:0}
  const sessionId=getSessionId()
  const userId=getClientId()
  const pollRef=useRef<number|undefined>(undefined)
  const channelRef=useRef<ReturnType<typeof supabase.channel>|null>(null)
  const lastWriteTsRef=useRef<number>(0)

  // Turn DB rows into unique pins (newest per user)
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
    // Ignore polls immediately after our own write to avoid a brief “flash back”
    if(Date.now()-lastWriteTsRef.current<800){ return }
    setPins(mapRowsToPins(data||[]))
  }

  useEffect(()=>{
    let mounted=true
    const setup=async()=>{
      await loadPins()
      // Broadcast (doesn’t require DB replication)
      const ch=supabase
        .channel(`pins_broadcast_${sessionId}`)
        .on("broadcast", {event:"reload"}, (_msg)=>{ if(mounted){ loadPins() } })
        .subscribe()
      channelRef.current=ch
      // Poll as a fallback every 3s
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

  const notifyOthers=()=>{
    try{ channelRef.current?.send({type:"broadcast", event:"reload", payload:{ts:Date.now()}}) }catch{}
  }

  // Persist: update if your row exists, else insert. Then tidy duplicates.
  const saveRow=async(p:Pin)=>{
    const nowIso=new Date().toISOString()

    const {data:existing}=await supabase
      .from("location_pins")
      .select("id")
      .eq("session_id", sessionId)
      .eq("user_id", userId)
      .order("created_at", {ascending:false})
      .limit(1)

    if(existing && existing.length>0){
      const id=existing[0].id
      const {error}=await supabase
        .from("location_pins")
        .update({
          latitude:p.lat, longitude:p.lng,
          name:p.name, city:p.city||null, country:p.country||null, weather_note:p.weather||null,
          created_at:nowIso
        })
        .eq("id", id)
      if(error){ console.error("Update error:", error.message) }
    }else{
      const {error}=await supabase
        .from("location_pins")
        .insert({
          session_id:sessionId, user_id:userId,
          latitude:p.lat, longitude:p.lng,
          name:p.name, city:p.city||null, country:p.country||null, weather_note:p.weather||null,
          created_at:nowIso
        })
      if(error){ console.error("Insert error:", error.message) }
    }

    // Clean up older duplicates (defensive)
    const {data:allRows}=await supabase
      .from("location_pins")
      .select("id, created_at")
      .eq("session_id", sessionId)
      .eq("user_id", userId)
      .order("created_at", {ascending:false})

    if(allRows && allRows.length>1){
      const idsToDelete=allRows.slice(1).map((r:any)=>r.id)
      if(idsToDelete.length){ await supabase.from("location_pins").delete().in("id", idsToDelete) }
    }
  }

  // Shared save pathway (optimistic → persist → reload → broadcast)
  const savePin=async(p:Pin)=>{
    // Optimistic
    const next=[{...p, userId}, ...pins.filter((x)=>x.userId!==userId)]
    setPins(next)
    lastWriteTsRef.current=Date.now()

    await saveRow(p)
    await loadPins()
    notifyOthers()
  }

  // Add/move via map click
  const handleSelect=(lat:number, lng:number)=>{ setSelected({lat, lng}) }
  const handleSubmitAdd=async(data:{name:string; city?:string; country?:string; weatherNote:string})=>{
    if(!selected){ return }
    await savePin({lat:selected.lat, lng:selected.lng, name:data.name, city:data.city, country:data.country, weather:data.weatherNote})
    setSelected(null)
  }

  // Edit via clicking your own marker
  const [editingPin, setEditingPin]=useState<Pin|null>(null)
  useEffect(()=>{ setEditingPin(editing) }, [editing])
  const handleSubmitEdit=async(data:{name:string; city?:string; country?:string; weatherNote:string})=>{
    if(!editingPin){ return }
    await savePin({lat:editingPin.lat, lng:editingPin.lng, name:data.name, city:data.city, country:data.country, weather:data.weatherNote})
    setEditing(null)
  }

  // Drag your own pin
  const handleDragEnd=async(pin:Pin, e:DragEndEvent)=>{
    const ll=(e.target as any)?.getLatLng?.()
    if(!ll){ return }
    await savePin({lat:ll.lat, lng:ll.lng, name:pin.name, city:pin.city, country:pin.country, weather:pin.weather})
  }

  return (
    <>
      <div style={{position:"absolute", inset:0}}>
        <MapContainer center={[center.lat, center.lng]} zoom={2} style={{height:"100%", width:"100%"}}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                     attribution='© OSM contributors'/>
          <ClickToSelect onSelect={handleSelect}/>
          {pins?.map((pin, i)=>(
            <Marker
              key={i}
              position={[pin.lat, pin.lng]}
              icon={pin.userId===userId? myIcon : defaultIcon}
              draggable={pin.userId===userId}
              eventHandlers={{
                dragend:(e)=>handleDragEnd(pin, e as any),
                click:()=>{ if(pin.userId===userId){ setEditing(pin) } }
              }}
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
          onSubmit={handleSubmitAdd}
          onClose={()=>setSelected(null)}
        />
      )}

      {editingPin&&(
        <LocationDialog
          location={{lat:editingPin.lat, lng:editingPin.lng}}
          initialData={{name:editingPin.name, city:editingPin.city, country:editingPin.country, weatherNote:editingPin.weather||""}}
          onSubmit={handleSubmitEdit}
          onClose={()=>setEditing(null)}
        />
      )}
    </>
  )
}
