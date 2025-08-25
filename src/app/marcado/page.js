"use client";

import { useEffect, useState, useRef } from "react";
import { db } from "../firebase";
import { collection, getDocs, doc, deleteDoc, getDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { useRouter } from "next/navigation";

export default function Marcados() {
  const [pacientesMarcados, setPacientesMarcados] = useState([]);
  const [pacienteSeleccionado, setPacienteSeleccionado] = useState(null);
  const [imagenAmpliada, setImagenAmpliada] = useState(null);
  const [menuVisible, setMenuVisible] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [usuarioActual, setUsuarioActual] = useState(null);
  const router = useRouter();
  const menuRef = useRef(null);

  // Cargar pacientes marcados
  useEffect(() => {
    const cargarMarcados = async () => {
      const snapshot = await getDocs(collection(db, "pacientesMarcados"));
      const list = [];
      snapshot.forEach((doc) => {
        list.push({ id: doc.id, ...doc.data() });
      });
      setPacientesMarcados(list);
    };
    cargarMarcados();
  }, []);

  // Cargar usuario actual
  useEffect(() => {
    const cargarUsuario = async () => {
      try {
        const username = localStorage.getItem("username"); // guardado al iniciar sesión
        if (!username) return;
        const q = collection(db, "usuarios");
        const snapshot = await getDocs(q);
        const userDoc = snapshot.docs.find(d => d.data().username === username);
        if (userDoc) {
          setUsuarioActual({ id: userDoc.id, nombre: userDoc.data().username || username });
        }
      } catch (err) {
        console.error("Error cargando usuario actual:", err);
      }
    };
    cargarUsuario();
  }, []);

  // Cerrar menú al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuVisible(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Seleccionar paciente
  const seleccionarPaciente = async (paciente) => {
    if (pacienteSeleccionado?.id === paciente.id) {
      setPacienteSeleccionado(null);
      setMenuVisible(false);
    } else {
      try {
        const docSnap = await getDoc(doc(db, "pacientes", paciente.id));
        if (docSnap.exists()) {
          setPacienteSeleccionado({ ...paciente, imagenes: docSnap.data().imagenes || [] });
        } else {
          setPacienteSeleccionado(paciente);
        }
      } catch {
        setPacienteSeleccionado(paciente);
      }
      setMenuVisible(false);
    }
  };
const desmarcarPaciente = async (paciente) => {
  if (!confirm("¿Deseas desmarcar este paciente?")) return;
  try {
    // Borrar paciente marcado
    await deleteDoc(doc(db, "pacientesMarcados", paciente.id));
    setPacientesMarcados(pacientesMarcados.filter((p) => p.id !== paciente.id));
    if (pacienteSeleccionado?.id === paciente.id) setPacienteSeleccionado(null);

    // Registrar log correctamente
    await addDoc(collection(db, "logs"), {
      usuarioId: usuarioActual?.id || "desconocido",
      usuarioNombre: usuarioActual?.nombre || "Sin nombre",
      accion: `Desmarcó a: ${paciente.nombre || "Sin nombre"}`,
      pacienteId: paciente.id,
      nombrePaciente: paciente.nombre || "Sin nombre",
      fecha: serverTimestamp(),
    });

    alert("Paciente desmarcado.");
  } catch (e) {
    console.error("Error al desmarcar paciente o registrar log:", e);
    alert("Error al desmarcar paciente.");
  }
};
  const editarPaciente = (id) => {
    if (!pacienteSeleccionado) return;
    const fecha = pacienteSeleccionado.fecha || "";
    const horaInicio = pacienteSeleccionado.horaInicio || "";
    const horaFin = pacienteSeleccionado.horaFin || "";
    router.push(`/RPaciente?id=${id}&origen=marcado&fecha=${fecha}&horaInicio=${horaInicio}&horaFin=${horaFin}`);
    setMenuVisible(false);
  };

  const crearCita = (paciente) => {
    if (!paciente) return;
    router.push(`/Asignar?id=${paciente.id}`);
    setMenuVisible(false);
  };

  // Filtrado por búsqueda
  const pacientesFiltrados = pacientesMarcados.filter((p) =>
    p.nombre?.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div
      className="container"
      style={{
        padding: 60,
        maxWidth: 900,
        margin: "30px auto",
        backgroundColor: "white",
        borderRadius: 12,
        boxShadow: "0 4px 20px rgba(0,0,0,0.1)",
        position: "relative",
        height: "calc(80vh - 40px)",
        overflowY: "auto",
      }}
    >
      <button
        onClick={() => router.push("/dashboard")}
        className="btn-volver"
        aria-label="Volver al calendario"
        title="Volver al calendario"
        style={{ position: "absolute", top: 10, left: 10 }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="white" viewBox="0 0 24 24" width="22" height="22">
          <path d="M15 19l-7-7 7-7" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <h2 style={{ marginTop: 0, marginBottom: 10, fontWeight: "bold" }}>Pacientes Marcados</h2>

      <input
        type="text"
        placeholder="Buscar paciente por nombre..."
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        style={{
          width: "100%",
          padding: "10px 14px",
          fontSize: 16,
          marginBottom: 20,
          borderRadius: 6,
          border: "1px solid #ccc",
          boxSizing: "border-box",
        }}
        aria-label="Buscar paciente"
      />

      {pacientesFiltrados.length === 0 && <p>No hay pacientes marcados.</p>}

      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {pacientesFiltrados.map((p) => (
          <li key={p.id} style={{ marginBottom: 12 }}>
            <div
              style={{
                padding: 10,
                borderRadius: 8,
                backgroundColor: pacienteSeleccionado?.id === p.id ? "#e0e7ff" : "#f3f4f6",
                cursor: "pointer",
                boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
                userSelect: "none",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
              onClick={() => seleccionarPaciente(p)}
            >
              <div>
                <strong>{p.nombre || "Sin nombre"}</strong>
                <br />
                <small>Edad: {p.edad || "-"}</small>
                <br />
                <small>Teléfono: {p.telefono || "-"}</small>
              </div>

              {pacienteSeleccionado?.id === p.id && (
                <div style={{ position: "relative", userSelect: "none" }} ref={menuRef}>
                  <button
                    onClick={(e) => { e.stopPropagation(); setMenuVisible(!menuVisible); }}
                    aria-label="Opciones paciente"
                    title="Opciones"
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: 8,
                      borderRadius: "50%",
                      transition: "background-color 0.2s",
                      color: "#2563eb",
                      fontSize: 28,
                      fontWeight: "bold",
                      lineHeight: 1,
                      userSelect: "none",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#e0e7ff")}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                  >
                    ⋮
                  </button>

                  {menuVisible && (
                    <div
                      style={{
                        position: "absolute",
                        right: 0,
                        top: "calc(100% + 6px)",
                        backgroundColor: "white",
                        borderRadius: 10,
                        boxShadow: "0 8px 20px rgba(0,0,0,0.12)",
                        minWidth: 140,
                        zIndex: 100,
                        userSelect: "none",
                        display: "flex",
                        flexDirection: "column",
                        padding: 8,
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => editarPaciente(pacienteSeleccionado.id)}
                        style={menuBtnStyle}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(37,166,235,0.1)")}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                      >
                        Editar
                      </button>

                      <button
                        onClick={(e) => { e.stopPropagation(); crearCita(p); }}
                        style={menuBtnStyle}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(37,166,235,0.1)")}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                      >
                        Crear cita
                      </button>

                      <button
                        onClick={() => desmarcarPaciente(p)}
                        style={menuBtnStyle}
                        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(37,166,235,0.1)")}
                        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                      >
                        Desmarcar
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {pacienteSeleccionado?.id === p.id && (
              <div
                style={{
                  marginTop: 8,
                  borderTop: "1px solid #ddd",
                  paddingTop: 10,
                  backgroundColor: "#f9fafb",
                  borderRadius: 8,
                }}
              >
                <h3>{pacienteSeleccionado.nombre}</h3>
                <p><b>Edad:</b> {pacienteSeleccionado.edad}</p>
                <p><b>Sexo:</b> {pacienteSeleccionado.sexo}</p>
                <p><b>Teléfono:</b> {pacienteSeleccionado.telefono}</p>
                <p><b>Patología:</b> {pacienteSeleccionado.patologia}</p>
                <p><b>Domicilio:</b> {pacienteSeleccionado.domicilio}</p>

                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10, cursor: "pointer" }}>
                  {pacienteSeleccionado.imagenes && pacienteSeleccionado.imagenes.length > 0 ? (
                    pacienteSeleccionado.imagenes.map((img, i) => (
                      <img
                        key={i}
                        src={img}
                        alt={`imagen paciente ${pacienteSeleccionado.nombre} ${i + 1}`}
                        width={100}
                        height="auto"
                        loading="lazy"
                        onClick={(e) => { e.stopPropagation(); setImagenAmpliada(img); }}
                        style={{ borderRadius: 6, boxShadow: "0 1px 3px rgba(0,0,0,0.2)", objectFit: "cover", userSelect: "none" }}
                      />
                    ))
                  ) : (
                    <p>No hay imágenes disponibles</p>
                  )}
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>

      {imagenAmpliada && (
        <div
          onClick={() => setImagenAmpliada(null)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(0,0,0,0.5)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 9999,
            cursor: "zoom-out",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: "#fff",
              borderRadius: 10,
              padding: 16,
              boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
              maxWidth: "80vw",
              maxHeight: "80vh",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <img
              src={imagenAmpliada}
              alt="Imagen ampliada"
              style={{ maxWidth: "100%", maxHeight: "70vh", borderRadius: 8 }}
            />
            <button
              onClick={() => setImagenAmpliada(null)}
              style={{
                marginTop: 16,
                padding: "8px 16px",
                backgroundColor: "#2563eb",
                border: "none",
                color: "white",
                borderRadius: 6,
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const menuBtnStyle = {
  padding: "10px 12px",
  background: "none",
  border: "none",
  textAlign: "left",
  cursor: "pointer",
  fontWeight: "600",
  fontSize: 15,
  color: "#000000ff",
  borderRadius: 6,
  transition: "background-color 0.2s ease",
  userSelect: "none",
  marginBottom: 6,
};
