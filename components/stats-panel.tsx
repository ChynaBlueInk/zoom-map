"use client"

import {useEffect, useState} from "react"

type Pin={lat:number; lng:number; name:string; city?:string; country?:string; weather?:string; aiTool?:string}

export function StatsPanel({pins}:{pins:Pin[]|undefined}){
  // --- aggregates
  const byCountry:Record<string, number>={}
  ;(pins||[]).forEach((p)=>{ if(p.country){ byCountry[p.country]=(byCountry[p.country]||0)+1 } })
  const entries=Object.entries(byCountry).sort((a,b)=>b[1]-a[1])
  const total=(pins||[]).length
  const max=entries[0]?.[1]||1

  // AI word cloud counts (split on commas, trim)
  const aiCounts:Record<string, number>={}
  ;(pins||[]).forEach((p)=>{
    const raw=(p.aiTool||"").trim()
    if(!raw){ return }
    raw.split(",").map((s)=>s.trim()).filter(Boolean).forEach((tool)=>{
      const key=tool.toLowerCase()
      aiCounts[key]=(aiCounts[key]||0)+1
    })
  })
  const aiWords=Object.entries(aiCounts).sort((a,b)=>b[1]-a[1])

  // --- responsive behaviour
  const [isMobile, setIsMobile]=useState(false)
  const [open, setOpen]=useState(true)

  useEffect(()=>{
    const check=()=>{ setIsMobile(window.innerWidth<640) }
    check()
    window.addEventListener("resize", check)
    return ()=>window.removeEventListener("resize", check)
  },[])

  useEffect(()=>{
    // desktop open, mobile closed (to avoid overlapping instructions)
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

  if(!open){ return ToggleButton }

  return (
    <>
      {/* Panel */}
      <div style={{
        position:"fixed",
        top:isMobile? "auto" : 16,
        right:16,
        bottom:isMobile? 64 : "auto",
        zIndex:9998,
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

        {/* Keep the Top Regions list */}
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

        {/* NEW: AI word cloud (replaces the old country calligram) */}
        <div style={{fontWeight:700, fontSize:13, marginTop:12, marginBottom:6}}>AI Tools (word cloud)</div>
        <div style={{
          marginTop:4, padding:8, background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:8,
          display:"flex", flexWrap:"wrap", gap:10, alignItems:"baseline", lineHeight:1.1
        }}>
          {aiWords.length===0? (
            <span style={{fontSize:12, color:"#64748b"}}>No AI tools yet</span>
          ):(
            aiWords.map(([word, count])=>{
              const size=Math.min(40, 12+count*6) // 12–40px
              const weight=count>=3? 800 : count===2? 700 : 600
              // Show nicely-cased text: title-case each token
              const pretty=word.split(" ").map((t)=>t.charAt(0).toUpperCase()+t.slice(1)).join(" ")
              return (
                <span key={word} style={{fontSize:size, fontWeight:weight, color:"#0ea5e9"}}>
                  {pretty}
                </span>
              )
            })
          )}
        </div>
      </div>

      {/* Toggle button */}
      {ToggleButton}
    </>
  )
}
