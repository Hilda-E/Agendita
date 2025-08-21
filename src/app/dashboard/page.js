"use client";

import { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import { collection, getDocs, addDoc, query, where, doc, updateDoc } from "firebase/firestore";
import Calendar from "react-calendar";
import { useRouter } from "next/navigation";
import "react-calendar/dist/Calendar.css";

const MAX_CITAS_POR_DIA = 8;

export default function Dashboard() {
  const [fechaSeleccionada, setFechaSeleccionada] = useState(new Date());
  const [estadoDias, setEstadoDias] = useState({});
  const [rol, setRol] = useState("usuario");
  const router = useRouter();

  useEffect(() => {
    const rolGuardado = localStorage.getItem("rol");
    if (rolGuardado) setRol(rolGuardado);
  }, []);

  useEffect(() => {
    const obtenerCitas = async () => {
      const snapshot = await getDocs(collection(db, "pacientes"));
      const estado = {};
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.fecha && data.horaInicio) {
          let fechaStr = data.fecha;
          if (fechaStr.includes("-")) {
            const partes = fechaStr.split("-");
            if (partes[0].length === 2 && partes[2].length === 4) {
              fechaStr = `${partes[2]}-${partes[1]}-${partes[0]}`;
            }
          }
          if (!estado[fechaStr]) estado[fechaStr] = 0;
          estado[fechaStr] += 1;
        }
      });
      setEstadoDias(estado);
    };
    obtenerCitas();
  }, []);

  const handleDateChange = (value) => {
    const fechaFormateada = value.toISOString().split("T")[0];
    router.push(`/horario?fecha=${fechaFormateada}`);
  };

  const tileClassName = ({ date, view }) => {
    if (view !== "month") return;
    const fechaStr = date.toISOString().split("T")[0];
    const cantidad = estadoDias[fechaStr] || 0;
    if (date.getDay() === 0 || date.getDay() === 6) return "weekend";
    if (cantidad >= MAX_CITAS_POR_DIA) return "lleno";
    if (cantidad > 0) return "disponible";
    return "vacio";
  };

  const tileDisabled = ({ date, view }) => {
    return view === "month" && (date.getDay() === 0 || date.getDay() === 6);
  };

  const cerrarSesion = async () => {
    const confirmar = confirm("¿Estás seguro de salir?");
    if (!confirmar) return;

    const username = localStorage.getItem("username") || "Sin nombre";

    try {
      // Buscar usuario en Firestore
      const q = query(collection(db, "usuarios"), where("username", "==", username));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        const userRef = doc(db, "usuarios", userDoc.id);

        // Marcar sesión como inactiva
        await updateDoc(userRef, { sesionActiva: false });

        // Registrar log
        await addDoc(collection(db, "logs"), {
          usuarioId: userDoc.id,
          usuarioNombre: username,
          accion: "Cerró sesión",
          fecha: new Date()
        });
      }

      // Cerrar sesión de Firebase
      await auth.signOut();

      // Limpiar localStorage
      localStorage.removeItem("username");
      localStorage.removeItem("rol");

      router.push("/login");
    } catch (error) {
      console.error("Error cerrando sesión:", error);
      alert("Error al cerrar sesión");
    }
  };

  const hoy = new Date();
  const inicioAnio = new Date(hoy.getFullYear(), 0, 1);
  const finAnio = new Date(hoy.getFullYear(), 11, 31);

  return (
    <div className="dashboard-container">
      <div className="botones-arriba">
        <button
          onClick={() => {
            if (rol === "admin") {
              router.push("/VistaAdmin");
            } else {
              cerrarSesion();
            }
          }}
          className="btn-volver"
          aria-label="Volver"
          title="Volver"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="white"
            viewBox="0 0 24 24"
            width="22"
            height="22"
          >
            <path
              d="M15 19l-7-7 7-7"
              stroke="white"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>

        <button
          onClick={() => router.push("/marcado")}
          className="btn-marcados"
          aria-label="Pacientes marcados"
          title="Pacientes marcados"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="white"
            viewBox="0 0 24 24"
            width="22"
            height="22"
          >
            <path
              d="M4 6h16M4 12h16M4 18h16"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
        </button>
      </div>

      <h2 className="titulo-calendario" style={{ textAlign: "left" }}>
        Selecciona una fecha para agendar tu cita
      </h2>

      <Calendar
        onChange={handleDateChange}
        value={fechaSeleccionada}
        tileClassName={tileClassName}
        tileDisabled={tileDisabled}
        minDate={inicioAnio}
        maxDate={finAnio}
        formatShortWeekday={(locale, date) =>
          date.toLocaleDateString(locale, { weekday: "short" })
        }
        className="react-calendar large"
      />

      <div className="leyenda-calendario">
        <LeyendaColor color="#dc2626" texto="Lleno (8 o más citas)" />
        <LeyendaColor color="#16a34a" texto="Disponible (1 a 7 citas)" />
        <LeyendaColor
          color="#ffffff"
          texto="Libre (sin citas)"
          textoColor="#000"
          borde
        />
        <LeyendaColor color="#05299d" texto="No laborable (fin de semana)" />
      </div>
    </div>
  );
}

function LeyendaColor({ color, texto, textoColor, borde = false }) {
  const esColorClaro =
    color.toLowerCase() === "#ffffff" || color.toLowerCase() === "white";
  const colorTexto = textoColor || (esColorClaro ? "#111827" : "white");

  return (
    <div className="leyenda-item">
      <div
        className={`cuadro-color ${borde ? "con-borde" : ""}`}
        style={{ backgroundColor: color }}
      />
      <span className="texto-leyenda" style={{ color: colorTexto }}>
        {texto}
      </span>
    </div>
  );
}
