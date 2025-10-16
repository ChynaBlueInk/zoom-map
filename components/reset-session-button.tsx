"use client"

import {useMemo, useState} from "react"
import {createClient} from "../lib/supabase/client"

const getSessionId=()=>{
  if(typeof window==="undefined"){ return "default" }
  const u=new URL(window.location.href)
  return u.searchParams.get("session")||"default"
}

export function ResetSessionButton({onReset}:{onReset:()=>void}){
  const supabase=useMemo(()=>createClient(), [])
  const [busy, setBusy]=useState(false)

  const handleReset=async()=>{
    const sessionId=getSessionId()
    const ok=window.confirm(`This will clear ALL pins for session "${sessionId}". Continue?`)
    if(!ok){ return }
    setBusy(true)
    const {error}=await supabase.from("location_pins").delete().eq("session_id", sessionId)
    setBusy(false)
    if(error){ alert("Reset failed: "+error.message); return }
    onReset() // clear local UI state
  }

  return (
    <button
      onClick={handleReset}
      disabled={busy}
      style={{
        position:"fixed", top:16, right:352, zIndex:9999,
        background:"#ef4444", color:"#fff", border:"none", borderRadius:8, padding:"8px 12px",
        boxShadow:"0 8px 20px rgba(0,0,0,.15)", cursor:busy?"not-allowed":"pointer", opacity:busy?0.7:1,
        fontSize:13
      }}
      title="Clear all pins for this session"
    >
      {busy? "Resetting…" : "Reset Session"}
    </button>
  )
}
