import {useState} from "react"
import {MapView} from "../components/map-view"
import {InstructionsPanel} from "../components/instructions-panel"
import {StatsPanel} from "../components/stats-panel"
import {ResetSessionButton} from "../components/reset-session-button"   // <-- add this

export default function App(){
  const [pins, setPins]=useState([])

  return (
    <div style={{height:"100vh", display:"flex", flexDirection:"column"}}>
      <header style={{background:"linear-gradient(90deg,#2563eb,#0d9488)", color:"#fff", padding:"16px"}}>
        <h1 style={{margin:0, textAlign:"center"}}>Welcome to Our Session! 🌏</h1>
        <p style={{margin:0, marginTop:"6px", textAlign:"center", opacity:0.9}}>Click anywhere on the map to show your location</p>
      </header>
      <main style={{position:"relative", flex:1}}>
        <MapView pins={pins} setPins={setPins}/>
        <InstructionsPanel/>
        <StatsPanel pins={pins}/>
        <ResetSessionButton onReset={()=>setPins([])}/>   {/* <-- add this */}
      </main>
    </div>
  )
}
