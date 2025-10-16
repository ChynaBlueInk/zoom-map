"use client"

import {useEffect, useMemo, useState} from "react"
import {MapContainer, TileLayer, Marker, Tooltip, useMapEvents} from "react-leaflet"
import "leaflet/dist/leaflet.css"
import L from "leaflet"
import {LocationDialog} from "./location-dialog"
import {createClient} from "../lib/supabase/client"

// Fix Leaflet default icon paths for Vite
import marker2x from "leaflet/dist/images/marker-icon-2x.png"
import marker1x from "leaflet/dist/images/marker-icon.png"
import markerShadow from "leaflet/dist/images/marker-shadow.png"
L.Icon.Default.mergeOptions({iconRetinaUrl:marker2x, iconUrl:marker1x, shadowUrl:markerShadow})

type Pin={lat:number; lng:number; name:string; city?:string; country?:string; weather?:string}
type Props={ pins:Pin[]; setPins:(pins:Pin[])=>void }

function ClickToSelect({onSelect}:{onSelect:(lat:number, lng:number)=>void}){
  useMapEvents({ click:(e)=>{ onSelect(e.latlng.lat, e.latlng.lng) } })
  return null
}

// Simple helpers inline so you don't need extra files
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

  // 1) Initial load from Supabase (for current session only)
  useEffect(()=>{
    const load=async()=>{
      const {data, error}=await supabase
        .from("location_pins")
        .select("*")
        .eq("session_id", sessionId)
        .order("created_at", {ascending:false})
      if(error){ console.error("Load pins error:", error.message); return }
      const mapped=(data||[]).map((r)=>({
        lat:r.latitude, lng:r.longitude, name:r.name||"Participant",
        city:r.city||undefined, country:r.country||undefined, weather:r.weather_note||undefined
      }))
      setPins(mapped)
    }
    load()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]) // re-run if you change ?session=...

  const handleSelect=(lat:number, lng:number)=>{ setSelected({lat, lng}) }

  // 2) Save to Supabase with upsert (one pin per person per session)
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
      weather_note:data.weatherNote
    }
    const {error}=await supabase
      .from("location_pins")
      .upsert(row, {onConflict:"session_id, user_id"})
      .select()
    if(error){ console.error("Upsert error:", error.message) }

    // Re-fetch pins so UI reflects DB state
    const {data:refresh, error:refErr}=await supabase
      .from("location_pins")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", {ascending:false})
    if(refErr){ console.error("Reload error:", refErr.message) }
    const mapped=(refresh||[]).map((r)=>({
      lat:r.latitude, lng:r.longitude, name:r.name||"Participant",
      city:r.city||undefined, country:r.country||undefined, weather:r.weather_note||undefined
    }))
    setPins(mapped)

    setSelected(null)
  }

  return (
    <>
      <div style={{position:"absolute", inset:0}}>
        <MapContainer center={[center.lat, center.lng]} zoom={2} style={{height:"100%", width:"100%"}}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                     attribution='&copy; <a href="https://osm.org/copyright">OSM</a> contributors'/>
          <ClickToSelect onSelect={handleSelect}/>
          {pins?.map((pin, i)=>(
            <Marker key={i} position={[pin.lat, pin.lng]}>
              <Tooltip>
                {`${pin.name}${pin.city?`, ${pin.city}`:""}${pin.country?` • ${pin.country}`:""}${pin.weather?` • ${pin.weather}`:""}`}
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
