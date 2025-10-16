"use client"

import {useEffect, useState} from "react"

type Pin={lat:number; lng:number; name:string; city?:string; country?:string; weather?:string}

export function StatsPanel({pins}:{pins:Pin[]|undefined}){
  // --- basic aggregates
  const byCountry:Record<string, number>={}
  ;(pins||[]).forEach((p)=>{ if(p.country){ byCountry[p.country]=(byCountry[p.country]||0)+1 } })
  const entries=Object.entries(byCountry).sort((a,b)=>b[1]-a[1])
  const total=(pins||[]).length
  const max=entries[0]?.[1]||1

  // --- responsive behaviour
  const [isMobile, setIsMobile]=useState(false)
  const [open, setOpen]=useState(true)

  useEffect(()=>{
    const check=()=>{ setIsMobile(window.innerWidth<640) } // <640px → mobile
    check()
    window.addEventListener("resize", check)
    return ()=>window.removeEventListener("resize", check)
  },[])

  useEffect(()=>{
    // default: desktop open, mobile closed to avoid overlapping the instructions
    setOpen(!isMobile)
  },[isMobile])

  // floating toggle button (always visible)
  const ToggleButton=(
    <button
      onClick={()=>setOpen((s)=>!s)}
      style={{
        position:"fixed", right:16, bottom:16, zIndex:9999,
        background:"#0ea5e9", color:"#fff", border:"none", borderRadius:9999,
        padding:"10px 14px", fontSize:13, boxShadow:"0 10px 24px rgba(0,0,0,.2)",
        cursor:"pointer", opacity:open?0.9:1
      }}
      aria-expanded={open}
      title={open? "Hide stats" : "Show stats"}
    >
      {open? "Hide Stats" : "Show Stats"}
    </button>
  )

  if(!open){
    return ToggleButton
  }

  return (
    <>
      {/* Panel */}
      <div style={{
        position:"fixed",
        // desktop: top-right; mobile: bottom-right above the toggle
        top:isMobile? "auto" : 16,
        right:16,
        bottom:isMobile? 64 : "auto",
        zIndex:9998, // keep below the toggle + below the dialog
        width:isMobile? "min(92vw, 360px)" : 320,
        background:"#fff", borderRadius:12, padding:16,
        boxShadow:"0 12px 30px rgba(0,0,0,.2)",
        fontFamily:"system-ui, Arial, sans-serif"
      }}>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8}}>
          <div style={{fontWeight:700, fontSize:14}}>Live Stats</div>
          <button
            onClick={()=>setOpen(false)}
            style={{border:"none", background:"transparent", cursor:"pointer", fontSize:18, lineHeight:1}}
            aria-label="Close stats"
          >×</button>
        </div>

        <div style={{display:"flex", justifyContent:"space-between", fontSize:13, marginBottom:8}}>
          <span style={{color:"#475569"}}>Total Pins</span>
          <span style={{fontWeight:700, color:"#2563eb"}}>{total}</span>
        </div>

        <div style={{fontWeight:700, fontSize:13, marginTop:8, marginBottom:6}}>Top Regions</div>
        {entries.length===0&&(<div style={{fontSize:12, color:"#64748b"}}>No countries yet</div>)}
        {entries.slice(0,5).map(([country, count])=>(
          <div key={country} style={{marginBottom:8}}>
            <div style={{display:"flex", justifyContent:"space-between", fontSize:12, marginBottom:4}}>
              <span style={{color:"#0f172a"}}>{country}</span>
              <span style={{fontWeight:600}}>{count}</span>
            </div>
            <div style={{height:8, background:"#e5e7eb", borderRadius:9999}}>
              <div style={{height:8, width:`${(count/max)*100}%`, background:"#14b8a6", borderRadius:9999}}/>
            </div>
          </div>
        ))}

        {/* simple calligram-style block */}
        {entries.length>0&&(
          <div style={{
            marginTop:12, padding:8, background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:8,
            display:"flex", flexWrap:"wrap", gap:8, alignItems:"baseline"
          }}>
            {entries.map(([country, count])=>{
              const size=12+Math.round((count/max)*16) // 12–28px
              return <span key={country} style={{fontSize:size, fontWeight:600, color:"#1f2937"}}>{country}</span>
            })}
          </div>
        )}
      </div>

      {/* Toggle button */}
      {ToggleButton}
    </>
  )
}
