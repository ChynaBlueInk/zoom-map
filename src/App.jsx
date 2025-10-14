import {useEffect, useState} from "react"
import {createClient} from "../lib/supabase/client"

export default function App(){
  const [status, setStatus]=useState("Checking Supabase…")

  useEffect(()=>{
    const run=async()=>{
      try{
        const supabase=createClient()
        const {data, error}=await supabase.from("location_pins").select("*").limit(1)
        if(error){ setStatus("Supabase reachable, query error: "+error.message); return }
        setStatus("OK: Supabase reachable"+(data?.length?" and table has rows":" (no rows yet)"))
      }catch(err){
        setStatus("Cannot reach Supabase: "+(err?.message||String(err)))
      }
    }
    run()
  },[])

  return (
    <div style={{height:"100vh", display:"grid", placeItems:"center", fontFamily:"system-ui"}}>
      <div>
        <h1 style={{marginBottom:8}}>Supabase Connectivity Test</h1>
        <code>{status}</code>
      </div>
    </div>
  )
}
