"use client"

import {useEffect, useMemo, useRef, useState} from "react"
import {createClient} from "../lib/supabase/client"

type Entry={ ai_tool?:string|null }

export function AIWordCloudPanel(){
  const supabase=useMemo(()=>createClient(), [])
  const [items, setItems]=useState<Record<string, number>>({})
  const channelRef=useRef<ReturnType<typeof supabase.channel>|null>(null)
  const pollRef=useRef<number|undefined>(undefined)

  const sessionId=useMemo(()=>{
    if(typeof window==="undefined"){ return "default" }
    const u=new URL(window.location.href)
    return u.searchParams.get("session")||"default"
  }, [])

  const load=async()=>{
    const {data, error}=await supabase
      .from("location_pins")
      .select("ai_tool")
      .eq("session_id", sessionId)
    if(error){ console.error("AI cloud load error:", error.message); return }
    const counts:Record<string, number>={}
    for(const row of (data||[]) as Entry[]){
      const raw=(row.ai_tool||"").trim()
      if(!raw){ continue }
      // Split on commas to allow multiple tools (e.g., "ChatGPT, Midjourney")
      raw.split(",").map((s)=>s.trim()).filter(Boolean).forEach((word)=>{
        const key=word.toLowerCase()
        counts[key]=(counts[key]||0)+1
      })
    }
    setItems(counts)
  }

  useEffect(()=>{
    let mounted=true
    load()
    const ch=supabase
      .channel(`pins_broadcast_${sessionId}`)
      .on("broadcast", {event:"reload"}, ()=>{ if(mounted){ load() } })
      .subscribe()
    channelRef.current=ch
    pollRef.current=window.setInterval(load, 4000) as unknown as number
    return ()=>{
      mounted=false
      if(channelRef.current){ supabase.removeChannel(channelRef.current) }
      if(pollRef.current){ clearInterval(pollRef.current) }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId])

  const words=Object.entries(items).sort((a,b)=>b[1]-a[1])

  return (
    <div style={{
      position:"absolute", bottom:16, left:16, zIndex:1000,
      maxWidth:"calc(100vw - 32px)", background:"rgba(255,255,255,0.95)",
      borderRadius:12, boxShadow:"0 8px 24px rgba(0,0,0,.15)", padding:"12px 14px"
    }}>
      <div style={{fontSize:12, fontWeight:600, marginBottom:8, color:"#0f172a"}}>AI Word Cloud</div>
      <div style={{
        display:"flex", flexWrap:"wrap", gap:10, alignItems:"baseline",
        lineHeight:1.1
      }}>
        {words.length===0? (
          <span style={{fontSize:12, color:"#64748b"}}>No AI tools yet — add one!</span>
        ):(
          words.map(([word,count])=>{
            // scale font size between 12 and 40
            const size=Math.min(40, 12 + count*6)
            const weight=count>=3? 800 : count===2? 700 : 600
            return (
              <span key={word} style={{fontSize:size, fontWeight:weight, color:"#0ea5e9"}}>
                {word}
              </span>
            )
          })
        )}
      </div>
    </div>
  )
}
