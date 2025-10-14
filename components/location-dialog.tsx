"use client"

import type React from "react"
import { useState } from "react"

type LocationDialogProps={
  location:{ lat:number; lng:number }
  onSubmit:(data:{ name:string; city?:string; country?:string; weatherNote:string })=>void
  onClose:()=>void
}

export function LocationDialog({ location, onSubmit, onClose }:LocationDialogProps){
  const [name, setName]=useState("")
  const [city, setCity]=useState("")
  const [country, setCountry]=useState("")
  const [weatherNote, setWeatherNote]=useState("")

  const handleSubmit=(e:React.FormEvent)=>{
    e.preventDefault()
    if(!name||!weatherNote){ return }
    onSubmit({ name, city:city||undefined, country:country||undefined, weatherNote })
  }

  return (
    <div className="fixed inset-0 z-[2000] bg-black/40 flex items-center justify-center" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6" onClick={(e)=>e.stopPropagation()}>
        <div className="font-semibold text-lg mb-1">Add Your Location</div>
        <div className="text-sm text-gray-600 mb-4">Please add your name and what the weather’s doing.</div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1" htmlFor="name">Name</label>
            <input id="name" className="w-full border rounded px-3 py-2" value={name} onChange={(e)=>setName(e.target.value)} placeholder="e.g., Cheryl" required/>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="city">City (optional)</label>
              <input id="city" className="w-full border rounded px-3 py-2" value={city} onChange={(e)=>setCity(e.target.value)} placeholder="e.g., Dili"/>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1" htmlFor="country">Country (optional)</label>
              <input id="country" className="w-full border rounded px-3 py-2" value={country} onChange={(e)=>setCountry(e.target.value)} placeholder="e.g., Timor-Leste"/>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Weather</label>
            <div className="grid grid-cols-3 gap-2 text-sm">
              {["hot","cold","wet","dry","night","day"].map((w)=>(
                <label key={w} className={`border rounded px-3 py-2 cursor-pointer ${weatherNote===w?"bg-blue-50 border-blue-400":"bg-white"}`}>
                  <input type="radio" name="weather" value={w} className="mr-2" onChange={(e)=>setWeatherNote(e.target.value)}/>
                  {w}
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-3 py-2 border rounded">Cancel</button>
            <button type="submit" className="px-3 py-2 bg-blue-600 text-white rounded" disabled={!name||!weatherNote}>Add Pin</button>
          </div>
        </form>
      </div>
    </div>
  )
}
