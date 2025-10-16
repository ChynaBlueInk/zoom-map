"use client"

type Pin={lat:number; lng:number; name:string; city?:string; country?:string; weather?:string}
export function StatsPanel({pins}:{pins:Pin[]|undefined}){
  const byCountry:Record<string, number>={}
  ;(pins||[]).forEach((p)=>{ if(p.country){ byCountry[p.country]=(byCountry[p.country]||0)+1 } })
  const entries=Object.entries(byCountry).sort((a,b)=>b[1]-a[1])
  const total=(pins||[]).length
  const max=entries[0]?.[1]||1

  return (
    <div style={{
      position:"fixed", top:16, right:16, zIndex:9999, width:320,
      background:"#fff", borderRadius:12, padding:16, boxShadow:"0 12px 30px rgba(0,0,0,.2)",
      fontFamily:"system-ui, Arial, sans-serif"
    }}>
      <div style={{fontWeight:700, fontSize:14, marginBottom:8}}>Live Stats</div>
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

      {/* Simple calligram-style sizing */}
      {entries.length>0&&(
        <div style={{
          marginTop:12, padding:8, background:"#f8fafc", border:"1px solid #e2e8f0", borderRadius:8,
          display:"flex", flexWrap:"wrap", gap:8, alignItems:"baseline"
        }}>
          {entries.map(([country, count])=>{
            const size=12+Math.round((count/max)*16) // 12–28px
            return (
              <span key={country} style={{fontSize:size, fontWeight:600, color:"#1f2937"}}>
                {country}
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}
