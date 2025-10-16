"use client"

import type React from "react"
import {useState} from "react"

type Props={
  location:{lat:number; lng:number}
  onSubmit:(data:{name:string; city?:string; country?:string; weatherNote:string})=>void
  onClose:()=>void
}

export function LocationDialog({location, onSubmit, onClose}:Props){
  const [name, setName]=useState("")
  const [city, setCity]=useState("")
  const [country, setCountry]=useState("")
  const [weatherNote, setWeatherNote]=useState("")

  const handleSubmit=(e:React.FormEvent)=>{
    e.preventDefault()
    if(!name||!weatherNote){return}
    onSubmit({name, city:city||undefined, country:country||undefined, weatherNote})
  }

  return (
    <div
      onClick={onClose}
      style={{
        position:"fixed", inset:0, background:"rgba(0,0,0,0.4)",
        display:"flex", alignItems:"center", justifyContent:"center",
        zIndex: 2147483647 /* ensure it's above the map */
      }}
    >
      <div
        onClick={(e)=>e.stopPropagation()}
        style={{
          background:"#fff", borderRadius:8, boxShadow:"0 10px 30px rgba(0,0,0,.2)",
          width:"100%", maxWidth:480, padding:24, fontFamily:"system-ui, Arial, sans-serif"
        }}
      >
        <div style={{fontWeight:600, fontSize:18, marginBottom:6}}>Add Your Location</div>
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
            <div style={{fontSize:13, fontWeight:600, marginBottom:6}}>Weather</div>
            <div style={{display:"grid", gridTemplateColumns:"repeat(3, minmax(0,1fr))", gap:8, fontSize:14}}>
              {["hot","cold","wet","dry","night","day"].map((w)=>(
                <label key={w} style={{
                  display:"flex", alignItems:"center", gap:8,
                  border:"1px solid #ddd", borderRadius:6, padding:"8px 10px", cursor:"pointer"
                }}>
                  <input type="radio" name="weather" value={w} onChange={(e)=>setWeatherNote(e.target.value)}/>
                  {w}
                </label>
              ))}
            </div>
          </div>

          <div style={{display:"flex", justifyContent:"flex-end", gap:8, marginTop:4}}>
            <button type="button" onClick={onClose}
                    style={{border:"1px solid #ccc", background:"#fff", borderRadius:6, padding:"8px 12px"}}>Cancel</button>
            <button type="submit" disabled={!name||!weatherNote}
                    style={{border:"none", background:"#2563eb", color:"#fff", borderRadius:6, padding:"8px 12px", opacity:(!name||!weatherNote)?0.6:1}}>
              Add Pin
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
