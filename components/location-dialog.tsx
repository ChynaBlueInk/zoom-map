"use client"

import type React from "react"
import {useEffect, useRef, useState} from "react"

type Props={
  location:{lat:number; lng:number}
  onSubmit:(data:{name:string; city?:string; country?:string; weatherNote:string; aiTool?:string})=>void
  onClose:()=>void
  /** Optional: pass to prefill fields when editing */
  initialData?:{name?:string; city?:string; country?:string; weatherNote?:string; aiTool?:string}
}

const WEATHER_OPTIONS=["hot","cold","wet","dry","night","day"]

export function LocationDialog({location, onSubmit, onClose, initialData}:Props){
  const [name, setName]=useState("")
  const [city, setCity]=useState("")
  const [country, setCountry]=useState("")
  const [selectedWeather, setSelectedWeather]=useState<string[]>([])
  const [aiTool, setAiTool]=useState("")

  // Prefill exactly once to avoid wiping user input on re-renders
  const prefilledRef=useRef(false)
  useEffect(()=>{
    if(prefilledRef.current){ return }
    prefilledRef.current=true
    if(initialData){
      setName(initialData.name||"")
      setCity(initialData.city||"")
      setCountry(initialData.country||"")
      const parsed=(initialData.weatherNote||"").split(",").map((s)=>s.trim()).filter(Boolean)
      setSelectedWeather(parsed)
      setAiTool(initialData.aiTool||"")
    }
  }, [initialData])

  const toggleWeather=(w:string)=>{
    setSelectedWeather((prev)=>{
      if(prev.includes(w)){ return prev.filter((x)=>x!==w) }
      return [...prev, w]
    })
  }

  const handleSubmit=(e:React.FormEvent)=>{
    e.preventDefault()
    if(!name||selectedWeather.length===0){ return }
    onSubmit({
      name,
      city:city||undefined,
      country:country||undefined,
      weatherNote:selectedWeather.join(", "),
      aiTool:aiTool.trim()||undefined
    })
  }

  const isEdit=Boolean(initialData)
  const title=isEdit? "Edit Your Location" : "Add Your Location"
  const cta=isEdit? "Save Changes" : "Add Pin"

  return (
    <div
      onClick={onClose}
      style={{
        position:"fixed", inset:0, background:"rgba(0,0,0,0.4)",
        display:"flex", alignItems:"center", justifyContent:"center",
        zIndex:2147483647
      }}
    >
      <div
        onClick={(e)=>e.stopPropagation()}
        style={{background:"#fff", borderRadius:8, boxShadow:"0 10px 30px rgba(0,0,0,.2)", width:"100%", maxWidth:480, padding:24, fontFamily:"system-ui, Arial, sans-serif"}}
      >
        <div style={{fontWeight:600, fontSize:18, marginBottom:6}}>{title}</div>
        <div style={{color:"#555", fontSize:13, marginBottom:16}}>Please add your name and the weather.</div>

        <form onSubmit={handleSubmit} style={{display:"grid", gap:12}}>
          <div>
            <label htmlFor="name" style={{display:"block", fontSize:13, fontWeight:600, marginBottom:6}}>Name</label>
            <input id="name" required value={name} onChange={(e)=>setName(e.target.value)}
                   placeholder="e.g., Cheryl"
                   style={{width:"100%", border:"1px solid #ccc", borderRadius:6, padding:"8px 10px"}}/>
          </div>

          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:12}}>
            <div>
              <label htmlFor="city" style={{display:"block", fontSize:13, fontWeight:600, marginBottom:6}}>City (optional)</label>
              <input id="city" value={city} onChange={(e)=>setCity(e.target.value)} placeholder="e.g., Dili"
                     style={{width:"100%", border:"1px solid #ccc", borderRadius:6, padding:"8px 10px"}}/>
            </div>
            <div>
              <label htmlFor="country" style={{display:"block", fontSize:13, fontWeight:600, marginBottom:6}}>Country (optional)</label>
              <input id="country" value={country} onChange={(e)=>setCountry(e.target.value)} placeholder="e.g., Timor-Leste"
                     style={{width:"100%", border:"1px solid #ccc", borderRadius:6, padding:"8px 10px"}}/>
            </div>
          </div>

          <div>
            <div style={{fontSize:13, fontWeight:600, marginBottom:6}}>Weather (choose one or more)</div>
            <div style={{display:"grid", gridTemplateColumns:"repeat(3, minmax(0,1fr))", gap:8, fontSize:14}}>
              {WEATHER_OPTIONS.map((w)=>(
                <label key={w} style={{
                  display:"flex", alignItems:"center", gap:8,
                  border:selectedWeather.includes(w)?"1px solid #60a5fa":"1px solid #ddd",
                  background:selectedWeather.includes(w)?"#eff6ff":"#fff",
                  borderRadius:6, padding:"8px 10px", cursor:"pointer"
                }}>
                  <input type="checkbox" checked={selectedWeather.includes(w)} onChange={()=>toggleWeather(w)}/>
                  {w}
                </label>
              ))}
            </div>
            <div style={{marginTop:6, fontSize:12, color:"#64748b"}}>
              {selectedWeather.length>0? `Selected: ${selectedWeather.join(", ")}` : "Pick at least one"}
            </div>
          </div>

          {/* AI tool (optional) */}
          <div>
            <label htmlFor="aiTool" style={{display:"block", fontSize:13, fontWeight:600, marginBottom:6}}>
              AI you use most often (optional)
            </label>
            <input
              id="aiTool"
              value={aiTool}
              onChange={(e)=>setAiTool(e.target.value)}
              placeholder="e.g., ChatGPT, Claude, Midjourney"
              style={{width:"100%", border:"1px solid #ccc", borderRadius:6, padding:"8px 10px"}}
            />
          </div>

          <div style={{display:"flex", justifyContent:"flex-end", gap:8, marginTop:4}}>
            <button type="button" onClick={onClose}
                    style={{border:"1px solid #ccc", background:"#fff", borderRadius:6, padding:"8px 12px"}}>Cancel</button>
            <button type="submit" disabled={!name||selectedWeather.length===0}
                    style={{border:"none", background:"#2563eb", color:"#fff", borderRadius:6, padding:"8px 12px", opacity:(!name||selectedWeather.length===0)?0.6:1}}>
              {cta}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
