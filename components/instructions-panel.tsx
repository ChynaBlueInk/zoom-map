"use client"

import {useMemo, useState} from "react"

export function InstructionsPanel(){
  const [isOpen, setIsOpen]=useState(true)
  const [copied, setCopied]=useState(false)
  const [showQR, setShowQR]=useState(false)

  const currentUrl=useMemo(()=>{
    if(typeof window==="undefined"){ return "" }
    return window.location.href
  },[])

  const handleCopy=async()=>{
    try{
      await navigator.clipboard.writeText(currentUrl)
      setCopied(true)
      setTimeout(()=>setCopied(false), 1500)
    }catch(e){
      console.error("Copy failed", e)
    }
  }

  if(!isOpen){
    return (
      <button
        onClick={()=>setIsOpen(true)}
        style={{
          position:"fixed", top:80, left:16, zIndex:9999,
          background:"#2563eb", color:"#fff", border:"none", borderRadius:8, padding:"8px 12px",
          boxShadow:"0 6px 18px rgba(0,0,0,.15)", cursor:"pointer", fontSize:13
        }}
      >
        Show Instructions
      </button>
    )
  }

  return (
    <div
      style={{
        position:"fixed", top:80, left:16, zIndex:9999,
        width:340, background:"#fff", borderRadius:12, padding:16,
        boxShadow:"0 12px 30px rgba(0,0,0,.2)", fontFamily:"system-ui, Arial, sans-serif"
      }}
    >
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8}}>
        <div style={{fontWeight:700, fontSize:16, color:"#0f172a"}}>How to Participate</div>
        <button
          onClick={()=>setIsOpen(false)}
          aria-label="Close"
          style={{border:"none", background:"transparent", cursor:"pointer", fontSize:18, lineHeight:1}}
        >×</button>
      </div>

      <ol style={{paddingLeft:16, margin:"8px 0 12px 0", color:"#334155", fontSize:14}}>
        <li style={{marginBottom:6}}>Click anywhere on the map to drop your pin</li>
        <li style={{marginBottom:6}}>Enter your <b>name</b>, optional city/country, and today’s <b>weather</b></li>
        <li>Watch everyone’s pins appear in real time (we’ll turn this on next)</li>
      </ol>

      <div style={{borderTop:"1px solid #e2e8f0", paddingTop:12}}>
        <div style={{fontWeight:600, fontSize:13, color:"#0f766e", marginBottom:8}}>Share this page</div>
        <div style={{display:"flex", gap:8}}>
          <button
            onClick={handleCopy}
            style={{
              flex:1, border:"1px solid #cbd5e1", background:"#fff", borderRadius:8, padding:"8px 10px",
              cursor:"pointer", fontSize:13
            }}
          >
            {copied? "Copied!" : "Copy Link"}
          </button>
          <button
            onClick={()=>setShowQR((s)=>!s)}
            style={{border:"1px solid #cbd5e1", background:"#fff", borderRadius:8, padding:"8px 10px", cursor:"pointer", fontSize:13}}
          >
            {showQR? "Hide QR" : "QR Code"}
          </button>
        </div>

        {showQR&&(
          <div style={{marginTop:12, textAlign:"center", border:"1px solid #e2e8f0", borderRadius:8, padding:12}}>
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(currentUrl)}`}
              alt="QR to join"
              width={200} height={200}
              style={{display:"block", margin:"0 auto"}}
            />
            <div style={{fontSize:12, color:"#64748b", marginTop:6}}>Scan to join on mobile</div>
          </div>
        )}
      </div>

      <div style={{background:"#eff6ff", border:"1px solid #dbeafe", color:"#1e3a8a", borderRadius:8, padding:8, fontSize:12, marginTop:12}}>
        <b>Host tip:</b> share the link in Zoom chat or show the QR; screen-share this page while people add their pins.
      </div>
    </div>
  )
}