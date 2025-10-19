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
  const [editing, setEditing]=useState<Pin|null>(null)
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

  const notifyOthers=()=>{ try{ channelRef.current?.send({type:"broadcast", event:"reload", payload:{ts:Date.now()}}) }catch{} }

  // Shared save (optimistic + persist + notify)
  const savePin=async(p:Pin)=>{
    // optimistic: replace any existing pin for this user in local state
    const next=[{...p, userId}, ...pins.filter((x)=>x.userId!==userId)]
    setPins(next)

    const row={
      session_id:sessionId,
      user_id:userId,
      latitude:p.lat,
      longitude:p.lng,
      name:p.name,
      city:p.city||null,
      country:p.country||null,
      weather_note:p.weather||null,
      created_at:new Date().toISOString()
    }
    const {error}=await supabase.from("location_pins").upsert(row, {onConflict:"session_id, user_id"}).select()
    if(error){ console.error("Save error:", error.message) }
    await loadPins()
    notifyOthers()
  }

  // Dialog submit → create/move to selected point
  const handleSubmitAdd=async(data:{name:string; city?:string; country?:string; weatherNote:string})=>{
    if(!selected){ return }
    await savePin({lat:selected.lat, lng:selected.lng, name:data.name, city:data.city, country:data.country, weather:data.weatherNote})
    setSelected(null)
  }

  // Edit dialog submit → update fields at same coords
  const handleSubmitEdit=async(data:{name:string; city?:string; country?:string; weatherNote:string})=>{
    if(!editing){ return }
    await savePin({lat:editing.lat, lng:editing.lng, name:data.name, city:data.city, country:data.country, weather:data.weatherNote})
    setEditing(null)
  }

  // Drag your own pin to move it (keeps details the same)
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
                     attribution='&copy; <a href="https://osm.org/copyright">OSM</a> contributors'/>
          <ClickToSelect onSelect={handleSelect}/>
          {pins?.map((pin, i)=>(
            <Marker
              key={i}
              position={[pin.lat, pin.lng]}
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
      )}"use client"

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
type Row={
  id:string; session_id:string; user_id:string;
  latitude:number; longitude:number; name:string|null;
  city:string|null; country:string|null; weather_note:string|null;
  created_at:string;
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
  const [editing, setEditing]=useState<Pin|null>(null)
  const center={lat:0, lng:0}
  const sessionId=getSessionId()
  const userId=getClientId()
  const pollRef=useRef<number|undefined>(undefined)
  const channelRef=useRef<ReturnType<typeof supabase.channel>|null>(null)
  const lastWriteTsRef=useRef<number>(0) // ignore stale poll results right after our own save

  // Convert DB rows → unique pins (newest per user_id)
  const rowsToPins=(rows:Row[])=>{
    const byUser=new Map<string, Row>()
    for(const r of rows||[]){
      const prev=byUser.get(r.user_id)
      if(!prev || new Date(r.created_at)>new Date(prev.created_at)){ byUser.set(r.user_id, r) }
    }
    return Array.from(byUser.values()).map((r)=>({
      lat:r.latitude, lng:r.longitude, name:r.name||"Participant",
      city:r.city||undefined, country:r.country||undefined, weather:r.weather_note||undefined,
      userId:r.user_id
    }))
  }

  const loadPins=async()=>{
    const {data, error}=await supabase
      .from("location_pins")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", {ascending:false})
    if(error){ console.error("Load pins error:", error.message); return }
    // If this poll fires within 800ms of our own write, ignore (prevents brief "bounce")
    if(Date.now()-lastWriteTsRef.current<800){ return }
    setPins(rowsToPins((data||[]) as Row[]))
  }

  useEffect(()=>{
    let mounted=true
    const setup=async()=>{
      await loadPins()
      // Broadcast (doesn't require DB replication)
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

  const notifyOthers=()=>{ try{ channelRef.current?.send({type:"broadcast", event:"reload", payload:{ts:Date.now()}}) }catch{} }

  // --- DB helpers: update-or-insert, then cleanup duplicates
  const saveRow=async(p:Pin)=>{
    const nowIso=new Date().toISOString()

    // 1) check if we already have a row for this session/user
    const {data:existing, error:selErr}=await supabase
      .from("location_pins")
      .select("id")
      .eq("session_id", sessionId)
      .eq("user_id", userId)
      .order("created_at", {ascending:false})
      .limit(1)

    if(selErr){ console.error("Select own row error:", selErr.message) }

    if(existing && existing.length>0){
      const id=existing[0].id
      const {error:updErr}=await supabase
        .from("location_pins")
        .update({
          latitude:p.lat, longitude:p.lng,
          name:p.name, city:p.city||null, country:p.country||null, weather_note:p.weather||null,
          created_at:nowIso // treat as updated_at to keep "newest"
        })
        .eq("id", id)
      if(updErr){ console.error("Update error:", updErr.message) }
    }else{
      const {error:insErr}=await supabase
        .from("location_pins")
        .insert({
          session_id:sessionId, user_id:userId,
          latitude:p.lat, longitude:p.lng,
          name:p.name, city:p.city||null, country:p.country||null, weather_note:p.weather||null,
          created_at:nowIso
        })
      if(insErr){ console.error("Insert error:", insErr.message) }
    }

    // 2) cleanup any older duplicates for this user/session
    const {data:allRows}=await supabase
      .from("location_pins")
      .select("id, created_at")
      .eq("session_id", sessionId)
      .eq("user_id", userId)
      .order("created_at", {ascending:false})

    if(allRows && allRows.length>1){
      const keepId=allRows[0].id
      const idsToDelete=allRows.slice(1).map((r:any)=>r.id)
      if(idsToDelete.length){
        await supabase.from("location_pins").delete().in("id", idsToDelete)
      }
    }
  }

  // Shared save (optimistic UI → persist → reload → broadcast)
  const savePin=async(p:Pin)=>{
    // optimistic UI
    const next=[{...p, userId}, ...pins.filter((x)=>x.userId!==userId)]
    setPins(next)
    lastWriteTsRef.current=Date.now()

    await saveRow(p)
    await loadPins()
    notifyOthers()
  }

  // Click map → add/move pin to that point via dialog
  const handleSelect=(lat:number, lng:number)=>{ setSelected({lat, lng}) }

  const handleSubmitAdd=async(data:{name:string; city?:string; country?:string; weatherNote:string})=>{
    if(!selected){ return }
    await savePin({lat:selected.lat, lng:selected.lng, name:data.name, city:data.city, country:data.country, weather:data.weatherNote})
    setSelected(null)
  }

  // Click your marker → open edit dialog (prefilled)
  const [editingPin, setEditingPin]=useState<Pin|null>(null)
  useEffect(()=>{ setEditingPin(editing) }, [editing])

  const handleSubmitEdit=async(data:{name:string; city?:string; country?:string; weatherNote:string})=>{
    if(!editingPin){ return }
    await savePin({lat:editingPin.lat, lng:editingPin.lng, name:data.name, city:data.city, country:data.country, weather:data.weatherNote})
    setEditing(null)
  }

  // Drag your own pin to move it
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
                     attribution='&copy; <a href="https://osm.org/copyright">OSM</a> contributors'/>
          <ClickToSelect onSelect={handleSelect}/>
          {pins?.map((pin, i)=>(
            <Marker
              key={i}
              position={[pin.lat, pin.lng]}
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


      {editing&&(
        <LocationDialog
          location={{lat:editing.lat, lng:editing.lng}}
          initialData={{name:editing.name, city:editing.city, country:editing.country, weatherNote:editing.weather||""}}
          onSubmit={handleSubmitEdit}
          onClose={()=>setEditing(null)}
        />
      )}
    </>
  )
}
