"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { doc, getDoc, setDoc, deleteDoc, addDoc, collection } from "firebase/firestore";
import { db } from "../firebase";

export default function Guardado() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mostrarCambios, setMostrarCambios] = useState(false);
  const [imagenModal, setImagenModal] = useState(null);
  const [marcado, setMarcado] = useState(false);

  useEffect(() => {
    if (!id) {
      alert("No se proporcionó ID de paciente.");
      router.push("/");
      return;
    }

    async function fetchData() {
      setLoading(true);
      const docRef = doc(db, "pacientes", id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setData(docSnap.data());
        const marcadoDoc = await getDoc(doc(db, "pacientesMarcados", id));
        setMarcado(marcadoDoc.exists());
      } else {
        alert("Paciente no encontrado.");
        router.push("/");
      }
      setLoading(false);
    }
    fetchData();
  }, [id, router]);

  if (loading) return <p style={{ textAlign: "center", fontSize: 18 }}>Cargando información...</p>;
  if (!data) return null;

  const {
    nombre,
    edad,
    sexo,
    telefono,
    patologia,
    domicilio,
    fecha,
    horaInicio,
    horaFin,
    imagenes = [],
  } = data;

  const handleEditar = () => {
    const params = new URLSearchParams({
      id,
      nombre,
      edad,
      sexo,
      telefono,
      patologia,
      domicilio,
      fecha,
      horaInicio,
      horaFin,
      origen: "citas",
    }).toString();
    router.push("/RPaciente?" + params);
  };

  const handleEliminar = async () => {
    if (confirm("¿Seguro que quieres eliminar esta cita?")) {
      try {
        await deleteDoc(doc(db, "pacientes", id));
        alert("Paciente eliminado correctamente.");

        // --- REGISTRAR LOG ---
        const usuarioNombre = localStorage.getItem("username") || "Desconocido";
        await addDoc(collection(db, "logs"), {
          usuarioNombre,
          accion: `Eliminó a: ${nombre}`,
          pacienteId: id,
          nombrePaciente: nombre,
          fecha: new Date()
        });

        router.push("/dashboard?msg=eliminado");
      } catch (error) {
        alert("Error al eliminar: " + error.message);
      }
    }
  };

  const handleAceptar = () => router.push("/dashboard");

  const toggleMarcado = async () => {
    try {
      const usuarioNombre = localStorage.getItem("username") || "Desconocido";
      if (marcado) {
        await deleteDoc(doc(db, "pacientesMarcados", id));
        setMarcado(false);
        alert("Paciente desmarcado.");

        // --- REGISTRAR LOG ---
        await addDoc(collection(db, "logs"), {
          usuarioNombre,
          accion: `Desmarcó a: ${nombre}`,
          pacienteId: id,
          nombrePaciente: nombre,
          fecha: new Date()
        });
      } else {
        await setDoc(doc(db, "pacientesMarcados", id), {
          nombre,
          edad,
          sexo,
          telefono,
          patologia,
          domicilio,
          marcadoEn: new Date().toISOString(),
        });
        setMarcado(true);
        alert("Paciente marcado exitosamente.");

        // --- REGISTRAR LOG ---
        await addDoc(collection(db, "logs"), {
          usuarioNombre,
          accion: `Marcó a: ${nombre}`,
          pacienteId: id,
          nombrePaciente: nombre,
          fecha: new Date()
        });
      }
    } catch (error) {
      alert("Error al cambiar estado de marcado: " + error.message);
    }
  };

  const cerrarModal = () => setImagenModal(null);

  const botonMenuStyle = {
    width: "100%",
    padding: 8,
    backgroundColor: "white",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
    marginBottom: 6,
    fontWeight: "bold",
    textAlign: "left",
    fontSize: 16,
    color: "#000000",
  };

  const textoLargo = {
    wordBreak: "break-word",
    overflowWrap: "break-word",
    userSelect: "text",
  };

const formatearFecha = (fechaInput) => {
  if (!fechaInput) return "";

  let fechaObj;

  // Firestore Timestamp
  if (fechaInput?.seconds) {
    fechaObj = new Date(fechaInput.seconds * 1000);
  } 
  // ISO string o string normal
  else if (typeof fechaInput === "string") {
    fechaObj = new Date(fechaInput);
    if (isNaN(fechaObj)) return fechaInput; // si no se pudo parsear, regresamos el string tal cual
  } 
  // Ya es un objeto Date
  else if (fechaInput instanceof Date) {
    fechaObj = fechaInput;
  } 
  else {
    return ""; // caso desconocido
  }

  const dd = String(fechaObj.getDate()).padStart(2, "0");
  const mm = String(fechaObj.getMonth() + 1).padStart(2, "0");
  const yyyy = fechaObj.getFullYear();

  return `${dd}-${mm}-${yyyy}`;
};

  return (
    <div
      style={{
        maxWidth: 900,
        minWidth: 600,
        margin: "auto",
        marginTop: 60,
        padding: 15,
        backgroundColor: "white",
        borderRadius: 12,
        boxShadow: "0 0 20px rgba(0,0,0,0.25)",
        color: "#111827",
        fontSize: 18,
        userSelect: "text",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: 10,
          right: 10,
          display: "flex",
          alignItems: "center",
          cursor: "pointer",
          color: "#25a6ebff",
          userSelect: "none",
          padding: "4px 8px",
          borderRadius: 6,
          border: "1px solid #2563eb",
          fontWeight: "bold",
          fontSize: 18,
          zIndex: 1100,
        }}
        onClick={() => setMostrarCambios((v) => !v)}
        aria-label="Mostrar opciones"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          viewBox="0 0 24 24"
          width="20"
          height="20"
          style={{ marginRight: 6 }}
        >
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 113 3L7 19l-4 1 1-4 12.5-12.5z" />
        </svg>

        {mostrarCambios && (
          <div
            style={{
              position: "absolute",
              right: 0,
              top: "calc(100% + 6px)",
              backgroundColor: "white",
              borderRadius: 10,
              boxShadow: "0 8px 20px rgba(0, 0, 0, 0.25)",
              minWidth: 140,
              zIndex: 1200,
              display: "flex",
              flexDirection: "column",
              padding: 8,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleEditar}
              style={botonMenuStyle}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(37,166,235,0.1)")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "white")}
            >
              Editar
            </button>

            <button
              onClick={handleEliminar}
              style={botonMenuStyle}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(37,166,235,0.1)")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "white")}
            >
              Eliminar
            </button>

            <button
              onClick={toggleMarcado}
              style={{
                ...botonMenuStyle,
                color: marcado ? "#16a34a" : "#6b7280",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(37,166,235,0.1)")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "white")}
            >
              {marcado ? "Desmarcar paciente" : "Marcar paciente"}
            </button>
          </div>
        )}
      </div>

      {/* Resto de la interfaz se mantiene igual */}
      <h2 style={{ textAlign: "center", marginBottom: 20, fontSize: 24 }}>
        Información guardada
      </h2>

      <div style={{ minWidth: 280, fontSize: 20 }}>
        <p style={{ ...textoLargo, display: "flex", flexWrap: "wrap", gap: 8 }}>
          <span style={{ fontWeight: "bold" }}>Nombre:</span>
          <span style={{ flex: 1 }}>{nombre}</span>
        </p>

        <div
          style={{
            display: "flex",
            gap: 80,
            marginBottom: 10,
            flexWrap: "wrap",
            justifyContent: "flex-start",
            alignItems: "center",
          }}
        >
          <p style={{ margin: 0, ...textoLargo }}><b>Edad:</b> <span style={{ fontWeight: 400 }}>{edad}</span></p>
          <p style={{ margin: 0, ...textoLargo }}><b>Sexo:</b> <span style={{ fontWeight: 400 }}>{sexo}</span></p>
          <p style={{ margin: 0, ...textoLargo }}><b>Teléfono:</b> <span style={{ fontWeight: 400 }}>{telefono}</span></p>
        </div>

        <p style={{ marginTop: 6, display: "flex", flexWrap: "wrap" }}>
          <b style={{ minWidth: 100 }}>Patología:</b>
          <span style={{ flex: 1, wordBreak: "break-word", overflowWrap: "break-word" }}>
            {patologia}
          </span>
        </p>
        <p style={{ marginTop: 6, ...textoLargo }}><b>Domicilio:</b> <span style={{ fontWeight: 400 }}>{domicilio}</span></p>
       <p style={{ marginTop: 6, ...textoLargo }}><b>Fecha:</b> <span style={{ fontWeight: 400 }}>{formatearFecha(fecha)}</span></p>
        <p style={{ marginTop: 6, ...textoLargo }}><b>Hora:</b> <span style={{ fontWeight: 400 }}>{horaInicio} a {horaFin}</span></p>

        <div
          style={{
            marginTop: 20,
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            justifyContent: "flex-start",
          }}
        >
          {imagenes.length > 0 ? (
            imagenes.map((img, i) => (
              <img
                key={i}
                src={img}
                alt={`imagen-${i}`}
                style={{
                  width: 120,
                  height: 120,
                  objectFit: "cover",
                  borderRadius: 8,
                  cursor: "pointer",
                  boxShadow: "0 0 8px rgba(0,0,0,0.15)",
                  transition: "transform 0.2s",
                }}
                onClick={() => setImagenModal(img)}
                onMouseOver={(e) => (e.currentTarget.style.transform = "scale(1.05)")}
                onMouseOut={(e) => (e.currentTarget.style.transform = "scale(1)")}
              />
            ))
          ) : (
            <p>No hay imágenes disponibles</p>
          )}
        </div>
      </div>

      {imagenModal && (
        <div
          onClick={cerrarModal}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(0,0,0,0.7)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 1500,
          }}
        >
          <img
            src={imagenModal}
            alt="imagen ampliada"
            style={{
              maxWidth: "90%",
              maxHeight: "90%",
              borderRadius: 12,
              boxShadow: "0 0 20px rgba(0,0,0,0.5)",
            }}
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={cerrarModal}
            style={{
              position: "absolute",
              top: 20,
              right: 20,
              width: 36,
              height: 36,
              borderRadius: "50%",
              backgroundColor: "rgba(255,255,255,0.8)",
              border: "none",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              fontSize: 24,
              fontWeight: "bold",
              cursor: "pointer",
              userSelect: "none",
              transition: "background-color 0.3s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#dc2626")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.8)")}
            aria-label="Cerrar imagen"
          >
            ×
          </button>
        </div>
      )}

      <div style={{ textAlign: "center", marginTop: 30 }}>
        <button
          onClick={handleAceptar}
          style={{
            padding: "12px 30px",
            backgroundColor: "#2563eb",
            color: "white",
            border: "none",
            borderRadius: 8,
            fontWeight: "bold",
            fontSize: 20,
            cursor: "pointer",
          }}
        >
          Aceptar
        </button>
      </div>
    </div>
  );
}
