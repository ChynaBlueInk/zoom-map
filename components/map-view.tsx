"use client"

import {useState} from "react"
import {LocationDialog} from "./location-dialog"

const MAP_BOUNDS={north:20, south:-50, west:90, east:180}

const latLngToPosition=(lat:number, lng:number)=>{
  const x=((lng-MAP_BOUNDS.west)/(MAP_BOUNDS.east-MAP_BOUNDS.west))*100
  const y=((MAP_BOUNDS.north-lat)/(MAP_BOUNDS.north-MAP_BOUNDS.south))*100
  return {x:Math.max(0, Math.min(100, x)), y:Math.max(0, Math.min(100, y))}
}

const positionToLatLng=(x:number, y:number)=>{
  const lng=MAP_BOUNDS.west+(x/100)*(MAP_BOUNDS.east-MAP_BOUNDS.west)
  const lat=MAP_BOUNDS.north-(y/100)*(MAP_BOUNDS.north-MAP_BOUNDS.south)
  return {lat, lng}
}

export function MapView(){
  const [selectedLocation, setSelectedLocation]=useState<{lat:number; lng:number}|null>(null)
  const [pins, setPins]=useState<Array<{lat:number; lng:number; name:string; city?:string; country?:string; weather?:string}>>([])
  const [hoverIndex, setHoverIndex]=useState<number|null>(null)

  const handleMapClick=(e:React.MouseEvent<HTMLDivElement>)=>{
    const rect=e.currentTarget.getBoundingClientRect()
    const x=((e.clientX-rect.left)/rect.width)*100
    const y=((e.clientY-rect.top)/rect.height)*100
    setSelectedLocation(positionToLatLng(x, y))
  }

  const handleSubmit=(data:{name:string; city?:string; country?:string; weatherNote:string})=>{
    if(!selectedLocation){return}
    const newPin={lat:selectedLocation.lat, lng:selectedLocation.lng, name:data.name, city:data.city, country:data.country, weather:data.weatherNote}
    // For now: local only, show one pin by replacing any existing
    setPins([newPin])
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
              {Array.from({length:100}).map((_,i)=>(<div key={i} className="border border-gray-400" />))}
            </div>
          </div>

          {pins.map((p, i)=>{
            const pos=latLngToPosition(p.lat, p.lng)
            return (
              <div
                key={i}
                className="absolute -translate-x-1/2 -translate-y-full hover:scale-125 transition-transform cursor-pointer z-10"
                style={{left:`${pos.x}%`, top:`${pos.y}%`}}
                onMouseEnter={()=>setHoverIndex(i)}
                onMouseLeave={()=>setHoverIndex((h)=>h===i?null:h)}
                onClick={(e)=>e.stopPropagation()}
                title={p.name}
              >
                {/* simple pin */}
                <div className="w-5 h-5 bg-red-600 rounded-full shadow"></div>
              </div>
            )
          })}

          {hoverIndex!==null&&pins[hoverIndex]&&(
            <div
              className="absolute bg-white rounded-lg shadow-xl p-3 min-w-[220px] z-20 pointer-events-none"
              style={{
                left:`${latLngToPosition(pins[hoverIndex].lat, pins[hoverIndex].lng).x}%`,
                top:`${latLngToPosition(pins[hoverIndex].lat, pins[hoverIndex].lng).y}%`,
                transform:"translate(-50%, -120%)"
              }}
            >
              <div className="font-bold">{pins[hoverIndex].name}</div>
              {(pins[hoverIndex].city||pins[hoverIndex].country)&&(
                <div className="text-gray-600 text-sm">{[pins[hoverIndex].city, pins[hoverIndex].country].filter(Boolean).join(", ")}</div>
              )}
              {pins[hoverIndex].weather&&(<div className="text-blue-600 mt-1 text-sm italic">Weather: {pins[hoverIndex].weather}</div>)}
            </div>
          )}
        </div>
      </div>

      {selectedLocation&&(
        <LocationDialog
          location={selectedLocation}
          onSubmit={handleSubmit}
          onClose={()=>setSelectedLocation(null)}
        />
      )}
    </>
  )
}
