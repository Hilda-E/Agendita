"use client";
import React, { useState, useEffect } from "react";
import { db } from "../firebase";
import { useRouter, useSearchParams } from "next/navigation";
import { collection, query, where, getDocs, deleteDoc, doc, getDoc, addDoc } from "firebase/firestore";

export default function Horario() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fechaParam = searchParams.get("fecha");
  const fecha = fechaParam || ""; // <- proteccion contra null

  const [horaInicio, setHoraInicio] = useState("");
  const [horaFin, setHoraFin] = useState("");
  const [error, setError] = useState("");
  const [citas, setCitas] = useState([]);
  const [agrupadas, setAgrupadas] = useState({});
  const [expandedHora, setExpandedHora] = useState(null);
  const [detallePacienteId, setDetallePacienteId] = useState(null);
  const [imagenAmpliada, setImagenAmpliada] = useState(null);

  useEffect(() => {
    if (!fecha) return;
    const fetchCitas = async () => {
      try {
        const fechaFirestore = fecha.split("-").reverse().join("-");
        const valuesToCheck = [fecha, fechaFirestore].filter(Boolean);
        const q = query(collection(db, "pacientes"), where("fecha", "in", valuesToCheck));
        const snapshot = await getDocs(q);

        const citasDia = [];
        snapshot.forEach((docu) => {
          const data = docu.data();
          citasDia.push({
            id: docu.id,
            nombre: data.nombre || "Paciente",
            edad: data.edad || "No especificada",
            sexo: data.sexo || "No especificado",
            patologia: data.patologia || "No especificada",
            imagenes: data.imagenes || [],
            horaInicio: data.horaInicio || "",
            horaFin: data.horaFin || "",
          });
        });

        if (citasDia.length === 0) {
          const fallbackSnap = await getDocs(collection(db, "pacientes"));
          const fallback = [];
          fallbackSnap.forEach((docu) => {
            const data = docu.data();
            const f = data.fecha || "";
            if (f === fecha || f === fechaFirestore) {
              fallback.push({
                id: docu.id,
                nombre: data.nombre || "Paciente",
                edad: data.edad || "No especificada",
                sexo: data.sexo || "No especificado",
                patologia: data.patologia || "No especificada",
                imagenes: data.imagenes || [],
                horaInicio: data.horaInicio || "",
                horaFin: data.horaFin || "",
              });
            }
          });
          setCitas(fallback);
        } else {
          setCitas(citasDia);
        }
      } catch (err) {
        console.error("Error al obtener citas:", err);
        try {
          const snapshotAll = await getDocs(collection(db, "pacientes"));
          const fechaFirestore = fecha.split("-").reverse().join("-");
          const citasDia = [];
          snapshotAll.forEach((docu) => {
            const data = docu.data();
            if (data.fecha === fecha || data.fecha === fechaFirestore) {
              citasDia.push({
                id: docu.id,
                nombre: data.nombre || "Paciente",
                edad: data.edad || "No especificada",
                sexo: data.sexo || "No especificado",
                patologia: data.patologia || "No especificada",
                imagenes: data.imagenes || [],
                horaInicio: data.horaInicio || "",
                horaFin: data.horaFin || "",
              });
            }
          });
          setCitas(citasDia);
        } catch (err2) {
          console.error("Error en fallback al obtener citas:", err2);
          setCitas([]);
        }
      }
    };
    fetchCitas();
  }, [fecha]);

  useEffect(() => {
    const grupo = {};
    citas.forEach((cita) => {
      if (!cita.horaInicio) return;
      const horaGrupo = cita.horaInicio.split(":")[0].padStart(2, "0");
      if (!grupo[horaGrupo]) grupo[horaGrupo] = [];
      grupo[horaGrupo].push(cita);
    });
    Object.keys(grupo).forEach((hora) => {
      grupo[hora].sort((a, b) => (a.horaInicio > b.horaInicio ? 1 : -1));
    });
    setAgrupadas(grupo);
  }, [citas]);

  const horasFijas = [];
  for (let h = 8; h <= 15; h++) horasFijas.push(String(h).padStart(2, "0"));

  const validarHora = (hora) => {
    if (!/^\d{2}:\d{2}$/.test(hora)) return false;
    const [h, m] = hora.split(":").map(Number);
    if (h < 8 || h > 16) return false;
    if (m < 0 || m > 59) return false;
    if (h === 16 && m > 0) return false;
    return true;
  };

  const handleGuardar = (e) => {
    e.preventDefault();
    if (!horaInicio || !horaFin) {
      setError("Debes seleccionar hora de inicio y fin");
      return;
    }
    if (!validarHora(horaInicio) || !validarHora(horaFin)) {
      setError("Horario fuera del rango permitido (08:00 a 16:00)");
      return;
    }
    if (horaFin <= horaInicio) {
      setError("La hora fin debe ser mayor que la hora inicio");
      return;
    }
    setError("");
    router.push(
      `/RPaciente?fecha=${encodeURIComponent(fecha ? fecha.split("-").reverse().join("-") : "")}&horaInicio=${encodeURIComponent(horaInicio)}&horaFin=${encodeURIComponent(horaFin)}`
    );
  };

  const handleEditar = (id) => {
    const cita = citas.find(c => c.id === id);
    if (!cita) return;
    router.push(
      `/RPaciente?id=${encodeURIComponent(id)}&origen=citas&fecha=${encodeURIComponent(fecha || "")}&horaInicio=${encodeURIComponent(cita.horaInicio)}&horaFin=${encodeURIComponent(cita.horaFin)}`
    );
  };

  const handleEliminar = async (id) => {
    const confirma = confirm("¿Eliminar esta cita? Esta acción no se puede deshacer.");
    if (!confirma) return;
    try {
      // Obtener datos de la cita antes de eliminar
      const docRef = doc(db, "pacientes", id);
      const docSnap = await getDoc(docRef);
      let nombrePaciente = "Paciente desconocido";
      if (docSnap.exists()) {
        const data = docSnap.data();
        nombrePaciente = data.nombre || "Paciente desconocido";
      }

      await deleteDoc(docRef);
      setCitas((prev) => prev.filter((c) => c.id !== id));
      if (detallePacienteId === id) setDetallePacienteId(null);
      alert("Cita eliminada.");

      // --- REGISTRAR LOG ---
      const usuarioNombre = localStorage.getItem("username") || "Desconocido";
      await addDoc(collection(db, "logs"), {
        usuarioNombre,
        accion: `Eliminó cita del paciente: ${nombrePaciente}`,
        pacienteId: id,
        nombrePaciente,
        fecha: new Date() 
      });
    } catch (err) {
      console.error("Error eliminando cita:", err);
      alert("Ocurrió un error al eliminar. Reintenta.");
    }
  };

  return (
    <>
      <div style={{ maxWidth: 1100, margin: "80px auto 0", padding: 20, display: "flex", gap: 40, alignItems: "flex-start" }}>
        <div style={{ width: 520, backgroundColor: "#fff", padding: "60px 60px", borderRadius: 10, boxShadow: "0 2px 6px rgba(0,0,0,0.1)", display: "flex", flexDirection: "column", alignItems: "stretch" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 10, flexWrap: "wrap",  position: "relative",  }}>
            <button
              onClick={() => router.push("/dashboard")}
              className="btn-volver"
              aria-label="Volver a dashboard"
              title="Volver"
              style={{ position: "absolute", top: -50, left: -50 }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="white" viewBox="0 0 24 24" width="22" height="22">
                <path d="M15 19l-7-7 7-7" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <h2 style={{ color: "#000", margin: 0, whiteSpace: "nowrap" }}>
              Selecciona la hora para la cita del {fecha ? fecha.split("-").reverse().join("-") : ""}
            </h2>
          </div>

          <form onSubmit={handleGuardar} style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 12 }}>
            <label style={{ color: "#000", display: "flex", flexDirection: "column" }}>
              Hora de inicio:
              <input type="time" value={horaInicio} onChange={(e) => setHoraInicio(e.target.value)} step="60" min="08:00" max="16:00" required style={{ width: "100%", height: 32, marginTop: 4, fontSize: "20px", padding: "8px" }} />
            </label>
            <label style={{ color: "#000", display: "flex", flexDirection: "column" }}>
              Hora de fin:
              <input type="time" value={horaFin} onChange={(e) => setHoraFin(e.target.value)} step="60" min="08:00" max="16:00" required style={{ width: "100%", height: 32, marginTop: 4, fontSize: "20px", padding: "8px" }} />
            </label>
            {error && <p style={{ color: "red", marginTop: 4 }}>{error}</p>}
            <button type="submit" style={{ marginTop: 16, padding: "10px 20px", backgroundColor: "#2563eb", color: "white", border: "none", borderRadius: 6, cursor: "pointer", width: "100%", alignSelf: "stretch" }}>
              Guardar y continuar
            </button>
          </form>
        </div>

        <div style={{ width: 1200, backgroundColor: "#fff", padding: 20, borderRadius: 10, boxShadow: "0 2px 6px rgba(0,0,0,0.1)", maxHeight: "500px", overflowY: "auto", fontSize: "16px" }}>
          <h3 style={{ color: "#000" }}>CITAS YA REGISTRADAS</h3>
          {horasFijas.map((hora) => {
            const citasHora = agrupadas[hora] || [];
            const isExpanded = expandedHora === hora;
            const tieneCitas = citasHora.length > 0;

            return (
              <div key={hora} style={{ marginBottom: 15 }}>
                <button onClick={() => setExpandedHora(isExpanded ? null : hora)} style={{ width: "100%", backgroundColor: tieneCitas ? "#5C2FBC" : "#2563eb", color: "white", padding: "10px 16px", border: "none", borderRadius: 6, fontWeight: "bold", fontSize: 18, display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer", userSelect: "none" }} aria-expanded={isExpanded}>
                  <span>
                    {hora}:00{" "}
                    {tieneCitas && <span style={{ marginLeft: 8, fontWeight: "normal", fontSize: 16, userSelect: "none" }}>({citasHora.length} {citasHora.length === 1 ? "cita" : "citas"})</span>}
                  </span>
                  <span style={{ transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.3s", fontSize: 18, lineHeight: 1 }}>▼</span>
                </button>

                {isExpanded && (
                  <ul style={{ listStyle: "none", padding: 0, marginTop: 8 }}>
                    {citasHora.length === 0 ? (
                      <li style={{ color: "#555", padding: "8px 12px" }}>No hay citas en esta hora.</li>
                    ) : (
                      citasHora.map(({ id, nombre, horaInicio, horaFin, edad, sexo, patologia, imagenes }) => (
                        <li key={id} style={{ padding: "8px 12px", borderBottom: "1px solid #ccc", backgroundColor: "#f9f9f9", borderRadius: 4, marginBottom: detallePacienteId === id ? 8 : 0 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                            <div style={{ flex: 1, color: "#000" }}>
                              <p style={{ margin: 0, wordBreak: "break-word" }}>{nombre}</p>
                            </div>

                            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                              <button onClick={(ev) => { ev.stopPropagation(); setDetallePacienteId(detallePacienteId === id ? null : id); }} style={{ backgroundColor: "#2563eb", color: "white", border: "none", borderRadius: 4, padding: "4px 8px", cursor: "pointer" }}>
                                {detallePacienteId === id ? "Cerrar detalles" : "Ver detalles"}
                              </button>

                              <button title="Editar cita" onClick={(ev) => { ev.stopPropagation(); handleEditar(id); }} style={{ width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8, border: "none", cursor: "pointer", backgroundColor: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M12 20h9" />
                                  <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                                </svg>
                              </button>

                              <button title="Eliminar cita" onClick={(ev) => { ev.stopPropagation(); handleEliminar(id); }} style={{ width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 8, border: "none", cursor: "pointer", backgroundColor: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }}>
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="3 6 5 6 21 6" />
                                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                  <path d="M10 11v6" />
                                  <path d="M14 11v6" />
                                  <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                                </svg>
                              </button>
                            </div>
                          </div>

                          {detallePacienteId === id && (
                            <div style={{ marginTop: 8, backgroundColor: "#f0f9ff", padding: 10, borderRadius: 6, color: "#000", maxHeight: "200px", overflowY: "auto" }}>
                              <p><b>Edad:</b> {edad}</p>
                              <p><b>Sexo:</b> {sexo}</p>
                              <p style={{wordBreak: "break-word",whiteSpace:"normal" }}><b>Patología:</b> {patologia}</p>
                              <p><b>Horario:</b> {horaInicio} a {horaFin || "hora fin no definida"}</p>
                              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", cursor: "pointer" }}>
                                {imagenes?.length > 0 ? imagenes.map((img, i) => (
                                  <img key={i} src={img} alt={`imagen-${i}`} width={100} onClick={() => setImagenAmpliada(img)} style={{ borderRadius: 4, boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
                                )) : <p>No hay imágenes disponibles</p>}
                              </div>
                            </div>
                          )}
                        </li>
                      ))
                    )}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {imagenAmpliada && (
        <div onClick={() => setImagenAmpliada(null)} style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", backgroundColor: "rgba(0,0,0,0.6)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 9999, cursor: "zoom-out" }}>
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: "80vw", maxHeight: "80vh", backgroundColor: "#fff", padding: 10, borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.3)", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <img src={imagenAmpliada} alt="Imagen ampliada" style={{ maxWidth: "100%", maxHeight: "70vh", borderRadius: 6 }} />
            <button onClick={() => setImagenAmpliada(null)} style={{ marginTop: 12, padding: "6px 14px", border: "none", backgroundColor: "#2563eb", color: "white", borderRadius: 6, cursor: "pointer" }}>Cerrar</button>
          </div>
        </div>
      )}
    </>
  );
}
