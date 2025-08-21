"use client";

import { useEffect, useState } from "react";
import { db } from "../firebase";
import { collection, getDocs, deleteDoc, doc, updateDoc, onSnapshot } from "firebase/firestore";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pie, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement
} from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement);

export default function VistaAdmin() {
  const router = useRouter();

  const [usuarios, setUsuarios] = useState([]);
  const [citas, setCitas] = useState([]);
  const [logs, setLogs] = useState([]);
  const [selectedView, setSelectedView] = useState("graficas");
  const [filtroCitas, setFiltroCitas] = useState("hoy");
  const [editarModal, setEditarModal] = useState({ abierto: false, usuario: null });
  const [editarCita, setEditarCita] = useState(null);
  const [fechaFiltro, setFechaFiltro] = useState("");
  const [buscarTexto, setBuscarTexto] = useState("");
  const [filtroLogs, setFiltroLogs] = useState("hoy"); 
const [fechaFiltroLogs, setFechaFiltroLogs] = useState("");

  const hoy = new Date();

  const parseFecha = (valor) => {
    if (!valor) return null;
    if (typeof valor === "object" && typeof valor.toDate === "function") {
      const d = valor.toDate();
      d.setHours(0, 0, 0, 0);
      return d;
    }
    if (typeof valor === "number") {
      const d = new Date(valor);
      if (!isNaN(d)) { d.setHours(0,0,0,0); return d; }
      return null;
    }
    if (typeof valor === "string") {
      const s = valor.trim();
      const t = s.replace(/\//g, "-");
      const parts = t.split("-").map(p => p.trim());
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          const [yy, mm, dd] = parts.map(Number);
          const d = new Date(yy, (mm || 1) - 1, dd || 1);
          if (!isNaN(d)) { d.setHours(0,0,0,0); return d; }
        } else {
          const [dd, mm, yy] = parts.map(Number);
          const d = new Date(yy, (mm || 1) - 1, dd || 1);
          if (!isNaN(d)) { d.setHours(0,0,0,0); return d; }
        }
      }
      const d = new Date(s);
      if (!isNaN(d)) { d.setHours(0,0,0,0); return d; }
    }
    return null;
  };

// USUARIOS en tiempo real
useEffect(() => {
  const unsub = onSnapshot(collection(db, "usuarios"), (snapshot) => {
    const usuariosData = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        username: data.username || "(Sin nombre)",
        email: data.email || "",
        password: data.password || ""
      };
    });
    setUsuarios(usuariosData);
  });
  return () => unsub();
}, []);

// CITAS en tiempo real
useEffect(() => {
  const unsub = onSnapshot(collection(db, "pacientes"), (snapshot) => {
    const citasData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setCitas(citasData);
  });
  return () => unsub();
}, []);
  // 🔹 Cambiado para actualizar logs en tiempo real
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "logs"), (snapshot) => {
      const logsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Ordenar por fecha más reciente primero
      logsData.sort((a, b) => {
        const fechaA = a.fecha?.toDate ? a.fecha.toDate() : new Date(a.fecha);
        const fechaB = b.fecha?.toDate ? b.fecha.toDate() : new Date(b.fecha);
        return fechaB - fechaA;
      });
      setLogs(logsData);
    });
    return () => unsub();
  }, []);

  // FUNCIONES
  const eliminarUsuario = async (id) => {
    if (confirm("¿Eliminar este usuario?")) {
      await deleteDoc(doc(db, "usuarios", id));
      setUsuarios(usuarios.filter(u => u.id !== id));
    }
  };

  const eliminarCita = async (id) => {
    if (confirm("¿Eliminar esta cita?")) {
      await deleteDoc(doc(db, "pacientes", id));
    }
  };

  const editarUsuario = (usuario) => {
    setEditarModal({ abierto: true, usuario });
  };

  const guardarEdicion = async () => {
    const { usuario } = editarModal;
    if (!usuario) return;
    const ref = doc(db, "usuarios", usuario.id);
    await updateDoc(ref, { username: usuario.username, email: usuario.email });
    setUsuarios(usuarios.map(u => u.id === usuario.id ? usuario : u));
    setEditarModal({ abierto: false, usuario: null });
  };

  const recuperarPassword = async (usuario) => {
    const nuevaPass = prompt("Ingrese nueva contraseña para " + usuario.username);
    if (!nuevaPass) return;
    const ref = doc(db, "usuarios", usuario.id);
    await updateDoc(ref, { password: nuevaPass });
    alert("Contraseña actualizada correctamente");
  };

  const guardarEdicionCita = async (cita) => {
    if (!cita) return;
    const ref = doc(db, "pacientes", cita.id);
    await updateDoc(ref, { 
      nombre: cita.nombre, 
      telefono: cita.telefono, 
      fecha: cita.fecha, 
      horaInicio: cita.horaInicio, 
      horaFin: cita.horaFin, 
      imagenes: cita.imagenes || [] 
    });
    setCitas(citas.map(c => c.id === cita.id ? cita : c));
    setEditarCita(null);
  };

  // FILTRO CITAS
  const citasFiltradas = citas
    .filter(c => {
      const fechaCita = parseFecha(c.fecha);
      if (!fechaCita) return false;

      let fechaMatch = false;
      if (filtroCitas === "hoy") {
        const hoy0 = new Date();
        hoy0.setHours(0,0,0,0);
        fechaMatch = fechaCita.getTime() === hoy0.getTime();
      } else if (filtroCitas === "manana") {
        const manana0 = new Date();
        manana0.setHours(0,0,0,0);
        manana0.setDate(manana0.getDate()+1);
        fechaMatch = fechaCita.getTime() === manana0.getTime();
      } else if (filtroCitas === "todos") fechaMatch = true;
      else if (filtroCitas === "fecha" && fechaFiltro) {
        const [year, month, day] = fechaFiltro.split("-").map(Number);
        const f = new Date(year, month - 1, day);
        f.setHours(0,0,0,0);
        fechaMatch = fechaCita.getTime() === f.getTime();
      }

      const buscarMatch = (c.nombre?.toLowerCase() || "").includes(buscarTexto.toLowerCase()) || 
                    (c.telefono && c.telefono.toString().includes(buscarTexto));

      return fechaMatch && buscarMatch;
    })
    .sort((a, b) => {
      const fechaA = parseFecha(a.fecha);
      const fechaB = parseFecha(b.fecha);

      if (!fechaA || !fechaB) return 0;

      // Primero ordenar por fecha
      if (fechaA.getTime() !== fechaB.getTime()) return fechaA - fechaB;

      // Si la fecha es igual, ordenar por horaInicio
      const [ha, ma] = a.horaInicio?.split(":").map(Number) || [0,0];
      const [hb, mb] = b.horaInicio?.split(":").map(Number) || [0,0];
      return ha - hb || ma - mb;
    });

  // DATOS GRAFICAS
  const diasMes = Array.from({ length: 31 }, (_, i) => (i + 1).toString());
  const citasMes = Array(31).fill(0);
  citas.forEach(c => {
    const fecha = parseFecha(c.fecha);
    if (fecha && fecha.getMonth() === hoy.getMonth() && fecha.getFullYear() === hoy.getFullYear()) {
      const dia = fecha.getDate();
      if (dia >= 1 && dia <= 31) citasMes[dia - 1] += 1;
    }
  });
  const dataCitasMes = { labels: diasMes, datasets: [{ label: "Citas mes", data: citasMes, backgroundColor: "#3b82f6" }] };

  const horas = Array.from({length:8},(_,i)=>8+i);
  const citasPorHora = Array(8).fill(0);
  citas.forEach(c=>{
    const hora = parseInt(c.horaInicio?.split(":")[0]);
    if(!isNaN(hora) && hora>=8 && hora<16) citasPorHora[hora-8]+=1;
  });
  const coloresPastel = ["#f87171","#fbbf24","#34d399","#60a5fa","#a78bfa","#f472b6","#faa215ff","#2dd4bf"];
  const dataCitasHora = { labels: horas.map(h=>`${h}:00`), datasets:[{label:"Citas por hora", data:citasPorHora, backgroundColor:coloresPastel, borderWidth:0}] };

  const menuItems = [
    { view:"graficas", label:"Gráficas" },
    { view:"usuarios", label:"Usuarios" },
    { view:"citas", label:"Citas" },
    { view:"logs", label:"Historial" },
    {view:"dashboard", label:"Registrar",href:"/dashboard?origen=admin"}
  ];

  const menuItemStyle = (active)=>( {
    display:"flex", alignItems:"center", gap:10, padding:"10px 15px",
    borderRadius:6, backgroundColor:active?"#2563eb":"transparent", cursor:"pointer",
    color:"#fff", fontWeight:active?"bold":"normal"
  });

  const renderIcon = (view) => { /* ...el mismo código de icons... */ };

  const handleLogout = () => {
    const ok = confirm("¿Seguro que quieres salir?");
    if (ok) {
      router.push("/login");
    }
  };

  return (
    <div style={{ display:"flex", height:"100vh", fontFamily:"Arial, sans-serif" }}>
      {/* MENU LATERAL */}
      <div style={{ width:220, backgroundColor:"#1e40af", color:"#fff", display:"flex", flexDirection:"column", padding:20, gap:15 }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:10, marginBottom:10, border:"2px solid #fff", borderRadius:10, padding:10, backgroundColor:"#1e3a8a" }}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="white" aria-hidden>
            <circle cx="12" cy="8" r="4"/>
            <path d="M4 20c0-4 8-4 8-4s8 0 8 4v1H4v-1z"/>
          </svg>
          <h2 style={{ margin:0, fontSize:22 }}>Administrador</h2>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {menuItems.map(item => (
            item.href ? (
              <Link 
                key={item.view} 
                href={item.href} 
                style={{ ...menuItemStyle(selectedView===item.view), textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}
                onClick={() => setSelectedView(item.view)}
              >
                {renderIcon(item.view)}
                <span>{item.label}</span>
              </Link>
            ) : (
              <div 
                key={item.view} 
                onClick={() => setSelectedView(item.view)} 
                style={menuItemStyle(selectedView===item.view)}
                role="button"
              >
                {renderIcon(item.view)}
                <span>{item.label}</span>
              </div>
            )
          ))}
        </div>

        {/* BOTÓN CERRAR SESIÓN AL FINAL */}
        <button 
          onClick={handleLogout} 
          style={{ 
            marginTop: "auto", 
            padding: "10px", 
            borderRadius: 6, 
                width: 40,
    height: 40,
            color: "#fff", 
            border: "none", 
            cursor: "pointer", 
            display: "flex", 
            alignItems: "center", 
            gap: 8 
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="white" width="20" height="20" viewBox="0 0 24 24" aria-hidden>
            <path d="M16 13v-2H7V8l-5 4 5 4v-3h9zM20 3h-8v2h8v14h-8v2h8c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/>
          </svg>
        </button>
      </div>

      {/* CONTENIDO */}
      <div style={{ flex:1, backgroundColor:"#ffffffff", padding:30, overflowY:"auto", display:"block" }}>
        {/* GRAFICAS */}
        {selectedView==="graficas" && (
          <div style={{ display:"flex", flexDirection:"column", gap:30, width:"100%", alignItems:"center" }}>
            <div style={{ width:800, height:400, background:"#f3f4f6", padding:25, borderRadius:12, boxShadow:"0 6px 18px rgba(0,0,0,0.06)" }}>
              <h3 style={{color:"#000"}}>Citas registradas este mes</h3>
       <Bar
  data={dataCitasMes}
  width={800}
  height={400}
  options={{
    responsive: false,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    layout: {
      padding: {
        left: 40, // espacio extra a la izquierda para los números
        right: 10,
        top: 10,
        bottom: 10
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1
        }
      }
    }
  }}
/>
            </div>

            <div style={{ width:800, height:450, background:"#f3f4f6", padding:25, borderRadius:12, boxShadow:"0 6px 18px rgba(0,0,0,0.06)", display:"flex", gap:20 }}>
              <div style={{ flex:2, height:"100%" }}>
                <h3 style={{color:"#000"}}>Citas registradas totales</h3>
                <Pie 
                  data={dataCitasHora} 
                  width={450} 
                  height={400} 
                  options={{ responsive:false, maintainAspectRatio:false, plugins:{ legend: { display: false } } }} 
                />
              </div>
              <div style={{ flex:1, display:"flex", flexDirection:"column", justifyContent:"center", gap:10 }}>
                {dataCitasHora.labels.map((label,i)=>(
                  <div key={i} style={{ display:"flex", alignItems:"center", gap:10 }}>
                    <div style={{ width:20, height:20, backgroundColor:coloresPastel[i], borderRadius:4 }}></div>
                    <span style={{color:"#000"}}>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {/* USUARIOS */}
        {selectedView==="usuarios" && (
          <div>
            <h2 style={{color:"#000"}}>Usuarios registrados</h2>
            <div style={{ marginBottom:15, display:"flex", justifyContent:"flex-end" }}>
              <input type="text" placeholder="Buscar..." value={buscarTexto} onChange={e=>{ setBuscarTexto(e.target.value); }} style={{ padding:"5px 10px", borderRadius:6, border:"1px solid #ccc" }}/>
            </div>
            <div style={{ background:"#f3f4f6", padding:20, borderRadius:10, boxShadow:"0 2px 8px rgba(0,0,0,0.1)" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", color:"#000" }}>
                <thead style={{ background:"#2563eb", color:"#fff" }}>
                  <tr>
                    <th style={{ padding:10, width:"40%", border:"1px solid #e5e7eb" }}>Nombre</th>
                    <th style={{ padding:10, width:"35%", border:"1px solid #e5e7eb" }}>Email</th>
                    <th style={{ padding:10, width:"25%", border:"1px solid #e5e7eb" }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios
  .filter(u => (u.username?.toLowerCase() || "").includes(buscarTexto.toLowerCase()) || 
               (u.email?.toLowerCase() || "").includes(buscarTexto.toLowerCase()))
                    .map(u=>(
                    <tr key={u.id} style={{borderBottom:"1px solid #e5e7eb"}}>
                      <td style={{padding:10}}>{u.username || "(Sin nombre)"}</td>
                      <td>{u.email}</td>
                      <td style={{ display:"flex", gap:10, justifyContent:"center", alignItems:"center" }}>
                        <button onClick={()=>eliminarUsuario(u.id)} style={{background:"#ef4444", border:"none", borderRadius:6, padding:6, cursor:"pointer"}} title="Eliminar">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="white" viewBox="0 0 24 24" width="16" height="16">
                            <path d="M9 3V4H4V6H5V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V6H20V4H15V3H9ZM7 6H17V19H7V6ZM9 8V17H11V8H9ZM13 8V17H15V8H13Z"/>
                          </svg>
                        </button>
                        <button onClick={()=>editarUsuario(u)} style={{background:"#3b82f6", border:"none", borderRadius:6, padding:6, cursor:"pointer"}} title="Editar">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="white" width="16" height="16" viewBox="0 0 24 24">
                            <path d="M3 17.25V21h3.75l11.06-11.06-3.75-3.75L3 17.25zm18.71-11.04c.39-.39.39-1.02 0-1.41l-2.5-2.5a.996.996 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.99-1.99z"/>
                          </svg>
                        </button>
                        <button onClick={()=>recuperarPassword(u)} style={{background:"#10b981", border:"none", borderRadius:6, padding:6, cursor:"pointer"}} title="Recuperar contraseña">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="white" width="16" height="16" viewBox="0 0 24 24">
                            <path d="M12 4a8 8 0 018 8h-2a6 6 0 10-6 6v-3l4 4-4 4v-3a8 8 0 010-16z"/>
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* CITAS */}
        {selectedView === "citas" && (
          <div>
            <h2 style={{ color: "#000" }}>Citas</h2>
            <div style={{ display: "flex", gap: 10, marginBottom: 15, alignItems: "center" }}>
              <select value={filtroCitas} onChange={e => setFiltroCitas(e.target.value)} style={{ padding: 5, borderRadius: 6 }}>
                <option value="hoy">Hoy</option>
                <option value="manana">Mañana</option>
                <option value="todos">Todos</option>
                <option value="fecha">Por fecha</option>
              </select>
              {filtroCitas === "fecha" && (
                <input type="date" value={fechaFiltro} onChange={e => setFechaFiltro(e.target.value)} style={{ padding: 5, borderRadius: 6 }} />
              )}
              <input type="text" placeholder="Buscar..." value={buscarTexto} onChange={e => setBuscarTexto(e.target.value)} style={{ padding: 5, borderRadius: 6, flex: 1 }} />
            </div>
            <div style={{ background: "#f3f4f6", padding: 20, borderRadius: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", color: "#000" }}>
                <thead style={{ background: "#2563eb", color: "#fff" }}>
                  <tr>
                    <th style={{ padding: 10 }}>Nombre</th>
                    <th style={{ padding: 10 }}>Teléfono</th>
                    <th style={{ padding: 10 }}>Fecha</th>
                    <th style={{ padding: 10 }}>Hora</th>
                    <th style={{ padding: 10 }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {citasFiltradas.map(c => (
                    <tr key={c.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                      <td style={{ padding: 10 }}>{c.nombre}</td>
                      <td>{c.telefono}</td>
                     <td>{c.fecha ? (() => {
  const d = parseFecha(c.fecha);
  if (!d) return c.fecha;
  const dd = String(d.getDate()).padStart(2,"0");
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
})() : ""}</td>

                      <td>{c.horaInicio} - {c.horaFin}</td>
                      <td style={{ display: "flex", gap: 10, justifyContent: "center", alignItems: "center" }}>
                        <button onClick={() => setEditarCita(c)} style={{ background: "#3b82f6", border: "none", borderRadius: 6, padding: 6, cursor: "pointer" }} title="Editar">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="white" width="16" height="16" viewBox="0 0 24 24">
                            <path d="M3 17.25V21h3.75l11.06-11.06-3.75-3.75L3 17.25zm18.71-11.04c.39-.39.39-1.02 0-1.41l-2.5-2.5a.996.996 0 00-1.41 0l-1.83 1.83 3.75 3.75 1.99-1.99z"/>
                          </svg>
                        </button>
                        <button onClick={() => eliminarCita(c.id)} style={{ background: "#ef4444", border: "none", borderRadius: 6, padding: 6, cursor: "pointer" }} title="Eliminar">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="white" viewBox="0 0 24 24" width="16" height="16">
                            <path d="M9 3V4H4V6H5V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V6H20V4H15V3H9ZM7 6H17V19H7V6ZM9 8V17H11V8H9ZM13 8V17H15V8H13Z"/>
                          </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
{selectedView === "logs" && (
  <div>
    <h2 style={{ color: "#000" }}>Historial de acciones</h2>

    {/* FILTRO DE LOGS */}
    <div style={{ display: "flex", gap: 10, marginBottom: 15, alignItems: "center" }}>
      <select value={filtroLogs} onChange={e => setFiltroLogs(e.target.value)} style={{ padding: 5, borderRadius: 6 }}>
        <option value="hoy">Hoy</option>
        <option value="todos">Todos</option>
        <option value="fecha">Por fecha</option>
      </select>
      {filtroLogs === "fecha" && (
        <input type="date" value={fechaFiltroLogs} onChange={e => setFechaFiltroLogs(e.target.value)} style={{ padding: 5, borderRadius: 6 }} />
      )}
    </div>

    <div style={{ background: "#f3f4f6", padding: 20, borderRadius: 10, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", color: "#000" }}>
        <thead style={{ background: "#2563eb", color: "#fff" }}>
          <tr>
            <th style={{ padding: 10 }}>Usuario</th>
            <th style={{ padding: 10 }}>Acción</th>
            <th style={{ padding: 10 }}>Fecha</th>
          </tr>
        </thead>
        <tbody>
          {logs
            .filter(l => {
              const fechaLog = l.fecha?.toDate ? l.fecha.toDate() : new Date(l.fecha);
              if (!fechaLog) return false;

              const hoy0 = new Date();
              hoy0.setHours(0, 0, 0, 0);

              if (filtroLogs === "hoy") return fechaLog.setHours(0, 0, 0, 0) === hoy0.getTime();
              if (filtroLogs === "fecha" && fechaFiltroLogs) {
                const [year, month, day] = fechaFiltroLogs.split("-").map(Number);
                const f = new Date(year, month - 1, day);
                f.setHours(0, 0, 0, 0);
                return fechaLog.setHours(0, 0, 0, 0) === f.getTime();
              }
              return true; // todos
            })
            .sort((a, b) => {
              const fechaA = a.fecha?.toDate ? a.fecha.toDate() : new Date(a.fecha);
              const fechaB = b.fecha?.toDate ? b.fecha.toDate() : new Date(b.fecha);
              return fechaB - fechaA;
            })
            .map(l => (
              <tr key={l.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                <td style={{ padding: 10 }}>{l.usuarioNombre || l.detalles?.usuarioNombre || l.detalles?.username || "(Sin nombre)"}</td>
                <td style={{ padding: 10 }}>{l.accion}</td>
                <td style={{ padding: 10 }}>
                  {l.fecha?.toDate ? (() => {
                    const d = l.fecha.toDate();
                    const dd = String(d.getDate()).padStart(2, "0");
                    const mm = String(d.getMonth() + 1).padStart(2, "0");
                    const yyyy = d.getFullYear();
                    const hh = String(d.getHours()).padStart(2, "0");
                    const min = String(d.getMinutes()).padStart(2, "0");
                    return `${dd}-${mm}-${yyyy} ${hh}:${min}`;
                  })() : l.fecha}
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  </div>
)}

      </div>

      {/* MODAL EDITAR USUARIO */}
      {editarModal.abierto && (
        <div style={{ color:"#000",position:"fixed", top:0,left:0,right:0,bottom:0, background:"rgba(0,0,0,0.4)", display:"flex", justifyContent:"center", alignItems:"center" }}>
          <div style={{ background:"#fff", padding:30, borderRadius:10, width:400, display:"flex", flexDirection:"column", gap:15 }}>
            <h3>Editar usuario</h3>
            <input type="text" value={editarModal.usuario.username} onChange={e=>setEditarModal({ ...editarModal, usuario:{ ...editarModal.usuario, username:e.target.value }})} style={{ padding:5, borderRadius:6, border:"1px solid #ccc" }} placeholder="Nombre"/>
            <input type="text" value={editarModal.usuario.email} onChange={e=>setEditarModal({ ...editarModal, usuario:{ ...editarModal.usuario, email:e.target.value }})} style={{ padding:5, borderRadius:6, border:"1px solid #ccc" }} placeholder="Email"/>
            <div style={{ display:"flex", justifyContent:"flex-end", gap:10 }}>
              <button onClick={()=>setEditarModal({ abierto:false, usuario:null })} style={{ padding:"5px 10px", borderRadius:6, border:"none", background:"#ef4444", color:"#fff" }}>Cancelar</button>
              <button onClick={guardarEdicion} style={{ padding:"5px 10px", borderRadius:6, border:"none", background:"#3b82f6", color:"#fff" }}>Guardar</button>
            </div>
          </div>
        </div>
      )}

      {editarCita && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: 20,
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 10,
              width: 400,
              maxHeight: "90vh", // máximo 90% de la altura de la pantalla
              display: "flex",
              flexDirection: "column",
              overflowY: "auto", // scroll dentro del modal
              padding: 20,
              gap: 15,
            }}
          >
            <h3 style={{color:"#000"}}>Editar cita</h3>
            <input type="text" value={editarCita.nombre} onChange={e=>setEditarCita({...editarCita, nombre:e.target.value})} style={{ padding:5, borderRadius:6, border:"1px solid #ccc",fontSize:"18px" }} placeholder="Nombre"/>
            <input type="text" value={editarCita.telefono} onChange={e=>setEditarCita({...editarCita, telefono:e.target.value})} style={{ padding:5, borderRadius:6, border:"1px solid #ccc",fontSize:"18px" }} placeholder="Teléfono"/>
            <input type="date" value={editarCita.fecha} onChange={e=>setEditarCita({...editarCita, fecha:e.target.value})} style={{ padding:5, borderRadius:6, border:"1px solid #ccc",fontSize:"18px" }}/>
            <input type="time" value={editarCita.horaInicio} onChange={e=>setEditarCita({...editarCita, horaInicio:e.target.value})} style={{ padding:5, borderRadius:6, border:"1px solid #ccc",fontSize:"18px"  }}/>
            <input type="time" value={editarCita.horaFin} onChange={e=>setEditarCita({...editarCita, horaFin:e.target.value})} style={{ padding:5, borderRadius:6, border:"1px solid #ccc",fontSize:"18px"  }}/>
                 {/* IMÁGENES */}
            <div>
              <h4 style={{color:"#000"}}>Imágenes</h4>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                {editarCita.imagenes?.map((base64, i) => (
                  <div key={i} style={{ position: "relative", width: 80, height: 80 }}>
                    <img src={base64} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 6 }} />
                    <button
                      onClick={() => {
                        setEditarCita({
                          ...editarCita,
                          imagenes: editarCita.imagenes.filter((_, idx) => idx !== i),
                        });
                      }}
                      style={{
                        position: "absolute",
                        top: -5,
                        right: -5,
                        background: "#ef4444",
                        border: "none",
                        borderRadius: "50%",
                        width: 20,
                        height: 20,
                        color: "#fff",
                        fontWeight: "bold",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                      }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={e => {
                  const files = Array.from(e.target.files);
                  files.forEach(file => {
                    const reader = new FileReader();
                    reader.onload = ev => {
                      const base64 = ev.target.result;
                      setEditarCita({
                        ...editarCita,
                        imagenes: [...(editarCita.imagenes || []), base64],
                      });
                    };
                    reader.readAsDataURL(file);
                  });
                }}
                style={{ marginTop: 10 }}
              />
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
              <button onClick={() => setEditarCita(null)} style={{ padding: "6px 12px" }}>Cancelar</button>
              <button onClick={() => guardarEdicionCita(editarCita)} style={{ padding: "6px 12px", background: "#3b82f6", color: "#fff", border: "none" }}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
