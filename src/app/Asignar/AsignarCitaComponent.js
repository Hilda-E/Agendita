"use client";
import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { doc, getDoc, setDoc, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";

export default function AsignarCita() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");

  const [paciente, setPaciente] = useState(null);
  const [fecha, setFecha] = useState("");
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFin, setHoraFin] = useState("");

  const [errorHoraInicio, setErrorHoraInicio] = useState("");
  const [errorHoraFin, setErrorHoraFin] = useState("");
  const [errorGeneral, setErrorGeneral] = useState("");

  const currentYear = new Date().getFullYear();
  const minDate = `${currentYear}-01-01`;
  const maxDate = `${currentYear}-12-31`;

  useEffect(() => {
    if (!id) return;
    async function fetchPaciente() {
      const docSnap = await getDoc(doc(db, "pacientes", id));
      if (docSnap.exists()) setPaciente({ id, ...docSnap.data() });
      else alert("Paciente no encontrado");
    }
    fetchPaciente();
  }, [id]);

  const validarHoraRango = (hora) => {
    if (!hora) return "";
    const [h, m] = hora.split(":").map(Number);
    const horaNumber = h + m / 60;
    if (horaNumber < 8 || horaNumber > 16)
      return "La hora debe estar entre 08:00 a.m y 04:00 p.m";
    return "";
  };

  const handleHoraInicioChange = (e) => {
    const valor = e.target.value;
    setHoraInicio(valor);
    setErrorHoraInicio(validarHoraRango(valor));
    setErrorGeneral("");
  };

  const handleHoraFinChange = (e) => {
    const valor = e.target.value;
    setHoraFin(valor);
    setErrorHoraFin(validarHoraRango(valor));
    setErrorGeneral("");
  };

  const handleFechaChange = (e) => {
    const [year, month, day] = e.target.value.split("-");
    const selectedDate = new Date(year, month - 1, day);

    // Bloquear fines de semana
    const dayOfWeek = selectedDate.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      alert("No se pueden seleccionar fines de semana (domingo o sábado)");
      return;
    }

    // Bloquear años distintos al actual
    if (+year !== currentYear) {
      alert(`Solo se pueden seleccionar fechas del año ${currentYear}`);
      return;
    }

    setFecha(e.target.value);
  };

  const guardarCita = async () => {
    setErrorGeneral("");

    if (!fecha || !horaInicio || !horaFin) {
      alert("Selecciona fecha, hora de inicio y hora de fin");
      return;
    }

    const selectedYear = new Date(fecha).getFullYear();
    if (selectedYear !== currentYear) {
      setErrorGeneral(`La fecha debe estar dentro del año ${currentYear}`);
      return;
    }

    const hI = horaInicio.split(":").map(Number);
    const hF = horaFin.split(":").map(Number);
    const inicioMinutes = hI[0] * 60 + hI[1];
    const finMinutes = hF[0] * 60 + hF[1];

    if (errorHoraInicio || errorHoraFin) return;
    if (finMinutes < inicioMinutes) {
      setErrorGeneral("La hora de fin no puede ser antes que la hora de inicio");
      return;
    }
    if (inicioMinutes === finMinutes) {
      setErrorGeneral("La hora de inicio y fin no pueden ser iguales");
      return;
    }

    try {
      // Guardar la cita en la colección "citas" para que el dashboard la vea
      await addDoc(collection(db, "citas"), {
        pacienteId: paciente.id,
        nombrePaciente: paciente.nombre,
        fecha,
        horaInicio,
        horaFin,
        creadoPor: localStorage.getItem("username") || "Desconocido",
        timestamp: serverTimestamp(),
      });

      // Guardar log en la colección "logs"
      const usuarioNombre = localStorage.getItem("username") || "Desconocido";
      await addDoc(collection(db, "logs"), {
        accion: `Creó cita a: ${paciente.nombre}`,
        fecha: serverTimestamp(),
        pacienteId: paciente.id,
        nombrePaciente: paciente.nombre,
        usuarioId: usuarioNombre,
        usuarioNombre: usuarioNombre,
      });

      router.push(`/guardado?id=${id}`);
    } catch (e) {
      alert("Error al guardar la cita: " + e.message);
    }
  };

  if (!paciente)
    return (
      <p style={{ textAlign: "center", marginTop: 80, fontSize: 18 }}>
        Cargando paciente...
      </p>
    );

  const containerStyle = {
    position: "relative",
    maxWidth: 500,
    width: "90%",
    padding: 60,
    backgroundColor: "#fff",
    borderRadius: 12,
    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
  };

  const labelStyle = { display: "block", marginBottom: 8, fontWeight: "bold", color: "#000", fontSize: 18 };
  const inputStyle = {
    width: "100%",
    padding: 14,
    borderRadius: 6,
    border: "1px solid #000000ff",
    marginBottom: 5,
    boxSizing: "border-box",
    color: "#000",
    backgroundColor: "#fff",
    fontSize: 18,
  };
  const btnStyle = {
    width: "100%",
    padding: 14,
    borderRadius: 8,
    border: "none",
    backgroundColor: "#2563eb",
    color: "#fff",
    fontWeight: "bold",
    cursor: "pointer",
    fontSize: 18,
    marginTop: 20,
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "flex-start", paddingTop: 60 }}>
      <div style={containerStyle}>
        <button
          onClick={() => router.push("/marcado")}
          className="btn-volver"
          aria-label="Volver a marcado"
          title="Volver"
          style={{ position: "absolute", top: 20, left: 20}}
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="white" viewBox="0 0 24 24" width="22" height="22">
            <path d="M15 19l-7-7 7-7" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <h2 style={{ marginBottom: 10, fontWeight: "bold", color: "#000", textAlign: "center", fontSize: 24 }}>
          Asignar cita a {paciente.nombre}
        </h2>

        <label style={labelStyle}>Fecha:</label>
        <input type="date" value={fecha} onChange={handleFechaChange} style={inputStyle} min={minDate} max={maxDate} />

        <label style={labelStyle}>Hora de inicio:</label>
        <input type="time" value={horaInicio} onChange={handleHoraInicioChange} style={inputStyle} />
        {errorHoraInicio && <p style={{ color: "red", fontSize: 14, marginBottom: 10 }}>{errorHoraInicio}</p>}

        <label style={labelStyle}>Hora de fin:</label>
        <input type="time" value={horaFin} onChange={handleHoraFinChange} style={inputStyle} />
        {errorHoraFin && <p style={{ color: "red", fontSize: 14, marginBottom: 10 }}>{errorHoraFin}</p>}

        {errorGeneral && <p style={{ color: "red", fontSize: 14, marginBottom: 10 }}>{errorGeneral}</p>}

        <button onClick={guardarCita} style={btnStyle}>Guardar cita</button>
      </div>
    </div>
  );
}
