"use client"

import {useMemo, useState} from "react"
import {MapContainer, TileLayer, Marker, Tooltip, useMapEvents} from "react-leaflet"
import "leaflet/dist/leaflet.css"
import L from "leaflet"
import {LocationDialog} from "./location-dialog"

// ✅ Fix default marker icons for Vite
import marker2x from "leaflet/dist/images/marker-icon-2x.png"
import marker1x from "leaflet/dist/images/marker-icon.png"
import markerShadow from "leaflet/dist/images/marker-shadow.png"
L.Icon.Default.mergeOptions({iconRetinaUrl:marker2x, iconUrl:marker1x, shadowUrl:markerShadow})

type Pin={lat:number; lng:number; name:string; city?:string; country?:string; weather?:string}

function ClickToSelect({onSelect}:{onSelect:(lat:number, lng:number)=>void}){
  useMapEvents({
    click:(e)=>{ onSelect(e.latlng.lat, e.latlng.lng) }
  })
  return null
}

export function MapView(){
  const [selected, setSelected]=useState<{lat:number; lng:number}|null>(null)
  const [pin, setPin]=useState<Pin|null>(null)

  const center=useMemo(()=>({lat:0, lng:0}), [])
  const handleSelect=(lat:number, lng:number)=>{ setSelected({lat, lng}) }
  const handleSubmit=(data:{name:string; city?:string; country?:string; weatherNote:string})=>{
    if(!selected){return}
    setPin({lat:selected.lat, lng:selected.lng, name:data.name, city:data.city, country:data.country, weather:data.weatherNote})
    setSelected(null)
  }

  return (
    <>
      <div style={{position:"absolute", inset:0}}>
        <MapContainer center={[center.lat, center.lng]} zoom={2} style={{height:"100%", width:"100%"}}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                     attribution='&copy; <a href="https://osm.org/copyright">OSM</a> contributors'/>
          <ClickToSelect onSelect={handleSelect}/>
          {pin&&(
            <Marker position={[pin.lat, pin.lng]}>
              <Tooltip>{`${pin.name}${pin.city?`, ${pin.city}`:""}${pin.country?` • ${pin.country}`:""}${pin.weather?` • ${pin.weather}`:""}`}</Tooltip>
            </Marker>
          )}
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
